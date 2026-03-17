import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { apiFetch } from '../api/client'
import { statusLabel, fulfillmentLabel, queueTypeLabel, tzShort, fmtDate, fmtDateCompact, fmtTime12 } from '../utils/format'

export function PageWorkflows({ go, showToast, initialFocusId, isAdmin = true, hideNewButton = false }) {
  const [searchParams] = useSearchParams()
  const [rightTab, setRightTab] = useState('workflow')
  const [search, setSearch] = useState('')
  const [workflows, setWorkflows] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedWorkflowId, setSelectedWorkflowId] = useState(null)
  const [detail, setDetail] = useState(null)
  const [adminQueue, setAdminQueue] = useState([])
  const [resolveDraft, setResolveDraft] = useState({ executionId: null, vendor: '', fulfillmentType: 'mo_delivery' })
  const [editDraft, setEditDraft] = useState(null)
  // billingReview: { workflowId, rows: [{id, title, headcount, unitPrice, costPerMeal}] }
  const [billingReview, setBillingReview] = useState(null)
  const [statusFilter, setStatusFilter] = useState('all')

  // Tracks which workflow ID had its detail pre-fetched by the mount effect.
  // The selection useEffect skips re-fetching that ID to prevent a double call on load.
  const prefetchedIdRef = useRef(null)
  // Tracks the latest selectedWorkflowId for use inside action callbacks without stale closures.
  const selectedIdRef = useRef(selectedWorkflowId)
  useEffect(() => { selectedIdRef.current = selectedWorkflowId }, [selectedWorkflowId])

  const refreshList = useCallback(async () => {
    const [list, q] = await Promise.all([apiFetch('/workflows'), apiFetch('/admin/queue')])
    setWorkflows(list)
    setAdminQueue(q.items || [])
    return list
  }, [])

  const refreshDetail = useCallback(async (id) => {
    if (!id) { setDetail(null); return }
    const d = await apiFetch(`/workflows/${id}`)
    setDetail(d)
  }, [])

  // Initial load: fetch list + detail in one pass, mark the pre-fetched ID so the
  // selection effect below doesn't fire a second detail request for the same ID.
  useEffect(() => {
    const newId = searchParams.get('new')
    const focusId = searchParams.get('focus') || initialFocusId
    refreshList()
      .then(async (list) => {
        const targetId = newId || focusId || list[0]?.id || null
        if (targetId) {
          await refreshDetail(targetId)
          prefetchedIdRef.current = targetId  // mark before triggering selection effect
        }
        setSelectedWorkflowId(targetId)
      })
      .catch((e) => showToast(e.message, 'error'))
      .finally(() => setLoading(false))
  }, [])  // run once on mount

  // Re-fetch detail when the user picks a different workflow.
  // Skips the ID that was already loaded by the mount effect above.
  useEffect(() => {
    if (!selectedWorkflowId) { setDetail(null); return }
    if (prefetchedIdRef.current === selectedWorkflowId) {
      prefetchedIdRef.current = null  // consume the skip token — future selections always fetch
      return
    }
    refreshDetail(selectedWorkflowId).catch((e) => showToast(e.message, 'error'))
  }, [selectedWorkflowId, refreshDetail, showToast])

  const filteredWorkflows = useMemo(() => {
    const q = search.trim().toLowerCase()
    let list = workflows
    if (q) list = list.filter(w => `${w.name} ${w.team_name} ${w.sport || ''}`.toLowerCase().includes(q))
    if (statusFilter === 'pending') list = list.filter(w => w.status === 'submitted')
    if (statusFilter === 'active') list = list.filter(w => ['feasibility_approved', 'billing_prepped'].includes(w.status))
    if (statusFilter === 'done') list = list.filter(w => w.status === 'dispatch_approved')
    return list
  }, [workflows, search, statusFilter])

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
      city: detail.city,
      state: detail.state,
      gameDate: detail.game_date,
      gameTime: detail.game_time,
      dietaryNotes: detail.dietary_notes,
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
      serviceStyle: e.service_style,
      locationType: e.location_type,
      notes: e.notes,
      eventContext: e.event_context,
      fulfillmentType: e.fulfillment_type,
      moFulfills: e.mo_fulfills,
      headcount: e.headcount,
      dietaryCounts: e.dietary_counts || {},
      status: e.status,
      // Financials
      unitPrice: e.unit_price ?? 0,
      totalPrice: e.total_price ?? 0,
      cost: e.cost ?? 0,
      margin: e.margin ?? 0,
      // Nash delivery fields
      pickupAddress: e.pickup_address,
      deliveryAddress: e.delivery_address,
      pickupContactName: e.pickup_contact_name,
      pickupContactPhone: e.pickup_contact_phone,
      deliveryContactName: e.delivery_contact_name,
      deliveryContactPhone: e.delivery_contact_phone,
      deliveryWindowStart: e.delivery_window_start,
      deliveryWindowEnd: e.delivery_window_end,
    }))
  }, [detail])

  const openQueue = useMemo(() => (adminQueue || []).filter((q) => q.status === 'open'), [adminQueue])

  const grouped = useMemo(() => {
    const mo = [], tbd = [], notMo = []
    for (const e of executions) {
      if (e.fulfillmentType === 'tbd') tbd.push(e)
      else if (e.fulfillmentType === 'not_mo') notMo.push(e)
      else mo.push(e)
    }
    const byDate = (arr) => [...arr].sort((a, b) => {
      const da = `${a.date} ${a.time || '99:99'}`
      const db = `${b.date} ${b.time || '99:99'}`
      return da.localeCompare(db)
    })
    return { mo: byDate(mo), tbd: byDate(tbd), notMo: byDate(notMo) }
  }, [executions])

  const fmtExecTitle = (e) => {
    if (!e?.date) return '—'
    return `${fmtDate(e.date)} · ${e.time ? fmtTime12(e.time) : 'Time TBD'} · ${e.mealType}`
  }

  const resolveTbd = async () => {
    if (!resolveDraft.executionId || !resolveDraft.vendor.trim()) return
    await apiFetch('/admin/resolve-tbd', {
      method: 'POST',
      body: {
        execution_id: resolveDraft.executionId,
        vendor_note: resolveDraft.vendor.trim(),
        fulfillment_type: resolveDraft.fulfillmentType,
      },
    })
    showToast('TBD resolved!')
    setResolveDraft({ executionId: null, vendor: '', fulfillmentType: 'mo_delivery' })
    await refreshList()
    await refreshDetail(selectedIdRef.current)
  }

  const saveExecution = async (executionId, fields) => {
    await apiFetch(`/executions/${executionId}`, { method: 'PATCH', body: fields })
    showToast('Changes saved')
    await refreshList()
    await refreshDetail(selectedIdRef.current)
  }

  const openBillingReview = (workflowId, moRows) => {
    setBillingReview({
      workflowId,
      rows: moRows.map((e) => ({
        id: e.id,
        title: fmtExecTitle(e),
        headcount: e.headcount,
        unitPrice: e.unitPrice || '',
        costPerMeal: e.cost > 0 ? (e.cost / (e.headcount || 1)).toFixed(2) : '',
      })),
    })
    setRightTab('workflow')
  }

  const confirmBillingAndAdvance = async () => {
    if (!billingReview) return
    // Save any unit_price / cost_per_meal entered by the admin
    const patches = billingReview.rows.filter((r) => r.unitPrice !== '' || r.costPerMeal !== '')
    for (const r of patches) {
      const body = {}
      if (r.unitPrice !== '') body.unitPrice = Number(r.unitPrice)
      if (r.costPerMeal !== '') body.costPerMeal = Number(r.costPerMeal)
      await apiFetch(`/executions/${r.id}`, { method: 'PATCH', body })
    }
    await advance(billingReview.workflowId, 'billing_prep')
    setBillingReview(null)
  }

  const advance = async (workflowId, action) => {
    const result = await apiFetch(`/admin/workflows/${workflowId}/advance`, { method: 'POST', body: { action } })
    if (action === 'dispatch_approve' && result.dispatched_count != null) {
      showToast(`Dispatched ${result.dispatched_count} meal${result.dispatched_count !== 1 ? 's' : ''} to Nash`)
    } else {
      showToast('Workflow advanced')
    }
    await refreshList()
    await refreshDetail(selectedIdRef.current)
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
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 18, alignItems: 'start' }}>

        {/* Left: Workflow list */}
        <div style={{ background: 'white', borderRadius: 16, border: '1px solid #E2E8F0', overflow: 'hidden' }}>
          <div style={{ padding: '18px 22px', borderBottom: '1px solid #EEF1F5', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="material-symbols-outlined" style={{ color: '#0F62FE' }}>list_alt</span>
              <span style={{ fontSize: 16, fontWeight: 800 }}>Workflows</span>
              <span className="badge badge-gray" style={{ fontSize: 11 }}>{workflows.length}</span>
            </div>
            {!hideNewButton && (
              <button className="btn-primary" onClick={() => go('new-schedule')}>
                <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'white' }}>add</span> New
              </button>
            )}
          </div>
          <div style={{ padding: 16, borderBottom: '1px solid #EEF1F5' }}>
            <input className="form-field" placeholder="Search workflows..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div style={{ padding: '8px 16px', borderBottom: '1px solid #EEF1F5', display: 'flex', gap: 4 }}>
            {[['all','All'],['pending','Submitted'],['active','In Review'],['done','Dispatched']].map(([v,l]) => (
              <button key={v} className={statusFilter === v ? 'btn-primary' : 'btn-secondary'} style={{ padding: '4px 10px', fontSize: 11 }} onClick={() => setStatusFilter(v)}>{l}</button>
            ))}
          </div>
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 'calc(100vh - 240px)', overflowY: 'auto' }}>
            {filteredWorkflows.map((w) => {
              const active = w.id === selectedWorkflowId
              const counts = w.counts || {}
              const isNew = searchParams.get('new') === w.id
              return (
                <div
                  key={w.id}
                  className="hover-lift"
                  onClick={() => { setSelectedWorkflowId(w.id); setRightTab('workflow') }}
                  style={{
                    border: active ? '2px solid #0F62FE' : isNew ? '2px solid #24A148' : '1.5px solid #E2E8F0',
                    background: active ? '#EBF2FF' : isNew ? '#F0FFF4' : 'white',
                    borderRadius: 12, padding: 14,
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                      {isNew && <span className="badge badge-green" style={{ fontSize: 9, padding: '1px 5px' }}>NEW</span>}
                      <div style={{ fontSize: 13, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{w.name}</div>
                    </div>
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
              <div style={{ padding: 32, textAlign: 'center', color: '#718096' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 36, color: '#CBD5E0', marginBottom: 12 }}>list_alt</span>
                <div style={{ fontSize: 13 }}>No workflows yet. Create a schedule or submit intake.</div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Detail panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ background: 'white', borderRadius: 16, border: '1px solid #E2E8F0', overflow: 'hidden' }}>
            <div style={{ padding: '12px 14px', borderBottom: '1px solid #EEF1F5', display: 'flex', gap: 10 }}>
              <button className={rightTab === 'workflow' ? 'btn-primary' : 'btn-secondary'} style={{ padding: '8px 12px', fontSize: 12 }} onClick={() => setRightTab('workflow')}>
                Workflow
              </button>
              {isAdmin && (
                <button className={rightTab === 'queue' ? 'btn-primary' : 'btn-secondary'} style={{ padding: '8px 12px', fontSize: 12 }} onClick={() => setRightTab('queue')}>
                  Admin Queue <span className="badge badge-orange" style={{ marginLeft: 6 }}>{openQueue.length}</span>
                </button>
              )}
            </div>

            {isAdmin && rightTab === 'queue' && (
              <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 600, overflowY: 'auto' }}>
                {openQueue.slice(0, 15).map((q) => {
                  const execForItem = executions.find(e => e.id === q.execution_id)
                  const queueWf = workflows.find(w => w.id === q.workflow_id)
                  const QUEUE_BORDER = { feasibility: '#3B82F6', resolve_tbd: '#D97706', billing_prep: '#16A34A', dispatch_approval: '#9333EA' }
                  const qBorderColor = QUEUE_BORDER[q.type] || '#E2E8F0'
                  return (
                    <div key={q.id} style={{ border: '1.5px solid #E2E8F0', borderLeft: `4px solid ${qBorderColor}`, borderRadius: 12, padding: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                        <div style={{ fontSize: 12, fontWeight: 900 }}>{queueTypeLabel(q.type)}</div>
                        {q.created_at && <span style={{ fontSize: 10, color: '#A0AEC0' }}>{fmtDate(q.created_at.split('T')[0])}</span>}
                      </div>
                      {queueWf && <div style={{ fontSize: 11, fontWeight: 700, color: '#374151', marginBottom: 3 }}>{queueWf.team_name}{queueWf.sport ? ` · ${queueWf.sport}` : ''}</div>}
                      <div style={{ fontSize: 12, color: '#718096' }}>
                        {execForItem ? fmtExecTitle(execForItem) : 'Workflow-level action'}
                      </div>
                      <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        <button className="btn-secondary" style={{ padding: 8, fontSize: 12, justifyContent: 'center' }} onClick={() => {
                          setSelectedWorkflowId(q.workflow_id)
                          setRightTab('workflow')
                          if (q.type === 'resolve_tbd') setResolveDraft({ executionId: q.execution_id, vendor: '', fulfillmentType: 'mo_delivery' })
                        }}>Open</button>
                        <button className="btn-primary" style={{ padding: 8, fontSize: 12, justifyContent: 'center' }} onClick={() => {
                          if (q.type === 'resolve_tbd') {
                            setSelectedWorkflowId(q.workflow_id)
                            setRightTab('workflow')
                            setResolveDraft({ executionId: q.execution_id, vendor: '', fulfillmentType: 'mo_delivery' })
                            return
                          }
                          if (q.type === 'billing_prep') {
                            const targetWf = workflows.find(w => w.id === q.workflow_id)
                            if ((targetWf?.counts?.tbd ?? 0) > 0) {
                              showToast(`${targetWf.counts.tbd} TBD meal(s) must be resolved before billing prep.`, 'error')
                              return
                            }
                            // Show billing review before advancing — load detail first if needed
                            const target = selectedWorkflow?.id === q.workflow_id ? grouped.mo : []
                            if (target.length > 0) {
                              openBillingReview(q.workflow_id, target)
                            } else {
                              setSelectedWorkflowId(q.workflow_id)
                              setRightTab('workflow')
                            }
                            return
                          }
                          const action = q.type === 'feasibility' ? 'feasibility_approve' : q.type === 'dispatch_approval' ? 'dispatch_approve' : null
                          if (!action) return
                          advance(q.workflow_id, action).catch((e) => showToast(e.message, 'error'))
                        }}>Take Action</button>
                      </div>
                    </div>
                  )
                })}
                {openQueue.length === 0 && <div style={{ padding: 16, textAlign: 'center', color: '#718096' }}>No open admin items.</div>}
              </div>
            )}

            {rightTab === 'workflow' && (
              <div style={{ padding: 14, maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}>
                {!selectedWorkflow && <div style={{ padding: 24, textAlign: 'center', color: '#718096' }}>Select a workflow to review.</div>}
                {selectedWorkflow && (
                  <>
                    <div style={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between', gap: 12 }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 900, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis' }}>{selectedWorkflow.name}</div>
                        <div style={{ fontSize: 12, color: '#718096' }}>{selectedWorkflow.teamName}{selectedWorkflow.sport ? ` · ${selectedWorkflow.sport}` : ''}</div>
                        <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          <span className="badge badge-green">{grouped.mo.length} MO</span>
                          <span className="badge badge-amber">{grouped.tbd.length} TBD</span>
                          <span className="badge badge-gray">{grouped.notMo.length} Not MO</span>
                        </div>
                        {!isAdmin && (
                          <div style={{ marginTop: 10, background: selectedWorkflow.status === 'submitted' ? '#EBF2FF' : selectedWorkflow.status === 'dispatch_approved' ? '#F0FDF4' : '#FFFBEB', border: `1.5px solid ${selectedWorkflow.status === 'submitted' ? '#BFDBFE' : selectedWorkflow.status === 'dispatch_approved' ? '#86EFAC' : '#FDE68A'}`, borderRadius: 10, padding: '10px 12px' }}>
                            <div style={{ fontSize: 12, fontWeight: 800, marginBottom: 3, color: selectedWorkflow.status === 'submitted' ? '#1E40AF' : selectedWorkflow.status === 'dispatch_approved' ? '#14532D' : '#92400E', display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span className="material-symbols-outlined" style={{ fontSize: 15 }}>{selectedWorkflow.status === 'dispatch_approved' ? 'check_circle' : selectedWorkflow.status === 'submitted' ? 'schedule' : 'pending'}</span>
                              {selectedWorkflow.status === 'submitted' && 'Awaiting admin review'}
                              {selectedWorkflow.status === 'feasibility_approved' && 'Feasibility confirmed — billing in progress'}
                              {selectedWorkflow.status === 'billing_prepped' && 'Billing ready — awaiting dispatch approval'}
                              {selectedWorkflow.status === 'dispatch_approved' && 'Dispatched — meals are confirmed!'}
                            </div>
                            <div style={{ fontSize: 11, color: '#374151', lineHeight: 1.5 }}>
                              {selectedWorkflow.status === 'submitted' && `Our team will confirm feasibility shortly.${grouped.tbd.length > 0 ? ` Resolve ${grouped.tbd.length} TBD meal(s) below to speed up dispatch.` : ''}`}
                              {selectedWorkflow.status === 'feasibility_approved' && 'Our team is setting unit prices and costs. No action needed from you.'}
                              {selectedWorkflow.status === 'billing_prepped' && 'Final step: our team will approve dispatch and send to Nash.'}
                              {selectedWorkflow.status === 'dispatch_approved' && 'All MO meals have been dispatched to vendors. Check execution details below.'}
                            </div>
                          </div>
                        )}
                      </div>
                      <span className="badge badge-blue" style={{ whiteSpace: 'nowrap' }}>{statusLabel(selectedWorkflow.status)}</span>
                    </div>

                    {/* Trip Details */}
                    <div style={{ marginTop: 14, background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 12, padding: 12 }}>
                      <div style={{ fontSize: 11, fontWeight: 900, color: '#A0AEC0', letterSpacing: '0.08em', marginBottom: 8 }}>TRIP DETAILS</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        {[
                          ['School', selectedWorkflow.schoolName],
                          ['Conf / Div', `${selectedWorkflow.conference || '—'} · ${selectedWorkflow.division || '—'}`],
                          ['Trip / Mode', `${selectedWorkflow.tripType || '—'} · ${selectedWorkflow.homeAwayNeutral || '—'}`],
                          ['Opponent', selectedWorkflow.opponent],
                          ['Venue', selectedWorkflow.venueName],
                          ['Location', `${selectedWorkflow.city || '—'}, ${selectedWorkflow.state || '—'}`],
                          ['Game Date', selectedWorkflow.gameDate ? fmtDate(selectedWorkflow.gameDate) : null],
                          ['Game Time', selectedWorkflow.gameTime ? fmtTime12(selectedWorkflow.gameTime) : null],
                        ].map(([label, val]) => (
                          <div key={label}>
                            <div style={{ fontSize: 10, color: '#718096', fontWeight: 800, marginBottom: 1 }}>{label}</div>
                            <div style={{ fontSize: 12 }}>{val || '—'}</div>
                          </div>
                        ))}
                      </div>
                      {selectedWorkflow.dietaryNotes && (
                        <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #E2E8F0' }}>
                          <div style={{ fontSize: 10, color: '#718096', fontWeight: 800, marginBottom: 4 }}>DIETARY NOTES</div>
                          <div style={{ fontSize: 12, color: '#374151', lineHeight: 1.5 }}>{selectedWorkflow.dietaryNotes}</div>
                        </div>
                      )}
                    </div>

                    {/* TBD Resolve Panel */}
                    {resolveDraft.executionId && (
                      <div style={{ marginTop: 14, background: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: 12, padding: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                          <div style={{ fontSize: 12, fontWeight: 900, color: '#92400E' }}>Resolve TBD Meal</div>
                          <button className="btn-secondary" style={{ padding: '6px 10px', fontSize: 12 }} onClick={() => setResolveDraft({ executionId: null, vendor: '', fulfillmentType: 'mo_delivery' })}>Close</button>
                        </div>
                        <div style={{ fontSize: 12, color: '#92400E', marginTop: 6 }}>
                          {fmtExecTitle(executions.find((e) => e.id === resolveDraft.executionId) || {})}
                        </div>
                        <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                          <input className="form-field" style={{ flex: 1 }} value={resolveDraft.vendor} onChange={(e) => setResolveDraft((p) => ({ ...p, vendor: e.target.value }))} placeholder="Vendor name + address" />
                          <select className="form-field" style={{ width: 130 }} value={resolveDraft.fulfillmentType} onChange={(e) => setResolveDraft((p) => ({ ...p, fulfillmentType: e.target.value }))}>
                            <option value="mo_delivery">MO Delivery</option>
                            <option value="mo_pickup">MO Pickup</option>
                          </select>
                        </div>
                        <div style={{ marginTop: 10, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                          <button className="btn-secondary" onClick={() => setResolveDraft({ executionId: null, vendor: '', fulfillmentType: 'mo_delivery' })}>Cancel</button>
                          <button className="btn-primary" disabled={!resolveDraft.vendor.trim()} onClick={() => resolveTbd().catch((e) => showToast(e.message, 'error'))}>Mark Resolved</button>
                        </div>
                      </div>
                    )}

                    {/* Executions grouped */}
                    <div style={{ marginTop: 14 }}>
                      <ExecutionSection title="TBD — Needs Vendor" badgeClass="badge-amber" rows={grouped.tbd} onResolve={(e) => setResolveDraft({ executionId: e.id, vendor: e.notes || '', fulfillmentType: 'mo_delivery' })} onEdit={(e) => setEditDraft({ executionId: e.id, fields: { ...e } })} />
                      <ExecutionSection title="MO Executing" badgeClass="badge-green" rows={grouped.mo} onEdit={(e) => setEditDraft({ executionId: e.id, fields: { ...e } })} />
                      <ExecutionSection title="Not MO (Logged Only)" badgeClass="badge-gray" rows={grouped.notMo} onEdit={(e) => setEditDraft({ executionId: e.id, fields: { ...e } })} />
                    </div>

                    {/* Billing review panel — shown before billing_prep advance */}
                    {billingReview?.workflowId === selectedWorkflow.id && (
                      <div style={{ marginTop: 14, background: '#F0FFF4', border: '1.5px solid #86EFAC', borderRadius: 12, padding: 14 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                          <div style={{ fontSize: 13, fontWeight: 900, color: '#14532D' }}>Billing Review</div>
                          <button className="btn-secondary" style={{ padding: '5px 10px', fontSize: 12 }} onClick={() => setBillingReview(null)}>Cancel</button>
                        </div>
                        <div style={{ fontSize: 11, color: '#166534', marginBottom: 10 }}>Enter unit price (charged to client) and cost per meal (MO pays vendor) before confirming billing prep.</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {billingReview.rows.map((r, i) => (
                            <div key={r.id} style={{ background: 'white', border: '1px solid #D1FAE5', borderRadius: 10, padding: 10 }}>
                              <div style={{ fontSize: 11, fontWeight: 800, marginBottom: 6, color: '#374151' }}>{r.title}</div>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                <div>
                                  <div style={{ fontSize: 10, fontWeight: 800, color: '#718096', marginBottom: 3 }}>Unit Price / Meal ($)</div>
                                  <input className="form-field" type="number" step="0.01" min="0"
                                    value={r.unitPrice}
                                    placeholder="65.00"
                                    onChange={(e) => setBillingReview((p) => ({
                                      ...p, rows: p.rows.map((row, j) => j === i ? { ...row, unitPrice: e.target.value } : row)
                                    }))} />
                                </div>
                                <div>
                                  <div style={{ fontSize: 10, fontWeight: 800, color: '#718096', marginBottom: 3 }}>Cost / Meal ($)</div>
                                  <input className="form-field" type="number" step="0.01" min="0"
                                    value={r.costPerMeal}
                                    placeholder="42.00"
                                    onChange={(e) => setBillingReview((p) => ({
                                      ...p, rows: p.rows.map((row, j) => j === i ? { ...row, costPerMeal: e.target.value } : row)
                                    }))} />
                                </div>
                              </div>
                              {r.unitPrice && r.costPerMeal && r.headcount > 0 && (
                                <div style={{ marginTop: 6, fontSize: 10, color: '#166534' }}>
                                  Revenue: ${(Number(r.unitPrice) * r.headcount).toFixed(0)} · Cost: ${(Number(r.costPerMeal) * r.headcount).toFixed(0)} · Margin: ${((Number(r.unitPrice) - Number(r.costPerMeal)) * r.headcount).toFixed(0)}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                        <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                          <button className="btn-primary" onClick={() => confirmBillingAndAdvance().catch((e) => showToast(e.message, 'error'))}>
                            Confirm & Advance to Dispatch
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Edit execution panel */}
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
                          <div>
                            <div style={{ fontSize: 11, fontWeight: 800, color: '#718096', marginBottom: 4 }}>Unit Price / Meal ($)</div>
                            <input className="form-field" type="number" step="0.01" min="0"
                              value={editDraft.fields.unitPrice ?? ''}
                              placeholder="65.00"
                              onChange={(e) => setEditDraft((p) => ({ ...p, fields: { ...p.fields, unitPrice: e.target.value === '' ? null : Number(e.target.value) } }))} />
                          </div>
                          <div>
                            <div style={{ fontSize: 11, fontWeight: 800, color: '#718096', marginBottom: 4 }}>Cost / Meal ($) <span style={{ fontWeight: 400, color: '#A0AEC0' }}>MO pays vendor</span></div>
                            <input className="form-field" type="number" step="0.01" min="0"
                              value={editDraft.fields.costPerMeal ?? ''}
                              placeholder="42.00"
                              onChange={(e) => setEditDraft((p) => ({ ...p, fields: { ...p.fields, costPerMeal: e.target.value === '' ? null : Number(e.target.value) } }))} />
                          </div>
                        </div>

                        {/* Dietary Counts */}
                        <div style={{ marginTop: 14, border: '1.5px solid #E2E8F0', borderRadius: 10, padding: 12 }}>
                          <div style={{ fontSize: 11, fontWeight: 800, color: '#16A34A', letterSpacing: '0.05em', marginBottom: 10 }}>DIETARY COUNTS</div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                            {[
                              { key: 'vegetarian', label: 'Vegetarian', color: '#065F46', bg: '#D1FAE5' },
                              { key: 'glutenFree', label: 'Gluten-Free', color: '#92400E', bg: '#FEF3C7' },
                              { key: 'nutFree', label: 'Nut-Free', color: '#6B21A8', bg: '#F3E8FF' },
                            ].map((d) => (
                              <div key={d.key}>
                                <div style={{ fontSize: 10, fontWeight: 800, color: '#718096', marginBottom: 3 }}>{d.label}</div>
                                <input className="form-field" type="number" min="0"
                                  value={editDraft.fields.dietaryCounts?.[d.key] ?? 0}
                                  onChange={(e) => setEditDraft((p) => ({
                                    ...p,
                                    fields: { ...p.fields, dietaryCounts: { ...(p.fields.dietaryCounts || {}), [d.key]: Number(e.target.value) } }
                                  }))} />
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Nash Delivery Details */}
                        <NashFields fields={editDraft.fields} onChange={(k, v) => setEditDraft((p) => ({ ...p, fields: { ...p.fields, [k]: v } }))} />

                        <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                          <button className="btn-secondary" onClick={() => setEditDraft(null)}>Cancel</button>
                          <button className="btn-primary" onClick={() => {
                            saveExecution(editDraft.executionId, {
                              time: editDraft.fields.time,
                              timezone: editDraft.fields.timezone,
                              notes: editDraft.fields.notes,
                              fulfillmentType: editDraft.fields.fulfillmentType,
                              eventContext: editDraft.fields.eventContext,
                              unitPrice: editDraft.fields.unitPrice,
                              costPerMeal: editDraft.fields.costPerMeal,
                              dietaryCounts: editDraft.fields.dietaryCounts,
                              pickupAddress: editDraft.fields.pickupAddress,
                              deliveryAddress: editDraft.fields.deliveryAddress,
                              pickupContactName: editDraft.fields.pickupContactName,
                              pickupContactPhone: editDraft.fields.pickupContactPhone,
                              deliveryContactName: editDraft.fields.deliveryContactName,
                              deliveryContactPhone: editDraft.fields.deliveryContactPhone,
                              deliveryWindowStart: editDraft.fields.deliveryWindowStart,
                              deliveryWindowEnd: editDraft.fields.deliveryWindowEnd,
                            }).then(() => setEditDraft(null)).catch((e) => showToast(e.message, 'error'))
                          }}>Save Changes</button>
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

function NashFields({ fields, onChange }) {
  const [open, setOpen] = useState(false)
  const hasData = fields.pickupAddress || fields.deliveryAddress || fields.pickupContactName || fields.deliveryContactName
  return (
    <div style={{ marginTop: 14, border: '1.5px solid #E2E8F0', borderRadius: 10 }}>
      <button
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: "inherit" }}
        onClick={() => setOpen((o) => !o)}
      >
        <span style={{ fontSize: 11, fontWeight: 800, color: '#0F62FE', letterSpacing: '0.05em' }}>
          NASH DELIVERY DETAILS {hasData && '✓'}
        </span>
        <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#718096' }}>{open ? 'expand_less' : 'expand_more'}</span>
      </button>
      {open && (
        <div style={{ padding: '0 12px 12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {[
            ['pickupAddress', 'Pickup Address', 'text', '1/-1'],
            ['deliveryAddress', 'Delivery Address', 'text', '1/-1'],
            ['pickupContactName', 'Pickup Contact Name', 'text', null],
            ['pickupContactPhone', 'Pickup Contact Phone', 'tel', null],
            ['deliveryContactName', 'Delivery Contact Name', 'text', null],
            ['deliveryContactPhone', 'Delivery Contact Phone', 'tel', null],
            ['deliveryWindowStart', 'Delivery Window Start', 'time', null],
            ['deliveryWindowEnd', 'Delivery Window End', 'time', null],
          ].map(([key, label, type, col]) => (
            <div key={key} style={col ? { gridColumn: col } : {}}>
              <div style={{ fontSize: 10, fontWeight: 800, color: '#718096', marginBottom: 3 }}>{label}</div>
              <input
                className="form-field"
                type={type}
                value={fields[key] || ''}
                placeholder={label}
                onChange={(e) => onChange(key, e.target.value || null)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ExecutionSection({ title, badgeClass, rows, onResolve, onEdit }) {
  const [expanded, setExpanded] = useState(false)
  const LIMIT = 8
  const visible = expanded ? rows : rows.slice(0, LIMIT)

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
          {visible.map((e) => {
            const dietary = Object.entries(e.dietaryCounts || {}).filter(([, v]) => v > 0)
            return (
              <div key={e.id} style={{ border: '1.5px solid #E2E8F0', borderRadius: 12, padding: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: dietary.length > 0 ? 6 : 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                    {/* Compact date chip */}
                    {(() => { const { day, weekday } = fmtDateCompact(e.date); return (
                      <div style={{ background: '#F1F5F9', border: '1px solid #E2E8F0', borderRadius: 8, width: 44, minWidth: 44, textAlign: 'center', padding: '4px 0', flexShrink: 0 }}>
                        <div style={{ fontSize: 8, fontWeight: 800, color: '#718096', letterSpacing: '0.05em' }}>{weekday}</div>
                        <div style={{ fontSize: 13, fontWeight: 900, color: '#0D1117', lineHeight: 1.1 }}>{day}</div>
                      </div>
                    )})()}
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 900, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {e.time ? fmtTime12(e.time) : 'Time TBD'} · {e.mealType}
                      </div>
                      <div style={{ fontSize: 11, color: '#718096', display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                        {e.notes && <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>{e.notes}</span>}
                        {e.headcount > 0 && <span style={{ color: '#A0AEC0' }}>· {e.headcount} pax</span>}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                    {e.timezone && <span className="badge badge-blue">{tzShort(e.timezone)}</span>}
                    {onResolve && <button className="btn-secondary" style={{ padding: '5px 8px', fontSize: 11 }} onClick={() => onResolve(e)}>Resolve</button>}
                    {onEdit && <button className="btn-secondary" style={{ padding: '5px 8px', fontSize: 11 }} onClick={() => onEdit(e)}>Edit</button>}
                  </div>
                </div>
                {dietary.length > 0 && (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {dietary.map(([k, v]) => (
                      <span key={k} style={{ fontSize: 10, background: '#DEFBE6', color: '#14532D', padding: '2px 6px', borderRadius: 6, fontWeight: 700 }}>{k}: {v}</span>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
          {rows.length > LIMIT && (
            <button onClick={() => setExpanded(!expanded)} style={{ padding: '6px 2px', color: '#0F62FE', fontSize: 12, fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
              {expanded ? 'Show less' : `Show all ${rows.length} meals`}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
