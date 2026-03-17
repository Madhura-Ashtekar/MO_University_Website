import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from '../api/client'
import { fmtTime12, fmtDateShort } from '../utils/format'
import { parseAthleticsEmailToDraft, EXAMPLE_EMAIL_BASEBALL, EXAMPLE_EMAIL_WRESTLING } from '../demo/intakeParser'
import { classifyMealRow, classificationPill } from '../utils/classify'
import { PageWorkflows } from './Workflows'

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']
const DAY_LABELS = ['SUN','MON','TUE','WED','THU','FRI','SAT']

function daysInMonth(year, month) { return new Date(year, month + 1, 0).getDate() }
function firstDayOfWeek(year, month) { return new Date(year, month, 1).getDay() }
function toYYYYMM(year, month) { return `${year}-${String(month + 1).padStart(2, '0')}` }

function parseCSV(text, headcount) {
  const lines = text.trim().split(/\r?\n/).filter(l => l.trim())
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/[\s-]+/g, '_'))
  return lines.slice(1).map(line => {
    const vals = line.split(',').map(v => v.trim())
    const row = {}
    headers.forEach((h, i) => { row[h] = vals[i] || '' })
    return {
      date: row.date || '',
      time: row.time || null,
      mealType: row.meal_type || row.meal || 'Meal',
      locationType: row.location_type || row.location || 'restaurant',
      notes: row.notes || '',
      timezone: 'America/New_York',
      headcount,
    }
  }).filter(r => r.date && /^\d{4}-\d{2}-\d{2}$/.test(r.date))
}

