const STATUS_STYLES = {
  DRAFT:                'bg-slate-800 text-slate-400 border-slate-700',
  PENDING_MANAGER:      'bg-amber-950/50 text-amber-400 border-amber-800/60',
  PENDING_FINANCE:      'bg-blue-950/50 text-blue-400 border-blue-800/60',
  PENDING_PROCUREMENT:  'bg-violet-950/50 text-violet-400 border-violet-800/60',
  RFQ_SENT:             'bg-cyan-950/50 text-cyan-400 border-cyan-800/60',
  SUPPLIER_SELECTED:    'bg-teal-950/50 text-teal-400 border-teal-800/60',
  DELIVERED:            'bg-green-950/50 text-green-400 border-green-800/60',
  REJECTED:             'bg-red-950/50 text-red-400 border-red-800/60',
  OPEN:                 'bg-green-950/50 text-green-400 border-green-800/60',
  SUBMITTED:            'bg-blue-950/50 text-blue-400 border-blue-800/60',
  ISSUED:               'bg-violet-950/50 text-violet-400 border-violet-800/60',
}

const PRIORITY_STYLES = {
  HIGH:   'bg-red-950/50 text-red-400 border-red-800/60',
  MEDIUM: 'bg-amber-950/50 text-amber-400 border-amber-800/60',
  LOW:    'bg-slate-800 text-slate-400 border-slate-700',
}

export function StatusBadge({ status }) {
  const style = STATUS_STYLES[status] || 'bg-surface-700 text-slate-400 border-surface-600'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-mono tracking-widest uppercase border ${style}`}>
      {status?.replace(/_/g, ' ')}
    </span>
  )
}

export function PriorityBadge({ priority }) {
  const style = PRIORITY_STYLES[priority] || 'bg-surface-700 text-slate-400 border-surface-600'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-mono tracking-widest uppercase border ${style}`}>
      {priority}
    </span>
  )
}
