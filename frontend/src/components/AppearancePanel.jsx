import { useEffect } from 'react'
import { useTheme } from '../context/ThemeContext'

const names={violet:'Violet',ocean:'Ocean',emerald:'Emerald',sunset:'Sunset'}

export default function AppearancePanel({open,onClose}){
  const {mode,setMode,accent,setAccent,palettes}=useTheme()

  useEffect(()=>{
    if(!open)return
    const onKey=e=>{if(e.key==='Escape')onClose()}
    window.addEventListener('keydown',onKey)
    return()=>window.removeEventListener('keydown',onKey)
  },[open,onClose])

  if(!open)return null

  return <div className="theme-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}} role="presentation">
    <aside className="theme-panel" role="dialog" aria-modal="true" aria-labelledby="appearance-title">
      <div className="row between">
        <div>
          <span className="eyebrow">Appearance</span>
          <h3 id="appearance-title">Make LivePoll yours</h3>
        </div>
        <button className="btn small" onClick={onClose} aria-label="Close appearance settings">Close</button>
      </div>

      <p className="muted small">Choose a surface and accent. Your preference is saved on this device.</p>

      <label className="field-label">Theme</label>
      <div className="theme-modes">
        {['dark','light','system'].map(x=>
          <button
            className={`theme-choice ${mode===x?'selected':''}`}
            onClick={()=>setMode(x)}
            key={x}
            aria-pressed={mode===x}
          >
            {x==='dark'?'☾ Dark':x==='light'?'☀ Light':'◐ System'}
          </button>
        )}
      </div>

      <label className="field-label">Accent</label>
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
      <div className="accent-name">Active accent: <strong>{names[accent]}</strong></div>
    </aside>
  </div>
}
