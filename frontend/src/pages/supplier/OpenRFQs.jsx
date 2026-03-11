import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { viewOpenRFQs } from '../../api/supplierApi'
import AppLayout from '../../components/AppLayout'
import { LoadingSpinner, EmptyState, ErrorAlert } from '../../components/Feedback'

export default function OpenRFQs() {
  const [rfqs, setRfqs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    viewOpenRFQs()
      .then(({ data }) => setRfqs(data))
      .catch(err => setError(err.response?.data?.error || 'Failed to load'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <p className="section-title mb-1">Supplier</p>
          <h1 className="page-title">Open Requests for Quotation</h1>
        </div>

        {error && <ErrorAlert message={error} />}

        {loading ? <LoadingSpinner /> : rfqs.length === 0 ? (
          <EmptyState message="No open RFQs at the moment." />
        ) : (
          <div className="space-y-3">
            {rfqs.map(rfq => (
              <div key={rfq.rfq_id} className="card hover:border-amber-800/40 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs text-slate-600">RFQ #{rfq.rfq_id}</span>
                      <span className="font-mono text-[10px] text-green-400 uppercase tracking-widest bg-green-950/30 border border-green-800/40 px-1.5 py-0.5">Open</span>
                    </div>
                    {rfq.PurchaseRequest && (
                      <>
                        <p className="text-sm font-medium text-slate-200">{rfq.PurchaseRequest.item_name}</p>
                        <p className="text-xs text-slate-500 font-mono mt-0.5">
                          {rfq.PurchaseRequest.department} · {rfq.PurchaseRequest.quantity} units · {rfq.PurchaseRequest.category}
                        </p>
                        {rfq.PurchaseRequest.item_details && (
                          <p className="text-xs text-slate-500 mt-1">{rfq.PurchaseRequest.item_details}</p>
                        )}
                      </>
                    )}
                    <p className="text-xs text-amber-500 font-mono mt-2">
                      Deadline: {new Date(rfq.deadline).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={() => navigate(`/supplier/rfqs/${rfq.rfq_id}/quote`)}
                    className="btn-primary text-xs px-4 py-2 shrink-0">
                    Submit Quote
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
