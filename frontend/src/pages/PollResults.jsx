import { useEffect, useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { QRCodeCanvas } from 'qrcode.react'
import { api } from '../services/api'
import { connectPollSocket } from '../services/ws'
import ResultsBars from '../components/ResultsBars'

export default function PollResults() {
  const { id } = useParams()
  const [poll,setPoll]=useState(null)
  const [results,setResults]=useState(null)
  const [error,setError]=useState('')
  const [connected,setConnected]=useState(false)
  const [closing,setClosing]=useState(false)
  const [copied,setCopied]=useState(false)
  const shareUrl=useMemo(()=>`${window.location.origin}/poll/${id}`,[id])

  useEffect(()=>{
    Promise.all([api.getPoll(id),api.getResults(id)])
      .then(([p,r])=>{setPoll(p);setResults(r)})
      .catch(e=>setError(e.message))
  },[id])

  useEffect(()=>{
    const disconnect=connectPollSocket(id,{
      onOpen:()=>setConnected(true),
      onClose:()=>setConnected(false),
      onMessage:event=>{
        if(event.type==='results'||event.type==='closed'){
          setResults(event)
          if(event.type==='closed')setPoll(p=>p?{...p,status:'CLOSED'}:p)
        }
      }
    })
    return disconnect
  },[id])

  async function copyLink(){
    await navigator.clipboard.writeText(shareUrl)
    setCopied(true); setTimeout(()=>setCopied(false),1800)
  }
  async function share(){
    if(navigator.share) await navigator.share({title:poll.question,text:'Vote on my LivePoll',url:shareUrl})
    else await copyLink()
  }
  async function downloadQR(){
    const canvas=document.getElementById('poll-qr')
    if(!canvas)return
    const a=document.createElement('a');a.download='livepoll-qr.png';a.href=canvas.toDataURL('image/png');a.click()
  }
  async function handleClose(){
    setClosing(true)
    try{await api.closePoll(id);setPoll(p=>({...p,status:'CLOSED'}))}
    catch(e){setError(e.message)}
    finally{setClosing(false)}
  }

  if(error&&!poll)return <div className="page center"><div className="card"><div className="error">{error}</div><Link className="btn" to="/dashboard">Back to dashboard</Link></div></div>
  if(!poll)return <div className="page center"><p className="muted">Loading live analytics…</p></div>

  return <div className="page">
    <div className="shell">
      <div className="dashboard-head">
        <div>
          <span className={`badge ${connected?'active':'closed'}`}><span className="live-dot"/> {connected?'LIVE · REALTIME':'CONNECTING'}</span>
          <h2>{poll.question}</h2>
          <p className="muted">Share the voter link and watch every response arrive instantly.</p>
        </div>
        <Link className="btn" to="/dashboard">← Dashboard</Link>
      </div>

      {error&&<div className="error">{error}</div>}

      <div className="card xwide">
        <div className="share-box">
          <input readOnly value={shareUrl} onFocus={e=>e.target.select()} />
          <button className="btn" onClick={copyLink}>{copied?'Copied ✓':'Copy link'}</button>
          <button className="btn primary" onClick={share}>Share</button>
        </div>

        <div className="qr-card">
          <QRCodeCanvas id="poll-qr" value={shareUrl} size={150} marginSize={4} />
          <div className="stack">
            <span className="eyebrow">Scan to vote</span>
            <h3>Put this QR on a screen, slide or poster.</h3>
            <p className="helper">Anyone can scan the code and vote without creating an account.</p>
            <button className="btn small" onClick={downloadQR}>Download QR</button>
          </div>
        </div>

        <div className="divider"/>
        {results && <ResultsBars options={results.options} total={results.total} />}

        <div className="actions" style={{justifyContent:'flex-start'}}>
          <Link className="btn primary" to={`/poll/${id}`}>Open voter view ↗</Link>
          {poll.status==='ACTIVE'
            ? <button className="btn danger" disabled={closing} onClick={handleClose}>{closing?'Closing…':'Close poll'}</button>
            : <span className="badge closed">Poll closed</span>}
        </div>
      </div>
    </div>
  </div>
}
