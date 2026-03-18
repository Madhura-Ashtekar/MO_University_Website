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
    { icon:'assignment_late', ibg:'#FFF0EB', itx:'#9A3412', count:String(tbdCount), label:'TBD meals to resolve', sub:'Need vendor assignment', page:'orders' },
    { icon:'event_upcoming', ibg:'#EDE9FE', itx:'#5B21B6', count:String(upcomingMeals.length), label:'Upcoming Meals', sub: upcomingMeals[0] ? `Next: ${upcomingMeals[0].team_name}` : 'None scheduled yet', page:'schedules' },
    { icon:'flight_takeoff', ibg:'#EBF2FF', itx:'#1E40AF', count:String(workflowCount), label:'All Trips', sub:'View and manage submitted trips', page:'orders' },
    { icon:'restaurant', ibg:'#F0FFF4', itx:'#065F46', count:String(todayMeals.length), label:"Today's Meals", sub: todayMeals.length > 0 ? 'Active deliveries today' : 'No meals scheduled today', page:'schedules' },
  ]

  const MEAL_STATUS_COLOR = { 'mo_delivery': 'green', 'mo_pickup': 'blue', 'not_mo': 'gray', 'tbd': 'amber' }

  return (
    <div className="page" style={{ padding: '12px 24px', display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* 1. METRICS AT THE TOP */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { icon:'local_shipping', val: String(todayMeals.filter(m => m.fulfillment_type !== 'not_mo').length), label:'Total Deliveries', badge:'badge-green', badgeText:'Live', iconBg:'#EBF2FF', iconColor:'#0F62FE' },
          { icon:'groups', val: String(todayMeals.reduce((s, m) => s + (m.headcount || 0), 0)), label:'Total Meals Served', badge:'badge-gray', badgeText:'Active', iconBg:'#EDE9FE', iconColor:'#6D28D9' },
          { icon:'assignment_late', val: String(tbdCount), label:'Budget', badge:tbdCount > 0 ? 'badge-orange' : 'badge-green', badgeText: tbdCount > 0 ? 'Needs Attention' : 'Clear', iconBg:'#FFF0EB', iconColor:'#9A3412' },
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

      {/* 2. PRIMARY ACTIONS */}
      <div style={{ marginBottom: 24, position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#A0AEC0', letterSpacing: '0.08em' }}>QUICK ACTIONS</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
          {[
            { icon:'add_circle', label:'Create Schedule', page:'intake' },
            { icon:'list_alt', label:'Quick Order', page:'new-schedule' },
            { icon:'flight_takeoff', label:'My Orders', page:'workflows' },
          ].map((q) => (
            <button
              key={q.label}
              onClick={() => q.page ? go(q.page) : showToast?.('Action coming soon!', 'info')}
              className="hover-lift"
              style={{ display:'flex', alignItems:'center', gap:14, padding:'16px 20px', borderRadius:16, background:'white', border:'1px solid #E2E8F0', cursor:'pointer', fontFamily:"'DM Sans',sans-serif", textAlign:'left', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}
            >
              <div style={{ width:44, height:44, background:'#EBF2FF', borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <span className="material-symbols-outlined" style={{ fontSize:24, color:'#0F62FE' }}>{q.icon}</span>
              </div>
              <div style={{ minWidth:0 }}>
                <div style={{ fontSize:14, fontWeight:800, color:'#0D1117' }}>{q.label}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 3. MAIN OPERATIONAL GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 20, marginBottom: 24 }}>

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

    </div>
  )
}
