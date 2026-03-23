import { useEffect, useState } from 'react'
import AppLayout from '../../components/AppLayout'
import { LoadingSpinner } from '../../components/Feedback'
import { useAuth } from '../../context/AuthContext'
import axios from 'axios'

const predApi = axios.create({ baseURL: 'http://localhost:8001' })

// ─── API CALLS ────────────────────────────────────────────────────────────────
const getDashboard     = (dept) => predApi.get(`/summary/dashboard/${encodeURIComponent(dept)}`)
const getAnomalies     = (dept) => predApi.get(`/anomalies/department/${encodeURIComponent(dept)}`)
const getSpendForecast = (dept) => predApi.get(`/forecast/spend/${encodeURIComponent(dept)}`)

// ─── SMALL COMPONENTS ─────────────────────────────────────────────────────────

function StatCard({ label, value, sub, alert }) {
  return (
    <div className={`card ${alert ? 'border-amber-800/50' : ''}`}>
      <p className="section-title mb-2">{label}</p>
      <p className={`font-mono text-2xl font-medium ${alert ? 'text-amber-400' : 'text-slate-100'}`}>
        {value}
      </p>
      {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
    </div>
  )
}

function SectionTitle({ children }) {
  return <p className="section-title mb-3">{children}</p>
}

function TrendBadge({ trend }) {
  if (!trend) return null
  const color =
    trend.includes('↑') ? 'text-green-400' :
    trend.includes('↓') ? 'text-red-400' :
    'text-slate-400'
  return <span className={`text-xs font-mono ${color}`}>{trend}</span>
}

function ConfidenceBadge({ confidence }) {
  const map = {
    HIGH:     'bg-green-900/40 text-green-400',
    MEDIUM:   'bg-amber-900/40 text-amber-400',
    LOW:      'bg-slate-700 text-slate-300',
    VERY_LOW: 'bg-slate-700 text-slate-500',
  }
  return (
    <span className={`text-xs px-2 py-0.5 rounded font-mono ${map[confidence] || map.LOW}`}>
      {confidence}
    </span>
  )
}

function SeverityBadge({ severity }) {
  const map = {
    HIGH:   'bg-red-900/40 text-red-400',
    MEDIUM: 'bg-amber-900/40 text-amber-400',
    LOW:    'bg-slate-700 text-slate-300',
  }
  return (
    <span className={`text-xs px-2 py-0.5 rounded font-mono ${map[severity] || map.LOW}`}>
      {severity}
    </span>
  )
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function AIDashboard() {
  const { user } = useAuth()
  const department = user?.department

  const [dashboard, setDashboard]     = useState(null)
  const [anomalies, setAnomalies]     = useState(null)
  const [spendData, setSpendData]     = useState(null)
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState(null)
  const [activeTab, setActiveTab]     = useState('predictions')

  useEffect(() => {
    if (!department) {
      setError('No department assigned to your account.')
      setLoading(false)
      return
    }

    Promise.allSettled([
      getDashboard(department),
      getAnomalies(department),
      getSpendForecast(department),
    ]).then(([dash, anom, spend]) => {
      if (dash.status === 'fulfilled')  setDashboard(dash.value.data)
      if (anom.status === 'fulfilled')  setAnomalies(anom.value.data)
      if (spend.status === 'fulfilled') setSpendData(spend.value.data)
    }).catch(() => setError('Failed to load AI analysis.'))
    .finally(() => setLoading(false))
  }, [department])

  if (loading) return <AppLayout><LoadingSpinner /></AppLayout>

  if (error) return (
    <AppLayout>
      <div className="card border-red-800/50">
        <p className="text-red-400">{error}</p>
      </div>
    </AppLayout>
  )

  const predictions = dashboard?.demand_predictions || []
  const topItems    = dashboard?.top_requested_items || []
  const anomalyList = anomalies?.anomalies || []
  const spendFcast  = dashboard?.spend_forecast
  const monthly     = spendData?.monthly_breakdown || []
  const catBreak    = spendData?.category_breakdown || []

  return (
    <AppLayout>
      <div className="space-y-8">

        {/* ── Header ── */}
        <div>
          <p className="section-title mb-1">AI Analysis</p>
          <h1 className="page-title">Demand Intelligence</h1>
          <p className="text-sm text-slate-500 mt-1">
            {department} Department · Powered by Prophet + Isolation Forest
          </p>
        </div>

        {/* ── Summary Cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            label="Requests Analyzed"
            value={dashboard?.total_requests_analyzed || 0}
            sub="historical records"
          />
          <StatCard
            label="Items Predicted"
            value={predictions.length}
            sub="demand forecasts"
          />
          <StatCard
            label="Anomalies Found"
            value={anomalies?.total_anomalies || 0}
            sub={`${anomalies?.total_scanned || 0} scanned`}
            alert={(anomalies?.total_anomalies || 0) > 0}
          />
          <StatCard
            label="Spend Forecast"
            value={spendFcast ? `$${spendFcast.next_order_estimate?.toLocaleString()}` : '—'}
            sub={spendFcast?.trend || ''}
            alert={spendFcast?.trend?.includes('↑')}
          />
        </div>

        {/* ── Tabs ── */}
        <div className="flex gap-2 border-b border-slate-800">
          {[
            { id: 'predictions', label: 'Demand Predictions' },
            { id: 'spend',       label: 'Spend Forecast' },
            { id: 'anomalies',   label: `Anomalies (${anomalies?.total_anomalies || 0})` },
            { id: 'top',         label: 'Top Items' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-amber-500 text-amber-400'
                  : 'border-transparent text-slate-500 hover:text-slate-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Tab: Demand Predictions ── */}
        {activeTab === 'predictions' && (
          <div className="space-y-4">
            <SectionTitle>AI Demand Predictions — {department}</SectionTitle>
            <p className="text-xs text-slate-500 -mt-2">
              Model: {dashboard?.model} · Quantities predicted for next order cycle
            </p>
            <div className="card p-0 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-500 text-xs uppercase">
                    <th className="text-left p-3">Item</th>
                    <th className="text-left p-3">Category</th>
                    <th className="text-right p-3">Predicted Qty</th>
                    <th className="text-right p-3">Avg Price</th>
                    <th className="text-right p-3">Est. Spend</th>
                    <th className="text-center p-3">Trend</th>
                    <th className="text-center p-3">Confidence</th>
                  </tr>
                </thead>
                <tbody>
                  {predictions.length === 0 ? (
                    <tr><td colSpan={7} className="p-4 text-center text-slate-500">No predictions available</td></tr>
                  ) : predictions.map((p, i) => (
                    <tr key={i} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                      <td className="p-3 text-slate-100 font-medium">{p.item_name}</td>
                      <td className="p-3 text-slate-400">{p.category}</td>
                      <td className="p-3 text-right font-mono text-amber-400">
                        {p.predicted_quantity}
                        <span className="text-slate-600 text-xs ml-1">
                          ({p.quantity_lower}–{p.quantity_upper})
                        </span>
                      </td>
                      <td className="p-3 text-right text-slate-300">${p.avg_unit_price}</td>
                      <td className="p-3 text-right text-slate-300">${p.predicted_spend?.toLocaleString()}</td>
                      <td className="p-3 text-center"><TrendBadge trend={p.trend} /></td>
                      <td className="p-3 text-center"><ConfidenceBadge confidence={p.confidence} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Tab: Spend Forecast ── */}
        {activeTab === 'spend' && (
          <div className="space-y-6">
            <SectionTitle>Spend Forecast — {department}</SectionTitle>

            {/* Summary */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              <StatCard
                label="Next Order Estimate"
                value={spendFcast ? `$${spendFcast.next_order_estimate?.toLocaleString()}` : '—'}
                sub={`Range: $${spendFcast?.lower?.toLocaleString()} – $${spendFcast?.upper?.toLocaleString()}`}
              />
              <StatCard
                label="Total Spent to Date"
                value={spendFcast ? `$${spendFcast.total_to_date?.toLocaleString()}` : '—'}
                sub="historical total"
              />
              <StatCard
                label="Trend"
                value={spendFcast?.trend || '—'}
                alert={spendFcast?.trend?.includes('↑')}
              />
            </div>

            {/* Monthly Breakdown */}
            {monthly.length > 0 && (
              <div className="card">
                <p className="section-title mb-4">Monthly Spend History</p>
                <div className="space-y-2">
                  {monthly.map((m, i) => {
                    const max = Math.max(...monthly.map(x => x.spend))
                    const pct = Math.round((m.spend / max) * 100)
                    return (
                      <div key={i} className="flex items-center gap-3">
                        <span className="text-xs text-slate-500 w-16 font-mono">{m.month}</span>
                        <div className="flex-1 bg-slate-800 rounded-full h-2">
                          <div
                            className="bg-amber-500 h-2 rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs text-slate-300 w-20 text-right font-mono">
                          ${m.spend.toLocaleString()}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Category Breakdown */}
            {catBreak.length > 0 && (
              <div className="card">
                <p className="section-title mb-4">Spend by Category</p>
                <div className="space-y-2">
                  {catBreak.map((c, i) => {
                    const total = catBreak.reduce((s, x) => s + x.total_spend, 0)
                    const pct   = Math.round((c.total_spend / total) * 100)
                    return (
                      <div key={i} className="flex items-center gap-3">
                        <span className="text-xs text-slate-400 w-28">{c.category}</span>
                        <div className="flex-1 bg-slate-800 rounded-full h-2">
                          <div
                            className="bg-amber-500/70 h-2 rounded-full"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs text-slate-300 w-20 text-right font-mono">
                          ${c.total_spend.toLocaleString()}
                        </span>
                        <span className="text-xs text-slate-500 w-8 text-right">{pct}%</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Tab: Anomalies ── */}
        {activeTab === 'anomalies' && (
          <div className="space-y-4">
            <SectionTitle>Anomaly Detection — {department}</SectionTitle>
            <p className="text-xs text-slate-500 -mt-2">
              Model: Isolation Forest · {anomalies?.total_scanned} requests scanned
            </p>

            {anomalyList.length === 0 ? (
              <div className="card text-center">
                <p className="text-green-400 font-medium">✓ No anomalies detected</p>
                <p className="text-slate-500 text-sm mt-1">All purchase requests look normal</p>
              </div>
            ) : (
              <div className="card p-0 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-500 text-xs uppercase">
                      <th className="text-left p-3">Item</th>
                      <th className="text-left p-3">Category</th>
                      <th className="text-right p-3">Qty</th>
                      <th className="text-right p-3">Unit Price</th>
                      <th className="text-left p-3">Reason</th>
                      <th className="text-center p-3">Score</th>
                      <th className="text-center p-3">Severity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {anomalyList.map((a, i) => (
                      <tr key={i} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                        <td className="p-3 text-slate-100 font-medium">{a.item_name}</td>
                        <td className="p-3 text-slate-400">{a.category}</td>
                        <td className="p-3 text-right font-mono text-slate-300">{a.quantity}</td>
                        <td className="p-3 text-right font-mono text-slate-300">${a.unit_price}</td>
                        <td className="p-3 text-slate-400 text-xs max-w-xs">{a.reason}</td>
                        <td className="p-3 text-center font-mono text-amber-400">{a.anomaly_score}</td>
                        <td className="p-3 text-center"><SeverityBadge severity={a.severity} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── Tab: Top Items ── */}
        {activeTab === 'top' && (
          <div className="space-y-4">
            <SectionTitle>Most Requested Items — {department}</SectionTitle>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {topItems.map((item, i) => (
                <div key={i} className="card flex items-center gap-4">
                  <div className="w-8 h-8 rounded-full bg-amber-900/40 flex items-center justify-center">
                    <span className="text-amber-400 font-mono text-sm font-bold">{i + 1}</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-slate-100 font-medium">{item.item}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-amber-400 text-lg font-medium">{item.count}</p>
                    <p className="text-xs text-slate-500">requests</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </AppLayout>
  )
}
