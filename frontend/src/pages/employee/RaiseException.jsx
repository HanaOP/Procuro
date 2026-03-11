import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { raiseException } from '../../api/employeeApi'
import AppLayout from '../../components/AppLayout'
import { ErrorAlert, SuccessAlert } from '../../components/Feedback'

const EXCEPTION_TYPES = ['BUDGET_EXCEEDANCE', 'URGENT_REQUIREMENT', 'VENDOR_UNAVAILABILITY', 'POLICY_DEVIATION', 'OTHER']
const URGENCY_LEVELS = ['LOW', 'MEDIUM', 'HIGH']

export default function RaiseException() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [form, setForm] = useState({ exception_type: '', urgency_level: 'MEDIUM', reason: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleChange = e => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))

  const handleSubmit = async e => {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      await raiseException(id, form)
      setSuccess('Exception raised. Manager has been notified.')
      setTimeout(() => navigate('/employee/requests'), 1800)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to raise exception')
    } finally { setLoading(false) }
  }

  return (
    <AppLayout>
      <div className="space-y-6 max-w-lg">
        <div>
          <p className="section-title mb-1">Employee · Request #{id}</p>
          <h1 className="page-title">Raise Exception</h1>
          <p className="text-sm text-slate-500 mt-1">Flag a request for special consideration by the manager.</p>
        </div>

        <div className="card space-y-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Exception Type *</label>
              <select name="exception_type" value={form.exception_type} onChange={handleChange} className="input-field" required>
                <option value="">Select type</option>
                {EXCEPTION_TYPES.map(t => <option key={t} value={t} className="bg-surface-900">{t.replace(/_/g, ' ')}</option>)}
              </select>
            </div>

            <div>
              <label className="label">Urgency Level *</label>
              <div className="flex gap-2">
                {URGENCY_LEVELS.map(u => (
                  <button type="button" key={u}
                    onClick={() => setForm(prev => ({ ...prev, urgency_level: u }))}
                    className={`flex-1 py-2.5 text-xs font-mono uppercase tracking-wider border transition-all ${
                      form.urgency_level === u
                        ? u === 'HIGH' ? 'bg-red-900/40 border-red-700 text-red-400'
                          : u === 'MEDIUM' ? 'bg-amber-900/40 border-amber-700 text-amber-400'
                          : 'bg-surface-700 border-surface-500 text-slate-300'
                        : 'bg-surface-800 border-surface-600 text-slate-500 hover:border-surface-500'
                    }`}>
                    {u}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="label">Reason / Justification *</label>
              <textarea name="reason" value={form.reason} onChange={handleChange}
                className="input-field resize-none" rows={5} required
                placeholder="Explain why this exception is necessary..." />
            </div>

            {error && <ErrorAlert message={error} />}
            {success && <SuccessAlert message={success} />}

            <div className="flex gap-3">
              <button type="submit" disabled={loading} className="btn-primary">
                {loading ? 'Submitting...' : 'Raise Exception'}
              </button>
              <button type="button" onClick={() => navigate(-1)} className="btn-secondary">Cancel</button>
            </div>
          </form>
        </div>
      </div>
    </AppLayout>
  )
}
