import { useEffect, useState } from 'react'
import { getPendingRequests, approveRequest, rejectRequest } from '../../api/financeApi'
import AppLayout from '../../components/AppLayout'
import { PriorityBadge, StatusBadge } from '../../components/StatusBadge'
import { LoadingSpinner, EmptyState, ErrorAlert, SuccessAlert } from '../../components/Feedback'

function FinanceRequestCard({ r, onAction }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  const handleApprove = async () => {
    setLoading(true); setErr('')
    try { await approveRequest(r.pr_id); onAction('Approved and sent to Procurement.') }
    catch (e) { setErr(e.response?.data?.error || 'Failed') }
    finally { setLoading(false) }
  }

  const handleReject = async () => {
    setLoading(true); setErr('')
    try { await rejectRequest(r.pr_id); onAction('Request rejected.') }
    catch (e) { setErr(e.response?.data?.error || 'Failed') }
    finally { setLoading(false) }
  }

  return (
    <div className="card space-y-2">
      <div className="flex items-start justify-between gap-4 cursor-pointer" onClick={() => setOpen(!open)}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-xs text-slate-600">#{r.pr_id}</span>
            <PriorityBadge priority={r.priority} />
          </div>
          <p className="text-sm font-medium text-slate-200">{r.item_name}</p>
          <p className="text-xs text-slate-500 font-mono mt-0.5">
            {r.department} · {r.quantity} units · ₹{parseFloat(r.total_amount).toLocaleString()}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-amber-400 font-medium text-sm">₹{parseFloat(r.total_amount).toLocaleString()}</span>
          <span className="text-slate-600 text-sm">{open ? '▲' : '▼'}</span>
        </div>
      </div>

      {open && (
        <div className="border-t border-surface-700 pt-3 space-y-3 animate-fade-in">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono">
            <div className="bg-surface-800 px-3 py-2">
              <p className="text-slate-600 mb-0.5">Category</p>
              <p className="text-slate-300">{r.category}</p>
            </div>
            <div className="bg-surface-800 px-3 py-2">
              <p className="text-slate-600 mb-0.5">Unit Price</p>
              <p className="text-slate-300">₹{parseFloat(r.estimated_unit_price).toLocaleString()}</p>
            </div>
            <div className="bg-surface-800 px-3 py-2">
              <p className="text-slate-600 mb-0.5">Quantity</p>
              <p className="text-slate-300">{r.quantity}</p>
            </div>
            <div className="bg-surface-800 px-3 py-2">
              <p className="text-slate-600 mb-0.5">Required By</p>
              <p className="text-slate-300">{new Date(r.required_by).toLocaleDateString()}</p>
            </div>
          </div>
          {r.item_details && <p className="text-xs text-slate-400">{r.item_details}</p>}

          {err && <ErrorAlert message={err} />}

          <div className="flex gap-2">
            <button onClick={handleApprove} disabled={loading} className="btn-primary text-xs px-4 py-2">
              ✓ Approve Budget
            </button>
            <button onClick={handleReject} disabled={loading} className="btn-danger text-xs px-4 py-2">
              ✕ Reject
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function FinancePending() {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')

  const load = () => {
    setLoading(true)
    getPendingRequests()
      .then(({ data }) => setRequests(data))
      .catch(err => setError(err.response?.data?.error || 'Failed to load'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleAction = (msg) => {
    setToast(msg); setTimeout(() => setToast(''), 3000); load()
  }

  const totalPending = requests.reduce((sum, r) => sum + parseFloat(r.total_amount || 0), 0)

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="section-title mb-1">Finance</p>
            <h1 className="page-title">Pending Budget Approvals</h1>
          </div>
          {requests.length > 0 && (
            <div className="card text-right">
              <p className="section-title mb-0.5">Total Pending</p>
              <p className="font-mono text-amber-400 text-xl font-medium">₹{totalPending.toLocaleString()}</p>
            </div>
          )}
        </div>

        {toast && <SuccessAlert message={toast} />}
        {error && <ErrorAlert message={error} />}

        {loading ? <LoadingSpinner /> : requests.length === 0 ? (
          <EmptyState message="No requests awaiting finance approval." />
        ) : (
          <div className="space-y-2">
            {requests.map(r => <FinanceRequestCard key={r.pr_id} r={r} onAction={handleAction} />)}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
