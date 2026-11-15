import { createContext, useContext, type ReactNode } from 'react'
import { useGetMyPermissions, type MyStore } from '../hooks/useStores'

type StoreState = { store: MyStore; permissions: Set<string> }
const StoreContext = createContext<StoreState | null>(null)

// shortcut: always the first store, add a store switcher when multi-store ships
export function StoreProvider({ store, children }: { store: MyStore; children: ReactNode }) {
  const { data = [] } = useGetMyPermissions(store.id)
  return <StoreContext.Provider value={{ store, permissions: new Set(data) }}>{children}</StoreContext.Provider>
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used inside StoreProvider')
  return ctx
}

// UI-only gate; the database (RLS + functions) is what actually enforces permissions.
export const useCan = (permission?: string) => {
  const { permissions } = useStore()
  return !permission || permissions.has(permission)
}
