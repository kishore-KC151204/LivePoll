import { createPortal } from 'react-dom'
import { useEffect, useRef } from 'react'
import { useTheme } from '../context/ThemeContext'

const names={violet:'Violet',ocean:'Ocean',emerald:'Emerald',sunset:'Sunset'}

export default function AppearancePanel({open,onClose}){
  const {mode,setMode,accent,setAccent,palettes}=useTheme()
  const closeRef=useRef(null)

  useEffect(()=>{
    if(!open)return
    const previousOverflow=document.body.style.overflow
    document.body.style.overflow='hidden'
    const onKey=e=>{if(e.key==='Escape'){e.preventDefault();onClose()}}
    window.addEventListener('keydown',onKey)
    requestAnimationFrame(()=>closeRef.current?.focus())
    return()=>{
      document.body.style.overflow=previousOverflow
      window.removeEventListener('keydown',onKey)
    }
  },[open,onClose])

  if(!open)return null

  const panel=<div
    className="theme-backdrop"
    onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}
    role="presentation"
  >
    <aside className="theme-panel" role="dialog" aria-modal="true" aria-labelledby="appearance-title">
      <button ref={closeRef} className="theme-close" onClick={onClose} aria-label="Close appearance settings">×</button>

      <div className="theme-heading">
        <div>
          <span className="eyebrow">Appearance</span>
          <h3 id="appearance-title">Make LivePoll yours</h3>
          <p className="muted small">Personalize the workspace. Changes save automatically.</p>
        </div>
      </div>

      <section className="theme-section">
        <div className="theme-section-title">
          <div><strong>Theme</strong><span>Choose your surface</span></div>
        </div>
        <div className="theme-modes">
          {['dark','light','system'].map(x=>
            <button
              className={`theme-choice ${mode===x?'selected':''}`}
              onClick={()=>setMode(x)}
              key={x}
              aria-pressed={mode===x}
            >
              <span className="theme-choice-icon">{x==='dark'?'☾':x==='light'?'☀':'◐'}</span>
              <span>{x[0].toUpperCase()+x.slice(1)}</span>
            </button>
          )}
        </div>
      </section>

      <section className="theme-section">
        <div className="theme-section-title">
          <div><strong>Accent</strong><span>Bring your brand to life</span></div>
          <span className="accent-pill" style={{'--pill-color':palettes[accent].accent}}>{names[accent]}</span>
        </div>
        <div className="accent-grid">
          {Object.keys(palettes).map(x=>
            <button
              key={x}
              aria-label={`${names[x]} accent`}
              title={names[x]}
              className={`accent-dot ${accent===x?'selected':''}`}
              style={{'--swatch':palettes[x].accent}}
              onClick={()=>setAccent(x)}
              aria-pressed={accent===x}
            />
          )}
        </div>
      </section>

      <div className="theme-footer">
        <span className="theme-status"><span className="status-dot"/> Live preference</span>
        <button className="btn primary theme-done" onClick={onClose}>Done</button>
      </div>
    </aside>
  </div>

  return createPortal(panel,document.body)
}
