import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import AppLayout from '../../components/AppLayout'
import { ErrorAlert, SuccessAlert } from '../../components/Feedback'
import api from '../../api/axiosInstance'

export default function SubmitQuotation() {
  const { rfq_id } = useParams()
  const navigate   = useNavigate()

  const [form, setForm] = useState({
    price:         '',
    delivery_time: '',
    terms:         '',
  })
  const [pdfFile, setPdfFile]   = useState(null)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [success, setSuccess]   = useState('')

  const handleChange = e =>
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))

  const handleFileChange = e => {
    const file = e.target.files[0]
    if (file && file.type !== 'application/pdf') {
      setError('Only PDF files are allowed for contract document')
      setPdfFile(null)
      return
    }
    setError('')
    setPdfFile(file || null)
  }

  const handleSubmit = async e => {
    e.preventDefault()
    if (!form.price) { setError('Price is required'); return }
    setError(''); setLoading(true)

    try {
      // Use FormData to support file upload
      const formData = new FormData()
      formData.append('rfq_id',        rfq_id)
      formData.append('price',         form.price)
      formData.append('delivery_time', form.delivery_time)
      formData.append('terms',         form.terms)
      if (pdfFile) {
        formData.append('contract_document', pdfFile)
      }

      await api.post('/supplier/quotation', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })

      setSuccess('Quotation submitted successfully!')
      setTimeout(() => navigate('/supplier/quotations'), 1800)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit quotation')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AppLayout>
      <div className="space-y-6 max-w-md">
        <div>
          <p className="section-title mb-1">Supplier</p>
          <h1 className="page-title">Submit Quotation</h1>
          {rfq_id && (
            <p className="text-sm text-slate-500 mt-1 font-mono">For RFQ #{rfq_id}</p>
          )}
          <p className="text-xs text-slate-500 mt-2">
            You can submit up to 3 quotations per request. Submission is blocked once an order is placed.
          </p>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* RFQ ID — auto-filled, readonly */}
            <div>
              <label className="label">RFQ ID</label>
              <input
                type="text"
                value={`RFQ #${rfq_id}`}
                readOnly
                className="input-field opacity-60 cursor-not-allowed"
              />
            </div>

            {/* Price */}
            <div>
              <label className="label">Your Price (₹) *</label>
              <input
                name="price"
                type="number"
                min="0"
                step="0.01"
                value={form.price}
                onChange={handleChange}
                className="input-field"
                placeholder="e.g. 85000"
                required
              />
            </div>

            {/* Delivery Time */}
            <div>
              <label className="label">Delivery Time</label>
              <input
                name="delivery_time"
                type="text"
                value={form.delivery_time}
                onChange={handleChange}
                className="input-field"
                placeholder="e.g. 14 days, 2 weeks"
              />
            </div>

            {/* Terms */}
            <div>
              <label className="label">Terms & Conditions</label>
              <textarea
                name="terms"
                value={form.terms}
                onChange={handleChange}
                className="input-field h-20 resize-none"
                placeholder="Payment terms, warranty, etc."
              />
            </div>

            {/* Contract Document — PDF upload */}
            <div>
              <label className="label">Contract Document (PDF) — Optional</label>
              <label className={`mt-1 flex items-center gap-3 px-4 py-3 border rounded cursor-pointer transition-colors ${
                pdfFile
                  ? 'border-amber-600/50 bg-amber-900/10'
                  : 'border-slate-700 bg-slate-800/30 hover:border-slate-600'
              }`}>
                <span className="text-lg">📄</span>
                <div className="flex-1 min-w-0">
                  {pdfFile ? (
                    <p className="text-sm text-amber-400 truncate">{pdfFile.name}</p>
                  ) : (
                    <p className="text-sm text-slate-500">Click to upload PDF contract</p>
                  )}
                  <p className="text-xs text-slate-600 mt-0.5">PDF only · Max 10MB</p>
                </div>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
              {pdfFile && (
                <button
                  type="button"
                  onClick={() => setPdfFile(null)}
                  className="text-xs text-slate-500 hover:text-red-400 mt-1 transition-colors"
                >
                  Remove file
                </button>
              )}
            </div>

            {/* Price preview */}
            {form.price && (
              <div className="px-4 py-3 bg-slate-800/50 border border-slate-700 rounded flex justify-between">
                <span className="font-mono text-xs text-slate-500 uppercase tracking-wider">Quoted Price</span>
                <span className="font-mono text-amber-400 font-medium">
                  ₹{parseFloat(form.price || 0).toLocaleString()}
                </span>
              </div>
            )}

            {error   && <ErrorAlert message={error} />}
            {success && <SuccessAlert message={success} />}

            <div className="flex gap-3">
              <button type="submit" disabled={loading} className="btn-primary">
                {loading ? 'Submitting...' : 'Submit Quotation'}
              </button>
              <button
                type="button"
                onClick={() => navigate('/supplier/rfqs')}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </AppLayout>
  )
}
