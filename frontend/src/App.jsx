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
  { id: 'intake', label: 'Intake', icon: 'auto_awesome', link: '/intake', nb: true },
  { id: 'workflows', label: 'Workflows', icon: 'list_alt', link: '/workflows' },
  { id: 'teams', label: 'Teams', icon: 'groups', link: '/teams' },
  { id: 'budget', label: 'Budget', icon: 'payments', link: '/budget' },
]

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
      glutenFree: true,
      nutFree: false,
      dietaryNotes: '',
    }
  })

  const [serverHealthy, setServerHealthy] = useState(true)
  const [serverMeta, setServerMeta] = useState({ workflows: 0, openQueue: 0, openTbd: 0 })
  const [toast, setToast] = useState(null) // { text, type: 'success'|'error' }

  const showToast = (text, type = 'success') => {
    setToast({ text, type })
    setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => {
    const toSave = { ...S, chatMsgs: S.chatMsgs.slice(-50) }
    localStorage.setItem('mo_state_v2', JSON.stringify(toSave))
  }, [S])

  const refreshMeta = useCallback(async () => {
    try {
      const [workflows, queue] = await Promise.all([
        apiFetch('/workflows'),
        apiFetch('/admin/queue')
      ])
      const openQueue = (queue.items || []).filter(q => q.status === 'open')
      const openTbd = openQueue.filter(q => q.type === 'resolve_tbd').length
      setServerMeta({
        workflows: workflows.length,
        openQueue: openQueue.length,
        openTbd
      })
      setServerHealthy(true)
    } catch (e) {
      setServerHealthy(false)
    }
  }, [])

  useEffect(() => {
    refreshMeta()
    const timer = setInterval(refreshMeta, 10000)
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
      upd('chatMsgs', [...msgs, { role: 'ai', text: `I've noted that. I can help you adjust the ${S.schTeam} schedule or resolve those TBD meals.` }])
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
      glutenFree: true,
      nutFree: false,
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
      <Sidebar navItems={NAV_ITEMS} page={currentPageId} go={go} />
      
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
          <Route path="/schedules" element={<PageSchedules S={S} go={go} onDaySelect={(d) => upd('calDay', d)} />} />
          <Route path="/intake" element={<PageIntake defaultTeam={S.schTeam} defaultHeadcount={S.schHeadcount} onSubmitSchedule={handleSubmitSchedule} />} />
          <Route path="/workflows" element={<PageWorkflows go={go} showToast={showToast} />} />
          <Route path="/new-schedule" element={
            <PageNewSchedule 
              S={S} upd={upd} schNext={schNext} toggleDay={toggleDay} 
              addRow={addRow} delRow={delRow} updRow={updRow} 
              togglePref={togglePref} updVeg={updVeg} 
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
