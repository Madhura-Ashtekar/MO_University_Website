import React from 'react'

export function FloatBtn({ toggleChat }) {
  return (
    <button onClick={toggleChat} style={{ position: 'fixed', bottom: 24, right: 24, width: 52, height: 52, background: '#0F62FE', border: 'none', borderRadius: '50%', boxShadow: '0 8px 24px rgba(15,98,254,0.35)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99 }}>
      <span className="material-symbols-outlined" style={{ fontSize: 22, color: 'white' }}>chat_bubble</span>
    </button>
  )
}
