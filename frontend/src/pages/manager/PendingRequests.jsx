import { useEffect, useState } from 'react'
import { getPendingRequests, approveRequest, rejectRequest, clarifyRequest } from '../../api/managerApi'
import AppLayout from '../../components/AppLayout'
import { StatusBadge, PriorityBadge } from '../../components/StatusBadge'
import { LoadingSpinner, EmptyState, ErrorAlert, SuccessAlert } from '../../components/Feedback'

function RequestCard({ r, onAction }) {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState(null) // 'reject' | 'clarify'
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  const handleApprove = async () => {
    setLoading(true); setErr('')
    try { await approveRequest(r.pr_id); onAction() }
    catch (e) { setErr(e.response?.data?.error || 'Failed') }
    finally { setLoading(false) }
  }

  const handleReject = async () => {
    setLoading(true); setErr('')
    try { await rejectRequest(r.pr_id, { manager_comment: text }); onAction() }
    catch (e) { setErr(e.response?.data?.error || 'Failed') }
    finally { setLoading(false) }
  }

  const handleClarify = async () => {
    if (!text.trim()) { setErr('Message required'); return }
    setLoading(true); setErr('')
    try { await clarifyRequest(r.pr_id, { message: text }); onAction() }
    catch (e) { setErr(e.response?.data?.error || 'Failed') }
    finally { setLoading(false) }
  }

  return (
    <div className="card space-y-3">
      <div className="flex items-start justify-between gap-4 cursor-pointer" onClick={() => setOpen(!open)}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-xs text-slate-600">#{r.pr_id}</span>
            <PriorityBadge priority={r.priority} />
            <StatusBadge status={r.status} />
          </div>
          <p className="text-sm font-medium text-slate-200">{r.item_name}</p>
          <p className="text-xs text-slate-500 font-mono mt-0.5">
            {r.department} · {r.quantity} units · ₹{parseFloat(r.total_amount).toLocaleString()} · Due {new Date(r.required_by).toLocaleDateString()}
          </p>
        </div>
        <span className="text-slate-600 text-sm mt-0.5">{open ? '▲' : '▼'}</span>
      </div>

      {open && (
        <div className="border-t border-surface-700 pt-3 space-y-3 animate-fade-in">
          {r.item_details && (
            <div>
              <p className="section-title mb-1">Details</p>
              <p className="text-xs text-slate-400">{r.item_details}</p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3 text-xs font-mono">
            <div className="bg-surface-800 px-3 py-2">
              <p className="text-slate-600 mb-0.5">Category</p>
              <p className="text-slate-300">{r.category}</p>
            </div>
            <div className="bg-surface-800 px-3 py-2">
              <p className="text-slate-600 mb-0.5">Unit Price</p>
              <p className="text-slate-300">₹{parseFloat(r.estimated_unit_price).toLocaleString()}</p>
            </div>
          </div>

          {r.document_path && (
            <a
              href={`/uploads/${r.document_path.split(/[\\/]/).pop()}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3 py-2 bg-surface-800 border border-surface-600 hover:border-amber-500 text-xs font-mono text-amber-400 hover:text-amber-300 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              View Supporting Document (PDF)
            </a>
          )}

          {/* Show clarification thread if sent */}
          {r.clarification_message && (
            <div className="space-y-2">
              <div className="flex items-start gap-2 px-3 py-2 bg-amber-950/15 border border-amber-900/40">
                <span className="text-amber-400 text-xs font-mono shrink-0">⚠ Clarification sent:</span>
                <p className="text-xs text-amber-300 font-mono">{r.clarification_message}</p>
              </div>
              {r.clarification_reply ? (
                <div className="flex items-start gap-2 px-3 py-2 bg-surface-800 border border-surface-600">
                  <span className="text-emerald-400 text-xs font-mono shrink-0">↩ Employee reply:</span>
                  <p className="text-xs text-slate-300 font-mono">{r.clarification_reply}</p>
                </div>
              ) : (
                <p className="text-xs text-slate-500 font-mono">Waiting for employee reply...</p>
              )}
            </div>
          )}

          {err && <ErrorAlert message={err} />}

          {/* Action buttons — hide clarify if clarification already sent */}
          {!mode && (
            <div className="flex gap-2 flex-wrap">
              <button onClick={handleApprove} disabled={loading} className="btn-primary text-xs px-4 py-2">
                ✓ Approve → Finance
              </button>
              <button onClick={() => setMode('reject')} className="btn-danger text-xs px-4 py-2">
                ✕ Reject
              </button>
              {!r.clarification_message && (
                <button onClick={() => setMode('clarify')} className="btn-secondary text-xs px-4 py-2">
                  ? Request Clarification
                </button>
              )}
            </div>
          )}

          {mode === 'reject' && (
            <div className="space-y-2 animate-fade-in">
              <label className="label">Rejection Reason *</label>
              <textarea value={text} onChange={e => setText(e.target.value)}
                className="input-field resize-none" rows={2} placeholder="Explain why this request is being rejected..." />
              <div className="flex gap-2">
                <button onClick={() => {
                  if (!text.trim()) { setErr('A rejection reason is required'); return; }
                  handleReject();
                }} disabled={loading} className="btn-danger text-xs px-4 py-2">
                  {loading ? 'Rejecting...' : 'Confirm Reject'}
                </button>
                <button onClick={() => { setMode(null); setText(''); setErr('') }} className="btn-secondary text-xs px-4 py-2">Cancel</button>
              </div>
            </div>
          )}

          {mode === 'clarify' && (
            <div className="space-y-2 animate-fade-in">
              <label className="label">Clarification Message *</label>
              <textarea value={text} onChange={e => setText(e.target.value)}
                className="input-field resize-none" rows={2} placeholder="What do you need clarified?" />
              <div className="flex gap-2">
                <button onClick={handleClarify} disabled={loading} className="btn-primary text-xs px-4 py-2">
                  {loading ? 'Sending...' : 'Send Message'}
                </button>
                <button onClick={() => { setMode(null); setText('') }} className="btn-secondary text-xs px-4 py-2">Cancel</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function ManagerPending() {
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

  const handleAction = () => {
    setToast('Action completed.')
    setTimeout(() => setToast(''), 3000)
    load()
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="section-title mb-1">Manager</p>
            <h1 className="page-title">Pending Requests</h1>
          </div>
          <span className="font-mono text-xs text-slate-500">{requests.length} pending</span>
        </div>

        {toast && <SuccessAlert message={toast} />}
        {error && <ErrorAlert message={error} />}

        {loading ? <LoadingSpinner /> : requests.length === 0 ? (
          <EmptyState message="No pending requests." />
        ) : (
          <div className="space-y-2">
            {requests.map(r => <RequestCard key={r.pr_id} r={r} onAction={handleAction} />)}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
