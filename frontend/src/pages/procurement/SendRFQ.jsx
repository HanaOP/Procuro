import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { sendRFQ } from '../../api/procurementApi'
import AppLayout from '../../components/AppLayout'
import { ErrorAlert, SuccessAlert } from '../../components/Feedback'

export default function SendRFQ() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ pr_id: '', deadline: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleChange = e => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))

  const handleSubmit = async e => {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      const { data } = await sendRFQ({ pr_id: parseInt(form.pr_id), deadline: form.deadline })
      setSuccess(`RFQ #${data.rfq?.rfq_id} sent. Suppliers can now submit quotations.`)
      setTimeout(() => navigate('/procurement/requests'), 2000)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send RFQ')
    } finally { setLoading(false) }
  }

  return (
    <AppLayout>
      <div className="space-y-6 max-w-md">
        <div>
          <p className="section-title mb-1">Procurement</p>
          <h1 className="page-title">Send RFQ</h1>
          <p className="text-sm text-slate-500 mt-1">Request for Quotation from registered suppliers</p>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Purchase Request ID *</label>
              <input name="pr_id" type="number" value={form.pr_id} onChange={handleChange}
                className="input-field" placeholder="e.g. 42" required />
              <p className="mt-1 text-xs text-slate-600 font-mono">Must be a PENDING_PROCUREMENT status request</p>
            </div>

            <div>
              <label className="label">Quotation Deadline *</label>
              <input name="deadline" type="date" value={form.deadline} onChange={handleChange}
                className="input-field" required
                min={new Date(Date.now() + 86400000).toISOString().split('T')[0]} />
            </div>

            {error && <ErrorAlert message={error} />}
            {success && <SuccessAlert message={success} />}

            <div className="flex gap-3">
              <button type="submit" disabled={loading} className="btn-primary">
                {loading ? 'Sending...' : 'Send RFQ'}
              </button>
              <button type="button" onClick={() => navigate('/procurement/requests')} className="btn-secondary">
                View Approved PRs
              </button>
            </div>
          </form>
        </div>
      </div>
    </AppLayout>
  )
}
