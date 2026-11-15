import LogoutOutlined from '@ant-design/icons-svg/es/asn/LogoutOutlined'
import MenuOutlined from '@ant-design/icons-svg/es/asn/MenuOutlined'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { NavLink, Outlet } from 'react-router'
import { useStore } from '../auth/StoreProvider'
import { Button, Icon } from '../components/ui'
import { supabase } from '../lib/supabase'
import { NAV } from './nav'

// antd Layout with a dark Sider: fixed on desktop, drawer on mobile.
export function AppLayout() {
  const { t } = useTranslation()
  const { store, permissions } = useStore()
  const [open, setOpen] = useState(false)
  const items = NAV.filter(i => !i.permission || permissions.has(i.permission))

  const sider = (
    <nav aria-label="Menu" className="flex h-full w-[220px] flex-col bg-[#001529] text-white/65">
      <div className="truncate px-6 py-5 text-base font-semibold text-white">{store.name}</div>
      <ul className="flex flex-1 flex-col gap-1 px-2">
        {items.map(i => (
          <li key={i.path}>
            <NavLink
              to={i.path}
              end
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex h-10 items-center gap-2.5 rounded-lg px-4 transition-colors ${isActive ? 'bg-primary text-white' : 'hover:text-white'}`
              }
            >
              <Icon icon={i.icon} />
              {t(i.label)}
            </NavLink>
          </li>
        ))}
      </ul>
      <button type="button" onClick={() => supabase.auth.signOut()} className="m-2 flex h-10 items-center gap-2.5 rounded-lg px-4 hover:text-white">
        <Icon icon={LogoutOutlined} />
        {t('common.logout')}
      </button>
    </nav>
  )

  return (
    <div className="flex h-full">
      <aside className="hidden lg:block">{sider}</aside>
      {open ? (
        <div className="fixed inset-0 z-40 flex lg:hidden">
          {sider}
          <button type="button" aria-label="Cerrar menú" className="flex-1 bg-mask" onClick={() => setOpen(false)} />
        </div>
      ) : null}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center gap-3 border-b border-split bg-white px-4 lg:hidden">
          <Button variant="text" icon={MenuOutlined} aria-label="Menu" onClick={() => setOpen(true)} />
          <span className="font-semibold">{store.name}</span>
        </header>
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
