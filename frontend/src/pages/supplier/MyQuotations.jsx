import { useEffect, useState } from 'react'
import { myQuotations } from '../../api/supplierApi'
import AppLayout from '../../components/AppLayout'
import { StatusBadge } from '../../components/StatusBadge'
import { LoadingSpinner, EmptyState, ErrorAlert } from '../../components/Feedback'

export default function MyQuotations() {
  const [quotations, setQuotations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    myQuotations()
      .then(({ data }) => setQuotations(data))
      .catch(err => setError(err.response?.data?.error || 'Failed to load'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <p className="section-title mb-1">Supplier</p>
          <h1 className="page-title">My Quotations</h1>
        </div>

        {error && <ErrorAlert message={error} />}

        {loading ? <LoadingSpinner /> : quotations.length === 0 ? (
          <EmptyState message="No quotations submitted yet." />
        ) : (
          <div className="space-y-2">
            {quotations.map(q => (
              <div key={q.quotation_id} className="card hover:border-surface-600 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs text-slate-600">Q#{q.quotation_id}</span>
                      <span className="font-mono text-xs text-slate-600">· RFQ #{q.rfq_id}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-3 mt-2 text-xs font-mono">
                      <div>
                        <p className="text-slate-600 mb-0.5">Price</p>
                        <p className="text-amber-400 font-medium">₹{parseFloat(q.price).toLocaleString()}</p>
                      </div>
                      {q.delivery_time_days && (
                        <div>
                          <p className="text-slate-600 mb-0.5">Delivery</p>
                          <p className="text-slate-300">{q.delivery_time_days} days</p>
                        </div>
                      )}
                      <div>
                        <p className="text-slate-600 mb-0.5">Submitted</p>
                        <p className="text-slate-300">{new Date(q.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>
                  <StatusBadge status={q.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
