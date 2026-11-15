// Runs the migrations on an in-memory Postgres (PGlite) with a minimal stub of Supabase's
// auth schema, then exercises permissions, sales, stock and cash closing as real users.
// shortcut: stubs auth.users/auth.uid(), upgrade to pgTAP + `supabase test db` once Docker is available.
import {PGlite} from '@electric-sql/pglite';
import {readdirSync, readFileSync} from 'node:fs';
import {join} from 'node:path';
import {beforeAll, describe, expect, test} from 'vitest';

const OWNER = '00000000-0000-0000-0000-000000000001';
const CASHIER = '00000000-0000-0000-0000-000000000002';
const STRANGER = '00000000-0000-0000-0000-000000000003';

let db: PGlite;

async function as<T = any>(user: string | null, sql: string, params: unknown[] = []): Promise<T[]> {
  await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${user ?? ''}', false);`);
  await db.exec(user ? 'set role authenticated' : 'set role anon');
  try {
    return (await db.query<T>(sql, params)).rows;
  } finally {
    await db.exec('reset role');
  }
}
const one = async (user: string | null, sql: string, params: unknown[] = []) => Object.values((await as(user, sql, params))[0] as object)[0] as any;

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    create role anon nologin; create role authenticated nologin;
    create schema auth;
    create table auth.users (id uuid primary key, phone text, phone_confirmed_at timestamptz);
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth to anon, authenticated;
    grant usage on schema public to anon, authenticated;
    alter default privileges in schema public grant all on tables to anon, authenticated;
    alter default privileges in schema public grant all on functions to anon, authenticated;
    insert into auth.users values
      ('${OWNER}', '525500000001', now()),
      ('${CASHIER}', '525500000002', now()),
      ('${STRANGER}', '525500000003', now());
  `);
  const dir = join(import.meta.dirname, '..', 'migrations');
  for (const f of readdirSync(dir).sort()) await db.exec(readFileSync(join(dir, f), 'utf8'));
});

describe('store, roles and invitations', () => {
  let store: string;
  let cashierRole: string;

  test('owner creates store with default roles', async () => {
    store = await one(OWNER, `select public.create_store('Tienda')`);
    const roles = await as<{name: string; id: string}>(OWNER, 'select id, name from public.roles where store_id = $1 order by name', [store]);
    expect(roles.map(r => r.name)).toEqual(['Administrador', 'Cajero']);
    cashierRole = roles[1].id;
  });

  test('anon and strangers see nothing', async () => {
    await expect(as(null, 'select public.create_store($1)', ['x'])).rejects.toThrow();
    expect(await as(STRANGER, 'select * from public.stores')).toHaveLength(0);
  });

  test('invited phone joins with its role', async () => {
    await as(OWNER, `insert into public.invitations (store_id, phone, role_id, display_name) values ($1, '+525500000002', $2, 'Ana')`, [store, cashierRole]);
    expect(await as(STRANGER, 'select public.accept_invitations()')).toHaveLength(0);
    expect(await as(CASHIER, 'select public.accept_invitations()')).toHaveLength(1);
    const perms = (await as<{p: string}>(CASHIER, 'select public.my_permissions($1) as p', [store])).map(r => r.p);
    expect(perms).toContain('sales.create');
    expect(perms).not.toContain('products.manage');
  });

  test('cashier cannot manage catalog, roles or the owner', async () => {
    await expect(as(CASHIER, `insert into public.products (store_id, sku, name, price) values ($1, 'X', 'X', 1)`, [store])).rejects.toThrow();
    await expect(as(CASHIER, `insert into public.role_permissions values ($1, 'products.manage')`, [cashierRole])).rejects.toThrow();
    await as(CASHIER, `update public.store_members set deleted_at = now() where is_owner`);
    expect(await one(OWNER, 'select count(*)::int from public.store_members where is_owner and deleted_at is null')).toBe(1);
  });

  test('stock is not directly writable', async () => {
    await as(OWNER, `insert into public.products (store_id, sku, name, price, stock) values ($1, 'A', 'Agua', 10.50, 3)`, [store]);
    await expect(as(OWNER, `update public.products set stock = 100`)).rejects.toThrow();
  });

  test('sale requires open cash session, validates stock and payment', async () => {
    const product = await one(OWNER, `select id from public.products where sku = 'A'`);
    const items = JSON.stringify([{product_id: product, quantity: 2}]);
    await expect(as(CASHIER, 'select public.create_sale($1, $2::jsonb)', [store, items])).rejects.toThrow(/CASH_SESSION_REQUIRED/);

    const session = await one(CASHIER, 'select public.open_cash_session($1, 100)', [store]);
    await expect(as(CASHIER, 'select public.open_cash_session($1, 100)', [store])).rejects.toThrow(/ALREADY_OPEN/);
    await expect(as(CASHIER, `select public.create_sale($1, $2::jsonb, 'paid', null, 5)`, [store, items])).rejects.toThrow(/INSUFFICIENT_PAYMENT/);
    await expect(as(CASHIER, `select public.create_sale($1, $2::jsonb, 'debt')`, [store, items])).rejects.toThrow(/CUSTOMER_REQUIRED/);
    await expect(
      as(CASHIER, 'select public.create_sale($1, $2::jsonb)', [store, JSON.stringify([{product_id: product, quantity: 4}])]),
    ).rejects.toThrow(/INSUFFICIENT_STOCK/);

    const sale = await one(CASHIER, `select public.create_sale($1, $2::jsonb, 'paid', null, 50)`, [store, items]);
    const [s] = await as<any>(CASHIER, 'select total::float, change::float, status from public.sales where id = $1', [sale]);
    expect(s).toEqual({total: 21, change: 29, status: 'paid'});
    expect(await one(OWNER, `select stock from public.products where id = $1`, [product])).toBe(1);
    expect(await one(OWNER, `select count(*)::int from public.product_histories where sale_id = $1`, [sale])).toBe(1);

    // debt sale, then partial + final payment
    const customer = await one(CASHIER, `insert into public.customers (store_id, name) values ($1, 'Luis') returning id`, [store]);
    const debt = await one(CASHIER, `select public.create_sale($1, $2::jsonb, 'debt', $3)`, [store, JSON.stringify([{product_id: product, quantity: 1}]), customer]);
    await expect(as(CASHIER, 'select public.add_payment($1, 20)', [debt])).rejects.toThrow(/INVALID_AMOUNT/);
    expect(Number(await one(CASHIER, 'select public.add_payment($1, 5)', [debt]))).toBe(5.5);
    expect(Number(await one(CASHIER, `select public.add_payment($1, 5.5, 'card')`, [debt]))).toBe(0);
    expect(await one(CASHIER, 'select status from public.sales where id = $1', [debt])).toBe('paid');

    // cash: 100 opening + 21 cash sale + 5 cash payment - 10 out = 116 (card not counted)
    await as(CASHIER, `select public.add_cash_movement($1, 'out', 10, 'Hielo')`, [store]);
    expect(Number(await one(CASHIER, 'select public.close_cash_session($1, 110)', [session]))).toBe(-6);
    const [c] = await as<any>(OWNER, 'select expected_amount::float as e, difference::float as d from public.cash_sessions where id = $1', [session]);
    expect(c).toEqual({e: 116, d: -6});
  });

  test('employees only see their own sales unless sales.view_all', async () => {
    expect(await one(OWNER, 'select count(*)::int from public.sales')).toBe(2);
    expect(await one(STRANGER, 'select count(*)::int from public.sales')).toBe(0);
  });
});
