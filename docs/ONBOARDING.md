# Guía para nuevos devs

Punto de venta PWA (Vite + React + TypeScript) con Supabase como backend. Esta guía te lleva de cero a tener el proyecto corriendo.

## 1. Requisitos

| Herramienta | Versión | Para qué |
|---|---|---|
| Node | 22 (`.nvmrc`) | todo. Con Node 18 los tests y el build fallan |
| Docker Desktop | reciente, abierto | Supabase local |
| Git y `gh` (GitHub CLI) | cualquiera | ramas y secretos |

El CLI de Supabase no se instala: se usa con `npx supabase` (versión del proyecto en `package.json`).

## 2. Arranque local

```sh
nvm use            # o: fnm use
npm install
npm run db:start   # primera vez descarga imágenes (varios minutos). Imprime URL y claves locales
npm run db:reset   # aplica supabase/migrations a la base local
cp .env.example .env.local
```

Edita `.env.local` con lo que imprimió `db:start`:

```
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=<Publishable key que imprime db:start>
```

Luego `npm run dev` (http://localhost:5173).

- **Login en local:** no se envía ningún SMS. Los teléfonos `+52 55 0000 0001` y `+52 55 0000 0002` reciben siempre el código `123456` (`supabase/config.toml`).
- **Studio local:** http://127.0.0.1:54323 (tablas, usuarios, SQL).
- **Correos locales:** http://127.0.0.1:54324.
- **Apagar:** `npx supabase stop`.

> El método de login está en revisión y puede cambiar; revisa el `CHANGELOG.md`.

## 3. Variables y configuraciones que debes pedir

No hay secretos en el repo. Pide al responsable del proyecto:

| Qué | Para qué | Cuándo |
|---|---|---|
| Acceso al repo (GitHub) | colaborar | siempre |
| Acceso a Vercel | ver deploys y variables | solo si vas a tocar despliegues |
| Acceso a los proyectos Supabase `cashbox-staging` y `cashbox` | ver datos y logs | solo si lo necesitas; para desarrollar basta con local |
| `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` de **staging** | probar contra staging | opcional |
| `VITE_TURNSTILE_SITE_KEY` | CAPTCHA | solo si pruebas contra un ambiente con CAPTCHA activo |

Reglas:
- Solo se usa la clave **publishable/anon**. Nunca la `service_role` ni la `secret key` en el frontend, en Vercel ni en el repo.
- `.env.local` está en `.gitignore`. No lo subas.
- Las contraseñas de la base y el token de Supabase solo viven en los secretos de GitHub.

## 4. Estructura

```
src/
  auth/         sesión (AuthProvider), tienda y permisos (StoreProvider, useCan)
  components/   ui/ = componentes estilo Ant Design sobre Tailwind
  hooks/        consultas con react-query (useGetX / useCreateX ...)
  layout/       AppLayout y nav.ts (menú filtrado por permisos)
  screens/      pantallas
  lib/          cliente de Supabase, formato, queryClient
  i18n/         es / en
supabase/
  migrations/   schema, RLS y funciones (fuente de verdad del backend)
  tests/        pruebas de la base con PGlite
  config.toml   configuración de Supabase local
```

## 5. Cosas que debes saber

- **Los permisos viven en la base.** RLS y funciones `SECURITY DEFINER` los aplican. `useCan()` solo oculta botones; no protege nada.
- **Ventas, abonos, stock y caja** solo cambian mediante funciones RPC (`create_sale`, `add_payment`, `adjust_stock`, `open_cash_session`...). Las tablas no aceptan escritura directa.
- **Para vender hace falta un turno de caja abierto** por empleado.
- **Online-first:** el service worker solo guarda la app, nunca datos de Supabase.
- **Estilos:** Tailwind v4 con los tokens de Ant Design en `src/index.css`. Usa los componentes de `src/components/ui`; no agregues `antd`.
- **Iconos:** `@ant-design/icons-svg` con el componente `Icon`.
- **Textos:** todo en `src/i18n/locales/{es,en}.json`, nada hardcodeado.
- **Borrado lógico:** las tablas usan `deleted_at`; filtra siempre `deleted_at is null`.
- **Cliente sin tipos:** hasta correr `npm run db:types` el cliente de Supabase no está tipado.

## 6. Migraciones

1. Crea un archivo nuevo: `npx supabase migration new nombre`.
2. `npm run db:reset` y revisa que aplique en Postgres real.
3. Agrega o ajusta pruebas en `supabase/tests/db.test.ts`.
4. **Nunca edites una migración ya aplicada**: agrega otra.

## 7. Pruebas y calidad

```sh
npm run lint
npm test          # todo, incluye la base en PGlite (no necesita Docker)
npm run build
```

La CI corre lo mismo en cada push y PR.

## 8. Flujo de ramas y ambientes

| Ambiente | Rama | Frontend | Base |
|---|---|---|---|
| Local | tu rama | `npm run dev` | Supabase local |
| Staging | `staging` | Vercel | `cashbox-staging` |
| Producción | `main` | Vercel | `cashbox` |

1. Rama de feature desde `main`, desarrolla y prueba en local.
2. Merge a `staging`: Vercel despliega y la CI aplica migraciones a `cashbox-staging`.
3. Prueba en línea. Si está bien, merge a `main`.

**Ojo:** un push a `main` aplica migraciones a **producción**. No hagas push directo a `main`.

## 9. Cambios grandes

Si cambias una pantalla o flujo nuevo, el schema, una dependencia nativa o la arquitectura, agrega una entrada al inicio de `CHANGELOG.md` (fecha y viñetas cortas en español). No registres arreglos menores.

## 10. Problemas frecuentes

| Síntoma | Causa y solución |
|---|---|
| `styleText` no existe / falla vitest o vite | usas Node 18. `nvm use` / `fnm use` |
| `Missing VITE_SUPABASE_URL` | falta `.env.local` |
| `Cannot connect to the Docker daemon` | abre Docker Desktop |
| `phone_provider_disabled` en local | revisa que `[auth.sms.twilio]` esté `enabled = true` en `supabase/config.toml` y reinicia con `npx supabase stop && npx supabase start` |
| Recargar `/history` da 404 en Vercel | falta `vercel.json` (ya existe: no lo borres) |
| La app no se actualiza | la PWA pide confirmación; acepta el aviso "Actualizar" |
