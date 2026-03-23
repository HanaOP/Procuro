import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { viewQuotations, selectSupplier } from '../../api/procurementApi'
import AppLayout from '../../components/AppLayout'
import { LoadingSpinner, EmptyState, ErrorAlert, SuccessAlert } from '../../components/Feedback'

export default function ViewQuotations() {
  const { rfq_id } = useParams()
  const navigate   = useNavigate()
  const [quotations, setQuotations] = useState([])
  const [loading, setLoading]       = useState(true)
  const [selecting, setSelecting]   = useState(null)
  const [error, setError]           = useState('')
  const [success, setSuccess]       = useState('')

  useEffect(() => {
    viewQuotations(rfq_id)
      .then(({ data }) => setQuotations(data))
      .catch(err => setError(err.response?.data?.error || 'Failed to load'))
      .finally(() => setLoading(false))
  }, [rfq_id])

  const handleSelect = async (quotation_id) => {
    setSelecting(quotation_id); setError('')
    try {
      await selectSupplier(quotation_id)
      setSuccess('Supplier selection sent to manager for review. Manager has 5 minutes to raise an objection.')
      setTimeout(() => navigate('/procurement/supplier-approvals'), 2500)
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to select supplier')
    } finally { setSelecting(null) }
  }

  const minPrice = quotations.length > 0
    ? Math.min(...quotations.map(q => parseFloat(q.price)))
    : null

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <p className="section-title mb-1">Procurement · RFQ #{rfq_id}</p>
          <h1 className="page-title">Supplier Quotations</h1>
          <p className="text-xs text-slate-500 mt-1">
            Select a supplier to send for manager review. Manager has 5 minutes to raise an objection.
          </p>
        </div>

        {error   && <ErrorAlert message={error} />}
        {success && <SuccessAlert message={success} />}

        {loading ? <LoadingSpinner /> : quotations.length === 0 ? (
          <EmptyState message="No quotations submitted yet. Suppliers haven't responded to this RFQ." />
        ) : (
          <div className="space-y-3">
            {quotations
              .sort((a, b) => parseFloat(a.price) - parseFloat(b.price))
              .map(q => {
                const isCheapest = parseFloat(q.price) === minPrice
                return (
                  <div key={q.quotation_id}
                    className={`card space-y-3 ${isCheapest ? 'border-green-800/50' : ''}`}>

                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-xs text-slate-600">Q#{q.quotation_id}</span>
                          {isCheapest && (
                            <span className="font-mono text-[10px] text-green-400 uppercase tracking-widest bg-green-950/30 border border-green-800/40 px-1.5 py-0.5">
                              Lowest Price
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 font-mono">
                          Supplier: {q.User?.name || `ID ${q.supplier_id}`} · Submitted {new Date(q.submitted_at).toLocaleDateString()}
                        </p>
                        {q.delivery_time && (
                          <p className="text-xs text-slate-500 font-mono mt-0.5">
                            Delivery: {q.delivery_time}
                          </p>
                        )}
                        {q.terms && (
                          <p className="text-xs text-slate-500 mt-1">Terms: {q.terms}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-mono text-xl font-medium text-amber-400">
                          ₹{parseFloat(q.price).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    {/* Contract document download link */}
                    {q.contract_document && (
                      <div className="px-3 py-2 bg-slate-800/50 border border-slate-700 rounded text-xs font-mono text-slate-400 flex items-center gap-2">
                        <span>📄</span>
                        <a
                          href={`/uploads/${q.contract_document}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-amber-400 hover:text-amber-300 underline"
                        >
                          View Contract Document
                        </a>
                      </div>
                    )}

                    <button
                      onClick={() => handleSelect(q.quotation_id)}
                      disabled={!!selecting}
                      className="btn-primary text-xs px-4 py-2 w-full"
                    >
                      {selecting === q.quotation_id
                        ? 'Sending to manager...'
                        : '✔ Select This Supplier → Send to Manager'}
                    </button>
                  </div>
                )
              })}
          </div>
        )}
      </div>
    </AppLayout>
  )
}