import { useTheme } from '../context/ThemeContext'

export default function AppearancePanel({open,onClose}){
  const {mode,setMode,accent,setAccent,palettes}=useTheme()
  if(!open)return null
  return <div className="theme-backdrop" onClick={onClose}>
    <aside className="theme-panel" onClick={e=>e.stopPropagation()}>
      <div className="row between"><div><span className="eyebrow">Appearance</span><h3>Make LivePoll yours</h3></div><button className="btn small" onClick={onClose}>Close</button></div>
      <p className="muted small">Your preference is saved on this device.</p>
      <label className="field-label">Theme</label>
      <div className="theme-modes">{['dark','light','system'].map(x=><button className={`theme-choice ${mode===x?'selected':''}`} onClick={()=>setMode(x)} key={x}>{x==='dark'?'☾ Dark':x==='light'?'☀ Light':'◐ System'}</button>)}</div>
      <label className="field-label">Accent</label>
      <div className="accent-grid">{Object.keys(palettes).map(x=><button key={x} aria-label={x} className={`accent-dot ${accent===x?'selected':''}`} style={{'--swatch':palettes[x].accent}} onClick={()=>setAccent(x)} />)}</div>
    </aside>
  </div>
}
