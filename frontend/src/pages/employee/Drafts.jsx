import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getDrafts } from '../../api/employeeApi'
import AppLayout from '../../components/AppLayout'
import { PriorityBadge } from '../../components/StatusBadge'
import { LoadingSpinner, EmptyState, ErrorAlert } from '../../components/Feedback'

export default function Drafts() {
  const [drafts, setDrafts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    getDrafts()
      .then(({ data }) => setDrafts(data))
      .catch(err => setError(err.response?.data?.error || 'Failed to load'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="section-title mb-1">Employee</p>
            <h1 className="page-title">Drafts</h1>
          </div>
          <button onClick={() => navigate('/employee/new')} className="btn-primary">+ New Request</button>
        </div>

        {error && <ErrorAlert message={error} />}

        {loading ? <LoadingSpinner /> : drafts.length === 0 ? (
          <EmptyState message="No drafts saved." />
        ) : (
          <div className="space-y-2">
            {drafts.map(r => (
              <div key={r.pr_id} className="card hover:border-amber-800/40 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs text-slate-600">#{r.pr_id}</span>
                      {r.priority && <PriorityBadge priority={r.priority} />}
                      <span className="font-mono text-[10px] text-amber-600 uppercase tracking-widest bg-amber-950/30 border border-amber-900/40 px-1.5 py-0.5">Draft</span>
                    </div>
                    <p className="text-sm font-medium text-slate-200">{r.item_name || 'Untitled draft'}</p>
                    <p className="text-xs text-slate-500 mt-1 font-mono">
                      {r.department || '—'} · {r.quantity || 0} units · {r.category || '—'}
                    </p>
                    <p className="text-xs text-slate-600 font-mono mt-0.5">
                      Last edited {new Date(r.updated_at || r.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => navigate(`/employee/drafts/${r.pr_id}/edit`)}
                      className="btn-secondary text-xs px-3 py-1.5">
                      Edit
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
