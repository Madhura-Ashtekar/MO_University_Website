import React from 'react'

export function PageNewSchedule({ S, upd, schNext, toggleDay, addRow, delRow, updRow, togglePref, updVeg, onSubmitSchedule }) {
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
          <p style={{ fontSize: 14, color: '#718096', marginBottom: 24 }}>Enter basic logistics to help our AI suggest the best meal timing.</p>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
            <div className="form-group">
              <label>Schedule Name</label>
              <input className="form-field" placeholder="e.g. NCAA Regionals Travel" value={S.schName} onChange={(e) => upd('schName', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Team Name</label>
              <input className="form-field" placeholder="e.g. Varsity Baseball" value={S.schTeam} onChange={(e) => upd('schTeam', e.target.value)} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
            <div className="form-group">
              <label>School Name</label>
              <input className="form-field" placeholder="e.g. University of Virginia" value={S.schoolName} onChange={(e) => upd('schoolName', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Conference</label>
              <input className="form-field" placeholder="e.g. ACC, Big 10" value={S.conference} onChange={(e) => upd('conference', e.target.value)} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
            <div className="form-group">
              <label>Sport</label>
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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
            <div className="form-group">
              <label>Expected Headcount</label>
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

      {S.schStep === 2 && <Step2MealPlan S={S} schNext={schNext} toggleDay={toggleDay} addRow={addRow} delRow={delRow} updRow={updRow} />}
      {S.schStep === 3 && <Step3Dietary S={S} schNext={schNext} togglePref={togglePref} updVeg={updVeg} onSubmitSchedule={onSubmitSchedule} />}
    </div>
  )
}

function MiniCal({ sel, onToggle }) {
  const days = Array.from({ length: 28 }, (_, i) => i + 1)
  const isS = (d) => sel.includes(`2026-02-${String(d).padStart(2, '0')}`)
  return (
    <div style={{ background: 'white', borderRadius: 16, border: '1px solid #E2E8F0', padding: 18 }}>
      <div style={{ fontSize: 12, fontWeight: 900, marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span>FEBRUARY 2026</span>
        <span style={{ color: '#0F62FE' }}>{sel.length} Selected</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <div key={i} style={{ fontSize: 9, fontWeight: 800, color: '#A0AEC0', textAlign: 'center', paddingBottom: 4 }}>{d}</div>)}
        {days.map((d) => {
          const s = isS(d)
          return (
            <div key={d} onClick={() => onToggle(`2026-02-${String(d).padStart(2, '0')}`)} style={{ 
              height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700,
              cursor: 'pointer', background: s ? '#0F62FE' : 'transparent', color: s ? 'white' : '#475569', border: s ? 'none' : '1px solid transparent'
            }} className={!s ? 'cal-day-hover' : ''}>{d}</div>
          )
        })}
      </div>
    </div>
  )
}

function Step2MealPlan({ S, schNext, toggleDay, addRow, delRow, updRow }) {
  const days = (S.schDays.length > 0 ? [...S.schDays].sort() : [])
  const totalMeals = Object.values(S.mealRowsByDay).reduce((acc, arr) => acc + arr.filter(r => r.type && r.time).length, 0)

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 24, alignItems: 'start' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <MiniCal sel={S.schDays} onToggle={toggleDay} />
        <div style={{ background: '#F8FAFC', borderRadius: 16, border: '1.5px dashed #E2E8F0', padding: 18 }}>
          <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#0F62FE' }}>auto_awesome</span>
            <span style={{ fontSize: 12, fontWeight: 800, color: '#1E293B' }}>AI Suggestion</span>
          </div>
          <p style={{ fontSize: 11, color: '#64748B', lineHeight: 1.6, margin: 0 }}>
            Based on your baseball team travel, I recommend a <strong>Post-Game Meal</strong> at 8:00 PM on game days.
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
                <span style={{ fontSize: 13, fontWeight: 800 }}>{new Date(d).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</span>
                <span className="badge badge-blue">{rows.length} Meals</span>
              </div>
              <div style={{ padding: '8px 20px 20px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '120px 110px 140px 1fr 40px', gap: 12, padding: '10px 0', borderBottom: '1px solid #F4F6F9' }}>
                  {['MEAL TYPE', 'TIME', 'LOCATION', 'NOTES / PREFS', ''].map(h => <span key={h} style={{ fontSize: 9, fontWeight: 800, color: '#A0AEC0', letterSpacing: '0.05em' }}>{h}</span>)}
                </div>
                {rows.map((r, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '120px 110px 140px 1fr 40px', gap: 12, marginTop: 12 }}>
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
                    <select className="form-field" value={r.loc} onChange={(e) => updRow(d, i, 'loc', e.target.value)}>
                      <option value="hotel">Hotel</option>
                      <option value="field">Field / Stadium</option>
                      <option value="restaurant">Restaurant</option>
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

function Step3Dietary({ S, schNext, togglePref, updVeg, onSubmitSchedule }) {
  const days = (S.schDays.length > 0 ? [...S.schDays].sort() : [])
  const rows = days.flatMap((d) => (S.mealRowsByDay[d] || []).map((r) => ({ ...r, date: d })))
  const validRows = rows.filter((r) => r.type && r.time)

  const missing = []
  if (!S.schName?.trim()) missing.push('schedule name')
  if (!S.schTeam?.trim()) missing.push('team')
  if (!S.schHeadcount || Number.isNaN(Number(S.schHeadcount)) || Number(S.schHeadcount) <= 0) missing.push('headcount')
  if (days.length === 0) missing.push('at least one date')
  if (validRows.length === 0) missing.push('at least one meal row (meal type + time)')

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 310px', gap: 24, alignItems: 'start' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ background: 'white', borderRadius: 16, border: '1px solid #E2E8F0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ padding: '16px 22px', borderBottom: '1px solid #EEF1F5', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 26, height: 26, background: '#0F62FE', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ color: 'white', fontSize: 13, fontWeight: 800 }}>4</span>
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

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
              {[
                { label:'Gluten Free Option', sub:'Always include a GF choice', key:'glutenFree', val:S.glutenFree },
                { label:'Nut-Free Kitchen', sub:'Strict allergy protocol required', key:'nutFree', val:S.nutFree },
              ].map((t) => (
                <div key={t.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', border: '1.5px solid #E2E8F0', borderRadius: 12 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{t.label}</div>
                    <div style={{ fontSize: 11, color: '#718096' }}>{t.sub}</div>
                  </div>
                  <div className={`toggle-wrap ${t.val ? 'on' : ''}`} onClick={() => togglePref(t.key)} />
                </div>
              ))}
            </div>

            <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 8 }}>Additional Restrictions</label>
            <textarea className="form-field" rows={3} placeholder="No pork, severe shellfish allergy for 2 athletes, 1 diabetic needing carb counts…" style={{ resize: 'vertical' }} />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <button className="btn-secondary" onClick={() => schNext(2)}><span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_back</span> Back</button>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn-secondary" onClick={() => window.alert('Draft saved!')}>Save Draft</button>
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
                  tripType: 'overnight', // default for now
                  homeAwayNeutral: 'away', // default for now
                  opponent: null,
                  venueName: null,
                  rows: validRows.map((r) => ({
                    date: r.date,
                    time: r.time,
                    timezone: 'America/New_York',
                    mealType: r.type,
                    locationType: r.loc,
                    notes: r.notes,
                    budget: r.budget,
                    headcount: Number(S.schHeadcount),
                    dietaryCounts: {
                      vegetarian: Math.round((Number(S.vegPct) * Number(S.schHeadcount)) / 100),
                      glutenFree: S.glutenFree ? Math.round(0.25 * Number(S.schHeadcount)) : 0,
                      nutFree: S.nutFree ? Math.round(0.05 * Number(S.schHeadcount)) : 0,
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
            <span className="badge badge-red">1 Date Over Budget</span>
          </div>
          <div style={{ padding: '16px 18px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#A0AEC0', letterSpacing: '0.06em', marginBottom: 10 }}>BUDGET BY DAY</div>
            {[
              { label:'Day 1 · Feb 19', spent:1297.5, limit:S.schBudget, over:true },
              { label:'Day 2 · Feb 20', spent:850, limit:S.schBudget, over:false },
              { label:'Day 3 · Feb 21', spent:720, limit:S.schBudget, over:false },
            ].map((b) => {
              const pct = Math.min(100, Math.round((b.spent / b.limit) * 100))
              return (
                <div key={b.label} style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 600 }}>{b.label}</span>
                    <div>
                      <span style={{ fontSize: 12, fontWeight: 700, color: b.over ? '#DA1E28' : '#0D1117' }}>${b.spent.toLocaleString()}</span>
                      <span style={{ fontSize: 11, color: '#A0AEC0' }}> / ${b.limit.toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="budget-bar"><div className="budget-fill" style={{ width: `${pct}%`, background: b.over ? '#DA1E28' : '#24A148' }} /></div>
                </div>
              )
            })}
            <hr style={{ border: 'none', borderTop: '1px solid #EEF1F5', margin: '14px 0' }} />
          </div>
          <div style={{ padding: '14px 18px', background: '#F8FAFC', borderTop: '1px solid #EEF1F5', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 11, color: '#718096' }}>Estimated Total</div>
              <div style={{ fontSize: 24, fontWeight: 800 }}>${(S.schDays.length * S.schBudget).toLocaleString()}</div>
            </div>
            <span className="badge badge-blue">{S.schDays.length || 0} Dates</span>
          </div>
        </div>

        {missing.length > 0 && (
          <div style={{ background: '#FFF1F2', border: '1.5px solid #FECDD3', borderRadius: 12, padding: 14, display: 'flex', gap: 10 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#9B1C1C' }}>error</span>
            <div style={{ fontSize: 12, color: '#9B1C1C', lineHeight: 1.6 }}>
              <strong>Can’t submit yet.</strong> Missing {missing.join(', ')}.
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
