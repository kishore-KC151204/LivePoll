import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '../services/api'
import { connectPollSocket } from '../services/ws'
import ResultsBars from '../components/ResultsBars'

function getVoterId(){
  let id=localStorage.getItem('livepoll_voter_id')
  if(!id){id=crypto.randomUUID();localStorage.setItem('livepoll_voter_id',id)}
  return id
}

export default function PollVote(){
  const {id}=useParams()
  const [poll,setPoll]=useState(null),[results,setResults]=useState(null),[selected,setSelected]=useState(null)
  const [voted,setVoted]=useState(false),[error,setError]=useState(''),[loading,setLoading]=useState(true),[connected,setConnected]=useState(false),[voting,setVoting]=useState(false)
  const votedKey=`livepoll_voted_${id}`

  useEffect(()=>{
    Promise.all([api.getPoll(id),api.getResults(id)])
      .then(([p,r])=>{setPoll(p);setResults(r);if(localStorage.getItem(votedKey))setVoted(true)})
      .catch(e=>setError(e.message)).finally(()=>setLoading(false))
  },[id,votedKey])

  useEffect(()=>{
    const disconnect=connectPollSocket(id,{
      onOpen:()=>setConnected(true),onClose:()=>setConnected(false),
      onMessage:event=>{
        if(event.type==='results'||event.type==='closed'){
          setResults(event)
          if(event.type==='closed')setPoll(p=>p?{...p,status:'CLOSED'}:p)
        }
      }
    })
    return disconnect
  },[id])

  const submitVote=useCallback(async()=>{
    if(!selected||voting)return
    setError('');setVoting(true)
    try{
      const res=await api.vote(id,{optionId:selected,voterId:getVoterId()})
      setResults(res.results);setVoted(true);localStorage.setItem(votedKey,'1')
    }catch(e){setError(e.message)}
    finally{setVoting(false)}
  },[id,selected,votedKey,voting])

  if(loading)return <div className="page center"><p className="muted">Loading your live poll…</p></div>
  if(!poll)return <div className="page center"><div className="card"><div className="error">{error||'Poll not found'}</div></div></div>

  const closed=poll.status==='CLOSED'
  return <div className="page center">
    <div className="card wide">
      <div className="poll-header">
        <div>
          <span className={`badge ${connected?'active':'closed'}`}><span className="live-dot"/>{connected?'LIVE NOW':'CONNECTING'}</span>
          <p className="eyebrow" style={{marginTop:12}}>LivePoll audience</p>
          <h2>{poll.question}</h2>
        </div>
      </div>

      {error&&<div className="error">{error}</div>}
      {closed&&<div className="result-highlight"><strong>Voting is closed.</strong><div className="helper">These are the final results.</div></div>}

      {!voted&&!closed ? <>
        <p className="muted">Choose one answer. Your vote is protected from duplicate submissions on this device.</p>
        <div className="options">
          {poll.options.map(opt=><label className={`option ${selected===opt.id?'selected':''}`} key={opt.id}>
            <input type="radio" name="option" checked={selected===opt.id} onChange={()=>setSelected(opt.id)}/>
            <span>{opt.text}</span>
          </label>)}
        </div>
        <button className="btn primary" disabled={!selected||voting} onClick={submitVote}>{voting?'Publishing your vote…':'Cast my vote →'}</button>
      </> : results&&<ResultsBars options={results.options} total={results.total} />}

      {voted&&!closed&&<div className="success-box" style={{marginTop:16}}>Vote received. Keep this screen open to watch the live results change.</div>}
    </div>
  </div>
}
