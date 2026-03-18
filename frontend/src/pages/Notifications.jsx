import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from '../api/client'

const cell = { padding: '14px 18px', fontSize: 13, color: '#0D1117' }

const PRIORITY_BADGE = {
  High:   'badge-orange',
  Medium: 'badge-blue',
  Low:    'badge-gray',
}

function todayYMD() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function currentYYYYMM() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function PageNotifications({ go, serverMeta }) {
  const navigate = useNavigate()
  const [upcomingMeals, setUpcomingMeals] = useState([])
  const [tbdWorkflows, setTbdWorkflows] = useState([])

  useEffect(() => {
    const ymd = todayYMD()
    apiFetch(`/calendar?month=${currentYYYYMM()}`)
      .then((data) => {
        const upcoming = (data.events || [])
          .filter((e) => e.date > ymd)
          .sort((a, b) => `${a.date}${a.time || ''}`.localeCompare(`${b.date}${b.time || ''}`))
        setUpcomingMeals(upcoming)
      })
      .catch(() => {})
  }, [])

  // Fetch workflows to show per-schedule TBD alerts
  useEffect(() => {
    apiFetch('/workflows')
      .then((list) => {
        const withTbd = (list || []).filter(w => (w.counts?.tbd ?? 0) > 0)
        setTbdWorkflows(withTbd)
      })
      .catch(() => {})
  }, [])

  const alerts = []

  // One alert per schedule that has TBD meals
  for (const w of tbdWorkflows) {
    const tbdCount = w.counts?.tbd ?? 0
    alerts.push({
      icon: 'assignment_late',
      iconColor: '#9A3412',
      iconBg: '#FFF0EB',
      issue: `${w.name} — ${tbdCount} Unassigned meal${tbdCount !== 1 ? 's' : ''} need vendor assignment`,
      detail: `${w.team_name}${w.sport ? ` · ${w.sport}` : ''}`,
      priority: 'High',
      workflowId: w.id,
    })
  }

  if (upcomingMeals.length > 0) {
    alerts.push({
      icon: 'event_upcoming',
      iconColor: '#5B21B6',
      iconBg: '#EDE9FE',
      issue: `Review upcoming intake for ${upcomingMeals[0].team_name || 'next trip'}`,
      detail: upcomingMeals[0].date,
      priority: 'Medium',
      page: 'schedules',
    })
  }

  return (
    <div className="page" style={{ padding: '12px 24px' }}>
      <div style={{ marginBottom: 10 }}>
        <span style={{ fontSize: 12, color: '#718096' }}>
          {alerts.length === 0 ? 'All clear — no active tasks.' : `${alerts.length} active task${alerts.length !== 1 ? 's' : ''}`}
        </span>
      </div>

      <div style={{ background: 'white', borderRadius: 16, border: '1px solid #E2E8F0', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
            <tr>
              <th style={{ ...cell, width: '60%', fontWeight: 700, fontSize: 11, color: '#718096', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Task</th>
              <th style={{ ...cell, width: '20%', fontWeight: 700, fontSize: 11, color: '#718096', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Priority</th>
              <th style={{ ...cell, width: '20%', fontWeight: 700, fontSize: 11, color: '#718096', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {alerts.length === 0 ? (
              <tr>
                <td colSpan={3} style={{ padding: '48px 18px', textAlign: 'center', color: '#A0AEC0' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 36, display: 'block', marginBottom: 10 }}>notifications_none</span>
                  No alerts at this time
                </td>
              </tr>
            ) : alerts.map((a, i) => (
              <tr
                key={i}
                className="hover-lift"
                style={{ cursor: 'pointer', borderBottom: '1px solid #EEF1F5' }}
                onClick={() => a.workflowId ? navigate(`/workflows?focus=${a.workflowId}`) : a.page && go(a.page)}
              >
                <td style={cell}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 32, height: 32, background: a.iconBg, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 16, color: a.iconColor }}>{a.icon}</span>
                    </div>
                    <div>
                      <div style={{ fontWeight: 600 }}>{a.issue}</div>
                      {a.detail && <div style={{ fontSize: 12, color: '#718096', marginTop: 2 }}>{a.detail}</div>}
                    </div>
                  </div>
                </td>
                <td style={cell}>
                  <span className={`badge ${PRIORITY_BADGE[a.priority] || 'badge-gray'}`} style={{ fontSize: 11 }}>{a.priority}</span>
                </td>
                <td style={cell}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      if (a.workflowId) navigate(`/workflows?focus=${a.workflowId}`)
                      else if (a.page) go(a.page)
                    }}
                    style={{ background: 'none', border: '1px solid #E2E8F0', borderRadius: 8, padding: '4px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', color: '#0F62FE' }}
                  >
                    View →
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
