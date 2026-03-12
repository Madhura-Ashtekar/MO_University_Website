import React from 'react'

export function ChatPanel({ chatMsgs, toggleChat, sendChat }) {
  return (
    <div style={{ position: 'fixed', right: 24, bottom: 88, width: 340, background: 'white', borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.15)', border: '1px solid #E2E8F0', zIndex: 100, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ padding: '14px 16px', background: 'linear-gradient(135deg,#0F62FE,#0043CE)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'white' }}>auto_awesome</span>
          <span style={{ color: 'white', fontWeight: 700, fontSize: 14 }}>Plan with AI</span>
          <span style={{ background: 'rgba(255,255,255,0.2)', color: 'white', fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 8 }}>BETA</span>
        </div>
        <button onClick={toggleChat} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 8, padding: 5, cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'white' }}>close</span>
        </button>
      </div>

      <div id="chatMsgs" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 280, overflowY: 'auto' }}>
        {chatMsgs.map((m, idx) => {
          const u = m.role === 'user'
          return (
            <div key={idx} style={{ display: 'flex', gap: 8, flexDirection: u ? 'row-reverse' : 'row' }}>
              {!u ? (
                <div style={{ width: 26, height: 26, background: '#0F62FE', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 13, color: 'white' }}>smart_toy</span>
                </div>
              ) : null}
              <div className={u ? 'chat-user' : 'chat-ai'}>{m.text}</div>
            </div>
          )
        })}
      </div>

      <div style={{ padding: 12, borderTop: '1px solid #E2E8F0' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', background: '#F4F6F9', borderRadius: 10, padding: '8px 12px' }}>
          <input id="chatInput" type="text" placeholder="Ask AI assistant..." style={{ flex: 1, border: 'none', background: 'transparent', fontSize: 13, outline: 'none', fontFamily: "'DM Sans',sans-serif" }} onKeyDown={(e) => e.key === 'Enter' && sendChat()} />
          <button onClick={sendChat} style={{ background: '#0F62FE', border: 'none', borderRadius: 8, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 14, color: 'white' }}>send</span>
          </button>
        </div>
      </div>
    </div>
  )
}
