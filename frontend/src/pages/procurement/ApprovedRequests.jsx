import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getApprovedRequests, sendRFQ } from '../../api/procurementApi'
import AppLayout from '../../components/AppLayout'
import { StatusBadge, PriorityBadge } from '../../components/StatusBadge'
import { LoadingSpinner, EmptyState, ErrorAlert, SuccessAlert } from '../../components/Feedback'

function PRCard({ r, onRFQSent }) {
  const [open, setOpen] = useState(false)
  const [deadline, setDeadline] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const navigate = useNavigate()

  const handleSendRFQ = async () => {
    if (!deadline) { setErr('Deadline is required'); return }
    setLoading(true); setErr('')
    try {
      const { data } = await sendRFQ({ pr_id: r.pr_id, deadline })
      onRFQSent(data.rfq?.rfq_id || data.rfq_id)
    } catch (e) { setErr(e.response?.data?.error || 'Failed') }
    finally { setLoading(false) }
  }

  return (
    <div className="card space-y-2">
      <div className="flex items-start justify-between gap-4 cursor-pointer" onClick={() => setOpen(!open)}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-xs text-slate-600">#{r.pr_id}</span>
            <PriorityBadge priority={r.priority} />
            <StatusBadge status={r.status} />
          </div>
          <p className="text-sm font-medium text-slate-200">{r.item_name}</p>
          <p className="text-xs text-slate-500 font-mono mt-0.5">
            {r.department} · {r.quantity} units · ₹{parseFloat(r.total_amount).toLocaleString()}
          </p>
        </div>
        <span className="text-slate-600 text-sm mt-0.5">{open ? '▲' : '▼'}</span>
      </div>

      {open && (
        <div className="border-t border-surface-700 pt-3 space-y-3 animate-fade-in">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs font-mono">
            <div className="bg-surface-800 px-3 py-2">
              <p className="text-slate-600 mb-0.5">Category</p>
              <p className="text-slate-300">{r.category}</p>
            </div>
            <div className="bg-surface-800 px-3 py-2">
              <p className="text-slate-600 mb-0.5">Required By</p>
              <p className="text-slate-300">{new Date(r.required_by).toLocaleDateString()}</p>
            </div>
            <div className="bg-surface-800 px-3 py-2">
              <p className="text-slate-600 mb-0.5">Delivery To</p>
              <p className="text-slate-300 truncate">{r.delivery_location}</p>
            </div>
          </div>

          {r.status === 'PENDING_PROCUREMENT' && (
            <div className="bg-surface-800 border border-surface-700 p-4 space-y-3">
              <p className="section-title">Send Request for Quotation (RFQ)</p>
              <div>
                <label className="label">Quotation Deadline *</label>
                <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)}
                  className="input-field"
                  min={new Date(Date.now() + 86400000).toISOString().split('T')[0]} />
              </div>
              {err && <ErrorAlert message={err} />}
              <button onClick={handleSendRFQ} disabled={loading} className="btn-primary text-xs px-4 py-2">
                {loading ? 'Sending...' : 'Send RFQ to Suppliers'}
              </button>
            </div>
          )}

          {r.status === 'RFQ_SENT' && (
            <div className="flex items-center justify-between bg-surface-800 border border-surface-700 px-4 py-3">
              <span className="font-mono text-xs text-cyan-400">RFQ sent — awaiting quotations</span>
              <button
                onClick={() => navigate(`/procurement/quotations/${r.pr_id}`)}
                className="btn-secondary text-xs px-3 py-1.5">
                View Quotations
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function ProcurementRequests() {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')

  const load = () => {
    setLoading(true)
    getApprovedRequests()
      .then(({ data }) => setRequests(data))
      .catch(err => setError(err.response?.data?.error || 'Failed to load'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleRFQSent = (rfqId) => {
    setToast(`RFQ #${rfqId} sent successfully. Suppliers can now submit quotations.`)
    setTimeout(() => setToast(''), 4000)
    load()
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <p className="section-title mb-1">Procurement</p>
          <h1 className="page-title">Finance-Approved Requests</h1>
        </div>

        {toast && <SuccessAlert message={toast} />}
        {error && <ErrorAlert message={error} />}

        {loading ? <LoadingSpinner /> : requests.length === 0 ? (
          <EmptyState message="No approved requests awaiting procurement." />
        ) : (
          <div className="space-y-2">
            {requests.map(r => <PRCard key={r.pr_id} r={r} onRFQSent={handleRFQSent} />)}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
