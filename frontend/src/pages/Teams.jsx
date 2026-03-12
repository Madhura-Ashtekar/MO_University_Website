import React, { useState, useEffect } from 'react'
import { apiFetch } from '../api/client'

const EMPTY_FORM = { name: '', schoolName: '', sport: '', conference: '', division: 'DI', defaultHeadcount: 45, defaultBudget: 65 }

export function PageTeams({ showToast }) {
  const [teams, setTeams] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const loadTeams = () => {
    setLoading(true)
    apiFetch('/teams')
      .then(setTeams)
      .catch((e) => showToast(e.message, 'error'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadTeams() }, [])

  const upd = (k, v) => setForm((p) => ({ ...p, [k]: v }))

  const submitTeam = async () => {
    if (!form.name.trim() || !form.schoolName.trim() || !form.sport.trim()) return
    setSaving(true)
    try {
      await apiFetch('/teams', {
        method: 'POST',
        body: {
          name: form.name.trim(),
          schoolName: form.schoolName.trim(),
          sport: form.sport.trim(),
          conference: form.conference.trim() || null,
          division: form.division,
          defaultHeadcount: Number(form.defaultHeadcount),
          defaultBudget: Number(form.defaultBudget),
        },
      })
      showToast(`Team "${form.name}" created!`)
      setForm(EMPTY_FORM)
      setShowForm(false)
      loadTeams()
    } catch (e) {
      showToast(e.message || 'Failed to create team.', 'error')
    } finally {
      setSaving(false)
    }
  }

  const formValid = form.name.trim() && form.schoolName.trim() && form.sport.trim()

  return (
    <div className="page" style={{ padding: '28px 32px', maxWidth: 1200 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 900, marginBottom: 8 }}>Teams</h2>
          <p style={{ color: '#718096', margin: 0 }}>Manage team profiles and default preferences.</p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm((v) => !v)}>
          <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'white' }}>{showForm ? 'close' : 'add'}</span>
          {showForm ? 'Cancel' : 'New Team'}
        </button>
      </div>

      {/* New Team Form */}
      {showForm && (
        <div style={{ background: 'white', border: '1.5px solid #0F62FE', borderRadius: 16, padding: 22, marginBottom: 24, boxShadow: '0 4px 20px rgba(15,98,254,0.08)' }}>
          <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 16 }}>Create New Team</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#718096', display: 'block', marginBottom: 5 }}>Team Name <span style={{ color: '#EF4444' }}>*</span></label>
              <input className="form-field" value={form.name} onChange={(e) => upd('name', e.target.value)} placeholder="Varsity Baseball (Men's)" />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#718096', display: 'block', marginBottom: 5 }}>School Name <span style={{ color: '#EF4444' }}>*</span></label>
              <input className="form-field" value={form.schoolName} onChange={(e) => upd('schoolName', e.target.value)} placeholder="Duke University" />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#718096', display: 'block', marginBottom: 5 }}>Sport <span style={{ color: '#EF4444' }}>*</span></label>
              <input className="form-field" value={form.sport} onChange={(e) => upd('sport', e.target.value)} placeholder="Baseball, Wrestling..." />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#718096', display: 'block', marginBottom: 5 }}>Conference</label>
              <input className="form-field" value={form.conference} onChange={(e) => upd('conference', e.target.value)} placeholder="ACC, Big 10..." />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#718096', display: 'block', marginBottom: 5 }}>Division</label>
              <select className="form-field" value={form.division} onChange={(e) => upd('division', e.target.value)}>
                <option value="DI">DI</option>
                <option value="DII">DII</option>
                <option value="DIII">DIII</option>
                <option value="NAIA">NAIA</option>
                <option value="NJCAA">NJCAA</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#718096', display: 'block', marginBottom: 5 }}>Default Headcount</label>
              <input className="form-field" type="number" value={form.defaultHeadcount} onChange={(e) => upd('defaultHeadcount', e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#718096', display: 'block', marginBottom: 5 }}>Default Budget / Meal ($)</label>
              <input className="form-field" type="number" step="0.01" value={form.defaultBudget} onChange={(e) => upd('defaultBudget', e.target.value)} />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button className="btn-secondary" onClick={() => { setForm(EMPTY_FORM); setShowForm(false) }}>Cancel</button>
            <button className="btn-primary" disabled={!formValid || saving} onClick={submitTeam}>
              {saving ? 'Saving...' : 'Create Team'}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 32, color: '#CBD5E0', animation: 'spin 1s linear infinite' }}>sync</span>
        </div>
      ) : teams.length === 0 ? (
        <div style={{ background: '#F8FAFC', border: '1.5px dashed #E2E8F0', borderRadius: 16, padding: 48, textAlign: 'center' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 48, color: '#CBD5E0', marginBottom: 16 }}>groups</span>
          <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>No teams yet</h3>
          <p style={{ fontSize: 14, color: '#718096', maxWidth: 400, margin: '0 auto 16px' }}>
            Create a team to pre-link workflows and access Stripe billing.
          </p>
          <button className="btn-primary" onClick={() => setShowForm(true)}>Create First Team</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
          {teams.map((t) => (
            <div key={t.id} style={{ background: 'white', borderRadius: 16, border: '1px solid #E2E8F0', padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <div style={{ width: 44, height: 44, background: '#EBF2FF', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 24, color: '#0F62FE' }}>groups</span>
                </div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 800 }}>{t.name}</div>
                  <div style={{ fontSize: 12, color: '#718096' }}>{t.sport}</div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ color: '#718096' }}>School</span>
                  <span style={{ fontWeight: 700 }}>{t.school_name}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ color: '#718096' }}>Conf / Div</span>
                  <span style={{ fontWeight: 700 }}>{t.conference || '—'} · {t.division}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ color: '#718096' }}>Default Headcount</span>
                  <span style={{ fontWeight: 700 }}>{t.default_headcount}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ color: '#718096' }}>Default Budget / Meal</span>
                  <span style={{ fontWeight: 700 }}>${t.default_budget?.toFixed(2)}</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn-secondary" style={{ flex: 1, fontSize: 12 }} onClick={() => showToast('Roster management coming soon!')}>View Roster</button>
                <button className="btn-secondary" style={{ flex: 1, fontSize: 12 }} onClick={() => showToast('Dietary preferences editor coming soon!')}>Edit Prefs</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
