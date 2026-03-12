import React, { useState, useEffect, useMemo } from 'react'
import { apiFetch } from '../api/client'

export function PageWorkflows({ go, showToast }) {
  const [rightTab, setRightTab] = useState('workflow') // workflow | queue
  const [search, setSearch] = useState('')
  const [workflows, setWorkflows] = useState([])
  const [selectedWorkflowId, setSelectedWorkflowId] = useState(null)
  const [detail, setDetail] = useState(null)
  const [adminQueue, setAdminQueue] = useState([])
  const [resolveDraft, setResolveDraft] = useState({ executionId: null, vendor: '' })
  const [editDraft, setEditDraft] = useState(null) // { executionId, fields }

  const refreshAll = async ({ keepSelection = true } = {}) => {
    const list = await apiFetch('/workflows')
    setWorkflows(list)
    if (!keepSelection || !selectedWorkflowId) {
      setSelectedWorkflowId(list[0]?.id || null)
    } else if (selectedWorkflowId && !list.some((w) => w.id === selectedWorkflowId)) {
      setSelectedWorkflowId(list[0]?.id || null)
    }
    const q = await apiFetch('/admin/queue')
    setAdminQueue(q.items || [])
  }

  useEffect(() => {
    refreshAll().catch((e) => showToast(e.message, 'error'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!selectedWorkflowId) {
      setDetail(null)
      return
    }
    apiFetch(`/workflows/${selectedWorkflowId}`)
      .then(setDetail)
      .catch((e) => showToast(e.message, 'error'))
  }, [selectedWorkflowId])

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

  const fmtExecTitle = (e) => `${e.date} · ${e.time} · ${e.mealType}`

  const resolveTbd = async () => {
    if (!resolveDraft.executionId || !resolveDraft.vendor.trim()) return
    await apiFetch('/admin/resolve-tbd', {
      method: 'POST',
      body: { execution_id: resolveDraft.executionId, vendor_note: resolveDraft.vendor.trim() },
    })
    showToast('TBD resolved!')
    setResolveDraft({ executionId: null, vendor: '' })
    await refreshAll({ keepSelection: true })
    if (selectedWorkflowId) setDetail(await apiFetch(`/workflows/${selectedWorkflowId}`))
  }

  const saveExecution = async (executionId, fields) => {
    await apiFetch(`/executions/${executionId}`, { method: 'PATCH', body: fields })
    showToast('Changes saved')
    await refreshAll({ keepSelection: true })
    if (selectedWorkflowId) setDetail(await apiFetch(`/workflows/${selectedWorkflowId}`))
  }

  const advance = async (workflowId, action) => {
    await apiFetch(`/admin/workflows/${workflowId}/advance`, { method: 'POST', body: { action } })
    showToast(`Workflow advanced to ${action}`)
    await refreshAll({ keepSelection: true })
    if (selectedWorkflowId) setDetail(await apiFetch(`/workflows/${selectedWorkflowId}`))
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
            <input className="form-field" placeholder="Search workflows…" value={search} onChange={(e) => setSearch(e.target.value)} />
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
                      <span className="badge badge-green">✅ {counts.mo ?? 0}</span>
                      <span className="badge badge-amber">🔶 {counts.tbd ?? 0}</span>
                      <span className="badge badge-gray">⚪ {counts.not_mo ?? 0}</span>
                    </div>
                  </div>
                  <span className="badge badge-blue" style={{ whiteSpace: 'nowrap' }}>{w.status}</span>
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
                Admin queue <span className="badge badge-orange" style={{ marginLeft: 8 }}>{openQueue.length}</span>
              </button>
            </div>

            {rightTab === 'queue' && (
              <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {openQueue.slice(0, 12).map((q) => (
                  <div key={q.id} style={{ border: '1.5px solid #E2E8F0', borderRadius: 12, padding: 12 }}>
                    <div style={{ fontSize: 12, fontWeight: 900 }}>{q.type}</div>
                    <div style={{ fontSize: 12, color: '#718096', marginTop: 4 }}>
                      {q.execution_id ? `Execution: ${q.execution_id.slice(0, 10)}…` : `Workflow: ${q.workflow_id.slice(0, 10)}…`}
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
                        Take action
                      </button>
                    </div>
                  </div>
                ))}
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
                          <span className="badge badge-green">✅ {grouped.mo.length}</span>
                          <span className="badge badge-amber">🔶 {grouped.tbd.length}</span>
                          <span className="badge badge-gray">⚪ {grouped.notMo.length}</span>
                        </div>
                      </div>
                      <span className="badge badge-blue" style={{ whiteSpace: 'nowrap' }}>{selectedWorkflow.status}</span>
                    </div>

                    <div style={{ marginTop: 14, background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 12, padding: 12 }}>
                      <div style={{ fontSize: 11, fontWeight: 900, color: '#A0AEC0', letterSpacing: '0.08em', marginBottom: 8 }}>STRATEGIC DATA (Layer 1 & 2)</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        <div>
                          <div style={{ fontSize: 10, color: '#718096', fontWeight: 800, marginBottom: 2 }}>School</div>
                          <div style={{ fontSize: 12 }}>{selectedWorkflow.schoolName || '—'}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: 10, color: '#718096', fontWeight: 800, marginBottom: 2 }}>Conf / Div</div>
                          <div style={{ fontSize: 12 }}>{selectedWorkflow.conference || '—'} · {selectedWorkflow.division || '—'}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: 10, color: '#718096', fontWeight: 800, marginBottom: 2 }}>Trip / Mode</div>
                          <div style={{ fontSize: 12 }}>{selectedWorkflow.tripType || '—'} · {selectedWorkflow.homeAwayNeutral || '—'}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: 10, color: '#718096', fontWeight: 800, marginBottom: 2 }}>Opponent / Venue</div>
                          <div style={{ fontSize: 12 }}>{selectedWorkflow.opponent || '—'} @ {selectedWorkflow.venueName || '—'}</div>
                        </div>
                      </div>
                    </div>

                    {resolveDraft.executionId && (
                      <div style={{ marginTop: 14, background: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: 12, padding: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                          <div style={{ fontSize: 12, fontWeight: 900, color: '#92400E' }}>Resolve TBD meal</div>
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
                          <button className="btn-primary" disabled={!resolveDraft.vendor.trim()} onClick={() => resolveTbd().catch((e) => showToast(e.message, 'error'))}>Mark resolved</button>
                        </div>
                      </div>
                    )}

                    <div style={{ marginTop: 14 }}>
                      <ExecutionSection title="🔶 TBD — needs vendor" badgeClass="badge-amber" rows={grouped.tbd} onResolve={(e) => setResolveDraft({ executionId: e.id, vendor: e.notes || '' })} onEdit={(e) => setEditDraft({ executionId: e.id, fields: { ...e } })} />
                      <ExecutionSection title="✅ MO Executing" badgeClass="badge-green" rows={grouped.mo} onEdit={(e) => setEditDraft({ executionId: e.id, fields: { ...e } })} />
                      <ExecutionSection title="⚪ Not MO (logged only)" badgeClass="badge-gray" rows={grouped.notMo} onEdit={(e) => setEditDraft({ executionId: e.id, fields: { ...e } })} />
                    </div>

                    {editDraft?.executionId && (
                      <div style={{ marginTop: 14, background: 'white', border: '1.5px solid #E2E8F0', borderRadius: 12, padding: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                          <div style={{ fontSize: 12, fontWeight: 900 }}>Edit execution</div>
                          <button className="btn-secondary" style={{ padding: '6px 10px', fontSize: 12 }} onClick={() => setEditDraft(null)}>Close</button>
                        </div>
                        <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                          <div>
                            <div style={{ fontSize: 11, fontWeight: 800, color: '#718096', marginBottom: 4 }}>Time</div>
                            <input className="form-field" value={editDraft.fields.time || ''} onChange={(e) => setEditDraft((p) => ({ ...p, fields: { ...p.fields, time: e.target.value } }))} />
                          </div>
                          <div>
                            <div style={{ fontSize: 11, fontWeight: 800, color: '#718096', marginBottom: 4 }}>Timezone</div>
                            <select className="form-field" value={editDraft.fields.timezone || 'America/New_York'} onChange={(e) => setEditDraft((p) => ({ ...p, fields: { ...p.fields, timezone: e.target.value } }))}>
                              <option value="America/New_York">America/New_York</option>
                              <option value="America/Chicago">America/Chicago</option>
                              <option value="America/Denver">America/Denver</option>
                              <option value="America/Los_Angeles">America/Los_Angeles</option>
                            </select>
                          </div>
                          <div style={{ gridColumn: '1/-1' }}>
                            <div style={{ fontSize: 11, fontWeight: 800, color: '#718096', marginBottom: 4 }}>Notes</div>
                            <input className="form-field" value={editDraft.fields.notes || ''} onChange={(e) => setEditDraft((p) => ({ ...p, fields: { ...p.fields, notes: e.target.value } }))} />
                          </div>
                          <div>
                            <div style={{ fontSize: 11, fontWeight: 800, color: '#718096', marginBottom: 4 }}>Fulfillment</div>
                            <select className="form-field" value={editDraft.fields.fulfillmentType || 'mo_delivery'} onChange={(e) => setEditDraft((p) => ({ ...p, fields: { ...p.fields, fulfillmentType: e.target.value } }))}>
                              <option value="mo_delivery">mo_delivery</option>
                              <option value="mo_pickup">mo_pickup</option>
                              <option value="tbd">tbd</option>
                              <option value="not_mo">not_mo</option>
                            </select>
                          </div>
                          <div>
                            <div style={{ fontSize: 11, fontWeight: 800, color: '#718096', marginBottom: 4 }}>Event context</div>
                            <select className="form-field" value={editDraft.fields.eventContext || 'travel'} onChange={(e) => setEditDraft((p) => ({ ...p, fields: { ...p.fields, eventContext: e.target.value } }))}>
                              <option value="pre_game">pre_game</option>
                              <option value="post_game">post_game</option>
                              <option value="travel">travel</option>
                              <option value="practice">practice</option>
                              <option value="recovery">recovery</option>
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
                            Save changes
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          <div style={{ background: '#EBF2FF', border: '1.5px solid #BFDBFE', borderRadius: 12, padding: 14, display: 'flex', gap: 10 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#0F62FE' }}>info</span>
            <div style={{ fontSize: 12, color: '#1E40AF', lineHeight: 1.6 }}>
              These workflows are stored in the backend database. You can restart the backend to verify persistence.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ExecutionSection({ title, badgeClass, rows, onResolve, onEdit }) {
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
          {rows.slice(0, 8).map((e) => (
            <div key={e.id} style={{ border: '1.5px solid #E2E8F0', borderRadius: 12, padding: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 900, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {e.date} · {e.time} · {e.mealType}
                </div>
                <div style={{ fontSize: 12, color: '#718096', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {e.notes || '—'}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span className="badge badge-blue">{e.timezone}</span>
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
          {rows.length > 8 && (
            <div style={{ padding: '4px 2px', color: '#718096', fontSize: 12 }}>…and {rows.length - 8} more</div>
          )}
        </div>
      )}
    </div>
  )
}
