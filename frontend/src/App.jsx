import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom'
import './App.css'

// API Client
import { apiFetch } from './api/client'

// Layout Components
import { Sidebar } from './components/Sidebar'
import { TopBar } from './components/TopBar'
import { ChatPanel } from './components/ChatPanel'
import { FloatBtn } from './components/FloatBtn'

// Pages
import { PageDashboard } from './pages/Dashboard'
import { PageSchedules } from './pages/Schedules'
import { PageIntake } from './pages/Intake'
import { PageWorkflows } from './pages/Workflows'
import { PageNewSchedule } from './pages/NewSchedule'
import { PageTeams } from './pages/Teams'
import { PageBudget } from './pages/Budget'

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: 'dashboard', link: '/' },
  { id: 'schedules', label: 'Schedules', icon: 'calendar_today', link: '/schedules' },
  { id: 'teams', label: 'Teams', icon: 'groups', link: '/teams' },
  { id: 'budget', label: 'Budget', icon: 'payments', link: '/budget' },
]

function buildChatReply(txt, S) {
  const q = txt.toLowerCase()
  if (/\btbd\b|resolve|vendor|assign/.test(q))
    return `To resolve TBD meals, go to Workflows → select the workflow → click "Resolve" next to any TBD execution. Enter the vendor name and choose Delivery or Pickup.`
  if (/budget|cost|price|spend|margin|money|financ/.test(q))
    return `Budget tracking: set a per-meal budget in the Intake or New Schedule form. Once submitted, you can edit individual execution costs in the Workflows detail panel. The Budget page aggregates totals automatically.`
  if (/nash|deliver|dispatch|pickup/.test(q))
    return `Nash dispatch is triggered when a workflow reaches "dispatch_approved" status. Go to Workflows → take the workflow through Feasibility → Billing → Dispatch approval steps.`
  if (/schedule|new|add|create/.test(q))
    return `To add meals: use New Schedule for a step-by-step wizard, or Quick Intake to paste an itinerary email and have it parsed automatically.`
  if (/intake|parse|email|itinerar/.test(q))
    return `Paste your itinerary email into Quick Intake and click Parse. Review the generated draft rows, adjust any location types or notes, then Submit to Workflows.`
  if (/team|roster|headcount|player/.test(q))
    return `Team defaults (headcount, dietary preferences) are managed on the Teams page. These pre-fill when you create a new schedule for that team.`
  if (/dietary|vegetarian|gluten|nut.free|allerg/.test(q))
    return `Dietary counts are set per workflow during intake (veg %, gluten-free, nut-free toggles). They're stored per execution and visible in the Workflows detail panel.`
  if (/stripe|invoice|bill|payment/.test(q))
    return `Stripe invoicing is on the roadmap. Once unit prices and costs are confirmed in the billing prep step, invoice generation will be wired to Stripe automatically.`
  if (/status|workflow|approv/.test(q))
    return `Workflow lifecycle: Submitted → Feasibility Approved → Billing Prepped → Dispatch Approved. Each step has a corresponding Admin Queue action.`
  if (/help|what can|how do|how to/.test(q))
    return `I can help you with: resolving TBD meals, navigating the workflow lifecycle, understanding budget fields, or walking through the intake flow. What do you need?`
  const team = S.schTeam || 'the team'
  const fallbacks = [
    `Got it. If you're working on the ${team} schedule, check the Workflows page for any TBD meals or pending admin actions.`,
    `Noted. Use Quick Intake to parse a new itinerary, or New Schedule for a manual step-by-step entry.`,
    `Understood. Is there a specific workflow or execution you'd like to look at? The Workflows page has the full detail view.`,
  ]
  return fallbacks[txt.length % fallbacks.length]
}

