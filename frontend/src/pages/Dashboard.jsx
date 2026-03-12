import React, { useState, useEffect } from 'react'
import { apiFetch } from '../api/client'
import { fmtTime12 } from '../utils/format'

function todayYMD() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function currentYYYYMM() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function PageDashboard({ go, toggleChat, serverMeta, showToast }) {
  const [todayMeals, setTodayMeals] = useState([])
  const [upcomingMeals, setUpcomingMeals] = useState([])
  const [loadingMeals, setLoadingMeals] = useState(false)

  useEffect(() => {
    setLoadingMeals(true)
    const ymd = todayYMD()
    apiFetch(`/calendar?month=${currentYYYYMM()}`)
      .then((data) => {
        const all = data.events || []
        const todayList = all.filter((e) => e.date === ymd).sort((a, b) => (a.time || '99:99').localeCompare(b.time || '99:99'))
        const upcoming = all.filter((e) => e.date > ymd).sort((a, b) => `${a.date}${a.time || ''}`.localeCompare(`${b.date}${b.time || ''}`)).slice(0, 4)
        setTodayMeals(todayList)
        setUpcomingMeals(upcoming)
      })
      .catch(() => {})
      .finally(() => setLoadingMeals(false))
  }, [])

  const tbdCount = serverMeta?.openTbd ?? 0
  const workflowCount = serverMeta?.workflows ?? 0
  const actionItems = [
    { icon:'assignment_late', ibg:'#FFF0EB', itx:'#9A3412', count:String(tbdCount), label:'TBD meals to resolve', sub:'Need vendor assignment', page:'workflows' },
    { icon:'event_upcoming', ibg:'#EDE9FE', itx:'#5B21B6', count:String(upcomingMeals.length), label:'Upcoming Meals', sub: upcomingMeals[0] ? `Next: ${upcomingMeals[0].team_name}` : 'None scheduled yet', page:'schedules' },
    { icon:'list_alt', ibg:'#EBF2FF', itx:'#1E40AF', count:String(workflowCount), label:'Workflows', sub:'Trips and schedules submitted', page:'workflows' },
    { icon:'restaurant', ibg:'#F0FFF4', itx:'#065F46', count:String(todayMeals.length), label:"Today's Meals", sub: todayMeals.length > 0 ? 'Active deliveries today' : 'No meals scheduled today', page:'schedules' },
  ]

  const MEAL_STATUS_COLOR = { 'mo_delivery': 'green', 'mo_pickup': 'blue', 'not_mo': 'gray', 'tbd': 'amber' }

  return (
    <div className="page" style={{ padding: '24px 32px', maxWidth: 1280, margin: '0 auto' }}>

      {/* 1. PRIMARY ACTIONS */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#A0AEC0', letterSpacing: '0.08em' }}>QUICK ACTIONS</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
          {[
            { icon:'add_circle', label:'New Schedule', sub:'Manual guided setup', page:'new-schedule' },
            { icon:'auto_awesome', label:'Quick Intake', sub:'Paste email / Upload doc', page:'intake' },
            { icon:'edit_calendar', label:'Change Menu', sub:'Modify existing meals', page:'schedules' },
            { icon:'download', label:'Export Report', sub:'Generate PDF/CSV', page:null },
          ].map((q) => (
            <button
              key={q.label}
              onClick={() => q.page ? go(q.page) : showToast?.('Export reports coming soon!', 'info')}
              className="hover-lift"
              style={{ display:'flex', alignItems:'center', gap:14, padding:'16px 20px', borderRadius:16, background:'white', border:'1px solid #E2E8F0', cursor:'pointer', fontFamily:"'DM Sans',sans-serif", textAlign:'left', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}
            >
              <div style={{ width:44, height:44, background:'#EBF2FF', borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <span className="material-symbols-outlined" style={{ fontSize:24, color:'#0F62FE' }}>{q.icon}</span>
              </div>
              <div style={{ minWidth:0 }}>
                <div style={{ fontSize:14, fontWeight:800, color:'#0D1117' }}>{q.label}</div>
                <div style={{ fontSize:11, color:'#718096', marginTop:2 }}>{q.sub}</div>
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
            <div key={a.label} className="action-card" onClick={() => go(a.page)} style={{ padding:'16px 18px', borderRadius:16 }}>
              <div style={{ width:36, height:36, background:a.ibg, borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <span className="material-symbols-outlined" style={{ fontSize:18, color:a.itx }}>{a.icon}</span>
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:2 }}>
                  <span style={{ fontSize:13, fontWeight:700 }}>{a.label}</span>
                  <span style={{ fontSize:11, fontWeight:800, color:a.itx, background:a.ibg, width:18, height:18, borderRadius:'50%', display:'inline-flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>{a.count}</span>
                </div>
                <div style={{ fontSize:10, color:'#718096', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{a.sub}</div>
              </div>
              <span className="material-symbols-outlined action-arr" style={{ fontSize:16 }}>arrow_forward</span>
            </div>
          ))}
        </div>
      </div>

      {/* 3. MAIN OPERATIONAL GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>

        {/* Today's Schedule — LIVE */}
        <div style={{ background: 'white', borderRadius: 18, border: '1px solid #E2E8F0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #EEF1F5', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="material-symbols-outlined" style={{ color: '#0F62FE', fontSize: 22 }}>schedule</span>
              <span style={{ fontSize: 15, fontWeight: 800 }}>Today's Schedule</span>
            </div>
            <span style={{ fontSize: 12, color: '#718096', fontWeight: 600 }}>{new Date().toLocaleDateString('en-US', { weekday:'long', month:'short', day:'numeric' })}</span>
          </div>
          <div style={{ maxHeight: 300, overflowY: 'auto' }}>
            {loadingMeals && (
              <div style={{ padding: 32, textAlign: 'center' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 24, color: '#CBD5E0', animation: 'spin 1s linear infinite' }}>sync</span>
              </div>
            )}
            {!loadingMeals && todayMeals.length === 0 && (
              <div style={{ padding: 32, textAlign: 'center', color: '#718096' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 28, color: '#CBD5E0', marginBottom: 8 }}>restaurant</span>
                <div style={{ fontSize: 13 }}>No meals scheduled for today.</div>
                <button className="btn-primary" style={{ marginTop: 12, fontSize: 12 }} onClick={() => go('new-schedule')}>Schedule a meal</button>
              </div>
            )}
            {!loadingMeals && todayMeals.map((s, i) => {
              const statusType = MEAL_STATUS_COLOR[s.fulfillment_type] || 'gray'
              return (
                <div key={i} style={{ padding:'12px 20px', display:'flex', alignItems:'center', gap:14, borderBottom:'1px solid #F8FAFC' }}>
                  <div style={{ width:52, textAlign:'center', flexShrink:0 }}>
                    {s.time ? (
                      <>
                        <div style={{ fontSize:13, fontWeight:800 }}>{fmtTime12(s.time).split(' ')[0]}</div>
                        <div style={{ fontSize:9, color:'#718096', fontWeight:700 }}>{fmtTime12(s.time).split(' ')[1]}</div>
                      </>
                    ) : (
                      <div style={{ fontSize:11, fontWeight:700, color:'#A0AEC0' }}>TBD</div>
                    )}
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:2 }}>
                      <span style={{ fontSize:13, fontWeight:700 }}>{s.meal_type} – {s.team_name}</span>
                      <span className={`badge badge-${statusType}`} style={{ fontSize:9, padding:'2px 6px' }}>{s.fulfillment_type === 'mo_delivery' ? 'Delivery' : s.fulfillment_type === 'mo_pickup' ? 'Pickup' : s.fulfillment_type === 'tbd' ? 'TBD' : 'Logged'}</span>
                    </div>
                    <div style={{ fontSize:11, color:'#718096', display:'flex', gap:10 }}>
                      <span style={{ display:'flex', alignItems:'center', gap:3 }}>
                        <span className="material-symbols-outlined" style={{ fontSize:13 }}>location_on</span> {s.location_type}
                      </span>
                      <span style={{ display:'flex', alignItems:'center', gap:3 }}>
                        <span className="material-symbols-outlined" style={{ fontSize:13 }}>group</span> {s.headcount} Pax
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Upcoming Deliveries — LIVE */}
        <div style={{ background: 'white', borderRadius: 18, border: '1px solid #E2E8F0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #EEF1F5', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="material-symbols-outlined" style={{ color: '#0F62FE', fontSize: 22 }}>local_shipping</span>
              <span style={{ fontSize: 15, fontWeight: 800 }}>Upcoming Meals</span>
            </div>
            <button onClick={() => go('schedules')} style={{ color: '#0F62FE', fontSize: 12, fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer' }}>Full Calendar →</button>
          </div>
          <div style={{ padding: '10px 0' }}>
            {!loadingMeals && upcomingMeals.length === 0 && (
              <div style={{ padding: 32, textAlign: 'center', color: '#718096' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 28, color: '#CBD5E0', marginBottom: 8 }}>calendar_month</span>
                <div style={{ fontSize: 13 }}>No upcoming meals this month.</div>
              </div>
            )}
            {upcomingMeals.map((d, i) => {
              const dateParts = d.date.split('-')
              const day = Number(dateParts[2])
              const mo = new Date(d.date).toLocaleDateString('en-US', { month: 'short' }).toUpperCase()
              return (
                <div key={i} className="hover-lift" style={{ padding:'10px 20px', display:'flex', alignItems:'center', gap:14, cursor:'pointer', borderBottom:'1px solid #F8FAFC' }} onClick={() => go('schedules')}>
                  <div style={{ background:'#F0F4F8', borderRadius:12, width:44, height:44, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', flexShrink:0, border:'1px solid #E2E8F0' }}>
                    <span style={{ fontSize:8, fontWeight:800, color:'#718096' }}>{mo}</span>
                    <span style={{ fontSize:16, fontWeight:900, color:'#0D1117', lineHeight:1 }}>{day}</span>
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13, fontWeight:800, marginBottom:1, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{d.meal_type} – {d.team_name}</div>
                    <div style={{ fontSize:11, color:'#718096' }}>{d.location_type}{d.headcount ? ` · ${d.headcount} Pax` : ''}</div>
                  </div>
                  <span className={`badge badge-${MEAL_STATUS_COLOR[d.fulfillment_type] || 'gray'}`} style={{ fontSize:9, padding:'2px 6px' }}>
                    {d.fulfillment_type === 'tbd' ? 'TBD' : d.fulfillment_type === 'mo_delivery' ? 'Delivery' : d.fulfillment_type === 'mo_pickup' ? 'Pickup' : 'Logged'}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

      </div>

      {/* 4. AI Snapshot */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
          {[
            { icon:'local_shipping', val: String(todayMeals.filter(m => m.fulfillment_type !== 'not_mo').length), label:'Deliveries Today', badge:'badge-green', badgeText:'Live', iconBg:'#EBF2FF', iconColor:'#0F62FE' },
            { icon:'groups', val: String(todayMeals.reduce((s, m) => s + (m.headcount || 0), 0)), label:'Meals Served Today', badge:'badge-gray', badgeText:'Active', iconBg:'#EDE9FE', iconColor:'#6D28D9' },
            { icon:'assignment_late', val: String(tbdCount), label:'TBD to Resolve', badge:tbdCount > 0 ? 'badge-orange' : 'badge-green', badgeText: tbdCount > 0 ? 'Needs Attention' : 'Clear', iconBg:'#FFF0EB', iconColor:'#9A3412' },
          ].map((s) => (
            <div key={s.label} style={{ background:'white', borderRadius:16, border:'1px solid #E2E8F0', padding:18, boxShadow:'0 1px 3px rgba(0,0,0,0.03)', display:'flex', flexDirection:'column', justifyContent:'center' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
                <div style={{ width:32, height:32, background:s.iconBg, borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <span className="material-symbols-outlined" style={{ fontSize:16, color:s.iconColor }}>{s.icon}</span>
                </div>
                <span className={`badge ${s.badge}`} style={{ fontSize:10 }}>{s.badgeText}</span>
              </div>
              <div style={{ fontSize:24, fontWeight:900 }}>{s.val}</div>
              <div style={{ fontSize:11, color:'#A0AEC0', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.04em', marginTop:4 }}>{s.label}</div>
            </div>
          ))}
        </div>
        <div style={{ background:'linear-gradient(145deg, #F0F7FF 0%, #FFFFFF 100%)', borderRadius:18, border:'1.5px solid #BFDBFE', padding:18, boxShadow:'0 4px 12px rgba(15,98,254,0.05)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
            <span className="material-symbols-outlined" style={{ color:'#0F62FE', fontSize:18 }}>auto_awesome</span>
            <span style={{ fontWeight:800, fontSize:13, letterSpacing:'-0.01em' }}>AI DAILY SNAPSHOT</span>
            <span style={{ marginLeft:'auto', fontSize:9, background:'#0F62FE', color:'white', padding:'2px 7px', borderRadius:8, fontWeight:800 }}>BETA</span>
          </div>
          <div className="chat-ai" style={{ marginBottom:14, fontSize:12, lineHeight:1.5, color:'#1E293B' }}>
            {todayMeals.length > 0
              ? <>You have <strong>{todayMeals.length} meal{todayMeals.length > 1 ? 's' : ''}</strong> scheduled for today across {new Set(todayMeals.map(m => m.team_name)).size} team{new Set(todayMeals.map(m => m.team_name)).size > 1 ? 's' : ''}.</>
              : <>No meals scheduled for today. Use Quick Intake to add an upcoming trip.</>
            }
            {tbdCount > 0 && <> You have <strong>{tbdCount} TBD meal{tbdCount > 1 ? 's' : ''}</strong> waiting for vendor assignment.</>}
          </div>
          <button onClick={toggleChat} className="btn-primary" style={{ width:'100%', justifyContent:'center', padding:'10px', fontSize:12, borderRadius:10 }}>Open Assistant</button>
        </div>
      </div>

    </div>
  )
}
