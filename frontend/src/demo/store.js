/* Persistent demo store (local-only).
   This lets stakeholder demos feel real without backend wiring yet. */

const STORAGE_KEY = 'meal_outpost_demo_v1'

function nowIso() {
  return new Date().toISOString()
}

function uid(prefix) {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`
}

export function seedDemoState() {
  const workflowId = uid('wfl')
  const executions = [
    {
      id: uid('exe'),
      workflowId,
      date: '2026-02-19',
      time: '08:00',
      timezone: 'America/New_York',
      mealType: 'Breakfast',
      locationType: 'restaurant',
      notes: 'Cracked Eggery',
      eventContext: 'travel',
      moFulfills: true,
      fulfillmentType: 'mo_delivery',
      status: 'submitted',
      headcount: 45,
      dietaryCounts: { vegetarian: 9, glutenFree: 12, nutFree: 0 },
    },
    {
      id: uid('exe'),
      workflowId,
      date: '2026-02-19',
      time: '10:45',
      timezone: 'America/New_York',
      mealType: 'Lunch',
      locationType: 'airport',
      notes: 'At Airport – Per Diem',
      eventContext: 'travel',
      moFulfills: false,
      fulfillmentType: 'not_mo',
      status: 'context_only',
      headcount: 45,
      dietaryCounts: { vegetarian: 0, glutenFree: 0, nutFree: 0 },
    },
    {
      id: uid('exe'),
      workflowId,
      date: '2026-02-19',
      time: '15:00',
      timezone: 'America/Chicago',
      mealType: 'Pre-Practice Meal',
      locationType: 'perdiem',
      notes: 'TBD Pickup',
      eventContext: 'practice',
      moFulfills: false,
      fulfillmentType: 'tbd',
      status: 'submitted',
      headcount: 45,
      dietaryCounts: { vegetarian: 0, glutenFree: 0, nutFree: 0 },
    },
  ]

  return {
    meta: { version: 1, seededAt: nowIso() },
    workflows: [
      {
        id: workflowId,
        name: 'Baseball Away Trip · Feb 19–23',
        teamName: "Varsity Baseball (Men's)",
        sport: 'Baseball',
        tripType: 'multi_day',
        homeAwayNeutral: 'away',
        opponent: 'University of Louisiana',
        venueName: 'Lafayette, LA',
        status: 'submitted',
        createdAt: nowIso(),
        updatedAt: nowIso(),
      },
    ],
    executions,
    adminQueue: [
      {
        id: uid('q'),
        type: 'feasibility',
        workflowId,
        executionId: null,
        status: 'open',
        createdAt: nowIso(),
      },
      {
        id: uid('q'),
        type: 'resolve_tbd',
        workflowId,
        executionId: executions[2].id,
        status: 'open',
        createdAt: nowIso(),
      },
    ],
  }
}

export function loadDemoState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function saveDemoState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export function initDemoState() {
  const existing = loadDemoState()
  if (existing) return existing
  const seeded = seedDemoState()
  saveDemoState(seeded)
  return seeded
}

export function resetDemoState() {
  localStorage.removeItem(STORAGE_KEY)
}

export function classifyMealRow({ mealType, locationType, notes }) {
  const text = `${mealType || ''} ${locationType || ''} ${notes || ''}`.toLowerCase()
  if (text.includes('per diem') || locationType === 'perdiem' || locationType === 'airport') {
    return { moFulfills: false, fulfillmentType: 'not_mo' }
  }
  if (text.includes('provided') || text.includes('at field')) {
    return { moFulfills: false, fulfillmentType: 'not_mo' }
  }
  if (text.includes('tbd')) {
    return { moFulfills: false, fulfillmentType: 'tbd' }
  }
  return { moFulfills: true, fulfillmentType: 'mo_delivery' }
}

export function deriveEventContext({ mealType, locationType, notes }) {
  const text = `${mealType || ''} ${locationType || ''} ${notes || ''}`.toLowerCase()
  if (text.includes('pre-game') || text.includes('pregame')) return 'pre_game'
  if (text.includes('post-game') || text.includes('post game') || text.includes('recovery')) return 'post_game'
  if (locationType === 'airport' || locationType === 'bus') return 'travel'
  if (text.includes('practice')) return 'practice'
  return 'travel'
}

export function createWorkflowFromSchedule(demoState, scheduleDraft) {
  const workflowId = uid('wfl')
  const createdAt = nowIso()
  const workflow = {
    id: workflowId,
    name: scheduleDraft.name || 'Untitled Trip',
    teamName: scheduleDraft.teamName,
    sport: scheduleDraft.sport || null,
    tripType: scheduleDraft.tripType || null,
    homeAwayNeutral: scheduleDraft.homeAwayNeutral || null,
    opponent: scheduleDraft.opponent || null,
    venueName: scheduleDraft.venueName || null,
    status: 'submitted',
    createdAt,
    updatedAt: createdAt,
  }

  const executions = scheduleDraft.rows.map((row) => {
    const classification = classifyMealRow(row)
    const eventContext = deriveEventContext(row)
    return {
      id: uid('exe'),
      workflowId,
      date: row.date,
      time: row.time,
      timezone: row.timezone || 'America/New_York',
      mealType: row.mealType,
      locationType: row.locationType,
      notes: row.notes || '',
      eventContext,
      ...classification,
      status: classification.fulfillmentType === 'not_mo' ? 'context_only' : 'submitted',
      headcount: row.headcount,
      dietaryCounts: row.dietaryCounts || { vegetarian: 0, glutenFree: 0, nutFree: 0 },
      budget: row.budget || '',
    }
  })

  const adminQueue = [
    {
      id: uid('q'),
      type: 'feasibility',
      workflowId,
      executionId: null,
      status: 'open',
      createdAt,
    },
    ...executions
    .filter((e) => e.fulfillmentType === 'tbd')
    .map((e) => ({
      id: uid('q'),
      type: 'resolve_tbd',
      workflowId,
      executionId: e.id,
      status: 'open',
      createdAt,
    })),
  ]

  return {
    nextState: {
      ...demoState,
      workflows: [workflow, ...demoState.workflows],
      executions: [...executions, ...demoState.executions],
      adminQueue: [...adminQueue, ...demoState.adminQueue],
    },
    workflowId,
  }
}

