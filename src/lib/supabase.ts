import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
if (!url || !anonKey) throw new Error('Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY (see .env.example)')

// shortcut: untyped client, upgrade with `npm run db:types` once a Supabase instance is running
export const supabase = createClient(url, anonKey)

// Postgres functions raise codes like 'INSUFFICIENT_STOCK'; surface them as Error.message.
export function rpcError(error: { message: string } | null) {
  if (error) throw new Error(error.message.split(':')[0].trim())
}
