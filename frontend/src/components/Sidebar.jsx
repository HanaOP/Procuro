import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const NAV_ITEMS = {
  EMPLOYEE: [
    { label: 'Dashboard',     path: '/employee' },
    { label: 'New Request',   path: '/employee/new' },
    { label: 'My Requests',   path: '/employee/requests' },
    { label: 'Drafts',        path: '/employee/drafts' },
    { label: 'Rejected',      path: '/employee/rejected' },
  ],
  MANAGER: [
    { label: 'Dashboard',     path: '/manager' },
    { label: 'Pending',       path: '/manager/pending' },
    { label: 'High Priority', path: '/manager/high-priority' },
    { label: 'Approved',      path: '/manager/approved' },
    { label: 'Rejected',      path: '/manager/rejected' },
    { label: 'Exceptions',    path: '/manager/exceptions' },
  ],
  FINANCE: [
    { label: 'Dashboard',     path: '/finance' },
    { label: 'Pending',       path: '/finance/pending' },
    { label: 'Add Budget',    path: '/finance/budget' },
  ],
  PROCUREMENT: [
    { label: 'Dashboard',       path: '/procurement' },
    { label: 'Approved PRs',    path: '/procurement/requests' },
    { label: 'Send RFQ',        path: '/procurement/rfq' },
    { label: 'Mark Delivered',  path: '/procurement/orders' },
  ],
  SUPPLIER: [
    { label: 'Dashboard',       path: '/supplier' },
    { label: 'Open RFQs',       path: '/supplier/rfqs' },
    { label: 'Submit Quotation', path: '/supplier/quote' },
    { label: 'My Quotations',   path: '/supplier/quotations' },
  ],
}

const ROLE_LABELS = {
  EMPLOYEE: 'Employee',
  MANAGER: 'Manager',
  FINANCE: 'Finance',
  PROCUREMENT: 'Procurement',
  SUPPLIER: 'Supplier',
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
          <span className="font-mono text-[10px] text-slate-600 tracking-widest uppercase">{ROLE_LABELS[user.role]}</span>
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
              `flex items-center gap-2.5 px-3 py-2 text-sm transition-all duration-100 ${
                isActive
                  ? 'bg-amber-500/10 text-amber-400 border-l-2 border-amber-500 pl-[10px]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-surface-800 border-l-2 border-transparent pl-[10px]'
              }`
            }
          >
            {item.label}
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
