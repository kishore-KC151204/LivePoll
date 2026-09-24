import {useEffect,useState} from 'react'
import {Link,useNavigate,useParams} from 'react-router-dom'
import {api} from '../services/api'

export default function EditPoll(){
 const {id}=useParams(),navigate=useNavigate()
 const [question,setQuestion]=useState(''),[options,setOptions]=useState([]),[status,setStatus]=useState(''),[error,setError]=useState(''),[saving,setSaving]=useState(false)
 useEffect(()=>{api.getPoll(id).then(p=>{setQuestion(p.question);setOptions(p.options.map(o=>o.text));setStatus(p.status)}).catch(e=>setError(e.message))},[id])
 function update(i,v){setOptions(a=>a.map((x,j)=>j===i?v:x))}
 function add(){if(options.length<10)setOptions([...options,''])}
 function remove(i){if(options.length>2)setOptions(options.filter((_,j)=>j!==i))}
 async function save(e){e.preventDefault();setError('');setSaving(true);try{await api.updatePoll(id,{question,options});navigate(`/results/${id}`)}catch(e){setError(e.message)}finally{setSaving(false)}}
 return <div className="page"><div className="shell" style={{maxWidth:820}}>
  <div className="dashboard-head"><div><span className="eyebrow">Poll editor</span><h2>Refine your live question.</h2><p className="muted">Question and choices are version-safe. Once voting begins, answer choices are locked.</p></div><Link className="btn" to="/dashboard">← Dashboard</Link></div>
  {error&&<div className="error">{error}</div>}
  {status!=='ACTIVE'&&<div className="result-highlight">This poll is closed and can no longer be edited.</div>}
  <form className="card xwide form" onSubmit={save}>
   <label className="field-label">Question</label><textarea className="input" disabled={status!=='ACTIVE'} required minLength={3} maxLength={300} value={question} onChange={e=>setQuestion(e.target.value)}/>
   <div className="row between"><label className="field-label">Answer choices</label><span className="muted tiny">{options.length}/10</span></div>
   {options.map((o,i)=><div className="row" key={i}><input className="input" disabled={status!=='ACTIVE'} value={o} onChange={e=>update(i,e.target.value)}/>{options.length>2&&<button type="button" className="btn small" disabled={status!=='ACTIVE'} onClick={()=>remove(i)}>Remove</button>}</div>)}
   <button type="button" className="btn" disabled={status!=='ACTIVE'||options.length>=10} onClick={add}>＋ Add choice</button>
   <div className="divider"/><div className="row between"><Link className="btn" to={`/results/${id}`}>Cancel</Link><button className="btn primary" disabled={saving||status!=='ACTIVE'}>{saving?'Saving…':'Save changes →'}</button></div>
  </form>
 </div></div>
}