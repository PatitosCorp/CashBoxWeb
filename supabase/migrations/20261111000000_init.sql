-- CashBox Web: initial schema.
-- Rules live here (RLS + functions) so the web PWA and the mobile app share them.
-- Every table has store_id so a user can belong to several stores later.


-- ---------------------------------------------------------------------------
-- Permissions (fixed list; roles are combinations of these)
-- ---------------------------------------------------------------------------
create table public.permissions (
  key text primary key
);

insert into public.permissions (key) values
  ('store.manage'),
  ('roles.manage'),
  ('employees.manage'),
  ('categories.manage'),
  ('products.manage'),
  ('customers.manage'),
  ('sales.create'),
  ('sales.view_all'),
  ('payments.create'),
  ('cash.open'),
  ('cash.close'),
  ('cash.movements'),
  ('cash.view_all'),
  ('reports.view');

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create function public.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ---------------------------------------------------------------------------
-- Stores, roles, members, invitations
-- ---------------------------------------------------------------------------
create table public.stores (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  owner_id uuid not null references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.roles (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id),
  name text not null check (length(trim(name)) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create unique index roles_store_name_key on public.roles (store_id, lower(name)) where deleted_at is null;

create table public.role_permissions (
  role_id uuid not null references public.roles (id) on delete cascade,
  permission text not null references public.permissions (key),
  primary key (role_id, permission)
);

create table public.store_members (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id),
  user_id uuid not null references auth.users (id),
  role_id uuid references public.roles (id),
  is_owner boolean not null default false,
  display_name text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (store_id, user_id)
);

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id),
  phone text not null check (phone ~ '^\+[1-9][0-9]{7,14}$'), -- E.164
  role_id uuid not null references public.roles (id),
  display_name text not null default '',
  invited_by uuid not null default auth.uid() references auth.users (id),
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index invitations_pending_key on public.invitations (store_id, phone) where accepted_at is null;

-- Membership / permission checks. SECURITY DEFINER so they can read membership
-- tables without recursing into their own RLS policies.
create function public.is_member(p_store uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.store_members m
    where m.store_id = p_store and m.user_id = auth.uid() and m.deleted_at is null
  );
$$;

create function public.has_permission(p_store uuid, p_permission text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.store_members m
    left join public.roles r on r.id = m.role_id and r.deleted_at is null
    left join public.role_permissions rp on rp.role_id = r.id and rp.permission = p_permission
    where m.store_id = p_store
      and m.user_id = auth.uid()
      and m.deleted_at is null
      and (m.is_owner or rp.permission is not null) -- the owner always has every permission
  );
$$;

create function public.require_permission(p_store uuid, p_permission text) returns void
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null or not public.has_permission(p_store, p_permission) then
    raise exception 'PERMISSION_DENIED: %', p_permission using errcode = '42501';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Catalog
-- ---------------------------------------------------------------------------
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id),
  name text not null check (length(trim(name)) > 0),
  color text not null default '#303336',
  image text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id),
  category_id uuid references public.categories (id),
  sku text not null check (length(trim(sku)) > 0),
  name text not null check (length(trim(name)) > 0),
  price numeric(12, 2) not null check (price >= 0),
  stock integer not null default 0 check (stock >= 0),
  min_stock integer check (min_stock >= 0),
  image text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create unique index products_store_sku_key on public.products (store_id, sku) where deleted_at is null;
create index products_store_category_idx on public.products (store_id, category_id);

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id),
  name text not null check (length(trim(name)) > 0),
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- ---------------------------------------------------------------------------
-- Cash register sessions (one open session per employee per store)
-- ---------------------------------------------------------------------------
create table public.cash_sessions (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id),
  opened_by uuid not null references auth.users (id),
  opening_amount numeric(12, 2) not null check (opening_amount >= 0),
  opened_at timestamptz not null default now(),
  closed_by uuid references auth.users (id),
  closed_at timestamptz,
  counted_amount numeric(12, 2),
  expected_amount numeric(12, 2),
  difference numeric(12, 2),
  note text
);
create unique index cash_sessions_one_open_key on public.cash_sessions (store_id, opened_by) where closed_at is null;

