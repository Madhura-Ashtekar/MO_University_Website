import React, { useState, useEffect } from 'react'
import { apiFetch } from '../api/client'

export function PageBudget({ go, showToast }) {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [filterTeam, setFilterTeam] = useState('')
  const [filterMonth, setFilterMonth] = useState('')
  const [allTeams, setAllTeams] = useState([])

  useEffect(() => {
    apiFetch('/teams').then(setAllTeams).catch(() => {})
  }, [])

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (filterTeam) params.set('team_name', filterTeam)
    if (filterMonth) params.set('month', filterMonth)
    const qs = params.toString() ? `?${params.toString()}` : ''
    apiFetch(`/analytics/budget${qs}`)
      .then(setStats)
      .catch((e) => showToast(e.message, 'error'))
      .finally(() => setLoading(false))
  }, [filterTeam, filterMonth, showToast])

  if (loading && !stats) return <div className="page" style={{ padding: 40, textAlign: 'center' }}>Loading budget analytics...</div>

  return (
    <div className="page" style={{ padding: '28px 32px', maxWidth: 1280, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32, gap: 20, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 900, marginBottom: 8 }}>Budget Analytics</h2>
          <p style={{ color: '#718096', margin: 0 }}>Track spending across teams and travel periods.</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <select className="form-field" style={{ minWidth: 200 }} value={filterTeam} onChange={(e) => setFilterTeam(e.target.value)}>
            <option value="">All Teams</option>
            {allTeams.map((t) => <option key={t.id} value={t.name}>{t.name}</option>)}
          </select>
          <input className="form-field" type="month" style={{ minWidth: 150 }} value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} title="Filter by month" />
          {(filterTeam || filterMonth) && (
            <button className="btn-secondary" style={{ padding: '8px 12px', fontSize: 12 }} onClick={() => { setFilterTeam(''); setFilterMonth('') }}>Clear filters</button>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, marginBottom: 32 }}>
        {[
          { label: 'Total Spend', val: `$${(stats?.total_spend || 0).toLocaleString()}`, icon: 'payments', bg: '#EBF2FF', tx: '#0F62FE' },
          { label: 'Total Cost', val: `$${(stats?.total_cost || 0).toLocaleString()}`, icon: 'account_balance_wallet', bg: '#F0FDF4', tx: '#166534' },
          { label: 'Estimated Margin', val: `$${(stats?.total_margin || 0).toLocaleString()}`, icon: 'trending_up', bg: '#F0F9FF', tx: '#0369A1' },
          { label: 'Meals Tracked', val: String(stats?.by_month.reduce((acc, m) => acc + m.meals, 0) || 0), icon: 'restaurant', bg: '#FDF2F8', tx: '#9D174D' },
        ].map((s) => (
          <div key={s.label} style={{ background: 'white', borderRadius: 16, border: '1px solid #E2E8F0', padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <div style={{ width: 36, height: 36, background: s.bg, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 18, color: s.tx }}>{s.icon}</span>
              </div>
              <span style={{ fontSize: 11, fontWeight: 800, color: '#A0AEC0', letterSpacing: '0.08em' }}>{s.label.toUpperCase()}</span>
            </div>
            <div style={{ fontSize: 28, fontWeight: 900 }}>{s.val}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        
        {/* Spend by Team */}
        <div style={{ background: 'white', borderRadius: 20, border: '1px solid #E2E8F0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #EEF1F5', background: '#FAFBFC' }}>
            <span style={{ fontSize: 14, fontWeight: 800 }}>Spend by Team</span>
          </div>
          <div style={{ padding: 20 }}>
            {stats?.by_team.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#718096' }}>No data available yet.</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #EEF1F5' }}>
                    <th style={{ textAlign: 'left', padding: '10px', fontSize: 10, fontWeight: 800, color: '#A0AEC0' }}>TEAM</th>
                    <th style={{ textAlign: 'right', padding: '10px', fontSize: 10, fontWeight: 800, color: '#A0AEC0' }}>MEALS</th>
                    <th style={{ textAlign: 'right', padding: '10px', fontSize: 10, fontWeight: 800, color: '#A0AEC0' }}>TOTAL SPEND</th>
                  </tr>
                </thead>
                <tbody>
                  {stats?.by_team.map((t) => (
                    <tr key={t.name} style={{ borderBottom: '1px solid #F8FAFC' }}>
                      <td style={{ padding: '12px 10px', fontSize: 13, fontWeight: 800 }}>{t.name}</td>
                      <td style={{ padding: '12px 10px', fontSize: 13, textAlign: 'right' }}>{t.meals}</td>
                      <td style={{ padding: '12px 10px', fontSize: 13, fontWeight: 800, textAlign: 'right' }}>${t.spend.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Spend by Month */}
        <div style={{ background: 'white', borderRadius: 20, border: '1px solid #E2E8F0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #EEF1F5', background: '#FAFBFC' }}>
            <span style={{ fontSize: 14, fontWeight: 800 }}>Monthly Spend Trend</span>
          </div>
          <div style={{ padding: 20 }}>
            {stats?.by_month.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#718096' }}>No data available yet.</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #EEF1F5' }}>
                    <th style={{ textAlign: 'left', padding: '10px', fontSize: 10, fontWeight: 800, color: '#A0AEC0' }}>MONTH</th>
                    <th style={{ textAlign: 'right', padding: '10px', fontSize: 10, fontWeight: 800, color: '#A0AEC0' }}>MEALS</th>
                    <th style={{ textAlign: 'right', padding: '10px', fontSize: 10, fontWeight: 800, color: '#A0AEC0' }}>TOTAL SPEND</th>
                  </tr>
                </thead>
                <tbody>
                  {stats?.by_month.map((m) => (
                    <tr key={m.month} style={{ borderBottom: '1px solid #F8FAFC' }}>
                      <td style={{ padding: '12px 10px', fontSize: 13, fontWeight: 800 }}>{m.month}</td>
                      <td style={{ padding: '12px 10px', fontSize: 13, textAlign: 'right' }}>{m.meals}</td>
                      <td style={{ padding: '12px 10px', fontSize: 13, fontWeight: 800, textAlign: 'right' }}>${m.spend.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </div>

      <div style={{ marginTop: 24, background: '#EBF2FF', border: '1.5px solid #BFDBFE', borderRadius: 16, padding: 20, display: 'flex', gap: 16 }}>
        <div style={{ width: 44, height: 44, background: 'white', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 24, color: '#0F62FE' }}>insights</span>
        </div>
        <div>
          <h4 style={{ fontSize: 14, fontWeight: 800, marginBottom: 4 }}>Spending Insights</h4>
          <p style={{ fontSize: 12, color: '#1E40AF', margin: 0, lineHeight: 1.6 }}>
            Your <strong>average meal cost per athlete</strong> is currently unavailable because financial data is not being captured at the order level yet. 
            Once vendors are assigned and costs are logged in the <strong>Workflows</strong> page, you'll see per-meal benchmarking here.
          </p>
        </div>
      </div>
    </div>
  )
}
