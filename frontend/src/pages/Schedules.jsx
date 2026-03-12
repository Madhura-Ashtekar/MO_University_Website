import React, { useState, useEffect, useMemo } from 'react'
import { apiFetch } from '../api/client'
import { fmtTime12 } from '../utils/format'

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']
const DAY_LABELS = ['SUN','MON','TUE','WED','THU','FRI','SAT']

function daysInMonth(year, month) { return new Date(year, month + 1, 0).getDate() }
function firstDayOfWeek(year, month) { return new Date(year, month, 1).getDay() }
function toYYYYMM(year, month) { return `${year}-${String(month + 1).padStart(2, '0')}` }

export function PageSchedules({ S, go, onDaySelect }) {
  const now = new Date()
  const [calYear, setCalYear] = useState(now.getFullYear())
  const [calMonth, setCalMonth] = useState(now.getMonth())
  const [events, setEvents] = useState([])
  const [loadingEvents, setLoadingEvents] = useState(false)

  const selected = S.calDay || now.getDate()
  const today = now.getDate()
  const isCurrentMonth = calYear === now.getFullYear() && calMonth === now.getMonth()

  useEffect(() => {
    setLoadingEvents(true)
    apiFetch(`/calendar?month=${toYYYYMM(calYear, calMonth)}`)
      .then((data) => setEvents(data.events || []))
      .catch(() => setEvents([]))
      .finally(() => setLoadingEvents(false))
  }, [calYear, calMonth])

  const prevMonth = () => {
    if (calMonth === 0) { setCalYear((y) => y - 1); setCalMonth(11) }
    else setCalMonth((m) => m - 1)
  }
  const nextMonth = () => {
    if (calMonth === 11) { setCalYear((y) => y + 1); setCalMonth(0) }
    else setCalMonth((m) => m + 1)
  }
  const goToday = () => { setCalYear(now.getFullYear()); setCalMonth(now.getMonth()); onDaySelect(today) }

  const totalDays = daysInMonth(calYear, calMonth)
  const startDow = firstDayOfWeek(calYear, calMonth)

  const eventsByDay = useMemo(() => {
    const map = {}
    for (const e of events) {
      const day = Number(e.date.split('-')[2])
      if (!map[day]) map[day] = []
      map[day].push(e)
    }
    return map
  }, [events])

  const selectedDateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(selected).padStart(2, '0')}`
  const dayEvents = (eventsByDay[selected] || []).filter((e) => {
    const y = Number(e.date.split('-')[0])
    const m = Number(e.date.split('-')[1]) - 1
    return y === calYear && m === calMonth
  })

  const SPORT_COLORS = ['#0F62FE','#6D28D9','#059669','#D97706','#DC2626','#0891B2']
  const sportColorMap = useMemo(() => {
    const seen = {}
    let idx = 0
    for (const e of events) {
      const key = e.sport || e.team_name || 'default'
      if (!seen[key]) seen[key] = SPORT_COLORS[idx++ % SPORT_COLORS.length]
    }
    return seen
  }, [events])

  const eventColor = (e) => sportColorMap[e.sport || e.team_name || 'default'] || '#0F62FE'

  // Build calendar grid cells
  const cells = []
  for (let i = 0; i < startDow; i++) cells.push({ d: null, off: true })
  for (let d = 1; d <= totalDays; d++) cells.push({ d })
  while (cells.length % 7 !== 0) cells.push({ d: null, off: true })

  return (
    <div className="page" style={{ padding: '24px 32px', maxWidth: 1400, margin: '0 auto' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 24, alignItems: 'start' }}>

        {/* Main Calendar */}
        <div style={{ background: 'white', borderRadius: 20, border: '1px solid #E2E8F0', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid #EEF1F5', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#FAFBFC' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ display: 'flex', gap: 4 }}>
                <button className="btn-secondary" style={{ padding: '8px 10px' }} onClick={prevMonth}><span className="material-symbols-outlined" style={{ fontSize: 18 }}>chevron_left</span></button>
                <button className="btn-secondary" style={{ padding: '8px 10px' }} onClick={nextMonth}><span className="material-symbols-outlined" style={{ fontSize: 18 }}>chevron_right</span></button>
              </div>
              <h2 style={{ fontSize: 20, fontWeight: 900, margin: 0 }}>
                {MONTH_NAMES[calMonth]} {calYear}
                {loadingEvents && <span className="material-symbols-outlined" style={{ fontSize: 16, marginLeft: 8, color: '#A0AEC0', verticalAlign: 'middle', animation: 'spin 1s linear infinite' }}>sync</span>}
              </h2>
              {!isCurrentMonth && <button className="btn-secondary" style={{ padding: '6px 14px', fontSize: 13, fontWeight: 700 }} onClick={goToday}>Today</button>}
            </div>
            <div style={{ display: 'flex', background: '#F1F5F9', padding: 4, borderRadius: 10 }}>
              <button className="btn-primary" style={{ padding: '6px 16px', fontSize: 12, borderRadius: 8 }}>Month</button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid #EEF1F5' }}>
            {DAY_LABELS.map((d) => (
              <div key={d} style={{ padding: '12px 0', textAlign: 'center', fontSize: 11, fontWeight: 800, color: '#A0AEC0', letterSpacing: '0.08em' }}>{d}</div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gridAutoRows: 'minmax(100px, auto)' }}>
            {cells.map((cell, i) => {
              const isToday = !cell.off && isCurrentMonth && cell.d === today
              const isSel = !cell.off && cell.d === selected
              const dayEvs = cell.d ? (eventsByDay[cell.d] || []).filter((e) => {
                const y = Number(e.date.split('-')[0])
                const m = Number(e.date.split('-')[1]) - 1
                return y === calYear && m === calMonth
              }) : []
              return (
                <div
                  key={i}
                  className="cal-cell"
                  onClick={() => !cell.off && cell.d && onDaySelect(cell.d)}
                  style={{
                    padding: 8,
                    borderRight: '1px solid #EEF1F5',
                    borderBottom: '1px solid #EEF1F5',
                    background: cell.off ? '#F8FAFC' : isSel ? '#F0F7FF' : 'white',
                    cursor: cell.off ? 'default' : 'pointer',
                    minHeight: 100,
                    transition: 'all 0.15s ease',
                    ...(isToday ? { boxShadow: 'inset 0 0 0 2px #0F62FE' } : {}),
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 800, color: cell.off ? '#CBD5E0' : isToday ? '#0F62FE' : '#475569', marginBottom: 6, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span>{cell.d}</span>
                    {isToday && <span style={{ fontSize: 9, background: '#0F62FE', color: 'white', padding: '1px 5px', borderRadius: 4 }}>TODAY</span>}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {dayEvs.slice(0, 2).map((e, idx) => (
                      <div key={idx} style={{ background: eventColor(e), opacity: 0.9, borderRadius: 4, padding: '2px 6px' }}>
                        <div style={{ fontSize: 9, fontWeight: 900, opacity: 0.8 }}>{e.time ? fmtTime12(e.time) : 'TBD'}</div>
                        <div style={{ fontSize: 10, fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'white' }}>{e.team_name}</div>
                      </div>
                    ))}
                    {dayEvs.length > 2 && <div style={{ fontSize: 10, color: '#718096', fontWeight: 700, paddingLeft: 2 }}>+{dayEvs.length - 2} more</div>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Day Detail Sidebar */}
        <div style={{ background: 'white', borderRadius: 20, border: '1px solid #E2E8F0', overflow: 'hidden', position: 'sticky', top: 84, boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #EEF1F5', background: '#FAFBFC' }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: '#A0AEC0', display: 'block', marginBottom: 4 }}>
              {MONTH_NAMES[calMonth].toUpperCase()} {selected}, {calYear}
            </span>
            <span style={{ fontSize: 16, fontWeight: 900 }}>{dayEvents.length} Meals Scheduled</span>
          </div>
          <div style={{ padding: '8px 0', maxHeight: 'calc(100vh - 280px)', overflowY: 'auto' }}>
            {dayEvents.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 32, color: '#CBD5E0', marginBottom: 12 }}>event_busy</span>
                <div style={{ fontSize: 13, color: '#718096' }}>No meals on this date.</div>
                <button className="btn-primary" style={{ marginTop: 16, fontSize: 12 }} onClick={() => go('new-schedule')}>+ Add Meal</button>
              </div>
            ) : (
              dayEvents.map((e, i) => (
                <div key={i} style={{ padding: 16, borderBottom: '1px solid #F1F5F9' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span style={{ background: eventColor(e), width: 8, height: 8, borderRadius: '50%', flexShrink: 0 }} />
                    <span style={{ fontSize: 12, fontWeight: 900 }}>{e.time ? fmtTime12(e.time) : 'Time TBD'} · {e.meal_type}</span>
                    <span className="badge badge-blue" style={{ marginLeft: 'auto', fontSize: 9 }}>{e.headcount} Pax</span>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 4 }}>{e.team_name}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#718096' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 14 }}>location_on</span> {e.location_type}
                    </div>
                    {e.notes && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#718096' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>notes</span> {e.notes}
                      </div>
                    )}
                  </div>
                  <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                    <button className="btn-secondary" style={{ flex: 1, padding: '6px', fontSize: 11 }} onClick={() => go('workflows')}>Details</button>
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
