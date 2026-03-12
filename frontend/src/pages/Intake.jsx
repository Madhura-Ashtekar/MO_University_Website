import React, { useState, useMemo } from 'react'
import { parseAthleticsEmailToDraft, EXAMPLE_EMAIL_BASEBALL, EXAMPLE_EMAIL_WRESTLING } from '../demo/intakeParser'
import { classifyMealRow, classificationPill } from '../utils/classify'

export function PageIntake({ defaultTeam, defaultHeadcount, onSubmitSchedule }) {
  const [mode, setMode] = useState('paste')
  const [year, setYear] = useState(2026)
  const [teamName, setTeamName] = useState(defaultTeam || "Varsity Baseball (Men's)")
  const [schoolName, setSchoolName] = useState('')
  const [conference, setConference] = useState('')
  const [sport, setSport] = useState('')
  const [tripType, setTripType] = useState('multi_day')
  const [homeAwayNeutral, setHomeAwayNeutral] = useState('away')
  const [opponent, setOpponent] = useState('')
  const [venueName, setVenueName] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [headcount, setHeadcount] = useState(defaultHeadcount || 45)
  const [rawText, setRawText] = useState('')
  const [draftRows, setDraftRows] = useState([])
  const [parseError, setParseError] = useState('')

  const missing = useMemo(() => {
    const m = []
    if (!teamName?.trim()) m.push('team')
    if (!schoolName?.trim()) m.push('school')
    if (!sport?.trim()) m.push('sport')
    if (!headcount || Number(headcount) <= 0) m.push('headcount')
    if (draftRows.length === 0) m.push('at least one meal row')
    return m
  }, [teamName, schoolName, sport, headcount, draftRows.length])

  const categorized = useMemo(() => {
    const mo = []
    const tbd = []
    const notMo = []
    for (const r of draftRows) {
      const { fulfillmentType } = classifyMealRow(r.mealType, r.locationType, r.notes)
      if (fulfillmentType === 'not_mo') notMo.push(r)
      else if (fulfillmentType === 'tbd') tbd.push(r)
      else mo.push(r)
    }
    return { mo, tbd, notMo }
  }, [draftRows])

  const parseEmail = () => {
    setParseError('')
    try {
      const res = parseAthleticsEmailToDraft({ text: rawText, year })
      setDraftRows(res.rows.map((r) => ({ ...r, headcount })))
      if (res.rows.length === 0) setParseError('No meals detected. Try pasting more of the itinerary email.')
    } catch (e) {
      setParseError('Could not parse that email text.')
    }
  }

  const updateRow = (idx, patch) => {
    setDraftRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)))
  }

  const removeRow = (idx) => setDraftRows((prev) => prev.filter((_, i) => i !== idx))

  const submit = async () => {
    if (missing.length > 0) return
    const name = `${teamName} · Intake`
    try {
      await onSubmitSchedule?.({
        name,
        teamName,
        schoolName,
        conference,
        sport,
        tripType,
        homeAwayNeutral,
        opponent,
        venueName,
        city,
        state,
        rows: draftRows.map((r) => ({
          date: r.date,
          time: r.time,
          timezone: r.timezone,
          mealType: r.mealType,
          locationType: r.locationType,
          notes: r.notes,
          budget: '',
          headcount: Number(headcount),
          dietaryCounts: { vegetarian: 0, glutenFree: 0, nutFree: 0 },
          serviceStyle: r.locationType === 'airport' || r.locationType === 'perdiem' ? 'per_diem' : 'boxed',
        })),
      })
    } catch (e) {
      // Error handled by parent toast
    }
  }

  return (
    <div className="page" style={{ padding: '28px 32px', maxWidth: 1200 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '420px 1fr', gap: 18, alignItems: 'start' }}>
        <div style={{ background: 'white', borderRadius: 16, border: '1px solid #E2E8F0', padding: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ fontSize: 15, fontWeight: 800 }}>Intake</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn-secondary" style={{ padding: '8px 12px', fontSize: 12 }} onClick={() => { setRawText(EXAMPLE_EMAIL_BASEBALL); setSport('Baseball'); setTeamName("Varsity Baseball (Men's)"); }}>
                Load Baseball example
              </button>
              <button className="btn-secondary" style={{ padding: '8px 12px', fontSize: 12 }} onClick={() => { setRawText(EXAMPLE_EMAIL_WRESTLING); setSport('Wrestling'); setTeamName('Wrestling'); }}>
                Load Wrestling example
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            <button className={mode === 'paste' ? 'btn-primary' : 'btn-secondary'} style={{ padding: '8px 12px', fontSize: 12 }} onClick={() => setMode('paste')}>
              Paste email
            </button>
            <button className={mode === 'csv' ? 'btn-primary' : 'btn-secondary'} style={{ padding: '8px 12px', fontSize: 12 }} onClick={() => setMode('csv')}>
              Upload CSV (soon)
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#718096', display: 'block', marginBottom: 6 }}>Team Name</label>
              <input className="form-field" value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder="Varsity Baseball" />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#718096', display: 'block', marginBottom: 6 }}>School Name</label>
              <input className="form-field" value={schoolName} onChange={(e) => setSchoolName(e.target.value)} placeholder="Duke University" />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#718096', display: 'block', marginBottom: 6 }}>Conference</label>
              <input className="form-field" value={conference} onChange={(e) => setConference(e.target.value)} placeholder="ACC, Big 10..." />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#718096', display: 'block', marginBottom: 6 }}>Sport</label>
              <input className="form-field" value={sport} onChange={(e) => setSport(e.target.value)} placeholder="Baseball, Wrestling..." />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#718096', display: 'block', marginBottom: 6 }}>Trip type</label>
              <select className="form-field" value={tripType} onChange={(e) => setTripType(e.target.value)}>
                <option value="day_trip">day_trip</option>
                <option value="overnight">overnight</option>
                <option value="multi_day">multi_day</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#718096', display: 'block', marginBottom: 6 }}>Home / away</label>
              <select className="form-field" value={homeAwayNeutral} onChange={(e) => setHomeAwayNeutral(e.target.value)}>
                <option value="home">home</option>
                <option value="away">away</option>
                <option value="neutral">neutral</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#718096', display: 'block', marginBottom: 6 }}>Headcount</label>
              <input className="form-field" type="number" value={headcount} onChange={(e) => setHeadcount(Number(e.target.value || 0))} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#718096', display: 'block', marginBottom: 6 }}>City</label>
              <input className="form-field" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Durham" />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#718096', display: 'block', marginBottom: 6 }}>State</label>
              <input className="form-field" value={state} onChange={(e) => setState(e.target.value)} placeholder="NC" />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#718096', display: 'block', marginBottom: 6 }}>Opponent</label>
              <input className="form-field" value={opponent} onChange={(e) => setOpponent(e.target.value)} placeholder="NC State, etc." />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#718096', display: 'block', marginBottom: 6 }}>Venue</label>
              <input className="form-field" value={venueName} onChange={(e) => setVenueName(e.target.value)} placeholder="Stadium, Hotel..." />
            </div>
          </div>

          {mode === 'paste' && (
            <>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#718096', display: 'block', marginBottom: 6 }}>Email text</label>
              <textarea className="form-field" rows={10} style={{ resize: 'vertical' }} value={rawText} onChange={(e) => setRawText(e.target.value)} placeholder="Paste itinerary email here..." />
              <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                <button className="btn-secondary" onClick={() => { setRawText(''); setDraftRows([]) }}>Clear</button>
                <button className="btn-primary" onClick={parseEmail}>
                  <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'white' }}>auto_awesome</span> Parse
                </button>
              </div>
              {parseError && (
                <div style={{ marginTop: 12, background: '#FFF1F2', border: '1.5px solid #FECDD3', borderRadius: 12, padding: 12, color: '#9B1C1C', fontSize: 12 }}>
                  {parseError}
                </div>
              )}
            </>
          )}

          {mode === 'csv' && (
            <div style={{ background: '#F8FAFC', border: '1.5px dashed #E2E8F0', borderRadius: 12, padding: 14, color: '#718096', fontSize: 12, lineHeight: 1.6 }}>
              CSV upload is next. For now, paste email text and parse into a draft.
            </div>
          )}

          <div style={{ marginTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 12, color: '#718096' }}>
              {draftRows.length} draft rows · ✅ {categorized.mo.length} · 🔶 {categorized.tbd.length} · ⚪ {categorized.notMo.length}
            </div>
            <button className="btn-primary" disabled={missing.length > 0} onClick={submit}>
              Submit to Workflows
            </button>
          </div>
          {missing.length > 0 && (
            <div style={{ marginTop: 10, background: '#FFF1F2', border: '1.5px solid #FECDD3', borderRadius: 12, padding: 12, color: '#9B1C1C', fontSize: 12 }}>
              <strong>Can’t submit yet.</strong> Missing {missing.join(', ')}.
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ background: 'white', borderRadius: 16, border: '1px solid #E2E8F0', overflow: 'hidden' }}>
            <div style={{ padding: '16px 18px', borderBottom: '1px solid #EEF1F5', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 14, fontWeight: 800 }}>Draft itinerary</div>
              <span className="badge badge-blue">Review & confirm</span>
            </div>
            <div style={{ padding: 14, overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#FAFBFC', borderBottom: '1px solid #E2E8F0' }}>
                    {['DATE', 'TIME', 'MEAL', 'LOCATION', 'NOTES', ''].map((h) => (
                      <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontSize: 10, fontWeight: 800, color: '#A0AEC0', letterSpacing: '0.07em', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {draftRows.map((r, idx) => {
                    const { fulfillmentType } = classifyMealRow(r.mealType, r.locationType, r.notes)
                    const pill = classificationPill(fulfillmentType)
                    return (
                      <tr key={`${r.date}_${r.time}_${idx}`} style={{ borderBottom: '1px solid #F4F6F9' }}>
                        <td style={{ padding: '10px 10px', fontSize: 12, whiteSpace: 'nowrap' }}>{r.date}</td>
                        <td style={{ padding: '10px 10px', whiteSpace: 'nowrap' }}>
                          <input style={{ width: 92 }} className="form-field" value={r.time} onChange={(e) => updateRow(idx, { time: e.target.value })} />
                        </td>
                        <td style={{ padding: '10px 10px' }}>
                          <input className="form-field" value={r.mealType} onChange={(e) => updateRow(idx, { mealType: e.target.value })} />
                        </td>
                        <td style={{ padding: '10px 10px' }}>
                          <select className="form-field" value={r.locationType} onChange={(e) => updateRow(idx, { locationType: e.target.value })}>
                            <option value="restaurant">Restaurant</option>
                            <option value="hotel">Hotel</option>
                            <option value="field">Field</option>
                            <option value="airport">Airport</option>
                            <option value="perdiem">Per Diem</option>
                            <option value="bus">Bus</option>
                          </select>
                        </td>
                        <td style={{ padding: '10px 10px', minWidth: 260 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <input className="form-field" value={r.notes} onChange={(e) => updateRow(idx, { notes: e.target.value })} />
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
                      <td colSpan={6} style={{ padding: 24, textAlign: 'center', color: '#718096' }}>
                        Paste an email and click <strong>Parse</strong> to generate a draft.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ background: '#EBF2FF', border: '1.5px solid #BFDBFE', borderRadius: 12, padding: 14, display: 'flex', gap: 10 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#0F62FE' }}>tips_and_updates</span>
            <div style={{ fontSize: 12, color: '#1E40AF', lineHeight: 1.6 }}>
              This is the <strong>review-and-confirm</strong> workflow (not browse-and-shop). Meals still get imported even when MO doesn’t fulfill (per-diem/provided) so we keep the full trip dataset.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
