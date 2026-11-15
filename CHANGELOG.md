# Changelog

Registro de cambios grandes (arquitectura, dependencias, pantallas, modelo de datos).
Lo más reciente va arriba.

## 2026-11-15 - Ambientes y CI

- Tres ambientes: local (Docker), staging (rama `staging`) y prod (`main`), cada uno con su proyecto de Supabase.
- GitHub Action: lint, tests y build en cada push; aplica migraciones a Supabase según la rama.
- `vercel.json` con rewrite para las rutas de la SPA.
- Supabase local con Docker verificado: las migraciones aplican en Postgres real (15 tablas, 29 políticas, 15 funciones) y el login con código de prueba, `create_store` y RLS responden bien.
- Node 22 requerido (`.nvmrc`, `engines`).

## 2026-11-15 - Proyecto inicial

- PWA con Vite + React + TypeScript (`vite-plugin-pwa`, actualización con aviso, solo cachea la app, no los datos).
- Tailwind v4 con los tokens de Ant Design v5 y componentes propios: Button, Input, Checkbox, Field, Tag, Modal, Alert, Card, Icon (`@ant-design/icons-svg`). Fuente Rubik.
- Supabase como backend (online-first): login con código por SMS, CAPTCHA opcional con Cloudflare Turnstile.
- Schema inicial (`supabase/migrations`): tiendas, roles y permisos, miembros, invitaciones por teléfono, catálogo, clientes, ventas, abonos, historial de stock, turnos y movimientos de caja. `store_id` en todas las tablas.
- RLS en todas las tablas y funciones `create_store`, `accept_invitations`, `create_sale`, `add_payment`, `adjust_stock`, `open_cash_session`, `add_cash_movement`, `close_cash_session`, `my_permissions`.
- Pruebas de la base con PGlite (`npm run test:db`).
- Dashboard único con menú filtrado por permisos; las secciones aún son placeholders.
