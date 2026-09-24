import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../services/api'
import { useAuth } from '../context/AuthContext'

export default function Dashboard(){
  const {user}=useAuth(),navigate=useNavigate()
  const [polls,setPolls]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[copied,setCopied]=useState('')
  useEffect(()=>{
    if(!user){navigate('/login');return}
    api.listMyPolls().then(setPolls).catch(e=>setError(e.message)).finally(()=>setLoading(false))
  },[user,navigate])

  const active=useMemo(()=>polls.filter(p=>p.status==='ACTIVE').length,[polls])
  const totalVotes=useMemo(()=>polls.reduce((sum,p)=>sum+p.options.reduce((s,o)=>s+(o.voteCount||0),0),0),[polls])

  async function copyLink(id){
    const url=`${window.location.origin}/poll/${id}`
    await navigator.clipboard.writeText(url);setCopied(id);setTimeout(()=>setCopied(''),1600)
  }
  async function share(id){
    const url=`${window.location.origin}/poll/${id}`
    if(navigator.share) await navigator.share({title:'LivePoll',text:'Vote on this live poll',url})
    else copyLink(id)
  }

  return <div className="page">
    <div className="shell">
      <div className="dashboard-head">
        <div>
          <span className="eyebrow">Creator workspace</span>
          <h2>Welcome back, {user?.name?.split(' ')[0] || 'creator'}.</h2>
          <p className="muted">Launch a room, share the QR, and watch your audience respond in real time.</p>
        </div>
        <Link className="btn primary" to="/create">＋ Create live poll</Link>
      </div>

      {error&&<div className="error">{error}</div>}
      <div className="stat-grid">
        <div className="stat"><span>Total polls</span><strong>{polls.length}</strong></div>
        <div className="stat"><span>Live now</span><strong>{active}</strong></div>
        <div className="stat"><span>Total votes</span><strong>{totalVotes}</strong></div>
      </div>

      {loading?<p className="muted">Loading workspace…</p>:polls.length===0?
        <div className="empty"><h3>Your first live room is one click away.</h3><p className="muted">Create a poll and get a shareable link + QR code instantly.</p><Link className="btn primary" to="/create">Create first poll</Link></div>
      :<div className="grid">
        {polls.map(poll=>{
          const votes=poll.options.reduce((s,o)=>s+(o.voteCount||0),0)
          return <article className="card" key={poll.id}>
            <div className="row between">
              <span className={`badge ${poll.status==='ACTIVE'?'active':'closed'}`}>{poll.status}</span>
              <span className="muted tiny">{votes} vote{votes===1?'':'s'}</span>
            </div>
            <h3>{poll.question}</h3>
            <p className="muted small">{poll.options.length} choices · {new Date(poll.createdAt).toLocaleDateString()}</p>
            <div className="actions" style={{justifyContent:'flex-start'}}>
              <Link className="btn small primary" to={`/results/${poll.id}`}>Analytics</Link>
              <Link className="btn small" to={`/poll/${poll.id}`}>Open</Link>
              <button className="btn small" onClick={()=>copyLink(poll.id)}>{copied===poll.id?'Copied ✓':'Copy link'}</button>
              <button className="btn small" onClick={()=>share(poll.id)}>Share</button>
            </div>
          </article>
        })}
      </div>}
    </div>
  </div>
}
