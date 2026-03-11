import { useEffect, useState } from 'react'
import { getClarificationsList, approveRequest, rejectRequest } from '../../api/managerApi'
import AppLayout from '../../components/AppLayout'
import { LoadingSpinner, EmptyState, ErrorAlert } from '../../components/Feedback'

function ClarificationCard({ r, onAction }) {
  const [showReject, setShowReject] = useState(false)
  const [reason, setReason]         = useState('')
  const [err, setErr]               = useState('')
  const [loading, setLoading]       = useState(false)

  const qty     = parseFloat(r.quantity)
  const price   = parseFloat(r.estimated_unit_price)
  const total   = isNaN(qty) || isNaN(price) ? parseFloat(r.total_amount) : qty * price

  const doApprove = async () => {
    setLoading(true); setErr('')
    try { await approveRequest(r.pr_id); onAction() }
    catch (ex) { setErr(ex.response?.data?.error || 'Failed') }
    finally { setLoading(false) }
  }

  const doReject = async () => {
    if (!reason.trim()) { setErr('Rejection reason is required'); return }
    setLoading(true); setErr('')
    try { await rejectRequest(r.pr_id, { manager_comment: reason }); onAction() }
    catch (ex) { setErr(ex.response?.data?.error || 'Failed') }
    finally { setLoading(false) }
  }

  return (
    <div className="card space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-slate-500">#{r.pr_id}</span>
          <p className="text-sm font-medium text-slate-200">{r.item_name}</p>
        </div>
        <div className="flex items-center gap-3 text-xs font-mono text-slate-400">
          <span>{r.department}</span>
          <span>|</span>
          <span>Rs.{total.toLocaleString()}</span>
          <span>|</span>
          <span>{r.category}</span>
        </div>
      </div>

      {/* Clarification thread */}
      <div className="space-y-2">
        <div className="flex items-start gap-2 px-3 py-2 bg-amber-950/15 border border-amber-900/40">
          <span className="text-amber-400 text-xs font-mono shrink-0">Manager asked:</span>
          <p className="text-xs text-amber-300 font-mono">{r.clarification_message}</p>
        </div>

        {r.clarification_reply ? (
          <div className="flex items-start gap-2 px-3 py-2 bg-surface-800 border border-surface-600">
            <span className="text-slate-400 text-xs font-mono shrink-0">Employee replied:</span>
            <p className="text-xs text-slate-300 font-mono">{r.clarification_reply}</p>
          </div>
        ) : (
          <p className="text-xs text-slate-500 font-mono italic px-3 py-2 border border-surface-700">
            Awaiting employee reply...
          </p>
        )}
      </div>

      {/* Approve / Reject -- only show after reply received */}
      {r.clarification_reply && (
        <div className="space-y-2">
          {err && <p className="text-red-400 text-xs font-mono">{err}</p>}
          {!showReject ? (
            <div className="flex gap-2">
              <button onClick={doApprove} disabled={loading} className="btn-primary text-xs px-4 py-2">
                Approve &rarr; Finance
              </button>
              <button onClick={() => setShowReject(true)} className="btn-secondary text-xs px-4 py-2 border-red-800/50 text-red-400 hover:bg-red-950/40">
                Reject
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <label className="text-[10px] font-mono uppercase tracking-wider text-slate-500">Rejection Reason *</label>
              <textarea
                value={reason}
                onChange={e => setReason(e.target.value)}
                rows={2}
                className="input-field resize-none text-xs w-full"
                placeholder="Explain why this request is being rejected..."
              />
              <div className="flex gap-2">
                <button onClick={doReject} disabled={loading} className="btn-primary text-xs px-4 py-2 bg-red-900 hover:bg-red-800 border-red-700">
                  {loading ? 'Rejecting...' : 'Confirm Reject'}
                </button>
                <button onClick={() => { setShowReject(false); setErr('') }} className="btn-secondary text-xs px-4 py-2">
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function ManagerClarifications() {
  const [requests, setRequests] = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')

  const load = () => {
    setLoading(true)
    getClarificationsList()
      .then(({ data }) => setRequests(data))
      .catch(ex => setError(ex.response?.data?.error || 'Failed to load'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <p className="section-title mb-1">Manager</p>
          <h1 className="page-title">Clarifications</h1>
        </div>

        {error && <ErrorAlert message={error} />}

        {loading ? <LoadingSpinner /> : requests.length === 0 ? (
          <EmptyState message="No pending clarifications." />
        ) : (
          <div className="space-y-4">
            {requests.map(r => (
              <ClarificationCard key={r.pr_id} r={r} onAction={load} />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  )
}