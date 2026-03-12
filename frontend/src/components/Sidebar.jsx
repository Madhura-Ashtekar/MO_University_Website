import React from 'react'

export function Sidebar({ navItems, page, go }) {
  return (
    <aside style={{ width: 220, minWidth: 220, height: '100vh', position: 'sticky', top: 0, background: 'white', borderRight: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', padding: '0 12px 24px', zIndex: 40, overflow: 'hidden' }}>
      <div style={{ padding: '18px 6px 20px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid #EEF1F5', marginBottom: 12 }}>
        <div style={{ width: 34, height: 34, background: '#0F62FE', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'white' }}>restaurant</span>
        </div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#0D1117', lineHeight: 1 }}>Meal Outpost</div>
          <div style={{ fontSize: 10, color: '#718096', marginTop: 2 }}>Athletics</div>
        </div>
      </div>

      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: '#A0AEC0', letterSpacing: '0.08em', padding: '0 14px', marginBottom: 6 }}>MAIN MENU</div>
        {navItems.map((item) => {
          const active = page === item.id
          return (
            <button key={item.id} className={`sidebar-item${active ? ' active' : ''}`} onClick={() => go(item.id)}>
              <span className="material-symbols-outlined icon" style={{ fontSize: 20 }}>{item.icon}</span>
              <span>{item.label}</span>
              {item.nb && <span style={{ marginLeft: 'auto', fontSize: 9, background: '#0F62FE', color: 'white', padding: '1px 6px', borderRadius: 10, fontWeight: 700 }}>NEW</span>}
            </button>
          )
        })}
      </nav>

      <div style={{ borderTop: '1px solid #EEF1F5', paddingTop: 14, display: 'flex', alignItems: 'center', gap: 10, paddingLeft: 4 }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#EBF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #E2E8F0', flexShrink: 0 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#0F62FE' }}>person</span>
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700 }}>Jane Crawford</div>
          <div style={{ fontSize: 10, color: '#718096' }}>Nutritionist</div>
        </div>
        <button onClick={() => go('dashboard')} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }} title="Settings">
          <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#A0AEC0' }}>settings</span>
        </button>
      </div>
    </aside>
  )
}
