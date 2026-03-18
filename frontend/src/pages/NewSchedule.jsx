import React, { useState, useMemo } from 'react'

export function PageNewSchedule({ S, upd, schNext, toggleDay, addRow, delRow, updRow, togglePref, updVeg, updGfPct, updNfPct, onSubmitSchedule }) {
  const steps = [
    { id: 1, label: 'Trip Basics', icon: 'info' },
    { id: 2, label: 'Meal Plan', icon: 'restaurant_menu' },
    { id: 3, label: 'Dietary & Review', icon: 'fact_check' },
  ]

  return (
    <div className="page" style={{ padding: '24px 32px', maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 60, marginBottom: 40, position: 'relative' }}>
        <div style={{ position: 'absolute', top: 18, left: '15%', right: '15%', height: 2, background: '#E2E8F0', zIndex: 0 }} />
        {steps.map((st) => {
          const active = S.schStep === st.id
          const done = S.schStep > st.id
          return (
            <div key={st.id} style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <div style={{ 
                width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: active ? '#0F62FE' : done ? '#24A148' : 'white',
                border: active || done ? 'none' : '2px solid #E2E8F0',
                color: active || done ? 'white' : '#A0AEC0',
                transition: 'all 0.3s ease', boxShadow: active ? '0 0 0 4px rgba(15,98,254,0.15)' : 'none'
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{done ? 'check' : st.icon}</span>
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: active ? '#0F62FE' : '#718096', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{st.label}</span>
            </div>
          )
        })}
      </div>

      {S.schStep === 1 && (
        <div style={{ maxWidth: 640, margin: '0 auto', background: 'white', borderRadius: 20, border: '1px solid #E2E8F0', padding: 32, boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
          <h2 style={{ fontSize: 20, fontWeight: 900, marginBottom: 8 }}>Tell us about the trip</h2>
          <p style={{ fontSize: 14, color: '#718096', marginBottom: 24 }}>Enter basic logistics to define the travel context for your meals.</p>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
            <div className="form-group">
              <label>Schedule Name <span style={{ color: '#EF4444' }}>*</span></label>
              <input className="form-field" placeholder="e.g. NCAA Regionals Travel" value={S.schName} onChange={(e) => upd('schName', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Team Name <span style={{ color: '#EF4444' }}>*</span></label>
              <input className="form-field" placeholder="e.g. Varsity Baseball" value={S.schTeam} onChange={(e) => upd('schTeam', e.target.value)} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
            <div className="form-group">
              <label>School Name <span style={{ color: '#EF4444' }}>*</span></label>
              <input className="form-field" placeholder="e.g. University of Virginia" value={S.schoolName} onChange={(e) => upd('schoolName', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Conference</label>
              <input className="form-field" placeholder="e.g. ACC, Big 10" value={S.conference} onChange={(e) => upd('conference', e.target.value)} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
            <div className="form-group">
              <label>Sport <span style={{ color: '#EF4444' }}>*</span></label>
              <input className="form-field" placeholder="e.g. Baseball, Football" value={S.sport} onChange={(e) => upd('sport', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Division</label>
              <select className="form-field" value={S.division || 'DI'} onChange={(e) => upd('division', e.target.value)}>
                <option value="DI">Division I</option>
                <option value="DII">Division II</option>
                <option value="DIII">Division III</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
            <div className="form-group">
              <label>Trip Type</label>
              <select className="form-field" value={S.tripType || 'overnight'} onChange={(e) => upd('tripType', e.target.value)}>
                <option value="day_trip">Day Trip</option>
                <option value="overnight">Overnight</option>
                <option value="multi_day">Multi-Day</option>
              </select>
            </div>
            <div className="form-group">
              <label>Home / Away</label>
              <select className="form-field" value={S.homeAwayNeutral || 'away'} onChange={(e) => upd('homeAwayNeutral', e.target.value)}>
                <option value="home">Home</option>
                <option value="away">Away</option>
                <option value="neutral">Neutral</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
            <div className="form-group">
              <label>Opponent</label>
              <input className="form-field" placeholder="e.g. NC State" value={S.opponent || ''} onChange={(e) => upd('opponent', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Venue Name</label>
              <input className="form-field" placeholder="e.g. Scott Stadium" value={S.venueName || ''} onChange={(e) => upd('venueName', e.target.value)} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
            <div className="form-group">
              <label>City</label>
              <input className="form-field" placeholder="e.g. Charlottesville" value={S.city || ''} onChange={(e) => upd('city', e.target.value)} />
            </div>
            <div className="form-group">
              <label>State</label>
              <input className="form-field" placeholder="e.g. VA" value={S.state || ''} onChange={(e) => upd('state', e.target.value)} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
            <div className="form-group">
              <label>Game Date</label>
              <input className="form-field" type="date" value={S.gameDate || ''} onChange={(e) => upd('gameDate', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Game Time</label>
              <input className="form-field" type="time" value={S.gameTime || ''} onChange={(e) => upd('gameTime', e.target.value)} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
            <div className="form-group">
              <label>Expected Headcount <span style={{ color: '#EF4444' }}>*</span></label>
              <div style={{ position: 'relative' }}>
                <input className="form-field" type="number" value={S.schHeadcount} onChange={(e) => upd('schHeadcount', e.target.value)} />
                <span style={{ position: 'absolute', right: 12, top: 12, fontSize: 12, color: '#A0AEC0', fontWeight: 600 }}>Athletes</span>
              </div>
            </div>
            <div className="form-group">
              <label>Daily Budget per Athlete</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 12, top: 12, fontSize: 12, color: '#A0AEC0', fontWeight: 600 }}>$</span>
                <input className="form-field" style={{ paddingLeft: 24 }} type="number" value={S.schBudget} onChange={(e) => upd('schBudget', e.target.value)} />
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
            <button className="btn-primary" style={{ padding: '12px 32px' }} disabled={!S.schName || !S.schTeam} onClick={() => schNext(2)}>Continue <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'white' }}>arrow_forward</span></button>
          </div>
        </div>
      )}

      {S.schStep === 2 && <Step2MealPlan S={S} upd={upd} schNext={schNext} toggleDay={toggleDay} addRow={addRow} delRow={delRow} updRow={updRow} />}
      {S.schStep === 3 && <Step3Dietary S={S} upd={upd} schNext={schNext} togglePref={togglePref} updVeg={updVeg} updGfPct={updGfPct} updNfPct={updNfPct} onSubmitSchedule={onSubmitSchedule} />}
    </div>
  )
}

function MiniCal({ sel, onToggle, calYear, calMonth, onChangeMonth }) {
  const year = calYear
  const month = calMonth
  const firstDow = new Date(year, month - 1, 1).getDay()
  const daysInMonth = new Date(year, month, 0).getDate()
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)
  const monthName = new Date(year, month - 1).toLocaleString('en-US', { month: 'long' })

  const isSelected = (d) => sel.includes(`${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`)

  return (
    <div style={{ background: 'white', borderRadius: 16, border: '1px solid #E2E8F0', padding: 18 }}>
      <div style={{ fontSize: 12, fontWeight: 900, marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={() => onChangeMonth(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#718096' }}>chevron_left</span>
          </button>
          <span>{monthName} {year}</span>
          <button onClick={() => onChangeMonth(1)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#718096' }}>chevron_right</span>
          </button>
        </div>
        <span style={{ color: '#0F62FE' }}>{sel.length} Selected</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <div key={i} style={{ fontSize: 9, fontWeight: 800, color: '#A0AEC0', textAlign: 'center', paddingBottom: 4 }}>{d}</div>)}
        {Array.from({ length: firstDow }, (_, i) => <div key={`pad-${i}`} />)}
        {days.map((d) => {
          const s = isSelected(d)
          const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
          return (
            <div key={d} onClick={() => onToggle(dateStr)} style={{ 
              height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700,
              cursor: 'pointer', background: s ? '#0F62FE' : 'transparent', color: s ? 'white' : '#475569', border: s ? 'none' : '1px solid transparent'
            }} className={!s ? 'cal-day-hover' : ''}>{d}</div>
          )
        })}
      </div>
    </div>
  )
}

const TZ_OPTIONS = [
  { value: 'America/New_York', label: 'ET' },
  { value: 'America/Chicago', label: 'CT' },
  { value: 'America/Denver', label: 'MT' },
  { value: 'America/Los_Angeles', label: 'PT' },
]

function Step2MealPlan({ S, upd, schNext, toggleDay, addRow, delRow, updRow }) {
  const [calYear, setCalYear] = useState(() => {
    const now = new Date()
    return now.getFullYear()
  })
  const [calMonth, setCalMonth] = useState(() => {
    const now = new Date()
    return now.getMonth() + 1
  })

  const changeMonth = (delta) => {
    let m = calMonth + delta
    let y = calYear
    if (m < 1) { m = 12; y-- }
    if (m > 12) { m = 1; y++ }
    setCalMonth(m)
    setCalYear(y)
  }

  const days = (S.schDays.length > 0 ? [...S.schDays].sort() : [])
  const totalMeals = Object.values(S.mealRowsByDay).reduce((acc, arr) => acc + arr.filter(r => r.type && r.time).length, 0)

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 24, alignItems: 'start' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <MiniCal sel={S.schDays} onToggle={toggleDay} calYear={calYear} calMonth={calMonth} onChangeMonth={changeMonth} />
        <div style={{ background: '#F8FAFC', borderRadius: 16, border: '1.5px dashed #E2E8F0', padding: 18 }}>
          <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#0F62FE' }}>info</span>
            <span style={{ fontSize: 12, fontWeight: 800, color: '#1E293B' }}>Fulfillment Note</span>
          </div>
          <p style={{ fontSize: 11, color: '#64748B', lineHeight: 1.6, margin: 0 }}>
            Ensure your <strong>Post-Game Meal</strong> is scheduled with enough buffer after the game time.
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {days.length === 0 && (
          <div style={{ background: 'white', borderRadius: 16, border: '1px solid #E2E8F0', padding: 48, textAlign: 'center' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 40, color: '#CBD5E0', marginBottom: 16 }}>calendar_today</span>
            <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 8 }}>No dates selected</h3>
            <p style={{ fontSize: 13, color: '#718096', maxWidth: 300, margin: '0 auto' }}>Select travel dates on the calendar to begin planning your meals.</p>
          </div>
        )}

        {days.map((d) => {
          const rows = S.mealRowsByDay[d] || []
          return (
            <div key={d} style={{ background: 'white', borderRadius: 16, border: '1px solid #E2E8F0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid #EEF1F5', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#FAFBFC' }}>
                <span style={{ fontSize: 13, fontWeight: 800 }}>{new Date(d + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</span>
                <span className="badge badge-blue">{rows.length} Meals</span>
              </div>
              <div style={{ padding: '8px 20px 20px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '120px 110px 80px 140px 1fr 40px', gap: 12, padding: '10px 0', borderBottom: '1px solid #F4F6F9' }}>
                  {['MEAL TYPE', 'TIME', 'TZ', 'LOCATION', 'NOTES / PREFS', ''].map(h => <span key={h} style={{ fontSize: 9, fontWeight: 800, color: '#A0AEC0', letterSpacing: '0.05em' }}>{h}</span>)}
                </div>
                {rows.map((r, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '120px 110px 80px 140px 1fr 40px', gap: 12, marginTop: 12 }}>
                    <select className="form-field" value={r.type} onChange={(e) => updRow(d, i, 'type', e.target.value)}>
                      <option value="">Select...</option>
                      <option value="Breakfast">Breakfast</option>
                      <option value="Lunch">Lunch</option>
                      <option value="Pre-Game Meal">Pre-Game</option>
                      <option value="Post-Game Meal">Post-Game</option>
                      <option value="Dinner">Dinner</option>
                      <option value="Snack">Snack</option>
                    </select>
                    <input className="form-field" type="time" value={r.time} onChange={(e) => updRow(d, i, 'time', e.target.value)} />
                    <select className="form-field" value={r.tz || 'America/New_York'} onChange={(e) => updRow(d, i, 'tz', e.target.value)}>
                      {TZ_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                    <select className="form-field" value={r.loc} onChange={(e) => updRow(d, i, 'loc', e.target.value)}>
                      <option value="hotel">Hotel</option>
                      <option value="field">Field / Stadium</option>
                      <option value="restaurant">Restaurant</option>
                      <option value="airport">Airport</option>
                      <option value="perdiem">Per Diem</option>
                      <option value="bus">On Bus</option>
                    </select>
                    <input className="form-field" placeholder="e.g. Italian, Boxed, TBD..." value={r.notes} onChange={(e) => updRow(d, i, 'notes', e.target.value)} />
                    <button onClick={() => delRow(d, i)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}><span className="material-symbols-outlined" style={{ fontSize: 18, color: '#A0AEC0' }}>delete</span></button>
                  </div>
                ))}
                <button className="btn-secondary" style={{ marginTop: 16, width: '100%', justifyContent: 'center', borderStyle: 'dashed', borderWidth: '1.5px' }} onClick={() => addRow(d)}>+ Add another meal</button>
              </div>
            </div>
          )
        })}

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
          <button className="btn-secondary" onClick={() => schNext(1)}><span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_back</span> Back</button>
          <button className="btn-primary" onClick={() => schNext(3)}>Review & Dietary <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'white' }}>arrow_forward</span></button>
        </div>
      </div>

      <div style={{ position: 'sticky', top: 80, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ background: 'white', borderRadius: 16, border: '1px solid #E2E8F0', padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#A0AEC0', letterSpacing: '0.08em', marginBottom: 14 }}>ORDER SUMMARY</div>
          <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 3 }}>{S.schName || 'Unnamed Schedule'}</div>
          <div style={{ fontSize: 12, color: '#718096', marginBottom: 14 }}>{S.schTeam}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}><span style={{ color: '#718096' }}>Dates</span><span style={{ fontWeight: 700 }}>{days.length} day{days.length !== 1 ? 's' : ''}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}><span style={{ color: '#718096' }}>Meals planned</span><span style={{ fontWeight: 700 }}>{totalMeals}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}><span style={{ color: '#718096' }}>Headcount</span><span style={{ fontWeight: 700 }}>{S.schHeadcount} athletes</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}><span style={{ color: '#718096' }}>Daily budget</span><span style={{ fontWeight: 700 }}>${S.schBudget}</span></div>
          </div>
          <hr style={{ border: 'none', borderTop: '1px solid #F4F6F9', margin: '14px 0' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: '#718096' }}>Est. total</span>
            <span style={{ fontSize: 22, fontWeight: 800 }}>${(days.length * S.schBudget).toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function Step3Dietary({ S, upd, schNext, togglePref, updVeg, updGfPct, updNfPct, onSubmitSchedule }) {
  const days = (S.schDays.length > 0 ? [...S.schDays].sort() : [])
  const rows = days.flatMap((d) => (S.mealRowsByDay[d] || []).map((r) => ({ ...r, date: d })))
  const validRows = rows.filter((r) => r.type && r.time)

  const missing = []
  if (!S.schName?.trim()) missing.push('schedule name')
  if (!S.schTeam?.trim()) missing.push('team')
  if (!S.schoolName?.trim()) missing.push('school name')
  if (!S.schHeadcount || Number.isNaN(Number(S.schHeadcount)) || Number(S.schHeadcount) <= 0) missing.push('headcount')
  if (days.length === 0) missing.push('at least one date')
  if (validRows.length === 0) missing.push('at least one meal row (meal type + time)')

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 310px', gap: 24, alignItems: 'start' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ background: 'white', borderRadius: 16, border: '1px solid #E2E8F0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ padding: '16px 22px', borderBottom: '1px solid #EEF1F5', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 26, height: 26, background: '#0F62FE', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ color: 'white', fontSize: 13, fontWeight: 800 }}>3</span>
            </div>
            <span style={{ fontSize: 15, fontWeight: 700 }}>Dietary Rules & Restrictions</span>
          </div>
          <div style={{ padding: 22 }}>
            <div style={{ background: '#F8FAFC', padding: 16, borderRadius: 12, border: '1.5px solid #E2E8F0', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <label style={{ fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#16A34A' }}>eco</span> Vegetarian Coverage
                </label>
                <span style={{ background: '#D1FAE5', color: '#065F46', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 10 }}>
                  {S.vegPct}% ({Math.round((S.vegPct * S.schHeadcount) / 100)} people)
                </span>
              </div>
              <input type="range" min="0" max="100" value={S.vegPct} onChange={(e) => updVeg(e.target.value)} style={{ width: '100%', accentColor: '#0F62FE' }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
              {[
                { label: 'Gluten-Free %', icon: 'grain', iconColor: '#D97706', badgeBg: '#FEF3C7', badgeTx: '#92400E', pct: S.glutenFreePct ?? 0, updFn: updGfPct },
                { label: 'Nut-Free %', icon: 'no_food', iconColor: '#9333EA', badgeBg: '#F3E8FF', badgeTx: '#6B21A8', pct: S.nutFreePct ?? 0, updFn: updNfPct },
              ].map((d) => (
                <div key={d.label} style={{ background: '#F8FAFC', padding: 12, borderRadius: 12, border: '1.5px solid #E2E8F0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <label style={{ fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 15, color: d.iconColor }}>{d.icon}</span> {d.label}
                    </label>
                    <span style={{ background: d.badgeBg, color: d.badgeTx, fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 10 }}>
                      {d.pct}% ({Math.round((d.pct * S.schHeadcount) / 100)} people)
                    </span>
                  </div>
                  <input type="range" min="0" max="100" value={d.pct} onChange={(e) => d.updFn(Number(e.target.value))} style={{ width: '100%', accentColor: '#0F62FE' }} />
                </div>
              ))}
            </div>

            <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 8 }}>Additional Restrictions</label>
            <textarea
              className="form-field"
              rows={3}
              placeholder="No pork, severe shellfish allergy for 2 athletes, 1 diabetic needing carb counts..."
              style={{ resize: 'vertical' }}
              value={S.dietaryNotes || ''}
              onChange={(e) => upd('dietaryNotes', e.target.value)}
            />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <button className="btn-secondary" onClick={() => schNext(2)}><span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_back</span> Back</button>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              className="btn-primary"
              disabled={missing.length > 0}
              onClick={async () => {
                if (missing.length > 0) return
                const draft = {
                  name: S.schName,
                  teamName: S.schTeam,
                  schoolName: S.schoolName,
                  conference: S.conference,
                  division: S.division || 'DI',
                  headcount: Number(S.schHeadcount),
                  sport: S.sport,
                  tripType: S.tripType || 'overnight',
                  homeAwayNeutral: S.homeAwayNeutral || 'away',
                  opponent: S.opponent || null,
                  venueName: S.venueName || null,
                  city: S.city || null,
                  state: S.state || null,
                  gameDate: S.gameDate || null,
                  gameTime: S.gameTime || null,
                  dietaryNotes: S.dietaryNotes || null,
                  rows: validRows.map((r) => ({
                    date: r.date,
                    time: r.time,
                    timezone: r.tz || 'America/New_York',
                    mealType: r.type,
                    locationType: r.loc,
                    notes: r.notes,
                    budget: r.budget ? Number(r.budget) : null,
                    headcount: Number(S.schHeadcount),
                    dietaryCounts: {
                      vegetarian: Math.round((Number(S.vegPct) * Number(S.schHeadcount)) / 100),
                      glutenFree: Math.round(((S.glutenFreePct ?? 0) * Number(S.schHeadcount)) / 100),
                      nutFree: Math.round(((S.nutFreePct ?? 0) * Number(S.schHeadcount)) / 100),
                    },
                  })),
                }
                try {
                  await onSubmitSchedule?.(draft)
                } catch (e) {
                  // Error handled by parent toast
                }
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'white' }}>send</span> Submit Schedule
            </button>
          </div>
        </div>
      </div>

      <div style={{ position: 'sticky', top: 80, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ background: 'white', borderRadius: 16, border: '1px solid #E2E8F0', overflow: 'hidden', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid #EEF1F5', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#0F62FE' }}>receipt_long</span>
              <span style={{ fontWeight: 700 }}>Order Summary</span>
            </div>
          </div>
          <div style={{ padding: '16px 18px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#A0AEC0', letterSpacing: '0.06em', marginBottom: 10 }}>SCHEDULE OVERVIEW</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}><span style={{ color: '#718096' }}>Schedule</span><span style={{ fontWeight: 700 }}>{S.schName || '—'}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}><span style={{ color: '#718096' }}>Team</span><span style={{ fontWeight: 700 }}>{S.schTeam || '—'}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}><span style={{ color: '#718096' }}>Trip Dates</span><span style={{ fontWeight: 700 }}>{days.length} day{days.length !== 1 ? 's' : ''}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}><span style={{ color: '#718096' }}>Meals</span><span style={{ fontWeight: 700 }}>{validRows.length}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}><span style={{ color: '#718096' }}>Headcount</span><span style={{ fontWeight: 700 }}>{S.schHeadcount}</span></div>
            </div>
            <hr style={{ border: 'none', borderTop: '1px solid #EEF1F5', margin: '14px 0' }} />
          </div>
          <div style={{ padding: '14px 18px', background: '#F8FAFC', borderTop: '1px solid #EEF1F5', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 11, color: '#718096' }}>Estimated Total</div>
              <div style={{ fontSize: 24, fontWeight: 800 }}>${(days.length * S.schBudget).toLocaleString()}</div>
            </div>
            <span className="badge badge-blue">{days.length || 0} Dates</span>
          </div>
        </div>

        {missing.length > 0 && (
          <div style={{ background: '#FFF1F2', border: '1.5px solid #FECDD3', borderRadius: 12, padding: 14, display: 'flex', gap: 10 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#9B1C1C' }}>error</span>
            <div style={{ fontSize: 12, color: '#9B1C1C', lineHeight: 1.6 }}>
              <strong>Can't submit yet.</strong> Missing {missing.join(', ')}.
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
