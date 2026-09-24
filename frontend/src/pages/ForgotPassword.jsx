import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../services/api'

export default function ForgotPassword() {
  const [email,setEmail]=useState('')
  const [message,setMessage]=useState('')
  const [error,setError]=useState('')
  const [loading,setLoading]=useState(false)

  async function submit(e){
    e.preventDefault(); setError(''); setMessage(''); setLoading(true)
    try { const data=await api.forgotPassword(email); setMessage(data.message) }
    catch(e){ setError(e.message) }
    finally{ setLoading(false) }
  }

  return <div className="page center">
    <form className="card form" onSubmit={submit}>
      <span className="eyebrow">Account recovery</span>
      <h2>Forgot your password?</h2>
      <p className="helper">Enter the email used for LivePoll. If an account exists, we'll send a secure reset link.</p>
      {error && <div className="error">{error}</div>}
      {message && <div className="success-box">{message}</div>}
      <label className="field-label">Email</label>
      <input className="input" type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" />
      <button className="btn primary" disabled={loading}>{loading ? 'Sending…' : 'Send reset link'}</button>
      <p className="muted small"><Link to="/login">Back to login</Link></p>
    </form>
  </div>
}
