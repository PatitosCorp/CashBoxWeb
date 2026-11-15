import type { IconDefinition } from '@ant-design/icons-svg/lib/types'
import AppstoreOutlined from '@ant-design/icons-svg/es/asn/AppstoreOutlined'
import DollarOutlined from '@ant-design/icons-svg/es/asn/DollarOutlined'
import HistoryOutlined from '@ant-design/icons-svg/es/asn/HistoryOutlined'
import SafetyOutlined from '@ant-design/icons-svg/es/asn/SafetyOutlined'
import SettingOutlined from '@ant-design/icons-svg/es/asn/SettingOutlined'
import ShopOutlined from '@ant-design/icons-svg/es/asn/ShopOutlined'
import TagsOutlined from '@ant-design/icons-svg/es/asn/TagsOutlined'
import TeamOutlined from '@ant-design/icons-svg/es/asn/TeamOutlined'
import UserOutlined from '@ant-design/icons-svg/es/asn/UserOutlined'

// One dashboard for everyone; each entry shows only with its permission (undefined = any member).
export type NavItem = { path: string; label: string; icon: IconDefinition; permission?: string }

export const NAV: NavItem[] = [
  { path: '/', label: 'menu.sales', icon: ShopOutlined, permission: 'sales.create' },
  { path: '/history', label: 'menu.history', icon: HistoryOutlined },
  { path: '/cash', label: 'menu.cash', icon: DollarOutlined, permission: 'cash.open' },
  { path: '/products', label: 'menu.products', icon: AppstoreOutlined, permission: 'products.manage' },
  { path: '/categories', label: 'menu.categories', icon: TagsOutlined, permission: 'categories.manage' },
  { path: '/customers', label: 'menu.customers', icon: UserOutlined, permission: 'customers.manage' },
  { path: '/employees', label: 'menu.employees', icon: TeamOutlined, permission: 'employees.manage' },
  { path: '/roles', label: 'menu.roles', icon: SafetyOutlined, permission: 'roles.manage' },
  { path: '/settings', label: 'menu.settings', icon: SettingOutlined, permission: 'store.manage' },
]
