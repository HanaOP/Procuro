import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getRequests, replyToClarification } from '../../api/employeeApi'
import AppLayout from '../../components/AppLayout'
import { LoadingSpinner, EmptyState, ErrorAlert } from '../../components/Feedback'

function statusLabel(r) {
  if (r.status === 'DRAFT')                    return { text: 'Draft',              cls: 'text-slate-400 border-slate-700 bg-slate-800/40' }
  if (r.status === 'REJECTED')                 return { text: 'Rejected',           cls: 'text-red-400 border-red-800/60 bg-red-950/50' }
  if (['DELIVERED','COMPLETED'].includes(r.status)) return { text: 'Delivered',     cls: 'text-emerald-400 border-emerald-800/60 bg-emerald-950/50' }
  if (r.clarification_message && !r.clarification_reply) return { text: 'Needs Clarification', cls: 'text-amber-400 border-amber-800/60 bg-amber-950/50' }
  return { text: 'Under Processing', cls: 'text-blue-400 border-blue-800/60 bg-blue-950/50' }
}

function ClarificationBox({ r, onReplied }) {
  const [reply, setReply] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  const send = async (e) => {
    e.stopPropagation()
    if (!reply.trim()) { setErr('Reply cannot be empty'); return }
    setLoading(true); setErr('')
    try {
      await replyToClarification(r.pr_id, { reply })
      onReplied()
    } catch (ex) {
      setErr(ex.response?.data?.error || 'Failed to send reply')
    } finally { setLoading(false) }
  }

  if (r.clarification_reply) {
    return (
      <div className="space-y-2">
        <div className="flex items-start gap-2 px-3 py-2 bg-amber-950/15 border border-amber-900/40">
          <span className="text-amber-400 text-xs font-mono shrink-0">Manager:</span>
          <p className="text-xs text-amber-300 font-mono">{r.clarification_message}</p>
        </div>
        <div className="flex items-start gap-2 px-3 py-2 bg-surface-800 border border-surface-600">
          <span className="text-slate-400 text-xs font-mono shrink-0">Your reply:</span>
          <p className="text-xs text-slate-300 font-mono">{r.clarification_reply}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2" onClick={e => e.stopPropagation()}>
      <div className="flex items-start gap-2 px-3 py-2 bg-amber-950/15 border border-amber-900/40">
        <span className="text-amber-400 text-xs font-mono shrink-0">Manager:</span>
        <p className="text-xs text-amber-300 font-mono">{r.clarification_message}</p>
      </div>
      <div className="space-y-1">
        <label className="text-[10px] font-mono uppercase tracking-wider text-slate-500">Your Reply *</label>
        <textarea
          value={reply}
          onChange={e => setReply(e.target.value)}
          rows={2}
          className="input-field resize-none text-xs w-full"
          placeholder="Reply to the manager's clarification..."
        />
        {err && <p className="text-red-400 text-xs font-mono">{err}</p>}
        <button onClick={send} disabled={loading} className="btn-primary text-xs px-4 py-2">
          {loading ? 'Sending...' : 'Send Reply'}
        </button>
      </div>
    </div>
  )
}

export default function MyRequests() {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expandedId, setExpandedId] = useState(null)
  const navigate = useNavigate()

  const load = () => {
    setLoading(true)
    getRequests()
      .then(({ data }) => setRequests(data))
      .catch(err => setError(err.response?.data?.error || 'Failed to load'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="section-title mb-1">Employee</p>
            <h1 className="page-title">My Requests</h1>
          </div>
          <button onClick={() => navigate('/employee/new')} className="btn-primary">+ New Request</button>
        </div>

        {error && <ErrorAlert message={error} />}

        {loading ? <LoadingSpinner /> : requests.length === 0 ? <EmptyState message="No requests found." /> : (
          <div className="space-y-3">
            {requests.map(r => {
              const expanded = expandedId === r.pr_id
              const badge = statusLabel(r)
              const filename = r.document_path ? r.document_path.split(/[\/\\]/).pop() : null
              const hasClarification = !!r.clarification_message
              return (
                <div
                  key={r.pr_id}
                  className={`card space-y-1 cursor-pointer transition-colors ${r.status === 'REJECTED' ? 'border-red-900/40' : hasClarification && !r.clarification_reply ? 'border-amber-900/40' : ''}`}
                  onClick={() => setExpandedId(expanded ? null : r.pr_id)}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono text-xs text-slate-500 shrink-0">#{r.pr_id}</span>
                      <p className="text-sm font-medium text-slate-200 truncate">{r.item_name}</p>
                      <span className={`font-mono text-[10px] uppercase tracking-widest px-2 py-0.5 border shrink-0 ${badge.cls}`}>
                        {badge.text}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="font-mono text-xs text-slate-500">{r.department}</span>
                      <span className="font-mono text-xs text-slate-500">Rs.{parseFloat(r.total_amount).toLocaleString()}</span>
                      <span className="font-mono text-xs text-slate-500">{new Date(r.created_at).toLocaleDateString()}</span>
                      <span className={`text-slate-500 text-xs transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}>v</span>
                    </div>
                  </div>

                  {expanded && (
                    <div className="mt-3 pt-3 border-t border-surface-700 space-y-3" onClick={e => e.stopPropagation()}>
                      <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-xs">
                        {r.item_details && (
                          <div className="col-span-2">
                            <span className="text-slate-500 font-mono uppercase text-[10px] tracking-wider">Description</span>
                            <p className="text-slate-300 mt-0.5">{r.item_details}</p>
                          </div>
                        )}
                        <div>
                          <span className="text-slate-500 font-mono uppercase text-[10px] tracking-wider">Category</span>
                          <p className="text-slate-300 mt-0.5">{r.category}</p>
                        </div>
                        <div>
                          <span className="text-slate-500 font-mono uppercase text-[10px] tracking-wider">Quantity</span>
                          <p className="text-slate-300 mt-0.5">{r.quantity}</p>
                        </div>
                        <div>
                          <span className="text-slate-500 font-mono uppercase text-[10px] tracking-wider">Unit Price</span>
                          <p className="text-slate-300 mt-0.5">Rs.{parseFloat(r.estimated_unit_price).toLocaleString()}</p>
                        </div>
                        <div>
                          <span className="text-slate-500 font-mono uppercase text-[10px] tracking-wider">Required By</span>
                          <p className="text-slate-300 mt-0.5">{new Date(r.required_by).toLocaleDateString()}</p>
                        </div>
                        {filename && (
                          <div className="col-span-2">
                            <span className="text-slate-500 font-mono uppercase text-[10px] tracking-wider">Document</span>
                            <a
                              href={`/uploads/${filename}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block mt-0.5 text-amber-400 hover:text-amber-300 underline text-xs font-mono"
                              onClick={e => e.stopPropagation()}
                            >
                              {filename}
                            </a>
                          </div>
                        )}
                      </div>

                      {hasClarification && (
                        <ClarificationBox r={r} onReplied={load} />
                      )}

                      {r.status === 'REJECTED' && r.manager_comment && (
                        <div className="flex items-start gap-2 px-3 py-2 bg-red-950/15 border border-red-900/40">
                          <span className="text-red-400 text-xs font-mono shrink-0">Reason:</span>
                          <p className="text-xs text-red-300 font-mono">{r.manager_comment}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </AppLayout>
  )
}