create table public.cash_movements (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id),
  cash_session_id uuid not null references public.cash_sessions (id),
  type text not null check (type in ('in', 'out')),
  amount numeric(12, 2) not null check (amount > 0),
  reason text not null check (length(trim(reason)) > 0),
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Sales
-- ---------------------------------------------------------------------------
create table public.sales (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id),
  customer_id uuid references public.customers (id),
  cash_session_id uuid not null references public.cash_sessions (id),
  total numeric(12, 2) not null check (total >= 0),
  change numeric(12, 2) not null default 0 check (change >= 0),
  status text not null check (status in ('paid', 'debt')),
  note text,
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  check (status = 'paid' or customer_id is not null)
);
create index sales_store_created_idx on public.sales (store_id, created_at desc);

create table public.sale_items (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id),
  sale_id uuid not null references public.sales (id),
  product_id uuid references public.products (id),
  product_name text not null,   -- snapshot at sale time
  price_at_sale numeric(12, 2) not null,
  quantity integer not null check (quantity > 0),
  subtotal numeric(12, 2) not null,
  created_at timestamptz not null default now()
);
create index sale_items_sale_idx on public.sale_items (sale_id);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id),
  sale_id uuid not null references public.sales (id),
  cash_session_id uuid not null references public.cash_sessions (id),
  amount numeric(12, 2) not null check (amount > 0),
  method text not null default 'cash' check (method in ('cash', 'card', 'transfer')),
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now()
);
create index payments_sale_idx on public.payments (sale_id);
create index payments_session_idx on public.payments (cash_session_id);

create table public.product_histories (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id),
  product_id uuid not null references public.products (id),
  event_type text not null check (event_type in ('stock_update', 'sale')),
  quantity_change integer not null,
  stock_before integer not null,
  stock_after integer not null,
  note text,
  sale_id uuid references public.sales (id),
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now()
);
create index product_histories_product_idx on public.product_histories (product_id, created_at desc);

-- updated_at triggers
create trigger stores_updated_at before update on public.stores for each row execute function public.set_updated_at();
create trigger roles_updated_at before update on public.roles for each row execute function public.set_updated_at();
create trigger store_members_updated_at before update on public.store_members for each row execute function public.set_updated_at();
create trigger categories_updated_at before update on public.categories for each row execute function public.set_updated_at();
create trigger products_updated_at before update on public.products for each row execute function public.set_updated_at();
create trigger customers_updated_at before update on public.customers for each row execute function public.set_updated_at();
create trigger sales_updated_at before update on public.sales for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- Reads: store members. Direct writes: only catalog/admin tables, gated by permission.
-- Sales, payments, stock and cash only change through the functions below.
-- ---------------------------------------------------------------------------
alter table public.permissions enable row level security;
alter table public.stores enable row level security;
alter table public.roles enable row level security;
alter table public.role_permissions enable row level security;
alter table public.store_members enable row level security;
alter table public.invitations enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.customers enable row level security;
alter table public.cash_sessions enable row level security;
alter table public.cash_movements enable row level security;
alter table public.sales enable row level security;
alter table public.sale_items enable row level security;
alter table public.payments enable row level security;
alter table public.product_histories enable row level security;

create policy permissions_read on public.permissions for select to authenticated using (true);

create policy stores_read on public.stores for select to authenticated using (public.is_member(id));
create policy stores_update on public.stores for update to authenticated
  using (public.has_permission(id, 'store.manage')) with check (public.has_permission(id, 'store.manage'));

create policy roles_read on public.roles for select to authenticated using (public.is_member(store_id));
create policy roles_insert on public.roles for insert to authenticated with check (public.has_permission(store_id, 'roles.manage'));
create policy roles_update on public.roles for update to authenticated
  using (public.has_permission(store_id, 'roles.manage')) with check (public.has_permission(store_id, 'roles.manage'));

create policy role_permissions_read on public.role_permissions for select to authenticated
  using (exists (select 1 from public.roles r where r.id = role_id and public.is_member(r.store_id)));
create policy role_permissions_insert on public.role_permissions for insert to authenticated
  with check (exists (select 1 from public.roles r where r.id = role_id and public.has_permission(r.store_id, 'roles.manage')));
