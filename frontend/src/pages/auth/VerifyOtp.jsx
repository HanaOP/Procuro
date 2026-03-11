import { useState, useRef, useEffect } from 'react'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import { verifyOtp } from '../../api/authApi'
import { ErrorAlert, SuccessAlert } from '../../components/Feedback'

export default function VerifyOtp() {
  const location = useLocation()
  const navigate = useNavigate()
  const email = location.state?.email || ''

  const [digits, setDigits] = useState(['', '', '', '', '', ''])
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const inputRefs = useRef([])

  useEffect(() => {
    if (!email) navigate('/register')
    inputRefs.current[0]?.focus()
  }, [])

  const handleDigitChange = (i, val) => {
    if (!/^\d?$/.test(val)) return
    const next = [...digits]
    next[i] = val
    setDigits(next)
    if (val && i < 5) inputRefs.current[i + 1]?.focus()
  }

  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) {
      inputRefs.current[i - 1]?.focus()
    }
  }

  const handlePaste = (e) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    const next = [...digits]
    pasted.split('').forEach((d, i) => { next[i] = d })
    setDigits(next)
    inputRefs.current[Math.min(pasted.length, 5)]?.focus()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const otp = digits.join('')
    if (otp.length < 6) return setError('Enter all 6 digits')
    setError('')
    setLoading(true)
    try {
      await verifyOtp({ email, otp })
      setSuccess('Account verified! Redirecting to login...')
      setTimeout(() => navigate('/login'), 1800)
    } catch (err) {
      setError(err.response?.data?.error || 'Verification failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface-950 flex items-center justify-center px-6">
      <div className="w-full max-w-sm animate-fade-up">
        <div className="mb-8">
          <Link to="/login" className="font-mono text-amber-400 text-xl font-medium">PROCURO</Link>
          <h1 className="font-mono text-xl text-slate-100 font-medium mt-6">Verify email</h1>
          <p className="text-sm text-slate-500 mt-1">
            Enter the 6-digit OTP sent to{' '}
            <span className="text-slate-300 font-mono">{email}</span>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* OTP digit boxes */}
          <div className="flex gap-3 justify-between">
            {digits.map((d, i) => (
              <input
                key={i}
                ref={(el) => (inputRefs.current[i] = el)}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={d}
                onChange={(e) => handleDigitChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                onPaste={handlePaste}
                className="w-12 h-14 text-center text-xl font-mono bg-surface-800 border border-surface-600
                           text-slate-100 focus:outline-none focus:border-amber-500 focus:ring-1
                           focus:ring-amber-500/30 transition-colors"
              />
            ))}
          </div>

          {error && <ErrorAlert message={error} />}
          {success && <SuccessAlert message={success} />}

          <button
            type="submit"
            disabled={loading || digits.join('').length < 6}
            className="btn-primary w-full"
          >
            {loading ? 'Verifying...' : 'Verify OTP'}
          </button>
        </form>

        <p className="mt-6 text-sm text-slate-500">
          Wrong email?{' '}
          <Link to="/register" className="text-amber-400 hover:text-amber-300 transition-colors">
            Go back
          </Link>
        </p>
      </div>
    </div>
  )
}
