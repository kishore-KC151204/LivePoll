import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { api } from '../services/api'

const presets=[
  {label:'Team decision',question:'Which option should our team choose?',options:['Option A','Option B','Option C']},
  {label:'Event feedback',question:'How was the event?',options:['Excellent','Good','Okay','Needs improvement']},
  {label:'Icebreaker',question:'What should we do next?',options:['Coffee ☕','Lunch 🍜','Game 🎮','Walk 🚶']},
]

export default function CreatePoll(){
  const navigate=useNavigate()
  const [question,setQuestion]=useState(''),[options,setOptions]=useState(['','']),[error,setError]=useState(''),[loading,setLoading]=useState(false)

  function applyPreset(p){setQuestion(p.question);setOptions(p.options)}
  function updateOption(i,value){setOptions(o=>o.map((x,idx)=>idx===i?value:x))}
  function addOption(){if(options.length<10)setOptions([...options,''])}
  function removeOption(i){if(options.length>2)setOptions(options.filter((_,idx)=>idx!==i))}
  async function submit(e){
    e.preventDefault();setError('')
    const clean=options.map(o=>o.trim()).filter(Boolean)
    if(new Set(clean.map(x=>x.toLowerCase())).size!==clean.length){setError('Options must be unique.');return}
    if(clean.length<2){setError('Add at least two choices.');return}
    setLoading(true)
    try{const poll=await api.createPoll({question,options:clean});navigate(`/results/${poll.id}`)}
    catch(e){setError(e.message)}finally{setLoading(false)}
  }

  return <div className="page">
    <div className="shell" style={{maxWidth:820}}>
      <div style={{marginBottom:20}}>
        <span className="eyebrow">Poll studio</span>
        <h2>Design your live question.</h2>
        <p className="muted">Keep it focused. Your audience can join instantly from a link or QR code.</p>
      </div>
      <form className="card xwide form" onSubmit={submit}>
        <label className="field-label">Start from a template</label>
        <div className="preset-row">{presets.map(p=><button type="button" className="preset" key={p.label} onClick={()=>applyPreset(p)}>{p.label}</button>)}</div>
        {error&&<div className="error">{error}</div>}
        <label className="field-label">Question</label>
        <textarea className="input" required minLength={3} maxLength={300} value={question} onChange={e=>setQuestion(e.target.value)} placeholder="e.g. Which feature should we ship next?" />
        <div className="row between">
          <label className="field-label">Answer choices</label>
          <span className="muted tiny">{options.length}/10</span>
        </div>
        {options.map((opt,i)=><div className="row" key={i}>
          <input className="input" required placeholder={`Choice ${i+1}`} value={opt} onChange={e=>updateOption(i,e.target.value)} />
          {options.length>2&&<button type="button" className="btn small" onClick={()=>removeOption(i)}>Remove</button>}
        </div>)}
        {options.length<10&&<button type="button" className="btn" onClick={addOption}>＋ Add choice</button>}
        <div className="divider"/>
        <div className="row between">
          <Link className="btn" to="/dashboard">Cancel</Link>
          <button className="btn primary" disabled={loading}>{loading?'Creating live room…':'Create & open analytics →'}</button>
        </div>
      </form>
    </div>
  </div>
}
