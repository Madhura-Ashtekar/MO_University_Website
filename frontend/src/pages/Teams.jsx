import React, { useState, useEffect } from 'react'
import { apiFetch } from '../api/client'

export function PageTeams({ showToast }) {
  const [teams, setTeams] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiFetch('/teams')
      .then(setTeams)
      .catch((e) => showToast(e.message, 'error'))
      .finally(() => setLoading(false))
  }, [showToast])

  return (
    <div className="page" style={{ padding: '28px 32px', maxWidth: 1200 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 900, marginBottom: 8 }}>Teams</h2>
          <p style={{ color: '#718096', margin: 0 }}>Manage rosters and team-specific preferences.</p>
        </div>
        <button className="btn-primary" onClick={() => window.alert('Add Team coming soon')}>
          <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'white' }}>add</span> New Team
        </button>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#718096' }}>Loading teams...</div>
      ) : teams.length === 0 ? (
        <div style={{ background: '#F8FAFC', border: '1.5px dashed #E2E8F0', borderRadius: 16, padding: 48, textAlign: 'center' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 48, color: '#CBD5E0', marginBottom: 16 }}>groups</span>
          <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>No teams found</h3>
          <p style={{ fontSize: 14, color: '#718096', maxWidth: 400, margin: '0 auto' }}>Create a new team or submit a schedule to see teams here.</p>
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
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn-secondary" style={{ flex: 1, fontSize: 12 }}>View Roster</button>
                <button className="btn-secondary" style={{ flex: 1, fontSize: 12 }}>Edit Prefs</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
