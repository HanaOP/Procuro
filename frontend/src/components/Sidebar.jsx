import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// ── Icons ─────────────────────────────────────────────────────────────────────
const icons = {
  dashboard:    '⊞',
  pending:      '⏳',
  highpriority: '🔴',
  approved:     '✅',
  rejected:     '✗',
  clarify:      '💬',
  exceptions:   '⚠️',
  ai:           '🤖',
  supplier:     '🏭',
  audit:        '🧾',
  newrequest:   '＋',
  requests:     '📋',
  drafts:       '📝',
  rfq:          '📤',
  quotations:   '📥',
  orders:       '📦',
  delivered:    '🚚',
  budget:       '💰',
  finance:      '💳',
  open:         '🔓',
  submit:       '📨',
  myquotes:     '📑',
}

const NAV_ITEMS = {
  EMPLOYEE: [
    { label: 'Dashboard',    path: '/employee',           icon: icons.dashboard },
    { label: 'New Request',  path: '/employee/new',       icon: icons.newrequest },
    { label: 'My Requests',  path: '/employee/requests',  icon: icons.requests },
    { label: 'Drafts',       path: '/employee/drafts',    icon: icons.drafts },
    { label: 'Rejected',     path: '/employee/rejected',  icon: icons.rejected },
  ],
  MANAGER: [
    { label: 'Dashboard',         path: '/manager',                    icon: icons.dashboard },
    { label: 'Pending',           path: '/manager/pending',            icon: icons.pending },
    { label: 'High Priority',     path: '/manager/high-priority',      icon: icons.highpriority },
    { label: 'Approved',          path: '/manager/approved',           icon: icons.approved },
    { label: 'Rejected',          path: '/manager/rejected',           icon: icons.rejected },
    { label: 'Clarifications',    path: '/manager/clarifications',     icon: icons.clarify },
    { label: 'Exceptions',        path: '/manager/exceptions',         icon: icons.exceptions },
    { label: 'Supplier Review',   path: '/manager/supplier-approvals', icon: icons.supplier },
    { label: 'Audit Trail',       path: '/manager/audit-trail',        icon: icons.audit },
    { label: 'AI Analysis',       path: '/manager/ai-dashboard',       icon: icons.ai },
  ],
  FINANCE: [
    { label: 'Dashboard',   path: '/finance',         icon: icons.dashboard },
    { label: 'Pending',     path: '/finance/pending', icon: icons.pending },
    { label: 'Manage Invoices', path: '/finance/invoices', icon: icons.finance },
    { label: 'Add Budget',  path: '/finance/budget',  icon: icons.budget },
  ],
  PROCUREMENT: [
    { label: 'Dashboard',         path: '/procurement',                        icon: icons.dashboard },
    { label: 'Approved PRs',      path: '/procurement/requests',               icon: icons.approved },
    { label: 'Send RFQ',          path: '/procurement/rfq',                    icon: icons.rfq },
    { label: 'View Quotations',   path: '/procurement/view-quotations',        icon: icons.quotations },
    { label: 'Supplier Review',   path: '/procurement/supplier-approvals',     icon: icons.supplier },
    { label: 'Mark Delivered',    path: '/procurement/orders',                 icon: icons.delivered },
  ],
  SUPPLIER: [
    { label: 'Dashboard',       path: '/supplier',             icon: icons.dashboard },
    { label: 'Open RFQs',       path: '/supplier/rfqs',        icon: icons.open },
    { label: 'My Quotations',   path: '/supplier/quotations',  icon: icons.myquotes },
  ],
}

const ROLE_LABELS = {
  EMPLOYEE:    'Employee',
  MANAGER:     'Manager',
  FINANCE:     'Finance',
  PROCUREMENT: 'Procurement',
  SUPPLIER:    'Supplier',
}

export default function Sidebar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  if (!user) return null

  const items = NAV_ITEMS[user.role] || []

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <aside className="w-56 bg-surface-900 border-r border-surface-700 flex flex-col h-screen sticky top-0 shrink-0">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-surface-700">
        <span className="font-mono text-amber-400 text-lg font-medium tracking-tight">PROCURO</span>
        <div className="mt-1">
          <span className="font-mono text-[10px] text-slate-600 tracking-widest uppercase">
            {ROLE_LABELS[user.role]}
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {items.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path.split('/').length === 2}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-2 text-sm transition-all duration-100 rounded-sm ${
                isActive
                  ? 'bg-amber-500/10 text-amber-400 border-l-2 border-amber-500 pl-[10px]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-surface-800 border-l-2 border-transparent pl-[10px]'
              }`
            }
          >
            <span className="text-base leading-none w-4 shrink-0">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* User footer */}
      <div className="px-4 py-4 border-t border-surface-700">
        <div className="mb-3">
          <p className="text-sm text-slate-300 font-medium truncate">{user.name}</p>
          <p className="text-xs text-slate-600 font-mono truncate">{user.email}</p>
        </div>
        <button
          onClick={handleLogout}
          className="w-full text-left text-xs font-mono text-slate-500 hover:text-red-400 transition-colors uppercase tracking-widest py-1"
        >
          Sign out
        </button>
      </div>
    </aside>
  )
}
