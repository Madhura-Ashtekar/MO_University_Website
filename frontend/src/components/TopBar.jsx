import React from 'react'

export function TopBar({ title, crumbs, extra, go, toggleChat, demoMeta, serverHealthy }) {
  return (
    <div style={{ background: 'white', borderBottom: '1px solid #E2E8F0', padding: '0 28px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 30 }}>
      <div>
        <div style={{ marginBottom: 2 }}>
          {crumbs.map((c, i) => (
            <span key={c.label}>
              {i < crumbs.length - 1 ? (
                <>
                  <span onClick={() => go(c.link)} style={{ cursor: 'pointer', color: '#718096', fontSize: 12 }}>{c.label}</span>
                  <span style={{ margin: '0 5px', color: '#CBD5E0', fontSize: 12 }}>/</span>
                </>
              ) : (
                <span style={{ color: '#374151', fontWeight: 600, fontSize: 12 }}>{c.label}</span>
              )}
            </span>
          ))}
        </div>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: '#0D1117', margin: 0 }}>{title}</h1>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 12, background: serverHealthy ? '#F0FFF4' : '#FFF1F2', border: `1px solid ${serverHealthy ? '#C6F6D5' : '#FECDD3'}` }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: serverHealthy ? '#38A169' : '#E53E3E' }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: serverHealthy ? '#276749' : '#9B1C1C' }}>
            {serverHealthy ? 'Connected' : 'Offline'}
          </span>
        </div>
        {extra || null}
        <button className="btn-secondary" style={{ padding: '8px 14px', fontSize: 13 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>search</span> Search
        </button>
        <button className="btn-primary" style={{ padding: '8px 14px', fontSize: 13, background: '#EBF2FF', color: '#0F62FE', border: 'none' }} onClick={toggleChat}>
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>auto_awesome</span> AI Assistant
        </button>
      </div>
    </div>
  )
}