create policy role_permissions_delete on public.role_permissions for delete to authenticated
  using (exists (select 1 from public.roles r where r.id = role_id and public.has_permission(r.store_id, 'roles.manage')));

create policy store_members_read on public.store_members for select to authenticated using (public.is_member(store_id));
-- The owner row can never be edited or deactivated by anyone else.
create policy store_members_update on public.store_members for update to authenticated
  using (public.has_permission(store_id, 'employees.manage') and not is_owner)
  with check (
    public.has_permission(store_id, 'employees.manage') and not is_owner
    and (role_id is null or exists (select 1 from public.roles r where r.id = role_id and r.store_id = store_members.store_id))
  );

create policy invitations_read on public.invitations for select to authenticated using (public.has_permission(store_id, 'employees.manage'));
create policy invitations_insert on public.invitations for insert to authenticated
  with check (
    public.has_permission(store_id, 'employees.manage')
    and invited_by = auth.uid()
    and exists (select 1 from public.roles r where r.id = role_id and r.store_id = invitations.store_id and r.deleted_at is null)
  );
create policy invitations_delete on public.invitations for delete to authenticated
  using (public.has_permission(store_id, 'employees.manage') and accepted_at is null);

create policy categories_read on public.categories for select to authenticated using (public.is_member(store_id));
create policy categories_insert on public.categories for insert to authenticated with check (public.has_permission(store_id, 'categories.manage'));
create policy categories_update on public.categories for update to authenticated
  using (public.has_permission(store_id, 'categories.manage')) with check (public.has_permission(store_id, 'categories.manage'));

create policy products_read on public.products for select to authenticated using (public.is_member(store_id));
create policy products_insert on public.products for insert to authenticated
  with check (
    public.has_permission(store_id, 'products.manage')
    and (category_id is null or exists (select 1 from public.categories c where c.id = category_id and c.store_id = products.store_id))
  );
create policy products_update on public.products for update to authenticated
  using (public.has_permission(store_id, 'products.manage'))
  with check (
    public.has_permission(store_id, 'products.manage')
    and (category_id is null or exists (select 1 from public.categories c where c.id = category_id and c.store_id = products.store_id))
  );

create policy customers_read on public.customers for select to authenticated using (public.is_member(store_id));
create policy customers_insert on public.customers for insert to authenticated with check (public.has_permission(store_id, 'customers.manage'));
create policy customers_update on public.customers for update to authenticated
  using (public.has_permission(store_id, 'customers.manage')) with check (public.has_permission(store_id, 'customers.manage'));

-- Employees see their own sales/sessions; sales.view_all / cash.view_all see everything.
create policy sales_read on public.sales for select to authenticated
  using (public.is_member(store_id) and (created_by = auth.uid() or public.has_permission(store_id, 'sales.view_all')));
create policy sale_items_read on public.sale_items for select to authenticated
  using (exists (select 1 from public.sales s where s.id = sale_id));
create policy payments_read on public.payments for select to authenticated
  using (exists (select 1 from public.sales s where s.id = sale_id));
create policy product_histories_read on public.product_histories for select to authenticated
  using (public.has_permission(store_id, 'products.manage'));

create policy cash_sessions_read on public.cash_sessions for select to authenticated
  using (public.is_member(store_id) and (opened_by = auth.uid() or public.has_permission(store_id, 'cash.view_all')));
create policy cash_movements_read on public.cash_movements for select to authenticated
  using (exists (select 1 from public.cash_sessions c where c.id = cash_session_id));

-- Column-level guards on top of RLS: identity columns and stock are not directly writable.
revoke update on public.stores, public.store_members, public.products from authenticated, anon;
grant update (name, deleted_at) on public.stores to authenticated;
grant update (role_id, display_name, deleted_at) on public.store_members to authenticated;
grant update (category_id, sku, name, price, min_stock, image, deleted_at) on public.products to authenticated;

-- ---------------------------------------------------------------------------
-- Functions (RPC). SECURITY DEFINER + explicit permission checks.
-- ---------------------------------------------------------------------------