function AppContent() {
  const navigate = useNavigate()
  const location = useLocation()
  
  // App State
  const [S, setS] = useState(() => {
    const saved = localStorage.getItem('mo_state_v2')
    if (saved) {
      try { return JSON.parse(saved) } catch(e) { console.error(e) }
    }
    return {
      calDay: 10,
      showChat: false,
      chatMsgs: [{ role: 'ai', text: 'Hi Jane! How can I help you with the meal planning today?' }],
      
      // New Schedule Form State
      schStep: 1,
      schName: '',
      schTeam: "Varsity Baseball (Men's)",
      schoolName: 'University of Virginia',
      conference: 'ACC',
      sport: 'Baseball',
      division: 'DI',
      schHeadcount: 45,
      schBudget: 65,
      tripType: 'overnight',
      homeAwayNeutral: 'away',
      opponent: '',
      venueName: '',
      city: '',
      state: '',
      gameDate: '',
      gameTime: '',
      schDays: [],
      mealRowsByDay: {},
      
      // Dietary / Prefs
      vegPct: 15,
      glutenFreePct: 0,
      nutFreePct: 0,
      dietaryNotes: '',
    }
  })

  const [serverHealthy, setServerHealthy] = useState(true)
  const [serverMeta, setServerMeta] = useState({ workflows: 0, openQueue: 0, openTbd: 0 })
  const [toast, setToast] = useState(null) // { text, type: 'success'|'error' }

  const showToast = (text, type = 'success') => {
    setToast({ text, type })
    // Errors stay until dismissed — success/info messages auto-dismiss after 3s
    if (type !== 'error') {
      setTimeout(() => setToast(null), 3000)
    }
  }

  useEffect(() => {
    const toSave = { ...S, chatMsgs: S.chatMsgs.slice(-50) }
    localStorage.setItem('mo_state_v2', JSON.stringify(toSave))
  }, [S])

  const refreshMeta = useCallback(async () => {
    try {
      // Only poll the queue endpoint — Workflows page owns its own full data fetch.
      // This halves background API traffic vs. polling both /workflows and /admin/queue.
      const queue = await apiFetch('/admin/queue')
      const openQueue = (queue.items || []).filter(q => q.status === 'open')
      const openTbd = openQueue.filter(q => q.type === 'resolve_tbd').length
      setServerMeta(prev => ({
        ...prev,
        openQueue: openQueue.length,
        openTbd
      }))
      setServerHealthy(true)
    } catch (e) {
      setServerHealthy(false)
    }
  }, [])

  useEffect(() => {
    refreshMeta()
    const timer = setInterval(refreshMeta, 30000)  // 30s — was 10s polling /workflows + /admin/queue
    return () => clearInterval(timer)
  }, [refreshMeta])

  // Helpers
  const upd = (k, v) => setS(p => ({ ...p, [k]: v }))
  const go = (pageId) => {
    const item = NAV_ITEMS.find(n => n.id === pageId)
    if (item) navigate(item.link)
  }
  const toggleChat = () => upd('showChat', !S.showChat)
  const sendChat = () => {
    const el = document.getElementById('chatInput')
    if (!el || !el.value.trim()) return
    const txt = el.value.trim()
    el.value = ''
    const msgs = [...S.chatMsgs, { role: 'user', text: txt }]
    upd('chatMsgs', msgs)
    setTimeout(() => {
      const reply = buildChatReply(txt, S)
      upd('chatMsgs', [...msgs, { role: 'ai', text: reply }])
      const box = document.getElementById('chatMsgs')
      if (box) box.scrollTop = box.scrollHeight
    }, 800)
  }

  // Schedule Form Actions
  const schNext = (step) => upd('schStep', step)
  const toggleDay = (day) => {
    const next = S.schDays.includes(day) ? S.schDays.filter(d => d !== day) : [...S.schDays, day]
    upd('schDays', next)
    if (!S.mealRowsByDay[day]) {
      setS(p => ({
        ...p,
        schDays: next,
        mealRowsByDay: { ...p.mealRowsByDay, [day]: [{ type: '', time: '', loc: 'hotel', notes: '', budget: '' }] }
      }))
    }
  }
  const addRow = (day) => {
    const rows = [...(S.mealRowsByDay[day] || []), { type: '', time: '', loc: 'hotel', notes: '', budget: '' }]
    setS(p => ({ ...p, mealRowsByDay: { ...p.mealRowsByDay, [day]: rows } }))
  }
  const delRow = (day, idx) => {
    const rows = (S.mealRowsByDay[day] || []).filter((_, i) => i !== idx)
    setS(p => ({ ...p, mealRowsByDay: { ...p.mealRowsByDay, [day]: rows } }))
  }
  const updRow = (day, idx, k, v) => {
    const rows = (S.mealRowsByDay[day] || []).map((r, i) => i === idx ? { ...r, [k]: v } : r)
    setS(p => ({ ...p, mealRowsByDay: { ...p.mealRowsByDay, [day]: rows } }))
  }
  const togglePref = (k) => upd(k, !S[k])
  const updVeg = (v) => upd('vegPct', v)
  const updGfPct = (v) => upd('glutenFreePct', v)
  const updNfPct = (v) => upd('nutFreePct', v)

  const resetFormState = () => {
    setS((prev) => ({
      ...prev,
      schStep: 1,
      schName: '',
      schDays: [],
      mealRowsByDay: {},
      tripType: 'overnight',
      homeAwayNeutral: 'away',
      opponent: '',
      venueName: '',
      city: '',
      state: '',
      gameDate: '',
      gameTime: '',
      vegPct: 15,
      glutenFreePct: 0,
      nutFreePct: 0,
      dietaryNotes: '',
    }))
  }

  const handleSubmitSchedule = async (draft) => {
    try {
      const result = await apiFetch('/workflows/from-draft', { method: 'POST', body: draft })
      showToast('Workflow created successfully!')
      resetFormState()
      refreshMeta()
      // Navigate to workflows page and highlight the new workflow via URL param
      navigate(`/workflows?new=${result.workflow_id}`)
    } catch (e) {
      showToast(e.message || 'Submit failed.', 'error')
    }
  }

  // Determine current page ID for sidebar highlighting
  const currentPageId = NAV_ITEMS.find(n => n.link === location.pathname)?.id || 'dashboard'
  const currentTitle = NAV_ITEMS.find(n => n.id === currentPageId)?.label || 'Dashboard'

  return (
    <div className="app-container" style={{ display: 'flex', background: '#F8FAFC', minHeight: '100vh' }}>
      <Sidebar navItems={NAV_ITEMS} page={currentPageId} go={go} tbdCount={serverMeta.openTbd} />
      
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <TopBar 
          title={currentTitle} 
          crumbs={[{ label: 'Meal Outpost', link: 'dashboard' }, { label: currentTitle }]} 
          go={go} 
          toggleChat={toggleChat} 
          demoMeta={serverMeta}
          serverHealthy={serverHealthy}
        />
        
        <Routes>
          <Route path="/" element={<PageDashboard go={go} toggleChat={toggleChat} serverMeta={serverMeta} showToast={showToast} />} />
          <Route path="/schedules" element={<PageSchedules S={S} go={go} onDaySelect={(d) => upd('calDay', d)} onSubmitSchedule={handleSubmitSchedule} showToast={showToast} />} />
          <Route path="/intake" element={<PageIntake defaultTeam={S.schTeam} defaultHeadcount={S.schHeadcount} onSubmitSchedule={handleSubmitSchedule} />} />
          <Route path="/workflows" element={<PageWorkflows go={go} showToast={showToast} />} />
          <Route path="/new-schedule" element={
            <PageNewSchedule
              S={S} upd={upd} schNext={schNext} toggleDay={toggleDay}
              addRow={addRow} delRow={delRow} updRow={updRow}
              togglePref={togglePref} updVeg={updVeg} updGfPct={updGfPct} updNfPct={updNfPct}
              onSubmitSchedule={handleSubmitSchedule}
            />
          } />
          <Route path="/teams" element={<PageTeams showToast={showToast} />} />
          <Route path="/budget" element={<PageBudget go={go} showToast={showToast} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {S.showChat && <ChatPanel chatMsgs={S.chatMsgs} toggleChat={toggleChat} sendChat={sendChat} />}
      {!S.showChat && <FloatBtn toggleChat={toggleChat} />}

      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: 80,
          right: 24,
          padding: '12px 20px',
          background: toast.type === 'error' ? '#EF4444' : '#0F62FE',
          color: 'white',
          borderRadius: 12,
          boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          fontWeight: 700,
          fontSize: 14,
          animation: 'slideIn 0.3s ease forwards'
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
            {toast.type === 'error' ? 'error' : 'check_circle'}
          </span>
          {toast.text}
          <button
            onClick={() => setToast(null)}
            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.8)', cursor: 'pointer', padding: '0 0 0 8px', fontSize: 18, lineHeight: 1, display: 'flex', alignItems: 'center' }}
            aria-label="Dismiss"
          >×</button>
        </div>
      )}
    </div>
  )
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  )
}

export default App
