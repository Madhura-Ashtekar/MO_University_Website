import React from 'react'

export function PageSchedules({ S, go, onDaySelect }) {
  const events = [
    { d:9, team:'Duke Baseball', time:'12:00 PM', type:'Lunch', color:'#0F62FE', pax:45, loc:'Scott Stadium', vendor:'Cracked Eggery' },
    { d:9, team:'Duke Baseball', time:'6:00 PM', type:'Dinner', color:'#6D28D9', pax:45, loc:'Hotel', vendor:'TBD' },
    { d:10, team:'Wrestling', time:'8:00 AM', type:'Breakfast', color:'#0F62FE', pax:25, loc:'Hotel', vendor:'Hotel B' },
    { d:12, team:'Duke Baseball', time:'11:30 AM', type:'Lunch', color:'#0F62FE', pax:45, loc:'Field', vendor:'TBD' },
    { d:13, team:'Wrestling', time:'5:00 PM', type:'Post-Match', color:'#059669', pax:30, loc:'Arena', vendor:'Local D' },
  ]
  const today = 10
  const selected = S.calDay || today
  const dayEvents = events.filter((e) => e.d === selected)

  return (
    <div className="page" style={{ padding: '24px 32px', maxWidth: 1400, margin: '0 auto' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 24, alignItems: 'start' }}>
        
        {/* Main Calendar View */}
        <div style={{ background: 'white', borderRadius: 20, border: '1px solid #E2E8F0', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid #EEF1F5', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#FAFBFC' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ display: 'flex', gap: 4 }}>
                <button className="btn-secondary" style={{ padding: '8px 10px' }}><span className="material-symbols-outlined" style={{ fontSize: 18 }}>chevron_left</span></button>
                <button className="btn-secondary" style={{ padding: '8px 10px' }}><span className="material-symbols-outlined" style={{ fontSize: 18 }}>chevron_right</span></button>
              </div>
              <h2 style={{ fontSize: 20, fontWeight: 900, margin: 0 }}>March 2026</h2>
              <button className="btn-secondary" style={{ padding: '6px 14px', fontSize: 13, fontWeight: 700 }}>Today</button>
            </div>
            <div style={{ display: 'flex', background: '#F1F5F9', padding: 4, borderRadius: 10 }}>
              <button className="btn-primary" style={{ padding: '6px 16px', fontSize: 12, borderRadius: 8 }}>Month</button>
              <button className="btn-secondary" style={{ padding: '6px 16px', fontSize: 12, borderRadius: 8, background: 'transparent', border: 'none' }}>Week</button>
              <button className="btn-secondary" style={{ padding: '6px 16px', fontSize: 12, borderRadius: 8, background: 'transparent', border: 'none' }}>Day</button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid #EEF1F5' }}>
            {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map((d) => (
              <div key={d} style={{ padding: '12px 0', textAlign: 'center', fontSize: 11, fontWeight: 800, color: '#A0AEC0', letterSpacing: '0.08em' }}>{d}</div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gridAutoRows: 'minmax(120px, auto)' }}>
            {[
              { d: 1, off: true }, { d: 2, off: true }, { d: 3, off: true }, { d: 4, off: true }, { d: 5, off: true }, { d: 6, off: true }, { d: 7, off: true },
              { d: 1 }, { d: 2 }, { d: 3 }, { d: 4 }, { d: 5 }, { d: 6 }, { d: 7 },
              { d: 8 }, { d: 9 }, { d: 10 }, { d: 11 }, { d: 12 }, { d: 13 }, { d: 14 },
              { d: 15 }, { d: 16 }, { d: 17 }, { d: 18 }, { d: 19 }, { d: 20 }, { d: 21 },
              { d: 22 }, { d: 23 }, { d: 24 }, { d: 25 }, { d: 26 }, { d: 27 }, { d: 28 },
              { d: 29 }, { d: 30 }, { d: 31 }, { d: 1, off: true }, { d: 2, off: true }, { d: 3, off: true }, { d: 4, off: true },
            ].map((cell, i) => {
              const isToday = !cell.off && cell.d === today
              const isSel = !cell.off && cell.d === selected
              const dayEvs = events.filter((e) => !cell.off && e.d === cell.d)
              return (
                <div
                  key={i}
                  className="cal-cell"
                  onClick={() => !cell.off && onDaySelect(cell.d)}
                  style={{
                    padding: 10,
                    borderRight: '1px solid #EEF1F5',
                    borderBottom: '1px solid #EEF1F5',
                    background: cell.off ? '#F8FAFC' : isSel ? '#F0F7FF' : 'white',
                    cursor: cell.off ? 'default' : 'pointer',
                    minHeight: 120,
                    transition: 'all 0.2s ease',
                    position: 'relative',
                    ...(isToday ? { boxShadow: 'inset 0 0 0 2px #0F62FE' } : {}),
                    ...(isSel ? { background: '#F0F7FF', zIndex: 1 } : {}),
                  }}
                >
                  <div style={{
                    fontSize: 13,
                    fontWeight: 800,
                    color: cell.off ? '#CBD5E0' : isToday ? '#0F62FE' : '#475569',
                    marginBottom: 8,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    <span>{cell.d}</span>
                    {isToday && <span style={{ fontSize: 9, background: '#0F62FE', color: 'white', padding: '1px 5px', borderRadius: 4 }}>TODAY</span>}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {dayEvs.map((e, idx) => (
                      <div key={idx} className="cal-event" style={{ background: e.color, opacity: 0.9 }}>
                        <div style={{ fontSize: 9, fontWeight: 900, opacity: 0.8, marginBottom: 1 }}>{e.time}</div>
                        <div style={{ fontSize: 10, fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.team}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Day Detail Sidebar */}
        <div style={{ background: 'white', borderRadius: 20, border: '1px solid #E2E8F0', overflow: 'hidden', position: 'sticky', top: 84, boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #EEF1F5', background: '#FAFBFC' }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: '#A0AEC0', display: 'block', marginBottom: 4 }}>MARCH {selected}, 2026</span>
            <span style={{ fontSize: 16, fontWeight: 900 }}>{dayEvents.length} Meals Scheduled</span>
          </div>
          <div style={{ padding: '8px 0' }}>
            {dayEvents.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 32, color: '#CBD5E0', marginBottom: 12 }}>event_busy</span>
                <div style={{ fontSize: 13, color: '#718096' }}>No meals planned for this date.</div>
                <button className="btn-primary" style={{ marginTop: 16, fontSize: 12 }} onClick={() => go('new-schedule')}>+ Add Meal</button>
              </div>
            ) : (
              dayEvents.map((e, i) => (
                <div key={i} style={{ padding: 16, borderBottom: '1px solid #F1F5F9', position: 'relative' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span style={{ background: e.color, width: 8, height: 8, borderRadius: '50%' }} />
                    <span style={{ fontSize: 12, fontWeight: 900 }}>{e.time} · {e.type}</span>
                    <span className="badge badge-blue" style={{ marginLeft: 'auto', fontSize: 9 }}>{e.pax} Pax</span>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 4 }}>{e.team}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#718096' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 14 }}>location_on</span> {e.loc}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#718096' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 14 }}>storefront</span> {e.vendor}
                    </div>
                  </div>
                  <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                    <button className="btn-secondary" style={{ flex: 1, padding: '6px', fontSize: 11 }} onClick={() => go('workflows')}>Details</button>
                    <button className="btn-secondary" style={{ padding: '6px' }}><span className="material-symbols-outlined" style={{ fontSize: 16 }}>edit</span></button>
                  </div>
                </div>
              ))
            )}
          </div>
          {dayEvents.length > 0 && (
            <div style={{ padding: 16, background: '#F8FAFC', borderTop: '1px solid #EEF1F5' }}>
              <button className="btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => go('new-schedule')}>+ Add Another</button>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
