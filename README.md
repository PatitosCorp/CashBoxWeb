# CashBox Web

Punto de venta PWA para tiendas con administrador y empleados. Basado en CashBox (React Native).

## Stack

- Vite + React + TypeScript, PWA con `vite-plugin-pwa`
- Tailwind v4 con estilo Ant Design (`src/index.css`, `src/components/ui`)
- Supabase: Auth por SMS, Postgres con RLS y funciones (`supabase/`)
- `@tanstack/react-query`, `react-router`, i18next (es/en)

## Desarrollo

Requiere Node 22 (`nvm use` / `fnm use`).

```sh
npm install
cp .env.example .env.local   # llena VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY
npm run dev
```

Supabase local (requiere Docker):

```sh
npm run db:start   # imprime URL y anon key
npm run db:reset   # aplica supabase/migrations
npm run db:types   # genera src/lib/database.types.ts
```

En local, los teléfonos `+52 55 0000 0001` y `+52 55 0000 0002` reciben siempre el código `123456` (`supabase/config.toml`).

## Pruebas

```sh
npm test          # todo
npm run test:db   # migraciones + RLS + funciones en PGlite (sin Docker)
```

## Seguridad

- Los permisos se aplican en la base (RLS y funciones `SECURITY DEFINER`). Ocultar botones en la UI es solo comodidad.
- Ventas, abonos, stock y caja solo cambian mediante funciones; las tablas no aceptan escritura directa.
- Nunca pongas la `service_role` key en el frontend.
- En producción: activa CAPTCHA (Turnstile) y límites de SMS en Supabase para evitar abuso del envío de códigos.

## Ambientes

| Ambiente | Frontend | Base de datos | Migraciones |
|---|---|---|---|
| Local | `npm run dev` | Supabase local (Docker) | `npm run db:reset` |
| Staging | Vercel, rama `staging` | proyecto `cashbox-staging` | Action al hacer push a `staging` |
| Prod | Vercel, rama `main` | proyecto `cashbox` | Action al hacer push a `main` |

- Variables de Vercel: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (clave publishable/anon) y `VITE_TURNSTILE_SITE_KEY`. Production con los valores de `cashbox`; Preview acotadas a la rama `staging` con los de `cashbox-staging`. Vite las incrusta al compilar: si cambias una, redespliega.
- Secretos de GitHub (Settings > Secrets and variables > Actions): `SUPABASE_ACCESS_TOKEN`, `STAGING_PROJECT_REF`, `STAGING_DB_PASSWORD`, `PROD_PROJECT_REF`, `PROD_DB_PASSWORD`. Sin ellos la Action avisa y no aplica migraciones.
- Las migraciones solo avanzan: nunca edites una ya aplicada, agrega un archivo nuevo en `supabase/migrations`.
- Nunca pongas `service_role`/secret keys en Vercel ni en el repo.
- Flujo: feature en local, merge a `staging`, prueba en línea, merge a `main`.
