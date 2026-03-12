import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { apiFetch } from '../api/client'
import { statusLabel, fulfillmentLabel, queueTypeLabel, tzShort, fmtDate, fmtTime12 } from '../utils/format'

export function PageWorkflows({ go, showToast }) {
  const [rightTab, setRightTab] = useState('workflow')
  const [search, setSearch] = useState('')
  const [workflows, setWorkflows] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedWorkflowId, setSelectedWorkflowId] = useState(null)
  const [detail, setDetail] = useState(null)
  const [adminQueue, setAdminQueue] = useState([])
  const [resolveDraft, setResolveDraft] = useState({ executionId: null, vendor: '' })
  const [editDraft, setEditDraft] = useState(null)

  const refreshAll = useCallback(async ({ keepSelection = true } = {}) => {
    const [list, q] = await Promise.all([
      apiFetch('/workflows'),
      apiFetch('/admin/queue'),
    ])
    setWorkflows(list)
    setAdminQueue(q.items || [])
    if (!keepSelection || !selectedWorkflowId) {
      const firstId = list[0]?.id || null
      setSelectedWorkflowId(firstId)
      if (firstId) setDetail(await apiFetch(`/workflows/${firstId}`))
      else setDetail(null)
    } else if (selectedWorkflowId && !list.some((w) => w.id === selectedWorkflowId)) {
      const firstId = list[0]?.id || null
      setSelectedWorkflowId(firstId)
      if (firstId) setDetail(await apiFetch(`/workflows/${firstId}`))
      else setDetail(null)
    } else if (selectedWorkflowId) {
      setDetail(await apiFetch(`/workflows/${selectedWorkflowId}`))
    }
    setLoading(false)
  }, [selectedWorkflowId])

  useEffect(() => {
    refreshAll().catch((e) => { showToast(e.message, 'error'); setLoading(false) })
  }, [])

  useEffect(() => {
    if (!selectedWorkflowId) {
      setDetail(null)
      return
    }
    apiFetch(`/workflows/${selectedWorkflowId}`)
      .then(setDetail)
      .catch((e) => showToast(e.message, 'error'))
  }, [selectedWorkflowId, showToast])

  const filteredWorkflows = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return workflows
    return workflows.filter((w) => `${w.name} ${w.team_name} ${w.sport || ''}`.toLowerCase().includes(q))
  }, [workflows, search])

  const selectedWorkflow = useMemo(() => {
    if (!detail) return null
    return {
      id: detail.id,
      name: detail.name,
      teamName: detail.team_name,
      schoolName: detail.school_name,
      conference: detail.conference,
      division: detail.division,
      sport: detail.sport,
      tripType: detail.trip_type,
      homeAwayNeutral: detail.home_away_neutral,
      opponent: detail.opponent,
      venueName: detail.venue_name,
      status: detail.status,
      queueOpen: detail.queue_open || [],
    }
  }, [detail])

  const executions = useMemo(() => {
    if (!detail?.executions) return []
    return detail.executions.map((e) => ({
      id: e.id,
      workflowId: e.workflow_id,
      date: e.date,
      time: e.time,
      timezone: e.timezone,
      mealType: e.meal_type,
      locationType: e.location_type,
      notes: e.notes,
      eventContext: e.event_context,
      fulfillmentType: e.fulfillment_type,
      moFulfills: e.mo_fulfills,
      status: e.status,
    }))
  }, [detail])

  const openQueue = useMemo(() => (adminQueue || []).filter((q) => q.status === 'open'), [adminQueue])

  const grouped = useMemo(() => {
    const mo = []
    const tbd = []
    const notMo = []
    for (const e of executions) {
      if (e.fulfillmentType === 'tbd') tbd.push(e)
      else if (e.fulfillmentType === 'not_mo') notMo.push(e)
      else mo.push(e)
    }
    const byDate = (arr) => [...arr].sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`))
    return { mo: byDate(mo), tbd: byDate(tbd), notMo: byDate(notMo) }
  }, [executions])

  const fmtExecTitle = (e) => `${fmtDate(e.date)} · ${fmtTime12(e.time)} · ${e.mealType}`

  const resolveTbd = async () => {
    if (!resolveDraft.executionId || !resolveDraft.vendor.trim()) return
    await apiFetch('/admin/resolve-tbd', {
      method: 'POST',
      body: { execution_id: resolveDraft.executionId, vendor_note: resolveDraft.vendor.trim() },
    })
    showToast('TBD resolved!')
    setResolveDraft({ executionId: null, vendor: '' })
    await refreshAll({ keepSelection: true })
  }

  const saveExecution = async (executionId, fields) => {
    await apiFetch(`/executions/${executionId}`, { method: 'PATCH', body: fields })
    showToast('Changes saved')
    await refreshAll({ keepSelection: true })
  }

  const advance = async (workflowId, action) => {
    await apiFetch(`/admin/workflows/${workflowId}/advance`, { method: 'POST', body: { action } })
    showToast('Workflow advanced')
    await refreshAll({ keepSelection: true })
  }

  if (loading) {
    return (
      <div className="page" style={{ padding: '28px 32px', maxWidth: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
        <div style={{ textAlign: 'center' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 40, color: '#CBD5E0', animation: 'spin 1s linear infinite' }}>sync</span>
          <div style={{ fontSize: 14, color: '#718096', marginTop: 12 }}>Loading workflows...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="page" style={{ padding: '28px 32px', maxWidth: 1200 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 18, alignItems: 'start' }}>
        <div style={{ background: 'white', borderRadius: 16, border: '1px solid #E2E8F0', overflow: 'hidden' }}>
          <div style={{ padding: '18px 22px', borderBottom: '1px solid #EEF1F5', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="material-symbols-outlined" style={{ color: '#0F62FE' }}>list_alt</span>
              <span style={{ fontSize: 16, fontWeight: 800 }}>Workflows</span>
            </div>
            <button className="btn-primary" onClick={() => go('new-schedule')}>
              <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'white' }}>add</span> New
            </button>
          </div>
          <div style={{ padding: 16, borderBottom: '1px solid #EEF1F5' }}>
            <input className="form-field" placeholder="Search workflows..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filteredWorkflows.map((w) => {
              const active = w.id === selectedWorkflowId
              const counts = w.counts || {}
              return (
                <div
                  key={w.id}
                  className="hover-lift"
                  onClick={() => { setSelectedWorkflowId(w.id); setRightTab('workflow') }}
                  style={{
                    border: active ? '2px solid #0F62FE' : '1.5px solid #E2E8F0',
                    background: active ? '#EBF2FF' : 'white',
                    borderRadius: 12,
                    padding: 14,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 10,
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{w.name}</div>
                    <div style={{ fontSize: 12, color: '#718096' }}>{w.team_name}{w.sport ? ` · ${w.sport}` : ''}</div>
                    <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <span className="badge badge-green">{counts.mo ?? 0} MO</span>
                      <span className="badge badge-amber">{counts.tbd ?? 0} TBD</span>
                      <span className="badge badge-gray">{counts.not_mo ?? 0} Not MO</span>
                    </div>
                  </div>
                  <span className="badge badge-blue" style={{ whiteSpace: 'nowrap' }}>{statusLabel(w.status)}</span>
                </div>
              )
            })}
            {workflows.length === 0 && (
              <div style={{ padding: 24, textAlign: 'center', color: '#718096' }}>
                No workflows yet. Create a schedule or submit intake.
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ background: 'white', borderRadius: 16, border: '1px solid #E2E8F0', overflow: 'hidden' }}>
            <div style={{ padding: '12px 14px', borderBottom: '1px solid #EEF1F5', display: 'flex', gap: 10 }}>
              <button className={rightTab === 'workflow' ? 'btn-primary' : 'btn-secondary'} style={{ padding: '8px 12px', fontSize: 12 }} onClick={() => setRightTab('workflow')}>
                Workflow
              </button>
              <button className={rightTab === 'queue' ? 'btn-primary' : 'btn-secondary'} style={{ padding: '8px 12px', fontSize: 12 }} onClick={() => setRightTab('queue')}>
                Admin Queue <span className="badge badge-orange" style={{ marginLeft: 8 }}>{openQueue.length}</span>
              </button>
            </div>

            {rightTab === 'queue' && (
              <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {openQueue.slice(0, 12).map((q) => {
                  const execForItem = executions.find(e => e.id === q.execution_id)
                  return (
                    <div key={q.id} style={{ border: '1.5px solid #E2E8F0', borderRadius: 12, padding: 12 }}>
                      <div style={{ fontSize: 12, fontWeight: 900 }}>{queueTypeLabel(q.type)}</div>
                      <div style={{ fontSize: 12, color: '#718096', marginTop: 4 }}>
                        {execForItem
                          ? `${fmtDate(execForItem.date)} · ${fmtTime12(execForItem.time)} · ${execForItem.mealType}`
                          : `Workflow-level action`
                        }
                      </div>
                      <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        <button className="btn-secondary" style={{ padding: 8, fontSize: 12, justifyContent: 'center' }} onClick={() => {
                          setSelectedWorkflowId(q.workflow_id)
                          setRightTab('workflow')
                          if (q.type === 'resolve_tbd') setResolveDraft({ executionId: q.execution_id, vendor: '' })
                        }}>
                          Open
                        </button>
                        <button className="btn-primary" style={{ padding: 8, fontSize: 12, justifyContent: 'center' }} onClick={() => {
                          if (q.type === 'resolve_tbd') {
                            setSelectedWorkflowId(q.workflow_id)
                            setRightTab('workflow')
                            setResolveDraft({ executionId: q.execution_id, vendor: '' })
                            return
                          }
                          const action = q.type === 'feasibility' ? 'feasibility_approve' : q.type === 'billing_prep' ? 'billing_prep' : q.type === 'dispatch_approval' ? 'dispatch_approve' : null
                          if (!action) return
                          advance(q.workflow_id, action).catch((e) => showToast(e.message, 'error'))
                        }}>
                          Take Action
                        </button>
                      </div>
                    </div>
                  )
                })}
                {openQueue.length === 0 && <div style={{ padding: 16, textAlign: 'center', color: '#718096' }}>No open admin items.</div>}
              </div>
            )}

            {rightTab === 'workflow' && (
              <div style={{ padding: 14 }}>
                {!selectedWorkflow && <div style={{ padding: 16, textAlign: 'center', color: '#718096' }}>Select a workflow to review.</div>}
                {selectedWorkflow && (
                  <>
                    <div style={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between', gap: 12 }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 900, marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{selectedWorkflow.name}</div>
                        <div style={{ fontSize: 12, color: '#718096' }}>{selectedWorkflow.teamName}{selectedWorkflow.sport ? ` · ${selectedWorkflow.sport}` : ''}</div>
                        <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          <span className="badge badge-green">{grouped.mo.length} MO</span>
                          <span className="badge badge-amber">{grouped.tbd.length} TBD</span>
                          <span className="badge badge-gray">{grouped.notMo.length} Not MO</span>
                        </div>
                      </div>
                      <span className="badge badge-blue" style={{ whiteSpace: 'nowrap' }}>{statusLabel(selectedWorkflow.status)}</span>
                    </div>

                    <div style={{ marginTop: 14, background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 12, padding: 12 }}>
                      <div style={{ fontSize: 11, fontWeight: 900, color: '#A0AEC0', letterSpacing: '0.08em', marginBottom: 8 }}>TRIP DETAILS</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        <div>
                          <div style={{ fontSize: 10, color: '#718096', fontWeight: 800, marginBottom: 2 }}>School</div>
                          <div style={{ fontSize: 12 }}>{selectedWorkflow.schoolName || '\u2014'}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: 10, color: '#718096', fontWeight: 800, marginBottom: 2 }}>Conference / Division</div>
                          <div style={{ fontSize: 12 }}>{selectedWorkflow.conference || '\u2014'} \u00B7 {selectedWorkflow.division || '\u2014'}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: 10, color: '#718096', fontWeight: 800, marginBottom: 2 }}>Trip Type</div>
                          <div style={{ fontSize: 12 }}>{selectedWorkflow.tripType || '\u2014'} \u00B7 {selectedWorkflow.homeAwayNeutral || '\u2014'}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: 10, color: '#718096', fontWeight: 800, marginBottom: 2 }}>Opponent / Venue</div>
                          <div style={{ fontSize: 12 }}>{selectedWorkflow.opponent || '\u2014'} @ {selectedWorkflow.venueName || '\u2014'}</div>
                        </div>
                      </div>
                    </div>

                    {resolveDraft.executionId && (
                      <div style={{ marginTop: 14, background: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: 12, padding: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                          <div style={{ fontSize: 12, fontWeight: 900, color: '#92400E' }}>Resolve TBD Meal</div>
                          <button className="btn-secondary" style={{ padding: '6px 10px', fontSize: 12 }} onClick={() => setResolveDraft({ executionId: null, vendor: '' })}>Close</button>
                        </div>
                        <div style={{ fontSize: 12, color: '#92400E', marginTop: 6 }}>
                          {fmtExecTitle(executions.find((e) => e.id === resolveDraft.executionId) || { date: '', time: '', mealType: '' })}
                        </div>
                        <div style={{ marginTop: 10, display: 'flex', gap: 10 }}>
                          <input className="form-field" value={resolveDraft.vendor} onChange={(e) => setResolveDraft((p) => ({ ...p, vendor: e.target.value }))} placeholder="Vendor name + address" />
                        </div>
                        <div style={{ marginTop: 10, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                          <button className="btn-secondary" onClick={() => setResolveDraft({ executionId: null, vendor: '' })}>Cancel</button>
                          <button className="btn-primary" disabled={!resolveDraft.vendor.trim()} onClick={() => resolveTbd().catch((e) => showToast(e.message, 'error'))}>Mark Resolved</button>
                        </div>
                      </div>
                    )}

                    <div style={{ marginTop: 14 }}>
                      <ExecutionSection title="TBD \u2014 Needs Vendor" badgeClass="badge-amber" rows={grouped.tbd} onResolve={(e) => setResolveDraft({ executionId: e.id, vendor: e.notes || '' })} onEdit={(e) => setEditDraft({ executionId: e.id, fields: { ...e } })} />
                      <ExecutionSection title="MO Executing" badgeClass="badge-green" rows={grouped.mo} onEdit={(e) => setEditDraft({ executionId: e.id, fields: { ...e } })} />
                      <ExecutionSection title="Not MO (Logged Only)" badgeClass="badge-gray" rows={grouped.notMo} onEdit={(e) => setEditDraft({ executionId: e.id, fields: { ...e } })} />
                    </div>

                    {editDraft?.executionId && (
                      <div style={{ marginTop: 14, background: 'white', border: '1.5px solid #E2E8F0', borderRadius: 12, padding: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                          <div style={{ fontSize: 12, fontWeight: 900 }}>Edit Execution</div>
                          <button className="btn-secondary" style={{ padding: '6px 10px', fontSize: 12 }} onClick={() => setEditDraft(null)}>Close</button>
                        </div>
                        <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                          <div>
                            <div style={{ fontSize: 11, fontWeight: 800, color: '#718096', marginBottom: 4 }}>Time</div>
                            <input className="form-field" type="time" value={editDraft.fields.time || ''} onChange={(e) => setEditDraft((p) => ({ ...p, fields: { ...p.fields, time: e.target.value } }))} />
                          </div>
                          <div>
                            <div style={{ fontSize: 11, fontWeight: 800, color: '#718096', marginBottom: 4 }}>Timezone</div>
                            <select className="form-field" value={editDraft.fields.timezone || 'America/New_York'} onChange={(e) => setEditDraft((p) => ({ ...p, fields: { ...p.fields, timezone: e.target.value } }))}>
                              <option value="America/New_York">Eastern (ET)</option>
                              <option value="America/Chicago">Central (CT)</option>
                              <option value="America/Denver">Mountain (MT)</option>
                              <option value="America/Los_Angeles">Pacific (PT)</option>
                            </select>
                          </div>
                          <div style={{ gridColumn: '1/-1' }}>
                            <div style={{ fontSize: 11, fontWeight: 800, color: '#718096', marginBottom: 4 }}>Notes</div>
                            <input className="form-field" value={editDraft.fields.notes || ''} onChange={(e) => setEditDraft((p) => ({ ...p, fields: { ...p.fields, notes: e.target.value } }))} />
                          </div>
                          <div>
                            <div style={{ fontSize: 11, fontWeight: 800, color: '#718096', marginBottom: 4 }}>Fulfillment</div>
                            <select className="form-field" value={editDraft.fields.fulfillmentType || 'mo_delivery'} onChange={(e) => setEditDraft((p) => ({ ...p, fields: { ...p.fields, fulfillmentType: e.target.value } }))}>
                              <option value="mo_delivery">MO Delivery</option>
                              <option value="mo_pickup">MO Pickup</option>
                              <option value="tbd">TBD</option>
                              <option value="not_mo">Not MO</option>
                            </select>
                          </div>
                          <div>
                            <div style={{ fontSize: 11, fontWeight: 800, color: '#718096', marginBottom: 4 }}>Event Context</div>
                            <select className="form-field" value={editDraft.fields.eventContext || 'travel'} onChange={(e) => setEditDraft((p) => ({ ...p, fields: { ...p.fields, eventContext: e.target.value } }))}>
                              <option value="pre_game">Pre-Game</option>
                              <option value="post_game">Post-Game</option>
                              <option value="travel">Travel</option>
                              <option value="practice">Practice</option>
                              <option value="recovery">Recovery</option>
                            </select>
                          </div>
                        </div>
                        <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                          <button className="btn-secondary" onClick={() => setEditDraft(null)}>Cancel</button>
                          <button className="btn-primary" onClick={() => {
                            saveExecution(editDraft.executionId, {
                              time: editDraft.fields.time,
                              timezone: editDraft.fields.timezone,
                              notes: editDraft.fields.notes,
                              fulfillmentType: editDraft.fields.fulfillmentType,
                              eventContext: editDraft.fields.eventContext,
                            })
                              .then(() => setEditDraft(null))
                              .catch((e) => showToast(e.message, 'error'))
                          }}>
                            Save Changes
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function ExecutionSection({ title, badgeClass, rows, onResolve, onEdit }) {
  const [expanded, setExpanded] = useState(false)
  const LIMIT = 8
  const visible = expanded ? rows : rows.slice(0, LIMIT)
  const hasMore = rows.length > LIMIT

  return (
    <div style={{ marginBottom: 12, border: '1px solid #E2E8F0', borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ padding: '10px 12px', background: '#FAFBFC', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 12, fontWeight: 800 }}>{title}</div>
        <span className={`badge ${badgeClass}`}>{rows.length}</span>
      </div>
      {rows.length === 0 ? (
        <div style={{ padding: 12, color: '#718096', fontSize: 12 }}>No items.</div>
      ) : (
        <div style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {visible.map((e) => (
            <div key={e.id} style={{ border: '1.5px solid #E2E8F0', borderRadius: 12, padding: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 900, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {fmtDate(e.date)} · {fmtTime12(e.time)} · {e.mealType}
                </div>
                <div style={{ fontSize: 12, color: '#718096', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {e.notes || '\u2014'}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span className="badge badge-blue">{tzShort(e.timezone)}</span>
                {onResolve && (
                  <button className="btn-secondary" style={{ padding: '6px 10px', fontSize: 12 }} onClick={() => onResolve(e)}>
                    Resolve
                  </button>
                )}
                {onEdit && (
                  <button className="btn-secondary" style={{ padding: '6px 10px', fontSize: 12 }} onClick={() => onEdit(e)}>
                    Edit
                  </button>
                )}
              </div>
            </div>
          ))}
          {hasMore && (
            <button
              onClick={() => setExpanded(!expanded)}
              style={{ padding: '6px 2px', color: '#0F62FE', fontSize: 12, fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
            >
              {expanded ? 'Show less' : `Show all ${rows.length} meals`}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
