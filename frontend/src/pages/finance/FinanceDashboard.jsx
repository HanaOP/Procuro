import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { getPendingRequests } from '../../api/financeApi'
import AppLayout from '../../components/AppLayout'
import { LoadingSpinner } from '../../components/Feedback'
import axios from 'axios'

const predApi = axios.create({ baseURL: 'http://localhost:8001' })

const DEPARTMENTS = ['Engineering', 'IT', 'Operations', 'Administration', 'HR']

const getAllSpendForecast  = ()     => predApi.get('/forecast/spend')
const getDeptSpendForecast = (d)   => predApi.get(`/forecast/spend/${encodeURIComponent(d)}`)
const getAllAnomalies       = ()    => predApi.get('/anomalies/all')
const getDeptAnomalies     = (d)   => predApi.get(`/anomalies/department/${encodeURIComponent(d)}`)
const getDeptDashboard     = (d)   => predApi.get(`/summary/dashboard/${encodeURIComponent(d)}`)

function StatCard({ label, value, sub, alert, path }) {
  const content = (
    <div className={`card ${alert ? 'border-amber-800/50' : ''}`}>
      <p className="section-title mb-2">{label}</p>
      <p className={`font-mono text-2xl font-medium ${alert ? 'text-amber-400' : 'text-slate-100'}`}>{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
    </div>
  )
  return path ? <Link to={path} className="hover:border-amber-800/40 transition-colors block">{content}</Link> : content
}

function TrendBadge({ trend }) {
  if (!trend) return null
  const color = trend.includes('↑') ? 'text-green-400' : trend.includes('↓') ? 'text-red-400' : 'text-slate-400'
  return <span className={`text-xs font-mono ${color}`}>{trend}</span>
}

function SeverityBadge({ severity }) {
  const map = { HIGH: 'bg-red-900/40 text-red-400', MEDIUM: 'bg-amber-900/40 text-amber-400', LOW: 'bg-slate-700 text-slate-300' }
  return <span className={`text-xs px-2 py-0.5 rounded font-mono ${map[severity] || map.LOW}`}>{severity}</span>
}

export default function FinanceDashboard() {
  const { user } = useAuth()
  const [pending, setPending]           = useState([])
  const [invoicesCount, setInvoicesCount] = useState(0)
  const [selectedDept, setSelectedDept] = useState('All')
  const [allForecasts, setAllForecasts] = useState([])
  const [allAnomalies, setAllAnomalies] = useState(null)
  const [deptData, setDeptData]         = useState(null)
  const [loading, setLoading]           = useState(true)
  const [aiLoading, setAiLoading]       = useState(true)
  const [deptLoading, setDeptLoading]   = useState(false)
  const [activeTab, setActiveTab]       = useState('forecast')

  useEffect(() => {
    import('../../api/financeApi').then(({ getPendingRequests, getInvoices }) => {
      Promise.all([
        getPendingRequests(),
        getInvoices()
      ]).then(([reqs, invs]) => {
        setPending(reqs.data)
        setInvoicesCount(invs.data.filter(i => i.status === 'PENDING').length)
      }).catch(console.error)
      .finally(() => setLoading(false))
    })
  }, [])

  useEffect(() => {
    Promise.allSettled([
      getAllSpendForecast(),
      getAllAnomalies(),
    ]).then(([spend, anom]) => {
      if (spend.status === 'fulfilled') setAllForecasts(spend.value.data?.forecasts || [])
      if (anom.status === 'fulfilled')  setAllAnomalies(anom.value.data)
    }).finally(() => setAiLoading(false))
  }, [])

  useEffect(() => {
    if (selectedDept === 'All') { setDeptData(null); return }
    setDeptLoading(true)
    Promise.allSettled([
      getDeptDashboard(selectedDept),
      getDeptSpendForecast(selectedDept),
      getDeptAnomalies(selectedDept),
    ]).then(([dash, spend, anom]) => {
      setDeptData({
        dashboard: dash.status === 'fulfilled'  ? dash.value.data  : null,
        spend:     spend.status === 'fulfilled' ? spend.value.data : null,
        anomalies: anom.status === 'fulfilled'  ? anom.value.data  : null,
      })
    }).finally(() => setDeptLoading(false))
  }, [selectedDept])

  const totalValue      = pending.reduce((sum, r) => sum + parseFloat(r.total_amount || 0), 0)
  const totalForecast   = allForecasts.reduce((sum, f) => sum + (f.forecasted_monthly_spend || 0), 0)
  const increasingDepts = allForecasts.filter(f => f.trend?.includes('↑')).length

  // Data to display based on selected dept
  const displayForecasts = selectedDept === 'All'
    ? allForecasts
    : allForecasts.filter(f => f.department === selectedDept)
  const displayAnomalies = selectedDept === 'All' ? allAnomalies : deptData?.anomalies
  const monthly          = deptData?.spend?.monthly_breakdown || []
  const catBreak         = deptData?.spend?.category_breakdown || []

  return (
    <AppLayout>
      <div className="space-y-8">

        {/* ── Header ── */}
        <div>
          <p className="section-title mb-1">Dashboard</p>
          <h1 className="page-title">Finance Portal</h1>
          <p className="text-sm text-slate-500 mt-1">Welcome, {user?.name}</p>
        </div>

        {/* ── Stat Cards ── */}
        {loading ? <LoadingSpinner /> : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard
              label="Pending PRs"
              value={pending.length}
              alert={pending.length > 0}
              path="/finance/pending"
            />
            <StatCard
              label="Pending Invoices"
              value={invoicesCount}
              alert={invoicesCount > 0}
              path="/finance/invoices"
            />
            <div className="card">
              <p className="section-title mb-2">Total Pending Value</p>
              <p className="font-mono text-2xl font-medium text-slate-100">₹{totalValue.toLocaleString()}</p>
            </div>
            <StatCard
              label="Forecasted Monthly"
              value={`$${Math.round(totalForecast).toLocaleString()}`}
              alert={increasingDepts > 0}
            />
          </div>
        )}

        {/* ── Actions ── */}
        <div>
          <p className="section-title mb-3">Actions</p>
          <div className="flex flex-wrap gap-3">
            <Link to="/finance/pending" className="btn-primary">Review Pending</Link>
            <Link to="/finance/invoices" className="btn-primary">Manage Invoices</Link>
            <Link to="/finance/budget" className="btn-secondary">Allocate Budget</Link>
          </div>
        </div>

        {/* ── AI Section ── */}
        <div>
          <div className="flex items-start justify-between mb-4 flex-wrap gap-4">
            <div>
              <p className="section-title mb-1">AI Analysis</p>
              <p className="text-xs text-slate-500">Powered by Prophet + Isolation Forest</p>
            </div>

            {/* Department Selector */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-slate-500">Department:</span>
              {['All', ...DEPARTMENTS].map(dept => (
                <button
                  key={dept}
                  onClick={() => setSelectedDept(dept)}
                  className={`px-3 py-1.5 text-xs font-mono rounded transition-colors ${
                    selectedDept === dept
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/50'
                      : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-slate-200'
                  }`}
                >
                  {dept}
                </button>
              ))}
            </div>
          </div>

          {/* Department Summary when specific dept selected */}
          {selectedDept !== 'All' && deptData?.dashboard && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
              <StatCard
                label="Requests Analyzed"
                value={deptData.dashboard.total_requests_analyzed || 0}
                sub={`${selectedDept} dept`}
              />
              <StatCard
                label="Forecasted Spend"
                value={deptData.spend ? `$${deptData.spend.forecasted_next_month?.toLocaleString()}` : '—'}
                sub={`Range: $${deptData.spend?.spend_lower?.toLocaleString()} – $${deptData.spend?.spend_upper?.toLocaleString()}`}
              />
              <StatCard
                label="Total Spent to Date"
                value={deptData.spend ? `$${deptData.spend.total_spent_to_date?.toLocaleString()}` : '—'}
              />
              <StatCard
                label="Anomalies"
                value={deptData.anomalies?.total_anomalies || 0}
                sub={`${deptData.anomalies?.total_scanned || 0} scanned`}
                alert={(deptData.anomalies?.total_anomalies || 0) > 0}
              />
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-2 border-b border-slate-800 mb-6">
            {[
              { id: 'forecast',  label: 'Spend Forecast' },
              { id: 'anomalies', label: `Anomalies (${displayAnomalies?.total_anomalies || 0})` },
              ...(selectedDept !== 'All' ? [{ id: 'monthly', label: 'Monthly Breakdown' }] : []),
            ].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id ? 'border-amber-500 text-amber-400' : 'border-transparent text-slate-500 hover:text-slate-300'
                }`}>
                {tab.label}
              </button>
            ))}
          </div>

          {aiLoading || deptLoading ? <LoadingSpinner /> : (
            <>
              {/* Spend Forecast */}
              {activeTab === 'forecast' && (
                <div className="space-y-4">
                  <div className="card p-0 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-500 text-xs uppercase">
                          <th className="text-left p-3">Department</th>
                          <th className="text-right p-3">Forecasted Spend</th>
                          <th className="text-right p-3">Range</th>
                          <th className="text-right p-3">Historical Avg</th>
                          <th className="text-right p-3">Total to Date</th>
                          <th className="text-center p-3">Trend</th>
                          <th className="text-center p-3">Confidence</th>
                        </tr>
                      </thead>
                      <tbody>
                        {displayForecasts.map((f, i) => (
                          <tr key={i} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                            <td className="p-3 text-slate-100 font-medium">{f.department}</td>
                            <td className="p-3 text-right font-mono text-amber-400">${f.forecasted_monthly_spend?.toLocaleString()}</td>
                            <td className="p-3 text-right text-xs text-slate-500 font-mono">${f.spend_lower?.toLocaleString()} – ${f.spend_upper?.toLocaleString()}</td>
                            <td className="p-3 text-right font-mono text-slate-300">${f.historical_avg?.toLocaleString()}</td>
                            <td className="p-3 text-right font-mono text-slate-300">${f.total_historical_spend?.toLocaleString()}</td>
                            <td className="p-3 text-center"><TrendBadge trend={f.trend} /></td>
                            <td className="p-3 text-center">
                              <span className={`text-xs px-2 py-0.5 rounded font-mono ${
                                f.confidence === 'HIGH' ? 'bg-green-900/40 text-green-400' :
                                f.confidence === 'MEDIUM' ? 'bg-amber-900/40 text-amber-400' :
                                'bg-slate-700 text-slate-300'
                              }`}>{f.confidence}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Bar Chart */}
                  <div className="card">
                    <p className="section-title mb-4">
                      {selectedDept === 'All' ? 'Forecasted Spend by Department' : `${selectedDept} — Spend Comparison`}
                    </p>
                    <div className="space-y-3">
                      {displayForecasts.map((f, i) => {
                        const max = Math.max(...displayForecasts.map(x => x.forecasted_monthly_spend || 0))
                        const pct = max ? Math.round((f.forecasted_monthly_spend / max) * 100) : 0
                        return (
                          <div key={i} className="flex items-center gap-3">
                            <span className="text-xs text-slate-400 w-24 shrink-0">{f.department}</span>
                            <div className="flex-1 bg-slate-800 rounded-full h-2">
                              <div className="bg-amber-500 h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-xs text-slate-300 w-24 text-right font-mono shrink-0">
                              ${Math.round(f.forecasted_monthly_spend).toLocaleString()}
                            </span>
                            <TrendBadge trend={f.trend} />
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Anomalies */}
              {activeTab === 'anomalies' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <StatCard label="Total Scanned"   value={displayAnomalies?.total_scanned || 0} />
                    <StatCard label="Anomalies Found" value={displayAnomalies?.total_anomalies || 0} alert={(displayAnomalies?.total_anomalies || 0) > 0} />
                    <StatCard label="Anomaly Rate"    value={displayAnomalies?.anomaly_rate || '0%'} />
                  </div>
                  <div className="card p-0 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-500 text-xs uppercase">
                          {selectedDept === 'All' && <th className="text-left p-3">Department</th>}
                          <th className="text-left p-3">Item</th>
                          <th className="text-right p-3">Qty</th>
                          <th className="text-right p-3">Unit Price</th>
                          <th className="text-right p-3">Total</th>
                          <th className="text-left p-3">Reason</th>
                          <th className="text-center p-3">Severity</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(displayAnomalies?.anomalies || []).length === 0 ? (
                          <tr><td colSpan={7} className="p-4 text-center text-green-400">✓ No anomalies found</td></tr>
                        ) : (displayAnomalies?.anomalies || []).map((a, i) => (
                          <tr key={i} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                            {selectedDept === 'All' && <td className="p-3 text-slate-400">{a.department}</td>}
                            <td className="p-3 text-slate-100 font-medium">{a.item_name}</td>
                            <td className="p-3 text-right font-mono text-slate-300">{a.quantity}</td>
                            <td className="p-3 text-right font-mono text-slate-300">${a.unit_price}</td>
                            <td className="p-3 text-right font-mono text-slate-300">${a.total_amount?.toLocaleString()}</td>
                            <td className="p-3 text-slate-400 text-xs max-w-xs">{a.reason}</td>
                            <td className="p-3 text-center"><SeverityBadge severity={a.severity} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Monthly Breakdown — only for specific dept */}
              {activeTab === 'monthly' && selectedDept !== 'All' && (
                <div className="space-y-6">
                  {monthly.length > 0 && (
                    <div className="card">
                      <p className="section-title mb-4">Monthly Spend — {selectedDept}</p>
                      <div className="space-y-2">
                        {monthly.map((m, i) => {
                          const max = Math.max(...monthly.map(x => x.spend))
                          const pct = Math.round((m.spend / max) * 100)
                          return (
                            <div key={i} className="flex items-center gap-3">
                              <span className="text-xs text-slate-500 w-16 font-mono shrink-0">{m.month}</span>
                              <div className="flex-1 bg-slate-800 rounded-full h-2">
                                <div className="bg-amber-500 h-2 rounded-full" style={{ width: `${pct}%` }} />
                              </div>
                              <span className="text-xs text-slate-300 w-20 text-right font-mono shrink-0">
                                ${m.spend.toLocaleString()}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {catBreak.length > 0 && (
                    <div className="card">
                      <p className="section-title mb-4">Spend by Category — {selectedDept}</p>
                      <div className="space-y-2">
                        {catBreak.map((c, i) => {
                          const total = catBreak.reduce((s, x) => s + x.total_spend, 0)
                          const pct   = Math.round((c.total_spend / total) * 100)
                          return (
                            <div key={i} className="flex items-center gap-3">
                              <span className="text-xs text-slate-400 w-28 shrink-0">{c.category}</span>
                              <div className="flex-1 bg-slate-800 rounded-full h-2">
                                <div className="bg-amber-500/70 h-2 rounded-full" style={{ width: `${pct}%` }} />
                              </div>
                              <span className="text-xs text-slate-300 w-20 text-right font-mono shrink-0">
                                ${c.total_spend.toLocaleString()}
                              </span>
                              <span className="text-xs text-slate-500 w-8 text-right shrink-0">{pct}%</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

      </div>
    </AppLayout>
  )
}
