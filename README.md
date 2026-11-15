# CashBox Web

Punto de venta PWA para tiendas con administrador y empleados. Basado en CashBox (React Native).

## Stack

- Vite + React + TypeScript, PWA con `vite-plugin-pwa`
- Tailwind v4 con estilo Ant Design (`src/index.css`, `src/components/ui`)
- Supabase: Auth por SMS, Postgres con RLS y funciones (`supabase/`)
- `@tanstack/react-query`, `react-router`, i18next (es/en)

## Desarrollo

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
