import React from 'react'

export function FloatBtn({ toggleChat }) {
  return (
    <button 
      onClick={toggleChat} 
      className="glow-ai"
      style={{ 
        position: 'fixed', bottom: 24, right: 24,
        background: 'linear-gradient(135deg, #0F62FE 0%, #6D28D9 100%)', 
        border: 'none', borderRadius: '50%', 
        boxShadow: '0 8px 24px rgba(15,98,254,0.35)', 
        cursor: 'pointer', display: 'flex', alignItems: 'center', 
        justifyContent: 'center', zIndex: 99
      }}
    >
      <span className="material-symbols-outlined" style={{ fontSize: 24, color: 'white' }}>auto_awesome</span>
      <span className="hover-text">Chat with AI</span>
    </button>
  )
}