-- Creates a store, makes the caller its owner and seeds two default roles.
create function public.create_store(p_name text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_store uuid;
  v_admin uuid;
  v_cashier uuid;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED' using errcode = '42501';
  end if;
  insert into public.stores (name, owner_id) values (trim(p_name), auth.uid()) returning id into v_store;

  insert into public.roles (store_id, name) values (v_store, 'Administrador') returning id into v_admin;
  insert into public.role_permissions (role_id, permission) select v_admin, key from public.permissions;

  insert into public.roles (store_id, name) values (v_store, 'Cajero') returning id into v_cashier;
  insert into public.role_permissions (role_id, permission) values
    (v_cashier, 'sales.create'), (v_cashier, 'customers.manage'), (v_cashier, 'payments.create'),
    (v_cashier, 'cash.open'), (v_cashier, 'cash.close'), (v_cashier, 'cash.movements');

  insert into public.store_members (store_id, user_id, role_id, is_owner)
  values (v_store, auth.uid(), v_admin, true);
  return v_store;
end $$;

-- Joins the caller to every store that invited their (verified) phone number.
create function public.accept_invitations() returns setof uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_phone text;
  v_inv public.invitations;
begin
  select regexp_replace(u.phone, '\D', '', 'g') into v_phone
  from auth.users u where u.id = auth.uid() and u.phone_confirmed_at is not null;
  if v_phone is null or v_phone = '' then
    return;
  end if;

  for v_inv in
    select * from public.invitations i
    where i.accepted_at is null and regexp_replace(i.phone, '\D', '', 'g') = v_phone
    for update
  loop
    insert into public.store_members (store_id, user_id, role_id, display_name)
    values (v_inv.store_id, auth.uid(), v_inv.role_id, v_inv.display_name)
    on conflict (store_id, user_id) do update
      set role_id = excluded.role_id, display_name = excluded.display_name, deleted_at = null
      where public.store_members.is_owner = false;
    update public.invitations set accepted_at = now() where id = v_inv.id;
    return next v_inv.store_id;
  end loop;
end $$;

create function public.open_cash_session(p_store uuid, p_opening_amount numeric) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
begin
  perform public.require_permission(p_store, 'cash.open');
  if exists (select 1 from public.cash_sessions where store_id = p_store and opened_by = auth.uid() and closed_at is null) then
    raise exception 'CASH_SESSION_ALREADY_OPEN';
  end if;
  insert into public.cash_sessions (store_id, opened_by, opening_amount)
  values (p_store, auth.uid(), round(p_opening_amount, 2)) returning id into v_id;
  return v_id;
end $$;

-- Caller's open session in a store, or an error. Used by sales/payments/movements.
create function public.current_cash_session(p_store uuid) returns uuid
language plpgsql stable security definer set search_path = '' as $$
declare
  v_id uuid;
begin
  select id into v_id from public.cash_sessions
  where store_id = p_store and opened_by = auth.uid() and closed_at is null;
  if v_id is null then
    raise exception 'CASH_SESSION_REQUIRED';
  end if;
  return v_id;
end $$;

create function public.add_cash_movement(p_store uuid, p_type text, p_amount numeric, p_reason text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_session uuid;
  v_id uuid;
begin
  perform public.require_permission(p_store, 'cash.movements');
  v_session := public.current_cash_session(p_store);
  insert into public.cash_movements (store_id, cash_session_id, type, amount, reason, created_by)
  values (p_store, v_session, p_type, round(p_amount, 2), trim(p_reason), auth.uid()) returning id into v_id;
  return v_id;
end $$;

-- Expected cash = opening + cash payments + cash in - cash out. Card/transfer are not counted.
create function public.cash_session_expected(p_session uuid) returns numeric
language sql stable security definer set search_path = '' as $$
  select s.opening_amount
    + coalesce((select sum(p.amount) from public.payments p where p.cash_session_id = s.id and p.method = 'cash'), 0)
    + coalesce((select sum(m.amount) from public.cash_movements m where m.cash_session_id = s.id and m.type = 'in'), 0)
    - coalesce((select sum(m.amount) from public.cash_movements m where m.cash_session_id = s.id and m.type = 'out'), 0)
  from public.cash_sessions s where s.id = p_session;
$$;

-- Closes the caller's own session, or anyone's with cash.view_all.
create function public.close_cash_session(p_session uuid, p_counted_amount numeric, p_note text default null) returns numeric
language plpgsql security definer set search_path = '' as $$
declare
  v_s public.cash_sessions;
  v_expected numeric;
begin
  select * into v_s from public.cash_sessions where id = p_session for update;
  if v_s.id is null or v_s.closed_at is not null then
    raise exception 'CASH_SESSION_NOT_OPEN';
  end if;
  perform public.require_permission(v_s.store_id, 'cash.close');
  if v_s.opened_by <> auth.uid() then
    perform public.require_permission(v_s.store_id, 'cash.view_all');
  end if;
  if p_counted_amount is null or p_counted_amount < 0 then
    raise exception 'INVALID_AMOUNT';
  end if;
  v_expected := public.cash_session_expected(p_session);
  update public.cash_sessions set
    closed_by = auth.uid(), closed_at = now(),
    counted_amount = round(p_counted_amount, 2),
    expected_amount = v_expected,
    difference = round(p_counted_amount, 2) - v_expected,
    note = p_note
  where id = p_session;
  return round(p_counted_amount, 2) - v_expected;
end $$;

-- p_items: [{"product_id": uuid, "quantity": int}, ...]
-- Locks the products, validates stock, then writes sale + items + stock + history + payment atomically.
create function public.create_sale(
  p_store uuid,
  p_items jsonb,
  p_status text default 'paid',
  p_customer uuid default null,
  p_received numeric default null,
  p_method text default 'cash',
  p_note text default null
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_session uuid;
  v_sale uuid;
  v_total numeric(12, 2) := 0;
  v_lines jsonb;
  v_line record;
begin
  perform public.require_permission(p_store, 'sales.create');
  v_session := public.current_cash_session(p_store);

  if p_status not in ('paid', 'debt') then
    raise exception 'INVALID_STATUS';
  end if;
  if p_status = 'debt' and not exists (
    select 1 from public.customers where id = p_customer and store_id = p_store and deleted_at is null
  ) then
    raise exception 'CUSTOMER_REQUIRED';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'EMPTY_SALE';
  end if;

  -- Merge duplicate lines.
  select jsonb_agg(jsonb_build_object('product_id', x.product_id, 'quantity', x.quantity)) into v_lines
  from (
    select (e->>'product_id')::uuid as product_id, sum((e->>'quantity')::int) as quantity
    from jsonb_array_elements(p_items) e
    group by 1
  ) x;

  if exists (select 1 from jsonb_to_recordset(v_lines) l(product_id uuid, quantity int) where l.quantity is null or l.quantity < 1) then
    raise exception 'INVALID_QUANTITY';
  end if;

  -- Lock in id order to avoid deadlocks between cashiers selling at the same time.
  perform 1 from public.products p
  where p.id in (select l.product_id from jsonb_to_recordset(v_lines) l(product_id uuid, quantity int))
  order by p.id for update;

  if (select count(*) from jsonb_to_recordset(v_lines) l(product_id uuid, quantity int)
        join public.products p on p.id = l.product_id and p.store_id = p_store and p.deleted_at is null)
     <> jsonb_array_length(v_lines) then
    raise exception 'PRODUCT_NOT_FOUND';
  end if;
  if exists (select 1 from jsonb_to_recordset(v_lines) l(product_id uuid, quantity int)
             join public.products p on p.id = l.product_id where l.quantity > p.stock) then
    raise exception 'INSUFFICIENT_STOCK';
  end if;

  select coalesce(sum(round(p.price * l.quantity, 2)), 0) into v_total
  from jsonb_to_recordset(v_lines) l(product_id uuid, quantity int) join public.products p on p.id = l.product_id;

  if p_status = 'paid' and p_method = 'cash' and coalesce(p_received, v_total) < v_total then
    raise exception 'INSUFFICIENT_PAYMENT';
  end if;

  insert into public.sales (store_id, customer_id, cash_session_id, total, change, status, note, created_by)
  values (
    p_store, p_customer, v_session, v_total,
    case when p_status = 'paid' and p_method = 'cash' then coalesce(p_received, v_total) - v_total else 0 end,
    p_status, nullif(trim(p_note), ''), auth.uid()
  ) returning id into v_sale;

  for v_line in
    select p.id, p.name, p.price, p.stock, l.quantity
    from jsonb_to_recordset(v_lines) l(product_id uuid, quantity int) join public.products p on p.id = l.product_id
  loop
    insert into public.sale_items (store_id, sale_id, product_id, product_name, price_at_sale, quantity, subtotal)
    values (p_store, v_sale, v_line.id, v_line.name, v_line.price, v_line.quantity, round(v_line.price * v_line.quantity, 2));
    update public.products set stock = stock - v_line.quantity where id = v_line.id;
    insert into public.product_histories (store_id, product_id, event_type, quantity_change, stock_before, stock_after, sale_id, created_by)
    values (p_store, v_line.id, 'sale', -v_line.quantity, v_line.stock, v_line.stock - v_line.quantity, v_sale, auth.uid());
  end loop;

  if p_status = 'paid' and v_total > 0 then
    insert into public.payments (store_id, sale_id, cash_session_id, amount, method, created_by)
    values (p_store, v_sale, v_session, v_total, p_method, auth.uid());
  end if;

  return v_sale;
end $$;

-- Payment on a debt; the sale becomes paid once fully covered. Returns the remaining balance.
create function public.add_payment(p_sale uuid, p_amount numeric, p_method text default 'cash') returns numeric
language plpgsql security definer set search_path = '' as $$
declare
  v_sale public.sales;
  v_remaining numeric;
begin
  select * into v_sale from public.sales where id = p_sale and deleted_at is null for update;
  if v_sale.id is null then
    raise exception 'SALE_NOT_FOUND';
  end if;
  perform public.require_permission(v_sale.store_id, 'payments.create');
  if v_sale.status <> 'debt' then
    raise exception 'SALE_NOT_IN_DEBT';
  end if;
  v_remaining := v_sale.total - coalesce((select sum(amount) from public.payments where sale_id = p_sale), 0);
  if p_amount is null or p_amount <= 0 or round(p_amount, 2) > v_remaining then
    raise exception 'INVALID_AMOUNT';
  end if;

  insert into public.payments (store_id, sale_id, cash_session_id, amount, method, created_by)
  values (v_sale.store_id, p_sale, public.current_cash_session(v_sale.store_id), round(p_amount, 2), p_method, auth.uid());

  v_remaining := v_remaining - round(p_amount, 2);
  if v_remaining <= 0 then
    update public.sales set status = 'paid' where id = p_sale;
  end if;
  return v_remaining;
end $$;

-- Manual stock adjustment with history (stock is not directly writable).
create function public.adjust_stock(p_product uuid, p_new_stock integer, p_note text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_p public.products;
begin
  select * into v_p from public.products where id = p_product and deleted_at is null for update;
  if v_p.id is null then
    raise exception 'PRODUCT_NOT_FOUND';
  end if;
  perform public.require_permission(v_p.store_id, 'products.manage');
  if p_new_stock is null or p_new_stock < 0 then
    raise exception 'INVALID_QUANTITY';
  end if;
  if p_new_stock = v_p.stock then
    return;
  end if;
  update public.products set stock = p_new_stock where id = p_product;
  insert into public.product_histories (store_id, product_id, event_type, quantity_change, stock_before, stock_after, note, created_by)
  values (v_p.store_id, p_product, 'stock_update', p_new_stock - v_p.stock, v_p.stock, p_new_stock, p_note, auth.uid());
end $$;

-- Permissions of the caller in a store (for the UI; RLS still enforces everything).
create function public.my_permissions(p_store uuid) returns setof text
language sql stable security definer set search_path = '' as $$
  select p.key from public.permissions p where public.has_permission(p_store, p.key);
$$;

-- Only signed-in users may call functions.
revoke execute on all functions in schema public from public, anon;
grant execute on all functions in schema public to authenticated;
