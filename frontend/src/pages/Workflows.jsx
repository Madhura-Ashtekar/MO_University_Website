import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { apiFetch } from '../api/client'
import { statusLabel, fmtDateShort, fmtTime12 } from '../utils/format'

export function PageWorkflows({ showToast }) {
  const [searchParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const [workflows, setWorkflows] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedId, setSelectedId] = useState(searchParams.get('focus') || null)
  const [detail, setDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const refreshWorkflows = useCallback(async () => {
    const list = await apiFetch('/workflows')
    setWorkflows(list)
    return list
  }, [])

  useEffect(() => {
    refreshWorkflows()
      .catch((e) => showToast(e.message, 'error'))
      .finally(() => setLoading(false))
  }, [refreshWorkflows, showToast])

  // Load detail when selectedId changes
  useEffect(() => {
    if (!selectedId) { setDetail(null); return }
    setDetailLoading(true)
    apiFetch(`/workflows/${selectedId}`)
      .then(setDetail)
      .catch(() => setDetail(null))
      .finally(() => setDetailLoading(false))
  }, [selectedId])

  const filteredWorkflows = useMemo(() => {
    const q = search.trim().toLowerCase()
    let list = workflows
    if (q) list = list.filter(w => `${w.name} ${w.team_name} ${w.sport || ''}`.toLowerCase().includes(q))
    if (statusFilter === 'pending') list = list.filter(w => w.status === 'submitted')
    if (statusFilter === 'active') list = list.filter(w => ['feasibility_approved', 'billing_prepped'].includes(w.status))
    if (statusFilter === 'done') list = list.filter(w => w.status === 'dispatch_approved')
    return list
  }, [workflows, search, statusFilter])

  if (loading) {
    return (
      <div className="page" style={{ padding: '28px 32px', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
        <div style={{ textAlign: 'center' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 40, color: '#CBD5E0', animation: 'spin 1s linear infinite' }}>sync</span>
          <div style={{ fontSize: 14, color: '#718096', marginTop: 12 }}>Loading order history...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="page" style={{ padding: '12px 24px', display: 'flex', gap: 16, height: '100%', overflow: 'hidden' }}>
      {/* Left: order list */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <div style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
          <input className="form-field" placeholder="Search orders..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ flex: 1 }} />
          <div style={{ display: 'flex', gap: 6 }}>
            {[['all','All'],['pending','Submitted'],['active','In Review'],['done','Dispatched']].map(([v,l]) => (
              <button key={v} className={statusFilter === v ? 'btn-primary' : 'btn-secondary'} style={{ padding: '6px 14px', fontSize: 12 }} onClick={() => setStatusFilter(v)}>{l}</button>
            ))}
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
            <thead style={{ background: '#F8FAFC', borderBottom: '2px solid #E2E8F0' }}>
              <tr>
                <th style={headerCell}>Order</th>
                <th style={headerCell}>Team / Sport</th>
                <th style={headerCell}>Status</th>
                <th style={headerCell}>Meals</th>
                <th style={headerCell}>Last Updated</th>
              </tr>
            </thead>
            <tbody>
              {filteredWorkflows.map((w) => {
                const counts = w.counts || {}
                const isSelected = w.id === selectedId
                return (
                  <tr
                    key={w.id}
                    className="hover-lift"
                    style={{ borderBottom: '1px solid #EEF1F5', cursor: 'pointer', background: isSelected ? '#F0F7FF' : 'white' }}
                    onClick={() => setSelectedId(isSelected ? null : w.id)}
                  >
                    <td style={bodyCell}>
                      <div style={{ fontWeight: 700 }}>{w.name}</div>
                      <div style={{ fontSize: 12, color: '#718096' }}>{w.school_name || '—'}</div>
                    </td>
                    <td style={bodyCell}>
                      <div style={{ fontWeight: 700 }}>{w.team_name || '—'}</div>
                      <div style={{ fontSize: 12, color: '#718096' }}>{w.sport || '—'}</div>
                    </td>
                    <td style={bodyCell}>
                      <span className="badge badge-blue" style={{ fontSize: 11 }}>{statusLabel(w.status)}</span>
                    </td>
                    <td style={bodyCell}>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <span className="badge badge-green">{counts.mo ?? 0} MO</span>
                        {(counts.tbd ?? 0) > 0 && <span className="badge badge-amber">{counts.tbd} Unassigned</span>}
                        <span className="badge badge-gray">{counts.not_mo ?? 0} Other</span>
                      </div>
                    </td>
                    <td style={bodyCell}>
                      <div style={{ fontSize: 12, color: '#718096' }}>{w.updated_at ? new Date(w.updated_at).toLocaleString() : '—'}</div>
                    </td>
                  </tr>
                )
              })}
              {filteredWorkflows.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ padding: 32, textAlign: 'center', color: '#718096' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 36, color: '#CBD5E0', marginBottom: 12 }}>list_alt</span>
                    <div style={{ fontSize: 13 }}>No orders match your filters.</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Right: detail panel */}
      {selectedId && (
        <div style={{ width: 480, flexShrink: 0, background: 'white', borderRadius: 16, border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {detailLoading || !detail ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 32, color: '#CBD5E0', animation: 'spin 1s linear infinite' }}>sync</span>
            </div>
          ) : (
            <>
              {/* Detail header */}
              <div style={{ padding: '14px 18px', borderBottom: '1px solid #EEF1F5', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexShrink: 0 }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 900 }}>{detail.name}</div>
                  <div style={{ fontSize: 12, color: '#718096', marginTop: 2 }}>
                    {detail.team_name} · {detail.sport || '—'} · {detail.city && detail.state ? `${detail.city}, ${detail.state}` : detail.city || detail.state || '—'}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="badge badge-blue" style={{ fontSize: 11 }}>{statusLabel(detail.status)}</span>
                  <button onClick={() => setSelectedId(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#A0AEC0' }}>close</span>
                  </button>
                </div>
              </div>

              {/* Trip context */}
              <div style={{ padding: '10px 18px', borderBottom: '1px solid #EEF1F5', flexShrink: 0 }}>
                <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                  {[
                    ['School', detail.school_name],
                    ['Division', detail.division],
                    ['Type', detail.trip_type?.replace('_', ' ')],
                    ['Home/Away', detail.home_away_neutral],
                    ['Opponent', detail.opponent],
                    ['Venue', detail.venue_name],
                  ].filter(([, v]) => v).map(([label, val]) => (
                    <div key={label}>
                      <div style={{ fontSize: 9, fontWeight: 700, color: '#A0AEC0', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</div>
                      <div style={{ fontSize: 12, fontWeight: 600 }}>{val}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* TBD queue items */}
              {detail.queue_open?.filter(q => q.type === 'resolve_tbd').length > 0 && (
                <div style={{ padding: '8px 18px', borderBottom: '1px solid #EEF1F5', background: '#FFFBEB', flexShrink: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: '#92400E', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 14 }}>assignment_late</span>
                    {detail.queue_open.filter(q => q.type === 'resolve_tbd').length} Unassigned meals need vendor assignment
                  </div>
                </div>
              )}

              {/* Executions table */}
              <div style={{ flex: 1, overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                  <colgroup>
                    <col style={{ width: 72 }} />
                    <col style={{ width: 78 }} />
                    <col style={{ width: 60 }} />
                    <col style={{ width: '40%' }} />
                    <col style={{ width: 60 }} />
                  </colgroup>
                  <thead style={{ position: 'sticky', top: 0, background: '#F8FAFC', zIndex: 1 }}>
                    <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
                      {['DATE','MEAL','TIME','NOTES','STATUS'].map(h => (
                        <th key={h} style={{ padding: '7px 10px', textAlign: 'left', fontSize: 9, fontWeight: 800, color: '#A0AEC0', letterSpacing: '0.06em' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(detail.executions || []).sort((a, b) => `${a.date}${a.time || ''}`.localeCompare(`${b.date}${b.time || ''}`)).map((e) => (
                      <tr key={e.id} style={{ borderBottom: '1px solid #F4F6F9', background: e.fulfillment_type === 'tbd' ? '#FFFDF5' : 'white' }}>
                        <td style={{ padding: '5px 10px', fontSize: 11 }}>
                          <div style={{ fontWeight: 700 }}>{fmtDateShort(e.date)}</div>
                          <div style={{ fontSize: 9, color: '#A0AEC0' }}>{new Date(e.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' })}</div>
                        </td>
                        <td style={{ padding: '5px 10px', fontSize: 11 }}>{e.meal_type}</td>
                        <td style={{ padding: '5px 10px', fontSize: 11 }}>{e.time ? fmtTime12(e.time) : '—'}</td>
                        <td style={{ padding: '5px 10px', fontSize: 11, color: '#475569' }}>
                          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.notes || '—'}</div>
                        </td>
                        <td style={{ padding: '5px 10px' }}>
                          {e.fulfillment_type === 'tbd' ? (
                            <span style={{ fontSize: 9, fontWeight: 800, background: '#FEF3C7', color: '#92400E', padding: '2px 6px', borderRadius: 999 }}>Unassigned</span>
                          ) : e.fulfillment_type === 'not_mo' ? (
                            <span style={{ fontSize: 9, fontWeight: 700, color: '#A0AEC0' }}>Other</span>
                          ) : (
                            <span style={{ fontSize: 9, fontWeight: 800, background: '#DCFCE7', color: '#166534', padding: '2px 6px', borderRadius: 999 }}>MO</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

const headerCell = {
  textAlign: 'left',
  padding: '12px 16px',
  fontSize: 12,
  letterSpacing: '0.08em',
  fontWeight: 700,
  color: '#64748B',
}

const bodyCell = {
  padding: '14px 16px',
  fontSize: 13,
  color: '#0D1117',
  verticalAlign: 'top',
}
