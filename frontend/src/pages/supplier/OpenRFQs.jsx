import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { viewOpenRFQs } from '../../api/supplierApi'
import AppLayout from '../../components/AppLayout'
import { LoadingSpinner, EmptyState, ErrorAlert } from '../../components/Feedback'

export default function OpenRFQs() {
  const [rfqs, setRfqs]     = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState('')
  const navigate            = useNavigate()

  useEffect(() => {
    viewOpenRFQs()
      .then(({ data }) => setRfqs(data))
      .catch(err => setError(err.response?.data?.error || 'Failed to load'))
      .finally(() => setLoading(false))
  }, [])

  const handleSubmitQuote = (rfq_id) => {
    // Navigate to Submit Quotation page with rfq_id pre-filled
    navigate(`/supplier/rfqs/${rfq_id}/quote`)
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <p className="section-title mb-1">Supplier</p>
          <h1 className="page-title">Open Requests for Quotation</h1>
          <p className="text-xs text-slate-500 mt-1">
            Click "Submit Quote" to go to the quotation form with the RFQ ID pre-filled.
          </p>
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
                      <span className="font-mono text-[10px] text-green-400 uppercase tracking-widest bg-green-950/30 border border-green-800/40 px-1.5 py-0.5">
                        Open
                      </span>
                    </div>

                    {rfq.PurchaseRequest && (
                      <>
                        <p className="text-sm font-medium text-slate-200">
                          {rfq.PurchaseRequest.item_name}
                        </p>
                        <p className="text-xs text-slate-500 font-mono mt-0.5">
                          {rfq.PurchaseRequest.department} · {rfq.PurchaseRequest.quantity} units · {rfq.PurchaseRequest.category}
                        </p>
                        {rfq.PurchaseRequest.item_details && (
                          <p className="text-xs text-slate-500 mt-1">
                            {rfq.PurchaseRequest.item_details}
                          </p>
                        )}
                      </>
                    )}

                    <p className="text-xs text-amber-500 font-mono mt-2">
                      Deadline: {new Date(rfq.deadline).toLocaleDateString()}
                    </p>

                    <p className="text-[11px] text-slate-500 font-mono mt-1">
                      Your quotations: {rfq.my_quotation_count ?? 0}/3
                      {' · '}
                      Remaining: {rfq.remaining_quotations ?? 3}
                    </p>
                  </div>

                  <button
                    onClick={() => handleSubmitQuote(rfq.rfq_id)}
                    disabled={rfq.quotation_limit_reached}
                    className="btn-primary text-xs px-4 py-2 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {rfq.quotation_limit_reached ? 'Limit Reached (3/3)' : 'Submit Quote →'}
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