import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { login as loginApi } from '../../api/authApi'
import { useAuth } from '../../context/AuthContext'
import { ErrorAlert } from '../../components/Feedback'

const ROLE_DASHBOARDS = {
  EMPLOYEE: '/employee',
  MANAGER: '/manager',
  FINANCE: '/finance',
  PROCUREMENT: '/procurement',
  SUPPLIER: '/supplier',
}

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data } = await loginApi(form)
      login(data.user, data.token)
      navigate(ROLE_DASHBOARDS[data.user.role] || '/')
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface-950 flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-surface-900 border-r border-surface-700 flex-col justify-between p-12">
        <div>
          <span className="font-mono text-amber-400 text-2xl font-medium tracking-tight">PROCURO</span>
        </div>
        <div>
          <p className="font-mono text-slate-600 text-xs tracking-widest uppercase mb-6">Procurement flow</p>
          <div className="space-y-2">
            {['Request → Manager → Finance → Procurement → Supplier → Delivered'].map((step) => (
              <p key={step} className="text-slate-500 text-sm font-mono">{step}</p>
            ))}
          </div>
        </div>
        <div className="border-t border-surface-700 pt-6">
          <p className="font-mono text-xs text-slate-700 tracking-wider">INTERNAL USE ONLY</p>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-sm animate-fade-up">
          {/* Mobile logo */}
          <div className="lg:hidden mb-8">
            <span className="font-mono text-amber-400 text-xl font-medium">PROCURO</span>
          </div>

          <div className="mb-8">
            <h1 className="font-mono text-xl text-slate-100 font-medium">Sign in</h1>
            <p className="text-sm text-slate-500 mt-1">Access your procurement workspace</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Email</label>
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                className="input-field"
                placeholder="you@company.com"
                required
                autoFocus
              />
            </div>

            <div>
              <label className="label">Password</label>
              <input
                name="password"
                type="password"
                value={form.password}
                onChange={handleChange}
                className="input-field"
                placeholder="••••••••"
                required
              />
            </div>

            {error && <ErrorAlert message={error} />}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full mt-2"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <p className="mt-6 text-sm text-slate-500">
            No account?{' '}
            <Link to="/register" className="text-amber-400 hover:text-amber-300 transition-colors">
              Register
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
