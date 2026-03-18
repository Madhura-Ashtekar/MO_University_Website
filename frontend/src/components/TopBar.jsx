import React from 'react'
import { useNavigate } from 'react-router-dom'

export function TopBar({ title, go, demoMeta, serverHealthy }) {
  const navigate = useNavigate()
  const alertCount = (demoMeta?.openTbd ?? 0)

  return (
    <div style={{ background: 'white', borderBottom: '1px solid #E2E8F0', padding: '0 28px', height: 48, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 30 }}>
      <h1 style={{ fontSize: 16, fontWeight: 800, color: '#0D1117', margin: 0 }}>{title}</h1>

      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <button
          onClick={() => navigate('/schedules?tab=calendar')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          title="Calendar"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#718096' }}>calendar_month</span>
        </button>
        <button
          onClick={() => go?.('tasks')}
          style={{ position: 'relative', background: 'none', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          title="Tasks"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#718096' }}>notifications</span>
          {alertCount > 0 && (
            <span style={{
              position: 'absolute', top: 2, right: 2,
              minWidth: 14, height: 14, borderRadius: 7,
              background: '#EF4444', color: 'white',
              fontSize: 8, fontWeight: 800,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '0 3px',
            }}>
              {alertCount > 99 ? '99+' : alertCount}
            </span>
          )}
        </button>
      </div>
    </div>
  )
}
