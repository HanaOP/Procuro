export function LoadingSpinner({ label = 'Loading...' }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      <span className="font-mono text-xs text-slate-500 tracking-widest uppercase">{label}</span>
    </div>
  )
}

export function ErrorAlert({ message }) {
  if (!message) return null
  return (
    <div className="border border-red-800/60 bg-red-950/20 px-4 py-3 text-sm text-red-400 font-mono">
      ✕ {message}
    </div>
  )
}

export function SuccessAlert({ message }) {
  if (!message) return null
  return (
    <div className="border border-green-800/60 bg-green-950/20 px-4 py-3 text-sm text-green-400 font-mono">
      ✓ {message}
    </div>
  )
}

export function EmptyState({ message = 'No records found.' }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-2">
      <span className="font-mono text-xs text-slate-600 tracking-widest uppercase">{message}</span>
    </div>
  )
}
