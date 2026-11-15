import { useTranslation } from 'react-i18next'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import { useAuth } from './auth/AuthProvider'
import { StoreProvider, useCan } from './auth/StoreProvider'
import { Spinner } from './components/ui'
import { useGetMyStores } from './hooks/useStores'
import { AppLayout } from './layout/AppLayout'
import { NAV, type NavItem } from './layout/nav'
import { ComingSoon } from './screens/ComingSoon'
import { CreateStoreScreen } from './screens/CreateStoreScreen'
import { LoginScreen } from './screens/LoginScreen'
import { PwaPrompt } from './components/PwaPrompt'

function Loading() {
  const { t } = useTranslation()
  return (
    <div role="status" className="flex h-full items-center justify-center gap-2 text-text-tertiary">
      <Spinner /> {t('common.loading')}
    </div>
  )
}

function Guarded({ item }: { item: NavItem }) {
  const { t } = useTranslation()
  const allowed = useCan(item.permission)
  if (!allowed) return <Navigate to="/history" replace />
  return <ComingSoon title={t(item.label)} />
}

// Auth gate -> store gate -> dashboard.
function Root() {
  const { session, loading } = useAuth()
  const stores = useGetMyStores()

  if (loading) return <Loading />
  if (!session) return <LoginScreen />
  if (stores.isLoading) return <Loading />
  if (!stores.data?.length) return <CreateStoreScreen />

  return (
    <StoreProvider store={stores.data[0]}>
      <Routes>
        <Route element={<AppLayout />}>
          {NAV.map(item => (
            <Route key={item.path} path={item.path} element={<Guarded item={item} />} />
          ))}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </StoreProvider>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Root />
      <PwaPrompt />
    </BrowserRouter>
  )
}
