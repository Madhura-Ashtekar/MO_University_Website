import React from 'react'

export function PageDashboard({ go, toggleChat, serverMeta }) {
  const stats = [
    { icon:'local_shipping', val:'24', label:'Deliveries this week', badge:'badge-green', badgeText:'+12%', iconBg:'#EBF2FF', iconColor:'#0F62FE' },
    { icon:'groups', val:'1,250', label:'Meals served', badge:'badge-gray', badgeText:'Active', iconBg:'#EDE9FE', iconColor:'#6D28D9' },
    { icon:'attach_money', val:'$8.4k', label:'Monthly Spend', badge:'badge-teal', badgeText:'On Track', iconBg:'#E6FAF7', iconColor:'#065F46' },
  ]
  const tbdCount = serverMeta?.openTbd ?? 0
  const workflowCount = serverMeta?.workflows ?? 0
  const actionItems = [
    { icon:'assignment_late', ibg:'#FFF0EB', itx:'#9A3412', count:String(tbdCount), label:'TBD meals to resolve', sub:'Need vendor assignment', page:'workflows' },
    { icon:'event_upcoming', ibg:'#EDE9FE', itx:'#5B21B6', count:'2', label:'Upcoming Events', sub:'Next: Home vs Tech, Mar 7', page:'schedules' },
    { icon:'list_alt', ibg:'#EBF2FF', itx:'#1E40AF', count:String(workflowCount), label:'Workflows', sub:'Trips and schedules submitted', page:'workflows' },
    { icon:'warning', ibg:'#FFF1F2', itx:'#9B1C1C', count:'1', label:'Budget Alert', sub:'Daily max exceeded', page:'budget' },
  ]
  const schedItems = [
    { h:'12:00', ap:'PM', title:'Team Lunch – Buffet Style', loc:'Scott Stadium', pax:'50 Pax', status:'Delivered', stype:'green', hl:false },
    { h:'05:30', ap:'PM', title:'Pre-Game Dinner', loc:'Training Center', pax:'45 Pax', status:'In Prep', stype:'blue', hl:true },
    { h:'08:00', ap:'PM', title:'Post-Game Recovery Snacks', loc:'Locker Room', pax:'50 Pax', status:'Scheduled', stype:'gray', hl:false },
  ]
  const deliv = [
    { day:'25', mo:'OCT', title:'Away: VT', sub:'Bus Meals • 60 Pax', stype:'orange', status:'Pending' },
    { day:'26', mo:'OCT', title:'Team Lunch', sub:'Stadium • 50 Pax', stype:'green', status:'Confirmed' },
    { day:'27', mo:'OCT', title:'Recovery', sub:'Hotel • 45 Pax', stype:'blue', status:'Scheduled' },
  ]

  return (
    <div className="page" style={{ padding: '24px 32px', maxWidth: 1280, margin: '0 auto' }}>
      
      {/* 1. PRIMARY ACTIONS (Was Quick Actions) */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#A0AEC0', letterSpacing: '0.08em' }}>QUICK ACTIONS</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
          {[
            { icon:'add_circle', label:'New Schedule', sub: 'Manual guided setup', page:'new-schedule' },
            { icon:'auto_awesome', label:'Quick Intake', sub: 'Paste email / Upload doc', page:'intake' },
            { icon:'edit_calendar', label:'Change Menu', sub: 'Modify existing meals', page:'schedules' },
            { icon:'download', label:'Export Report', sub: 'Generate PDF/CSV', page:null },
          ].map((q) => (
            <button 
              key={q.label} 
              onClick={() => q.page ? go(q.page) : window.alert('Coming soon!')} 
              className="hover-lift"
              style={{ 
                display:'flex', alignItems:'center', gap: 14, padding:'16px 20px', borderRadius: 16, 
                background:'white', border:'1px solid #E2E8F0', cursor:'pointer', 
                fontFamily:"'DM Sans',sans-serif", textAlign: 'left',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
              }}
            >
              <div style={{ width: 44, height: 44, background: '#EBF2FF', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 24, color: '#0F62FE' }}>{q.icon}</span>
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#0D1117' }}>{q.label}</div>
                <div style={{ fontSize: 11, color: '#718096', marginTop: 2 }}>{q.sub}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 2. ATTENTION AREA */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#A0AEC0', letterSpacing: '0.08em' }}>NEEDS YOUR ATTENTION</span>
          <button onClick={() => go('workflows')} style={{ fontSize: 12, color: '#0F62FE', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer' }}>View all workflows</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
          {actionItems.map((a) => (
            <div key={a.label} className="action-card" onClick={() => go(a.page)} style={{ padding: '16px 18px', borderRadius: 16 }}>
              <div style={{ width: 36, height: 36, background: a.ibg, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 18, color: a.itx }}>{a.icon}</span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>{a.label}</span>
                  <span style={{ fontSize: 11, fontWeight: 800, color: a.itx, background: a.ibg, width: 18, height: 18, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{a.count}</span>
                </div>
                <div style={{ fontSize: 10, color: '#718096', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.sub}</div>
              </div>
              <span className="material-symbols-outlined action-arr" style={{ fontSize: 16 }}>arrow_forward</span>
            </div>
          ))}
        </div>
      </div>

      {/* 3. MAIN OPERATIONAL GRID (Schedule + Deliveries) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
        
        {/* Today's Schedule */}
        <div style={{ background: 'white', borderRadius: 18, border: '1px solid #E2E8F0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #EEF1F5', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="material-symbols-outlined" style={{ color: '#0F62FE', fontSize: 22 }}>schedule</span>
              <span style={{ fontSize: 15, fontWeight: 800 }}>Today’s Schedule</span>
            </div>
            <span style={{ fontSize: 12, color: '#718096', fontWeight: 600 }}>Tuesday, Oct 24</span>
          </div>
          <div style={{ maxHeight: 300, overflowY: 'auto' }}>
            {schedItems.map((s) => (
              <div key={s.title} style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 14, borderBottom: '1px solid #F8FAFC', ...(s.hl ? { background: '#F0F7FF', borderLeft: '4px solid #0F62FE' } : {}) }}>
                <div style={{ width: 44, textAlign: 'center', flexShrink: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 800 }}>{s.h}</div>
                  <div style={{ fontSize: 9, color: '#718096', fontWeight: 700 }}>{s.ap}</div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>{s.title}</span>
                    <span className={`badge badge-${s.stype}`} style={{ fontSize: 9, padding: '2px 6px' }}>{s.status}</span>
                  </div>
                  <div style={{ fontSize: 11, color: '#718096', display: 'flex', gap: 10 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><span className="material-symbols-outlined" style={{ fontSize: 13 }}>location_on</span> {s.loc}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><span className="material-symbols-outlined" style={{ fontSize: 13 }}>group</span> {s.pax}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Deliveries */}
        <div style={{ background: 'white', borderRadius: 18, border: '1px solid #E2E8F0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #EEF1F5', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="material-symbols-outlined" style={{ color: '#0F62FE', fontSize: 22 }}>local_shipping</span>
              <span style={{ fontSize: 15, fontWeight: 800 }}>Upcoming Deliveries</span>
            </div>
            <button onClick={() => go('schedules')} style={{ color: '#0F62FE', fontSize: 12, fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer' }}>Full Calendar →</button>
          </div>
          <div style={{ padding: '10px 0' }}>
            {deliv.map((d) => (
              <div key={d.title} className="hover-lift" style={{ padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', borderBottom: '1px solid #F8FAFC' }}>
                <div style={{ background: '#F0F4F8', borderRadius: 12, width: 44, height: 44, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1px solid #E2E8F0' }}>
                  <span style={{ fontSize: 8, fontWeight: 800, color: '#718096' }}>{d.mo}</span>
                  <span style={{ fontSize: 16, fontWeight: 900, color: '#0D1117', lineHeight: 1 }}>{d.day}</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.title}</div>
                  <div style={{ fontSize: 11, color: '#718096' }}>{d.sub}</div>
                </div>
                <span className={`badge badge-${d.stype}`} style={{ fontSize: 9, padding: '2px 6px' }}>{d.status}</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* 4. SECONDARY SECTION (Stats + AI) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20 }}>
        
        {/* Metrics Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
          {stats.map((s) => (
            <div key={s.label} style={{ background: 'white', borderRadius: 16, border: '1px solid #E2E8F0', padding: 18, boxShadow: '0 1px 3px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ width: 32, height: 32, background: s.iconBg, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 16, color: s.iconColor }}>{s.icon}</span>
                </div>
                <span className={`badge ${s.badge}`} style={{ fontSize: 10 }}>{s.badgeText}</span>
              </div>
              <div style={{ fontSize: 24, fontWeight: 900 }}>{s.val}</div>
              <div style={{ fontSize: 11, color: '#A0AEC0', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* AI Snapshot - Stay prominent but aside */}
        <div style={{ background: 'linear-gradient(145deg, #F0F7FF 0%, #FFFFFF 100%)', borderRadius: 18, border: '1.5px solid #BFDBFE', padding: 18, boxShadow: '0 4px 12px rgba(15, 98, 254, 0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span className="material-symbols-outlined" style={{ color: '#0F62FE', fontSize: 18 }}>auto_awesome</span>
            <span style={{ fontWeight: 800, fontSize: 13, letterSpacing: '-0.01em' }}>AI DAILY SNAPSHOT</span>
            <span style={{ marginLeft: 'auto', fontSize: 9, background: '#0F62FE', color: 'white', padding: '2px 7px', borderRadius: 8, fontWeight: 800 }}>BETA</span>
          </div>
          <div className="chat-ai" style={{ marginBottom: 14, fontSize: 12, lineHeight: 1.5, color: '#1E293B' }}>
            Jane, you have <strong>3 deliveries</strong> today. The 5:30 PM dinner has <strong>12 dietary flags</strong>.
          </div>
          <button onClick={toggleChat} className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '10px', fontSize: 12, borderRadius: 10 }}>Open Assistant</button>
        </div>

      </div>

    </div>
  )
}
