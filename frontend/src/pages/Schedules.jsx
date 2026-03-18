import React, { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { apiFetch } from '../api/client'
import { fmtTime12, fmtDateShort } from '../utils/format'
import { parseAthleticsEmailToDraft, EXAMPLE_EMAIL_BASEBALL, EXAMPLE_EMAIL_WRESTLING } from '../demo/intakeParser'
import { PageWorkflows } from './Workflows'

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']
const DAY_LABELS = ['SUN','MON','TUE','WED','THU','FRI','SAT']

function daysInMonth(year, month) { return new Date(year, month + 1, 0).getDate() }
function firstDayOfWeek(year, month) { return new Date(year, month, 1).getDay() }
function toYYYYMM(year, month) { return `${year}-${String(month + 1).padStart(2, '0')}` }

const MEAL_DEFAULTS = { Breakfast: '07:00', Lunch: '12:00', Dinner: '18:00' }
const MEAL_OPTIONS = ['Breakfast', 'Lunch', 'Dinner']

function normalizeMealType(t) {
  if (!t) return 'Dinner'
  const l = t.toLowerCase()
  if (l.includes('breakfast')) return 'Breakfast'
  if (l.includes('lunch') || l.includes('pre')) return 'Lunch'
  return 'Dinner'
}

function normalizeRow(r, headcount) {
  const mealType = normalizeMealType(r.mealType)
  return {
    ...r,
    mealType,
    vendorAddress: r.address || r.vendorAddress || null,
    address: undefined,
    deliveryAddress: r.deliveryAddress || null,
    time: r.time || MEAL_DEFAULTS[mealType],
    headcount,
  }
}

// AddressInput with debounced autocomplete dropdown
function AddressInput({ value, onChange, placeholder, city, state, style, disabled }) {
  const [candidates, setCandidates] = useState([])
  const [loading, setLoading] = useState(false)
  const timer = useRef(null)

  const search = async (q) => {
    setLoading(true)
    try {
      const resp = await apiFetch('/places/lookup', {
        method: 'POST',
        body: { vendor: q, location_hint: q, city: city || '', state: state || '' },
      })
      const cands = resp.candidates?.length
        ? resp.candidates
        : resp.unique && resp.address ? [{ name: q, address: resp.address }] : []
      setCandidates(cands)
    } catch (_e) {
      setCandidates([])
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (v) => {
    onChange(v)
    clearTimeout(timer.current)
    if (v.trim().length >= 3) {
      timer.current = setTimeout(() => search(v), 700)
    } else {
      setCandidates([])
    }
  }

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <input
        className="form-field"
        style={{ width: '100%', padding: '5px 8px', fontSize: 12, boxSizing: 'border-box', ...style }}
        value={value || ''}
        onChange={e => handleChange(e.target.value)}
        placeholder={loading ? 'Searching...' : placeholder}
        disabled={disabled || loading}
      />
      {candidates.length > 0 && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1px solid #E2E8F0', borderRadius: 8, boxShadow: '0 4px 14px rgba(0,0,0,0.12)', zIndex: 99, overflow: 'hidden', maxHeight: 180, overflowY: 'auto' }}>
          {candidates.map((c, i) => (
            <div
              key={i}
              onClick={() => { onChange(c.address || c.name); setCandidates([]) }}
              style={{ padding: '7px 10px', cursor: 'pointer', fontSize: 12, borderBottom: i < candidates.length - 1 ? '1px solid #F4F6F9' : 'none' }}
            >
              {c.name && c.name !== c.address && <div style={{ fontWeight: 700, color: '#1A202C' }}>{c.name}</div>}
              <div style={{ color: '#718096' }}>{c.address}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function parseCSV(text, headcount) {
  const lines = text.trim().split(/\r?\n/).filter(l => l.trim())
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/[\s-]+/g, '_'))
  return lines.slice(1).map(line => {
    const vals = line.split(',').map(v => v.trim())
    const row = {}
    headers.forEach((h, i) => { row[h] = vals[i] || '' })
    const mealType = normalizeMealType(row.meal_type || row.meal)
    return {
      date: row.date || '',
      time: row.time || MEAL_DEFAULTS[mealType],
      mealType,
      locationType: row.location_type || row.location || 'restaurant',
      vendor: row.vendor || row.notes || null,
      vendorAddress: row.address || null,
      deliveryAddress: null,
      notes: '',
      timezone: 'America/New_York',
      headcount,
    }
  }).filter(r => r.date && /^\d{4}-\d{2}-\d{2}$/.test(r.date))
}

export function PageSchedules({ S, go, onDaySelect, onSubmitSchedule, showToast }) {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const now = new Date()
  const [tab, setTab] = useState(searchParams.get('tab') === 'calendar' ? 'calendar' : 'intake')
  const [tripsFocusId, setTripsFocusId] = useState(searchParams.get('focus') || null)

  // Calendar state
  const [calYear, setCalYear] = useState(now.getFullYear())
  const [calMonth, setCalMonth] = useState(now.getMonth())
  const [events, setEvents] = useState([])
  const [loadingEvents, setLoadingEvents] = useState(false)

  const selected = S.calDay || now.getDate()
  const today = now.getDate()
  const isCurrentMonth = calYear === now.getFullYear() && calMonth === now.getMonth()

  useEffect(() => {
    const t = searchParams.get('tab')
    if (t === 'calendar') setTab('calendar')
    else setTab('intake')
  }, [searchParams])

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

  const rowCount = Math.ceil(cells.length / 7)

  const openTrip = (workflowId) => {
    navigate(`/workflows?focus=${workflowId}`)
  }

  return (
    <div className="page" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 4, background: '#F1F5F9', padding: 4, borderRadius: 10 }}>
          <button
            className={tab === 'intake' ? 'btn-primary' : 'btn-secondary'}
            style={{ padding: '8px 20px', fontSize: 13 }}
            onClick={() => navigate('/schedules?tab=intake')}
          >
            Create Schedule
          </button>
          <button
            className={tab === 'calendar' ? 'btn-primary' : 'btn-secondary'}
            style={{ padding: '8px 20px', fontSize: 13 }}
            onClick={() => navigate('/schedules?tab=calendar')}
          >
            Calendar
          </button>
        </div>
      </div>

      {/* Calendar tab */}
      {tab === 'calendar' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>

          {/* Main Calendar */}
          <div style={{ background: 'white', borderRadius: 20, border: '1px solid #E2E8F0', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', flex: 1 }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #EEF1F5', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#FAFBFC', flexShrink: 0 }}>
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
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid #EEF1F5', flexShrink: 0 }}>
              {DAY_LABELS.map(d => (
                <div key={d} style={{ padding: '12px 0', textAlign: 'center', fontSize: 11, fontWeight: 800, color: '#A0AEC0', letterSpacing: '0.08em' }}>{d}</div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gridTemplateRows: `repeat(${rowCount}, 1fr)`, flex: 1, minHeight: 0 }}>
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
        </div>
      )}

      {/* Intake tab — full intake management */}
      {tab === 'intake' && (
        <NewTripPanel
          onClose={() => navigate('/schedules')}
          onSubmitSchedule={async (draft) => { 
            await onSubmitSchedule(draft); 
            navigate('/workflows'); 
          }}
          showToast={showToast}
          go={go}
          defaultTeam={S.schTeam}
          defaultHeadcount={S.schHeadcount}
          inline={true}
        />
      )}
    </div>
  )
}

function NewTripPanel({ onClose, onSubmitSchedule, defaultTeam, defaultHeadcount, inline = false }) {
  const navigate = useNavigate()
  const [panelStep, setPanelStep] = useState(1)
  const [mode, setMode] = useState(null)
  const [page, setPage] = useState(1)
  const [allTeams, setAllTeams] = useState([])
  const [showCSVModal, setShowCSVModal] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  // Trip context
  const [teamName, setTeamName] = useState(defaultTeam || "Varsity Baseball (Men's)")
  const [schoolName, setSchoolName] = useState('University of Virginia')
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

  // Dietary - removed from form but kept in state for API
  const [vegPct, setVegPct] = useState(10)
  const [glutenFreePct, setGlutenFreePct] = useState(0)
  const [nutFreePct, setNutFreePct] = useState(0)

  // Parse state
  const [rawText, setRawText] = useState('')
  const [parsing, setParsing] = useState(false)
  const [draftRows, setDraftRows] = useState([])
  const [parseError, setParseError] = useState('')
  const [csvError, setCsvError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [lookingUpAddr, setLookingUpAddr] = useState(new Set())
  const pageSize = 15
  const pageCount = Math.max(1, Math.ceil(draftRows.length / pageSize))
  const pageStart = (page - 1) * pageSize
  const pagedRows = draftRows.slice(pageStart, pageStart + pageSize)

  useEffect(() => {
    apiFetch('/teams').then(setAllTeams).catch(() => {})
  }, [])

  useEffect(() => {
    const match = allTeams.find(t => t.name === teamName)
    if (match) {
      setVegPct(match.default_veg_pct ?? 10)
      setGlutenFreePct(match.default_gf_pct ?? 0)
      setNutFreePct(match.default_nf_pct ?? 0)
      if (match.school_name) setSchoolName(match.school_name)
      if (match.sport) setSport(match.sport)
    }
  }, [teamName, allTeams])

  useEffect(() => {
    setPage(p => Math.min(p, pageCount))
  }, [pageCount])

  useEffect(() => {
    setPage(p => Math.min(p, pageCount))
  }, [pageCount])

  const dietaryCounts = {
    vegetarian: Math.round((vegPct * Number(headcount)) / 100),
    glutenFree: Math.round((glutenFreePct * Number(headcount)) / 100),
    nutFree: Math.round((nutFreePct * Number(headcount)) / 100),
  }

  const parseEmail = async () => {
    setParseError('')
    setParsing(true)
    try {
      let result = null

      // --- Try LLM backend ---
      try {
        const resp = await apiFetch('/intake/parse', {
          method: 'POST',
          body: { text: rawText, year: new Date().getFullYear(), team: teamName, school: schoolName },
          timeoutMs: 90000,
        })
        if (resp.source !== 'unavailable' && resp.rows) {
          result = resp
        }
      } catch (_) {
        // backend unreachable — fall through to local parser
      }

      // --- Fallback: local rule-based parser ---
      if (!result) {
        result = parseAthleticsEmailToDraft({ text: rawText, year: new Date().getFullYear() })
        result.source = 'local'
      }

      setDraftRows(result.rows.map(r => normalizeRow(r, headcount)))
      setPage(1)

      if (result.metadata) {
        if (result.metadata.team) setTeamName(result.metadata.team)
        if (result.metadata.sport) setSport(result.metadata.sport)
        if (result.metadata.division) setDivision(result.metadata.division)
        if (result.metadata.venueName) setVenueName(result.metadata.venueName)
        if (result.metadata.city) setCity(result.metadata.city)
        if (result.metadata.state) setState(result.metadata.state)
      }

      if (result.rows.length === 0) {
        setParseError('No meals detected. Try pasting more of the itinerary email.')
      } else {
        setPanelStep(2)
      }
    } catch (_e) {
      setParseError('Could not parse that email text.')
    } finally {
      setParsing(false)
    }
  }

  const processCSVText = (text) => {
    setCsvError('')
    const rows = parseCSV(text, Number(headcount))
    if (rows.length === 0) {
      setCsvError('No valid rows found. Expected columns: date, time, meal_type, location_type, notes')
    } else {
      setDraftRows(rows)
      setShowCSVModal(false)
      setPanelStep(2)
        setPage(1)
    }
  }

  const handleCSVFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => processCSVText(ev.target.result)
    reader.readAsText(file)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (!file) return
    if (!file.name.endsWith('.csv')) {
      setCsvError('Please upload a CSV file.')
      return
    }
    const reader = new FileReader()
    reader.onload = (ev) => processCSVText(ev.target.result)
    reader.readAsText(file)
  }

  const updateRow = (idx, patch) => setDraftRows(prev => prev.map((r, i) => i === idx ? { ...r, ...patch } : r))
  const removeRow = (idx) => setDraftRows(prev => prev.filter((_, i) => i !== idx))

  const findAddress = async (idx) => {
    const r = draftRows[idx]
    setLookingUpAddr(prev => new Set([...prev, idx]))
    try {
      const resp = await apiFetch('/places/lookup', {
        method: 'POST',
        body: { vendor: r.vendor || '', location_hint: r.locationHint || '', city, state },
      })
      if (resp.unique && resp.address) {
        updateRow(idx, { vendorAddress: resp.address })
      } else if (resp.candidates?.length) {
        updateRow(idx, { vendorAddressCandidates: resp.candidates })
      }
    } catch (_e) {
      // ignore
    } finally {
      setLookingUpAddr(prev => { const s = new Set(prev); s.delete(idx); return s })
    }
  }

  // Pick one option from an "X or Y" vendor — updates row then immediately looks up address
  const pickVendor = async (globalIdx, vendorName) => {
    updateRow(globalIdx, { vendor: vendorName, isTbd: false, tbdReason: null, vendorAddress: null, vendorAddressCandidates: null })
    setLookingUpAddr(prev => new Set([...prev, globalIdx]))
    try {
      const r = draftRows[globalIdx]
      const resp = await apiFetch('/places/lookup', {
        method: 'POST',
        body: { vendor: vendorName, location_hint: r.locationHint || '', city, state },
      })
      if (resp.unique && resp.address) {
        updateRow(globalIdx, { vendorAddress: resp.address })
      } else if (resp.candidates?.length) {
        updateRow(globalIdx, { vendorAddressCandidates: resp.candidates })
      }
    } catch (_e) {
      // ignore
    } finally {
      setLookingUpAddr(prev => { const s = new Set(prev); s.delete(globalIdx); return s })
    }
  }

  const autoLookupAddresses = async (rows, cityVal, stateVal) => {
    // Rows that need lookup: have a vendor, no address, not a "pick one" TBD
    const toLookup = rows
      .map((r, idx) => ({ r, idx }))
      .filter(({ r }) => r.vendor && !r.vendorAddress && r.tbdReason !== 'multiple_options')
    if (!toLookup.length) return

    // Mark all as loading
    setLookingUpAddr(new Set(toLookup.map(x => x.idx)))

    // De-dupe by vendor so chains (same name) are only looked up once
    const vendorMap = {}
    for (const { r, idx } of toLookup) {
      const key = r.vendor.toLowerCase().trim()
      if (!vendorMap[key]) vendorMap[key] = { vendor: r.vendor, locationHint: r.locationHint || '', indices: [] }
      vendorMap[key].indices.push(idx)
    }

    await Promise.all(
      Object.values(vendorMap).map(async ({ vendor, locationHint, indices }) => {
        try {
          const resp = await apiFetch('/places/lookup', {
            method: 'POST',
            body: { vendor, location_hint: locationHint, city: cityVal, state: stateVal },
          })
          if (resp.unique && resp.address) {
            setDraftRows(prev => prev.map((r, i) =>
              indices.includes(i) ? { ...r, vendorAddress: resp.address } : r
            ))
          }
        } catch (_e) {
          // ignore
        } finally {
          setLookingUpAddr(prev => {
            const s = new Set(prev)
            indices.forEach(i => s.delete(i))
            return s
          })
        }
      })
    )
  }

  const missing = []
  if (!teamName?.trim()) missing.push('team')
  if (!schoolName?.trim()) missing.push('school')
  if (!sport?.trim()) missing.push('sport')
  if (!headcount || Number(headcount) <= 0) missing.push('headcount')
  if (draftRows.length === 0) missing.push('at least one meal row')

  const hasUnsavedWork = draftRows.length > 0 || rawText.trim().length > 0

  const handleClose = () => {
    if (hasUnsavedWork && !window.confirm('You have unsaved work. Close anyway?')) return
    onClose()
  }

  const submit = async () => {
    if (missing.length > 0) return
    setSubmitting(true)
    try {
      await onSubmitSchedule({
        name: `${teamName} · Trip`,
        teamName, schoolName, conference, division, sport, tripType, homeAwayNeutral,
        opponent, venueName, city, state,
        gameDate: gameDate || null, gameTime: null,
        rows: draftRows.map(r => ({
          date: r.date, time: r.time || null, timezone: r.timezone || 'America/New_York',
          mealType: r.mealType, locationType: r.locationType || 'restaurant',
          notes: [r.vendor, r.vendorAddress, r.deliveryAddress, r.notes].filter(Boolean).join(' — '),
          budget: budgetPerMeal ? Number(budgetPerMeal) : null,
          headcount: Number(headcount), dietaryCounts,
          serviceStyle: r.locationType === 'airport' || r.locationType === 'perdiem' ? 'per_diem' : 'boxed',
        })),
      })
    } catch (_e) {
      // Error handled by parent toast
    } finally {
      setSubmitting(false)
    }
  }

  const uniqueSchools = Array.from(new Set(['University of Virginia', ...allTeams.map(t => t.school_name).filter(Boolean)]))

  return (
    <div
      style={inline ? { display: 'flex', flex: 1, minHeight: 0, height: '100%', overflow: 'hidden' } : { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200, display: 'flex', justifyContent: 'flex-end' }}
      onClick={inline ? null : handleClose}
    >
      <div
        style={inline ? { flex: 1, background: 'white', borderRadius: 20, border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', overflow: 'hidden', height: '100%' } : { width: 960, maxWidth: '95vw', height: '100vh', background: 'white', overflowY: 'auto', boxShadow: '-4px 0 40px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Panel header with Progress Bar */}
        <div style={{ padding: '12px 20px', borderBottom: '1px solid #E2E8F0', background: 'white', zIndex: 1, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ fontSize: 16, fontWeight: 900 }}>Create Schedule</div>
            {!inline && (
              <button onClick={handleClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#718096' }}>close</span>
              </button>
            )}
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {[
              { id: 1, label: 'Entry' },
              { id: 2, label: 'Team Context' },
              { id: 3, label: 'Draft Itinerary' }
            ].map((s, i) => (
              <React.Fragment key={s.id}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ 
                    width: 20, height: 20, borderRadius: '50%', background: panelStep >= s.id ? '#0F62FE' : '#E2E8F0', 
                    color: panelStep >= s.id ? 'white' : '#718096', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800 
                  }}>
                    {panelStep > s.id ? <span className="material-symbols-outlined" style={{ fontSize: 12 }}>check</span> : s.id}
                  </div>
                  <span style={{ fontSize: 11, fontWeight: panelStep === s.id ? 800 : 500, color: panelStep === s.id ? '#0F62FE' : '#718096' }}>{s.label}</span>
                </div>
                {i < 2 && <div style={{ flex: 1, height: 2, background: panelStep > s.id ? '#0F62FE' : '#E2E8F0', maxWidth: 40 }} />}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Panel body */}
        <div style={{ flex: 1, overflowY: 'auto', background: '#F8FAFC', minHeight: 0 }}>
          
          {panelStep === 1 && (
            <div style={{ padding: 40, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 32, minHeight: '100%' }}>
              <div style={{ textAlign: 'center' }}>
                <h2 style={{ fontSize: 24, fontWeight: 900, marginBottom: 8 }}>How would you like to start?</h2>
                <p style={{ color: '#718096' }}>Select an option to begin creating your meal schedule.</p>
              </div>

              {mode !== 'paste' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, width: '100%', maxWidth: 700 }}>
                  <button 
                    onClick={() => setMode('paste')}
                    style={{ 
                      background: 'white', border: '1.5px solid #E2E8F0', 
                      borderRadius: 20, padding: 32, cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s'
                    }}
                    className="hover-lift"
                  >
                  <div style={{ width: 56, height: 56, background: '#EBF2FF', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 32, color: '#0F62FE' }}>content_paste</span>
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>Paste Itinerary</div>
                  <div style={{ fontSize: 13, color: '#718096', lineHeight: 1.5 }}>Paste text from an email or document to have it parsed automatically.</div>
                </button>

                <button 
                  onClick={() => setShowCSVModal(true)}
                  style={{ 
                    background: 'white', border: '1.5px solid #E2E8F0', 
                    borderRadius: 20, padding: 32, cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s'
                  }}
                  className="hover-lift"
                >
                  <div style={{ width: 56, height: 56, background: '#F0FDF4', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 32, color: '#16A34A' }}>upload_file</span>
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>Upload CSV</div>
                  <div style={{ fontSize: 13, color: '#718096', lineHeight: 1.5 }}>Upload a structured CSV file with your meal dates and times.</div>
                </button>
              </div>
              )}

              {mode === 'paste' && (
                <div style={{ width: '100%', maxWidth: 700, background: 'white', borderRadius: 20, border: '1.5px solid #E2E8F0', padding: 24 }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: '#A0AEC0', letterSpacing: '0.07em', marginBottom: 12 }}>ITINERARY TEXT</div>
                  <textarea 
                    className="form-field" 
                    rows={8} 
                    style={{ resize: 'vertical', marginBottom: 16 }} 
                    value={rawText} 
                    onChange={e => setRawText(e.target.value)} 
                    placeholder="Paste itinerary email here..." 
                  />
                  <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                    <button className="btn-secondary" onClick={() => setRawText('')}>Clear</button>
                    <button className="btn-primary" disabled={!rawText.trim() || parsing} onClick={parseEmail}>
                      {parsing ? 'Parsing...' : 'Next: Review Schedule'}
                    </button>
                  </div>
                  {parseError && <div style={{ marginTop: 12, background: '#FFF1F2', border: '1.5px solid #FECDD3', borderRadius: 10, padding: 12, color: '#9B1C1C', fontSize: 13 }}>{parseError}</div>}
                  
                  <div style={{ marginTop: 24, borderTop: '1px solid #EEF1F5', paddingTop: 16 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#718096', marginBottom: 8 }}>Try an example:</div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button className="btn-secondary" style={{ fontSize: 11, padding: '6px 12px' }} onClick={() => { setRawText(EXAMPLE_EMAIL_BASEBALL); setTeamName("Varsity Baseball (Men's)") }}>Baseball Itinerary</button>
                      <button className="btn-secondary" style={{ fontSize: 11, padding: '6px 12px' }} onClick={() => { setRawText(EXAMPLE_EMAIL_WRESTLING); setTeamName('Wrestling') }}>Wrestling Itinerary</button>
                    </div>
                    <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                      <button className="btn-secondary" onClick={() => setMode(null)}>← Back</button>
                      <button className="btn-secondary" onClick={() => setShowCSVModal(true)}>Use CSV Instead</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {panelStep === 2 && (
            <div style={{ padding: '16px 24px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ background: 'white', borderRadius: 20, border: '1px solid #E2E8F0', padding: '20px 24px', width: '100%', maxWidth: 600 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#A0AEC0', letterSpacing: '0.07em', marginBottom: 16 }}>SCHEDULE DETAILS</div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: '#718096', display: 'block', marginBottom: 4 }}>School Name <span style={{ color: '#EF4444' }}>*</span></label>
                    <input list="school-suggestions" className="form-field" style={{ padding: '9px 12px' }} value={schoolName} onChange={e => setSchoolName(e.target.value)} placeholder="University of Virginia" />
                    <datalist id="school-suggestions">
                      {uniqueSchools.map(s => <option key={s} value={s} />)}
                    </datalist>
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: '#718096', display: 'block', marginBottom: 4 }}>Schedule Name <span style={{ color: '#EF4444' }}>*</span></label>
                    <input list="team-suggestions" className="form-field" style={{ padding: '9px 12px' }} value={teamName} onChange={e => setTeamName(e.target.value)} placeholder="e.g. Wrestling NCAA 2026" />
                    <datalist id="team-suggestions">
                      {allTeams.filter(t => t.school_name === schoolName).map(t => <option key={t.id} value={t.name} />)}
                    </datalist>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: '#718096', display: 'block', marginBottom: 4 }}>Sport <span style={{ color: '#EF4444' }}>*</span></label>
                    <input className="form-field" style={{ padding: '9px 12px' }} value={sport} onChange={e => setSport(e.target.value)} placeholder="Baseball..." />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: '#718096', display: 'block', marginBottom: 4 }}>Division</label>
                    <select className="form-field" style={{ padding: '9px 12px' }} value={division} onChange={e => setDivision(e.target.value)}>
                      {['NCAA','DI','DII','DIII','NAIA','NJCAA'].map(d => <option key={d}>{d}</option>)}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: '#718096', display: 'block', marginBottom: 4 }}>Event-Days</label>
                    <select className="form-field" style={{ padding: '9px 12px' }} value={tripType} onChange={e => setTripType(e.target.value)}>
                      <option value="day_trip">One-Day</option>
                      <option value="multi_day">Multi-Day</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: '#718096', display: 'block', marginBottom: 4 }}>Home / Away</label>
                    <select className="form-field" style={{ padding: '9px 12px' }} value={homeAwayNeutral} onChange={e => setHomeAwayNeutral(e.target.value)}>
                      <option value="home">Home</option>
                      <option value="away">Away</option>
                      <option value="neutral">Both</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: '#718096', display: 'block', marginBottom: 4 }}>City</label>
                    <input className="form-field" style={{ padding: '9px 12px' }} value={city} onChange={e => setCity(e.target.value)} placeholder="Durham" />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: '#718096', display: 'block', marginBottom: 4 }}>State</label>
                    <input className="form-field" style={{ padding: '9px 12px' }} value={state} onChange={e => setState(e.target.value)} placeholder="NC" />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: '#718096', display: 'block', marginBottom: 4 }}>Headcount <span style={{ color: '#EF4444' }}>*</span></label>
                    <input className="form-field" type="number" style={{ padding: '9px 12px' }} value={headcount} onChange={e => setHeadcount(Number(e.target.value || 0))} />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: '#718096', display: 'block', marginBottom: 4 }}>Budget / Meal ($)</label>
                    <input className="form-field" type="number" style={{ padding: '9px 12px' }} value={budgetPerMeal} onChange={e => setBudgetPerMeal(e.target.value)} placeholder="65" />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 12, justifyContent: 'space-between' }}>
                  <button className="btn-secondary" onClick={() => setPanelStep(1)}><span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_back</span> Back</button>
                  <button className="btn-primary" onClick={() => { setPanelStep(3); autoLookupAddresses(draftRows, city, state) }}>Review</button>
                </div>
              </div>
            </div>
          )}

          {panelStep === 3 && (
            <div style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 12, height: '100%', overflow: 'hidden' }}>
              <div style={{ background: 'white', borderRadius: 16, border: '1px solid #E2E8F0', overflow: 'hidden', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid #EEF1F5', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                  <button className="btn-secondary" style={{ padding: '4px 10px', display: 'flex', alignItems: 'center' }} onClick={() => setPanelStep(2)}>
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_back</span>
                  </button>
                  <div style={{ fontSize: 14, fontWeight: 800 }}>Draft Itinerary</div>
                  <span className="badge badge-blue" style={{ marginLeft: 'auto' }}>{draftRows.length} rows</span>
                </div>
                <div style={{ overflow: 'auto', flex: 1 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                    <colgroup>
                      <col style={{ width: 74 }} />
                      <col style={{ width: 100 }} />
                      <col style={{ width: 78 }} />
                      <col style={{ width: '18%' }} />
                      <col style={{ width: '22%' }} />
                      <col style={{ width: '22%' }} />
                      <col style={{ width: 32 }} />
                    </colgroup>
                    <thead style={{ position: 'sticky', top: 0, zIndex: 2 }}>
                      <tr style={{ background: '#FAFBFC', borderBottom: '1px solid #E2E8F0' }}>
                        {['DATE','MEAL','TIME','VENDOR NAME','VENDOR ADDRESS','DELIVERY ADDRESS',''].map(h => (
                          <th key={h} style={{ padding: '7px 8px', textAlign: 'left', fontSize: 9, fontWeight: 800, color: '#A0AEC0', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {draftRows.length === 0 ? (
                        <tr>
                          <td colSpan={7} style={{ padding: 24, textAlign: 'center', color: '#718096' }}>No meal rows yet.</td>
                        </tr>
                      ) : (
                        pagedRows.map((r, idx) => {
                          const globalIdx = pageStart + idx
                          const hasVendor = r.vendor && !r.isTbd
                          return (
                            <tr key={`${globalIdx}-${r.date}-${r.mealType}`} style={{ borderBottom: '1px solid #F4F6F9', background: r.isTbd ? '#FFFDF5' : 'white' }}>
                              {/* DATE */}
                              <td style={{ padding: '5px 8px', fontSize: 11, whiteSpace: 'nowrap' }}>
                                <div style={{ fontWeight: 700 }}>{fmtDateShort(r.date)}</div>
                                <div style={{ fontSize: 10, color: '#A0AEC0' }}>{new Date(r.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' })}</div>
                              </td>
                              {/* MEAL */}
                              <td style={{ padding: '5px 8px' }}>
                                <select
                                  className="form-field"
                                  style={{ padding: '4px 6px', fontSize: 11, width: '100%' }}
                                  value={r.mealType}
                                  onChange={e => {
                                    const mt = e.target.value
                                    updateRow(globalIdx, { mealType: mt, time: r.time === MEAL_DEFAULTS[r.mealType] ? MEAL_DEFAULTS[mt] : r.time })
                                  }}
                                >
                                  {MEAL_OPTIONS.map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                              </td>
                              {/* TIME */}
                              <td style={{ padding: '5px 8px' }}>
                                <input
                                  className="form-field"
                                  type="time"
                                  style={{ padding: '4px 6px', fontSize: 11, width: '100%' }}
                                  value={r.time || ''}
                                  onChange={e => updateRow(globalIdx, { time: e.target.value || MEAL_DEFAULTS[r.mealType] })}
                                />
                              </td>
                              {/* VENDOR NAME */}
                              <td style={{ padding: '5px 8px' }}>
                                {r.tbdReason === 'multiple_options' && r.vendor ? (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <select
                                      className="form-field"
                                      style={{ padding: '4px 6px', fontSize: 11, flex: 1, borderColor: '#FCD34D', background: '#FFFBEB' }}
                                      value=""
                                      onChange={e => { if (e.target.value) pickVendor(globalIdx, e.target.value) }}
                                    >
                                      <option value="">Pick one…</option>
                                      {r.vendor.split(/ or /i).map((opt, oi) => (
                                        <option key={oi} value={opt.trim()}>{opt.trim()}</option>
                                      ))}
                                    </select>
                                    <span style={{ fontSize: 9, fontWeight: 800, background: '#FEF3C7', color: '#92400E', padding: '2px 5px', borderRadius: 999, whiteSpace: 'nowrap', flexShrink: 0 }}>PICK</span>
                                  </div>
                                ) : (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <input
                                      className="form-field"
                                      style={{ padding: '4px 6px', fontSize: 11, flex: 1, borderColor: r.isTbd ? '#FCD34D' : undefined, background: r.isTbd ? '#FFFBEB' : undefined }}
                                      value={r.vendor || ''}
                                      onChange={e => updateRow(globalIdx, { vendor: e.target.value || null, isTbd: false, tbdReason: null })}
                                      placeholder="Restaurant name…"
                                    />
                                    {r.isTbd && (
                                      <span style={{ fontSize: 9, fontWeight: 800, background: '#FEF3C7', color: '#92400E', padding: '2px 5px', borderRadius: 999, whiteSpace: 'nowrap', flexShrink: 0 }}>TBD</span>
                                    )}
                                  </div>
                                )}
                                {r.notes && <div style={{ fontSize: 9, color: '#718096', marginTop: 2 }}>{r.notes}</div>}
                              </td>
                              {/* VENDOR ADDRESS — auto-populated, shown only when vendor exists */}
                              <td style={{ padding: '5px 8px' }}>
                                {hasVendor ? (
                                  <div style={{ position: 'relative' }}>
                                    <input
                                      className="form-field"
                                      style={{ padding: '4px 6px', fontSize: 11, width: '100%', boxSizing: 'border-box', color: lookingUpAddr.has(globalIdx) ? '#93C5FD' : undefined }}
                                      value={r.vendorAddress || ''}
                                      onChange={e => updateRow(globalIdx, { vendorAddress: e.target.value || null, vendorAddressCandidates: null })}
                                      placeholder={lookingUpAddr.has(globalIdx) ? 'Looking up…' : 'Auto-filled or type'}
                                      disabled={lookingUpAddr.has(globalIdx)}
                                    />
                                    {r.vendorAddressCandidates?.length > 0 && (
                                      <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1px solid #E2E8F0', borderRadius: 6, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 50, overflow: 'hidden' }}>
                                        {r.vendorAddressCandidates.map((c, ci) => (
                                          <div key={ci} onClick={() => updateRow(globalIdx, { vendorAddress: c.address, vendorAddressCandidates: null })}
                                            style={{ padding: '6px 8px', cursor: 'pointer', fontSize: 11, borderBottom: ci < r.vendorAddressCandidates.length - 1 ? '1px solid #F4F6F9' : 'none' }}>
                                            <div style={{ fontWeight: 700 }}>{c.name}</div>
                                            <div style={{ color: '#718096', fontSize: 10 }}>{c.address}</div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <span style={{ fontSize: 10, color: '#CBD5E0', fontStyle: 'italic' }}>—</span>
                                )}
                              </td>
                              {/* DELIVERY ADDRESS — user types, autocomplete */}
                              <td style={{ padding: '5px 8px' }}>
                                <AddressInput
                                  value={r.deliveryAddress || ''}
                                  onChange={v => updateRow(globalIdx, { deliveryAddress: v || null })}
                                  placeholder="Delivery address…"
                                  city={city}
                                  state={state}
                                  style={{ padding: '4px 6px', fontSize: 11 }}
                                />
                              </td>
                              {/* DELETE */}
                              <td style={{ padding: '5px 4px', textAlign: 'center' }}>
                                <button style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 2 }} onClick={() => removeRow(globalIdx)}>
                                  <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#CBD5E0' }}>delete_outline</span>
                                </button>
                              </td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {pageCount > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 18 }}>
                  <button className="btn-secondary" disabled={page === 1} style={{ padding: '6px 16px', fontSize: 12 }} onClick={() => setPage(p => Math.max(1, p - 1))}>
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>chevron_left</span> Previous
                  </button>
                  <span style={{ fontSize: 12, color: '#718096' }}>Page {page} / {pageCount}</span>
                  <button className="btn-secondary" disabled={page === pageCount} style={{ padding: '6px 16px', fontSize: 12 }} onClick={() => setPage(p => Math.min(pageCount, p + 1))}>
                    Next <span className="material-symbols-outlined" style={{ fontSize: 16 }}>chevron_right</span>
                  </button>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                <div style={{ fontSize: 14, color: '#718096' }}>
                  {draftRows.length} meal rows
                  {draftRows.filter(r => r.isTbd).length > 0 && (
                    <span style={{ marginLeft: 10, fontSize: 12, fontWeight: 700, color: '#92400E', background: '#FEF3C7', padding: '2px 8px', borderRadius: 10 }}>
                      {draftRows.filter(r => r.isTbd).length} TBD — review before submitting
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <button className="btn-secondary" onClick={() => setPanelStep(2)}>Back</button>
                  <button className="btn-primary" disabled={missing.length > 0 || submitting} onClick={submit}>
                    {submitting ? 'Submitting...' : 'Submit Schedule'}
                  </button>
                </div>
              </div>
              {missing.length > 0 && (
                <div style={{ background: '#FFF1F2', border: '1.5px solid #FECDD3', borderRadius: 12, padding: 14, color: '#9B1C1C', fontSize: 13, flexShrink: 0 }}>
                  <strong>Missing info:</strong> {missing.join(', ')}.
                </div>
              )}
            </div>
          )}
        </div>

        {/* CSV Modal */}
        {showCSVModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 500, background: 'white', borderRadius: 20, padding: 32, boxShadow: '0 20px 50px rgba(0,0,0,0.2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                <h3 style={{ fontSize: 18, fontWeight: 900, margin: 0 }}>Upload CSV</h3>
                <button onClick={() => setShowCSVModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><span className="material-symbols-outlined">close</span></button>
              </div>
              
              <div 
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                style={{ 
                  background: isDragging ? '#EBF2FF' : '#F8FAFC', 
                  border: isDragging ? '2px solid #0F62FE' : '2px dashed #BFDBFE', 
                  borderRadius: 16, padding: 48, textAlign: 'center', transition: 'all 0.2s ease',
                  cursor: 'pointer'
                }}
                onClick={() => document.getElementById('csvUpload').click()}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 48, color: '#0F62FE', marginBottom: 16 }}>upload_file</span>
                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>Drag and drop CSV here</div>
                <div style={{ fontSize: 13, color: '#718096' }}>or click to browse files</div>
                <input type="file" id="csvUpload" accept=".csv" style={{ display: 'none' }} onChange={handleCSVFile} />
              </div>

              <div style={{ marginTop: 24, padding: 16, background: '#EFF6FF', borderRadius: 12, border: '1px solid #BFDBFE' }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: '#1D4ED8', marginBottom: 8, textTransform: 'uppercase' }}>Required Columns</div>
                <div style={{ fontSize: 12, fontFamily: 'monospace', color: '#1E40AF' }}>date, time, meal_type, location_type, notes</div>
              </div>

              {csvError && <div style={{ marginTop: 16, background: '#FFF1F2', border: '1.5px solid #FECDD3', borderRadius: 10, padding: 12, color: '#9B1C1C', fontSize: 13 }}>{csvError}</div>}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
