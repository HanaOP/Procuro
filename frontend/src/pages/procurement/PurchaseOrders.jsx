import { useState } from 'react'
import { markDelivered } from '../../api/procurementApi'
import AppLayout from '../../components/AppLayout'
import { ErrorAlert, SuccessAlert } from '../../components/Feedback'

export default function PurchaseOrders() {
  const [poId, setPoId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleMark = async e => {
    e.preventDefault()
    if (!poId) return
    setError(''); setLoading(true)
    try {
      await markDelivered(poId)
      setSuccess(`PO #${poId} marked as delivered. Request status updated to DELIVERED.`)
      setPoId('')
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to mark as delivered')
    } finally { setLoading(false) }
  }

  return (
    <AppLayout>
      <div className="space-y-6 max-w-md">
        <div>
          <p className="section-title mb-1">Procurement</p>
          <h1 className="page-title">Mark Purchase Order Delivered</h1>
        </div>

        <div className="card">
          <form onSubmit={handleMark} className="space-y-4">
            <div>
              <label className="label">Purchase Order ID *</label>
              <input type="number" value={poId} onChange={e => setPoId(e.target.value)}
                className="input-field" placeholder="e.g. 7" required />
            </div>

            {error && <ErrorAlert message={error} />}
            {success && <SuccessAlert message={success} />}

            <button type="submit" disabled={loading || !poId} className="btn-primary w-full">
              {loading ? 'Updating...' : 'Mark as Delivered'}
            </button>
          </form>
        </div>

        <div className="card bg-surface-800/50">
          <p className="section-title mb-2">How it works</p>
          <p className="text-xs text-slate-500 leading-relaxed">
            Once you confirm delivery, the Purchase Order status changes to DELIVERED and the linked Purchase Request
            is also updated. This closes the procurement cycle for that request.
          </p>
        </div>
      </div>
    </AppLayout>
  )
}
