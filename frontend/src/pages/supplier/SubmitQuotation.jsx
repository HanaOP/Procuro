import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { submitQuotation } from '../../api/supplierApi'
import AppLayout from '../../components/AppLayout'
import { ErrorAlert, SuccessAlert } from '../../components/Feedback'

export default function SubmitQuotation() {
  const { rfq_id } = useParams()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    rfq_id: rfq_id || '',
    price: '',
    delivery_time_days: '',
    contract_document: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleChange = e => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))

  const handleSubmit = async e => {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      await submitQuotation({
        ...form,
        rfq_id: parseInt(form.rfq_id),
        price: parseFloat(form.price),
        delivery_time_days: form.delivery_time_days ? parseInt(form.delivery_time_days) : null,
      })
      setSuccess('Quotation submitted successfully!')
      setTimeout(() => navigate('/supplier/quotations'), 1800)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit quotation')
    } finally { setLoading(false) }
  }

  return (
    <AppLayout>
      <div className="space-y-6 max-w-md">
        <div>
          <p className="section-title mb-1">Supplier</p>
          <h1 className="page-title">Submit Quotation</h1>
          {rfq_id && <p className="text-sm text-slate-500 mt-1 font-mono">For RFQ #{rfq_id}</p>}
        </div>

        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">RFQ ID *</label>
              <input name="rfq_id" type="number" value={form.rfq_id} onChange={handleChange}
                className="input-field" placeholder="e.g. 3" required />
            </div>

            <div>
              <label className="label">Your Price (₹) *</label>
              <input name="price" type="number" min="0" step="0.01" value={form.price}
                onChange={handleChange} className="input-field" placeholder="e.g. 85000" required />
            </div>

            <div>
              <label className="label">Delivery Time (days)</label>
              <input name="delivery_time_days" type="number" min="1" value={form.delivery_time_days}
                onChange={handleChange} className="input-field" placeholder="e.g. 14" />
            </div>

            <div>
              <label className="label">Contract Document Reference</label>
              <input name="contract_document" value={form.contract_document} onChange={handleChange}
                className="input-field" placeholder="Document name or URL" />
            </div>

            {form.price && (
              <div className="px-4 py-3 bg-surface-800 border border-surface-600 flex justify-between">
                <span className="font-mono text-xs text-slate-500 uppercase tracking-wider">Quoted Price</span>
                <span className="font-mono text-amber-400 font-medium">₹{parseFloat(form.price || 0).toLocaleString()}</span>
              </div>
            )}

            {error && <ErrorAlert message={error} />}
            {success && <SuccessAlert message={success} />}

            <div className="flex gap-3">
              <button type="submit" disabled={loading} className="btn-primary">
                {loading ? 'Submitting...' : 'Submit Quotation'}
              </button>
              <button type="button" onClick={() => navigate('/supplier/rfqs')} className="btn-secondary">Cancel</button>
            </div>
          </form>
        </div>
      </div>
    </AppLayout>
  )
}