export function PageSchedules({ S, go, onDaySelect, onSubmitSchedule, showToast }) {
  const navigate = useNavigate()
  const now = new Date()
  const [tab, setTab] = useState('calendar')
  const [showNewTrip, setShowNewTrip] = useState(false)
  const [tripsFocusId, setTripsFocusId] = useState(null)

  // Calendar state
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
      .then(data => setEvents(data.events || []))
      .catch(() => setEvents([]))
      .finally(() => setLoadingEvents(false))
  }, [calYear, calMonth])

  const prevMonth = () => { if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11) } else setCalMonth(m => m - 1) }
  const nextMonth = () => { if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0) } else setCalMonth(m => m + 1) }
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

  const dayEvents = (eventsByDay[selected] || []).filter(e => {
    const y = Number(e.date.split('-')[0])
    const m = Number(e.date.split('-')[1]) - 1
    return y === calYear && m === calMonth
  })

  const SPORT_COLORS = ['#0F62FE','#6D28D9','#059669','#D97706','#DC2626','#0891B2']
  const sportColorMap = useMemo(() => {
    const seen = {}; let idx = 0
    for (const e of events) {
      const key = e.sport || e.team_name || 'default'
      if (!seen[key]) seen[key] = SPORT_COLORS[idx++ % SPORT_COLORS.length]
    }
    return seen
  }, [events])

  const eventColor = e => sportColorMap[e.sport || e.team_name || 'default'] || '#0F62FE'

  const cells = []
  for (let i = 0; i < startDow; i++) cells.push({ d: null, off: true })
  for (let d = 1; d <= totalDays; d++) cells.push({ d })
  while (cells.length % 7 !== 0) cells.push({ d: null, off: true })

  const openTrip = (workflowId) => {
    setTripsFocusId(workflowId)
    setTab('trips')
  }

  return (
    <div className="page" style={{ padding: '24px 32px', maxWidth: 1400, margin: '0 auto' }}>

      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 4, background: '#F1F5F9', padding: 4, borderRadius: 10 }}>
          <button
            className={tab === 'calendar' ? 'btn-primary' : 'btn-secondary'}
            style={{ padding: '8px 20px', fontSize: 13 }}
            onClick={() => setTab('calendar')}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16, verticalAlign: 'middle', marginRight: 6 }}>calendar_month</span>
            Calendar
          </button>
          <button
            className={tab === 'trips' ? 'btn-primary' : 'btn-secondary'}
            style={{ padding: '8px 20px', fontSize: 13 }}
            onClick={() => setTab('trips')}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16, verticalAlign: 'middle', marginRight: 6 }}>flight_takeoff</span>
            Trips
          </button>
        </div>
        <button className="btn-primary" style={{ gap: 6 }} onClick={() => setShowNewTrip(true)}>
          <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'white' }}>add</span>
          New Trip
        </button>
      </div>

      {/* Calendar tab */}
      {tab === 'calendar' && (
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
              {DAY_LABELS.map(d => (
                <div key={d} style={{ padding: '12px 0', textAlign: 'center', fontSize: 11, fontWeight: 800, color: '#A0AEC0', letterSpacing: '0.08em' }}>{d}</div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gridAutoRows: 'minmax(100px, auto)' }}>
              {cells.map((cell, i) => {
                const isToday = !cell.off && isCurrentMonth && cell.d === today
                const isSel = !cell.off && cell.d === selected
                const dayEvs = cell.d ? (eventsByDay[cell.d] || []).filter(e => {
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
                          <div style={{ fontSize: 9, fontWeight: 900, opacity: 0.8, color: 'white' }}>{e.time ? fmtTime12(e.time) : 'TBD'}</div>
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
                  <span className="material-symbols-outlined" style={{ fontSize: 32, color: '#CBD5E0', display: 'block', marginBottom: 12 }}>event_busy</span>
                  <div style={{ fontSize: 13, color: '#718096' }}>No meals on this date.</div>
                  <button className="btn-primary" style={{ marginTop: 16, fontSize: 12 }} onClick={() => setShowNewTrip(true)}>+ New Trip</button>
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
                      {e.dietary_counts && Object.keys(e.dietary_counts).length > 0 && (
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
                          {e.dietary_counts.vegetarian > 0 && <span style={{ background: '#D1FAE5', color: '#065F46', fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 999 }}>{e.dietary_counts.vegetarian} Veg</span>}
                          {e.dietary_counts.glutenFree > 0 && <span style={{ background: '#FEF3C7', color: '#92400E', fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 999 }}>{e.dietary_counts.glutenFree} GF</span>}
                          {e.dietary_counts.nutFree > 0 && <span style={{ background: '#F3E8FF', color: '#6B21A8', fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 999 }}>{e.dietary_counts.nutFree} NF</span>}
                        </div>
                      )}
                    </div>
                    <div style={{ marginTop: 12 }}>
                      <button className="btn-secondary" style={{ width: '100%', padding: '6px', fontSize: 11, justifyContent: 'center' }} onClick={() => openTrip(e.workflow_id)}>
                        View Trip Details
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
            {dayEvents.length > 0 && (
              <div style={{ padding: 16, background: '#F8FAFC', borderTop: '1px solid #EEF1F5' }}>
                <button className="btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setShowNewTrip(true)}>+ New Trip</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Trips tab — full workflow management */}
      {tab === 'trips' && (
        <PageWorkflows go={go} showToast={showToast} initialFocusId={tripsFocusId} isAdmin={false} hideNewButton={true} />
      )}

      {/* New Trip slide-over */}
      {showNewTrip && (
        <NewTripPanel
          onClose={() => setShowNewTrip(false)}
          onSubmitSchedule={async (draft) => { await onSubmitSchedule(draft); setShowNewTrip(false); setTab('trips') }}
          showToast={showToast}
          go={go}
          defaultTeam={S.schTeam}
          defaultHeadcount={S.schHeadcount}
        />
      )}
    </div>
  )
}

function NewTripPanel({ onClose, onSubmitSchedule, showToast, go, defaultTeam, defaultHeadcount }) {
  const [mode, setMode] = useState('paste')
  const [allTeams, setAllTeams] = useState([])

  // Trip context
  const [teamName, setTeamName] = useState(defaultTeam || "Varsity Baseball (Men's)")
  const [schoolName, setSchoolName] = useState('')
  const [sport, setSport] = useState('')
  const [conference, setConference] = useState('')
  const [division, setDivision] = useState('DI')
  const [tripType, setTripType] = useState('multi_day')
  const [homeAwayNeutral, setHomeAwayNeutral] = useState('away')
  const [opponent, setOpponent] = useState('')
  const [venueName, setVenueName] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [gameDate, setGameDate] = useState('')
  const [headcount, setHeadcount] = useState(defaultHeadcount || 45)
  const [budgetPerMeal, setBudgetPerMeal] = useState('')

  // Dietary
  const [vegPct, setVegPct] = useState(10)
  const [glutenFreePct, setGlutenFreePct] = useState(0)
  const [nutFreePct, setNutFreePct] = useState(0)

  // Parse state
  const [rawText, setRawText] = useState('')
  const [draftRows, setDraftRows] = useState([])
  const [parseError, setParseError] = useState('')
  const [csvError, setCsvError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    apiFetch('/teams').then(setAllTeams).catch(() => {})
  }, [])

  useEffect(() => {
    const match = allTeams.find(t => t.name === teamName)
    if (match) {
      setVegPct(match.default_veg_pct ?? 10)
      setGlutenFreePct(match.default_gf_pct ?? 0)
      setNutFreePct(match.default_nf_pct ?? 0)
    }
  }, [teamName, allTeams])

  const dietaryCounts = {
    vegetarian: Math.round((vegPct * Number(headcount)) / 100),
    glutenFree: Math.round((glutenFreePct * Number(headcount)) / 100),
    nutFree: Math.round((nutFreePct * Number(headcount)) / 100),
  }

  const parseEmail = () => {
    setParseError('')
    try {
      const res = parseAthleticsEmailToDraft({ text: rawText, year: new Date().getFullYear() })
      setDraftRows(res.rows.map(r => ({ ...r, headcount })))
      if (res.rows.length === 0) setParseError('No meals detected. Try pasting more of the itinerary email.')
    } catch {
      setParseError('Could not parse that email text.')
    }
  }

  const handleCSVFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setCsvError('')
    const reader = new FileReader()
    reader.onload = (ev) => {
      const rows = parseCSV(ev.target.result, Number(headcount))
      if (rows.length === 0) {
        setCsvError('No valid rows found. Expected columns: date, time, meal_type, location_type, notes')
      } else {
        setDraftRows(rows)
      }
    }
    reader.readAsText(file)
  }

  const updateRow = (idx, patch) => setDraftRows(prev => prev.map((r, i) => i === idx ? { ...r, ...patch } : r))
  const removeRow = (idx) => setDraftRows(prev => prev.filter((_, i) => i !== idx))

  const missing = []
  if (!teamName?.trim()) missing.push('team')
  if (!schoolName?.trim()) missing.push('school')
  if (!sport?.trim()) missing.push('sport')
  if (!headcount || Number(headcount) <= 0) missing.push('headcount')
  if (draftRows.length === 0) missing.push('at least one meal row')

  const hasUnsavedWork = draftRows.length > 0 || rawText.trim().length > 0 || schoolName.trim().length > 0

  const handleClose = () => {
    if (hasUnsavedWork && !window.confirm('You have unsaved work. Close anyway?')) return
    onClose()
  }

  const submit = async () => {
    if (missing.length > 0) return
    const tbdCount = draftRows.filter(r => {
      const { fulfillmentType } = classifyMealRow(r.mealType, r.locationType, r.notes)
      return fulfillmentType === 'tbd'
    }).length
    if (tbdCount > 0 && !window.confirm(`${tbdCount} meal(s) are TBD and will need vendor assignment after submission. Continue?`)) return
    setSubmitting(true)
    try {
      await onSubmitSchedule({
        name: `${teamName} · Trip`,
        teamName, schoolName, conference, division, sport, tripType, homeAwayNeutral,
        opponent, venueName, city, state,
        gameDate: gameDate || null, gameTime: null,
        rows: draftRows.map(r => ({
          date: r.date, time: r.time || null, timezone: r.timezone || 'America/New_York',
          mealType: r.mealType, locationType: r.locationType, notes: r.notes,
          budget: budgetPerMeal ? Number(budgetPerMeal) : null,
          headcount: Number(headcount), dietaryCounts,
          serviceStyle: r.locationType === 'airport' || r.locationType === 'perdiem' ? 'per_diem' : 'boxed',
        })),
      })
    } catch {
      // Error handled by parent toast
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200, display: 'flex', justifyContent: 'flex-end' }}
      onClick={handleClose}
    >
      <div
        style={{ width: 960, maxWidth: '95vw', height: '100vh', background: 'white', overflowY: 'auto', boxShadow: '-4px 0 40px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Panel header */}
        <div style={{ padding: '18px 24px', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: 'white', zIndex: 1, flexShrink: 0 }}>
          <div style={{ fontSize: 18, fontWeight: 900 }}>New Trip</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 4, background: '#F1F5F9', padding: 4, borderRadius: 8 }}>
              <button className={mode === 'paste' ? 'btn-primary' : 'btn-secondary'} style={{ padding: '6px 14px', fontSize: 12 }} onClick={() => setMode('paste')}>Paste Email</button>
              <button className={mode === 'csv' ? 'btn-primary' : 'btn-secondary'} style={{ padding: '6px 14px', fontSize: 12 }} onClick={() => setMode('csv')}>Upload CSV</button>
              <button className="btn-secondary" style={{ padding: '6px 14px', fontSize: 12 }} onClick={() => { onClose(); go('new-schedule') }}>Step-by-Step</button>
            </div>
            <button onClick={handleClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 22, color: '#718096' }}>close</span>
            </button>
          </div>
        </div>

        {/* Panel body */}
        <div style={{ padding: '20px 24px', display: 'grid', gridTemplateColumns: '400px 1fr', gap: 20, alignItems: 'start', flex: 1 }}>

          {/* Left: form */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#A0AEC0', letterSpacing: '0.07em', marginBottom: 8 }}>TRIP CONTEXT</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#718096', display: 'block', marginBottom: 5 }}>Team Name <span style={{ color: '#EF4444' }}>*</span></label>
                <input className="form-field" value={teamName} onChange={e => setTeamName(e.target.value)} placeholder="Varsity Baseball" />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#718096', display: 'block', marginBottom: 5 }}>School Name <span style={{ color: '#EF4444' }}>*</span></label>
                <input className="form-field" value={schoolName} onChange={e => setSchoolName(e.target.value)} placeholder="Duke University" />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#718096', display: 'block', marginBottom: 5 }}>Conference</label>
                <input className="form-field" value={conference} onChange={e => setConference(e.target.value)} placeholder="ACC..." />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#718096', display: 'block', marginBottom: 5 }}>Division</label>
                <select className="form-field" value={division} onChange={e => setDivision(e.target.value)}>
                  {['DI','DII','DIII','NAIA','NJCAA'].map(d => <option key={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#718096', display: 'block', marginBottom: 5 }}>Sport <span style={{ color: '#EF4444' }}>*</span></label>
                <input className="form-field" value={sport} onChange={e => setSport(e.target.value)} placeholder="Baseball..." />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#718096', display: 'block', marginBottom: 5 }}>Trip Type</label>
                <select className="form-field" value={tripType} onChange={e => setTripType(e.target.value)}>
                  <option value="day_trip">Day Trip</option>
                  <option value="overnight">Overnight</option>
                  <option value="multi_day">Multi-Day</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#718096', display: 'block', marginBottom: 5 }}>Home / Away</label>
                <select className="form-field" value={homeAwayNeutral} onChange={e => setHomeAwayNeutral(e.target.value)}>
                  <option value="home">Home</option>
                  <option value="away">Away</option>
                  <option value="neutral">Neutral</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#718096', display: 'block', marginBottom: 5 }}>City</label>
                <input className="form-field" value={city} onChange={e => setCity(e.target.value)} placeholder="Durham" />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#718096', display: 'block', marginBottom: 5 }}>State</label>
                <input className="form-field" value={state} onChange={e => setState(e.target.value)} placeholder="NC" />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#718096', display: 'block', marginBottom: 5 }}>Headcount <span style={{ color: '#EF4444' }}>*</span></label>
                <input className="form-field" type="number" value={headcount} onChange={e => setHeadcount(Number(e.target.value || 0))} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#718096', display: 'block', marginBottom: 5 }}>Game Date</label>
                <input className="form-field" type="date" value={gameDate} onChange={e => setGameDate(e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#718096', display: 'block', marginBottom: 5 }}>Budget / Meal ($)</label>
                <input className="form-field" type="number" value={budgetPerMeal} onChange={e => setBudgetPerMeal(e.target.value)} placeholder="65" />
              </div>
            </div>

            {/* Dietary */}
            <div style={{ fontSize: 11, fontWeight: 800, color: '#A0AEC0', letterSpacing: '0.07em', marginBottom: 8 }}>DIETARY PREFERENCES</div>
            <div style={{ background: '#F8FAFC', borderRadius: 12, border: '1px solid #E2E8F0', padding: 14, marginBottom: 16 }}>
              {[
                { label: 'Vegetarian', icon: 'eco', iconColor: '#16A34A', pct: vegPct, setPct: setVegPct, count: dietaryCounts.vegetarian, badgeBg: '#D1FAE5', badgeTx: '#065F46' },
                { label: 'Gluten-Free', icon: 'grain', iconColor: '#D97706', pct: glutenFreePct, setPct: setGlutenFreePct, count: dietaryCounts.glutenFree, badgeBg: '#FEF3C7', badgeTx: '#92400E' },
                { label: 'Nut-Free Kitchen', icon: 'no_food', iconColor: '#9333EA', pct: nutFreePct, setPct: setNutFreePct, count: dietaryCounts.nutFree, badgeBg: '#F3E8FF', badgeTx: '#6B21A8' },
              ].map(d => (
                <div key={d.label} style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <label style={{ fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 14, color: d.iconColor }}>{d.icon}</span> {d.label} %
                    </label>
                    <span style={{ background: d.badgeBg, color: d.badgeTx, fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 10 }}>
                      {d.pct}% ({d.count})
                    </span>
                  </div>
                  <input type="range" min="0" max="100" value={d.pct} onChange={e => d.setPct(Number(e.target.value))} style={{ width: '100%', accentColor: '#0F62FE' }} />
                </div>
              ))}
            </div>

            {/* Input area */}
            {mode === 'paste' && (
              <>
                <div style={{ fontSize: 11, fontWeight: 800, color: '#A0AEC0', letterSpacing: '0.07em', marginBottom: 8 }}>ITINERARY EMAIL</div>
                <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                  <button className="btn-secondary" style={{ padding: '5px 8px', fontSize: 10 }} onClick={() => { setRawText(EXAMPLE_EMAIL_BASEBALL); setSport('Baseball'); setTeamName("Varsity Baseball (Men's)") }}>Baseball example</button>
                  <button className="btn-secondary" style={{ padding: '5px 8px', fontSize: 10 }} onClick={() => { setRawText(EXAMPLE_EMAIL_WRESTLING); setSport('Wrestling'); setTeamName('Wrestling') }}>Wrestling example</button>
                </div>
                <textarea className="form-field" rows={7} style={{ resize: 'vertical' }} value={rawText} onChange={e => setRawText(e.target.value)} placeholder="Paste itinerary email here..." />
                <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                  <button className="btn-secondary" style={{ fontSize: 12 }} onClick={() => { setRawText(''); setDraftRows([]) }}>Clear</button>
                  <button className="btn-primary" style={{ fontSize: 12 }} onClick={parseEmail}>
                    <span className="material-symbols-outlined" style={{ fontSize: 15, color: 'white' }}>auto_awesome</span> Parse
                  </button>
                </div>
                {parseError && <div style={{ marginTop: 8, background: '#FFF1F2', border: '1.5px solid #FECDD3', borderRadius: 10, padding: 10, color: '#9B1C1C', fontSize: 12 }}>{parseError}</div>}
              </>
            )}

            {mode === 'csv' && (
              <>
                <div style={{ fontSize: 11, fontWeight: 800, color: '#A0AEC0', letterSpacing: '0.07em', marginBottom: 8 }}>UPLOAD CSV</div>
                <div style={{ background: '#F8FAFC', border: '1.5px dashed #BFDBFE', borderRadius: 12, padding: 24, textAlign: 'center', marginBottom: 10 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 36, color: '#93C5FD', display: 'block', marginBottom: 8 }}>upload_file</span>
                  <div style={{ fontSize: 12, color: '#374151', marginBottom: 10 }}>CSV with columns:</div>
                  <div style={{ fontSize: 11, fontFamily: 'monospace', background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 6, padding: '6px 10px', marginBottom: 16, color: '#1D4ED8', display: 'inline-block' }}>
                    date, time, meal_type, location_type, notes
                  </div>
                  <div style={{ fontSize: 10, color: '#718096', marginBottom: 16 }}>
                    Example: <span style={{ fontFamily: 'monospace' }}>2026-03-14, 07:00, Breakfast, hotel, Pre-game meal</span>
                  </div>
                  <input type="file" accept=".csv,text/csv" id="csvUpload" style={{ display: 'none' }} onChange={handleCSVFile} />
                  <label htmlFor="csvUpload" style={{ cursor: 'pointer', background: '#0F62FE', color: 'white', padding: '8px 20px', fontSize: 13, fontWeight: 700, borderRadius: 8, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'white' }}>folder_open</span>
                    Choose File
                  </label>
                </div>
                {csvError && <div style={{ background: '#FFF1F2', border: '1.5px solid #FECDD3', borderRadius: 10, padding: 10, color: '#9B1C1C', fontSize: 12 }}>{csvError}</div>}
                {draftRows.length > 0 && (
                  <div style={{ background: '#F0FDF4', border: '1px solid #86EFAC', borderRadius: 10, padding: 10, fontSize: 12, color: '#14532D', fontWeight: 700 }}>
                    {draftRows.length} rows loaded from CSV
                  </div>
                )}
              </>
            )}
          </div>

          {/* Right: draft rows */}
          <div>
            <div style={{ background: 'white', borderRadius: 16, border: '1px solid #E2E8F0', overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid #EEF1F5', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontSize: 14, fontWeight: 800 }}>Draft Itinerary</div>
                <span className="badge badge-blue">{draftRows.length} rows</span>
              </div>
              <div style={{ padding: 14, overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#FAFBFC', borderBottom: '1px solid #E2E8F0' }}>
                      {['DATE', 'TIME', 'MEAL', 'LOCATION', 'NOTES / STATUS', ''].map(h => (
                        <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontSize: 10, fontWeight: 800, color: '#A0AEC0', letterSpacing: '0.07em', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {draftRows.map((r, idx) => {
                      const { fulfillmentType } = classifyMealRow(r.mealType, r.locationType, r.notes)
                      const pill = classificationPill(fulfillmentType)
                      return (
                        <tr key={idx} style={{ borderBottom: '1px solid #F4F6F9' }}>
                          <td style={{ padding: '10px 10px', fontSize: 12, whiteSpace: 'nowrap' }}>
                            <div style={{ fontWeight: 700 }}>{fmtDateShort(r.date)}</div>
                            <div style={{ fontSize: 10, color: '#A0AEC0' }}>{new Date(r.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' })}</div>
                          </td>
                          <td style={{ padding: '10px 10px', whiteSpace: 'nowrap' }}>
                            <input style={{ width: 90 }} className="form-field" value={r.time || ''} placeholder="HH:MM" onChange={e => updateRow(idx, { time: e.target.value || null })} />
                          </td>
                          <td style={{ padding: '10px 10px' }}>
                            <input className="form-field" value={r.mealType} onChange={e => updateRow(idx, { mealType: e.target.value })} />
                          </td>
                          <td style={{ padding: '10px 10px' }}>
                            <select className="form-field" value={r.locationType} onChange={e => updateRow(idx, { locationType: e.target.value })}>
                              <option value="restaurant">Restaurant</option>
                              <option value="hotel">Hotel</option>
                              <option value="field">Field / Stadium</option>
                              <option value="airport">Airport</option>
                              <option value="perdiem">Per Diem</option>
                              <option value="bus">On Bus</option>
                            </select>
                          </td>
                          <td style={{ padding: '10px 10px', minWidth: 200 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <input className="form-field" value={r.notes} onChange={e => updateRow(idx, { notes: e.target.value })} />
                              <span style={{ fontSize: 10, fontWeight: 800, background: pill.bg, color: pill.tx, padding: '3px 8px', borderRadius: 999, whiteSpace: 'nowrap' }}>{pill.label}</span>
                            </div>
                          </td>
                          <td style={{ padding: '10px 10px', textAlign: 'right' }}>
                            <button style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 4 }} onClick={() => removeRow(idx)}>
                              <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#A0AEC0' }}>delete_outline</span>
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                    {draftRows.length === 0 && (
                      <tr>
                        <td colSpan={6} style={{ padding: 40, textAlign: 'center', color: '#718096' }}>
                          {mode === 'paste' ? 'Paste an email and click Parse to generate a draft.' : 'Upload a CSV file to populate this table.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 12, color: '#718096' }}>{draftRows.length} rows ready</div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn-secondary" onClick={handleClose}>Cancel</button>
                <button className="btn-primary" disabled={missing.length > 0 || submitting} onClick={submit}>
                  {submitting ? 'Submitting...' : 'Submit to Trips'}
                </button>
              </div>
            </div>
            {missing.length > 0 && (
              <div style={{ marginTop: 10, background: '#FFF1F2', border: '1.5px solid #FECDD3', borderRadius: 10, padding: 10, color: '#9B1C1C', fontSize: 12 }}>
                Missing: {missing.join(', ')}.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
