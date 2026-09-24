import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../services/api'

export default function ResetPassword(){
  const [params]=useSearchParams()
  const token=useMemo(()=>params.get('token')||'',[params])
  const [password,setPassword]=useState('')
  const [confirm,setConfirm]=useState('')
  const [message,setMessage]=useState('')
  const [error,setError]=useState('')
  const [loading,setLoading]=useState(false)

  async function submit(e){
    e.preventDefault(); setError(''); setMessage('')
    if(!token){setError('This reset link is missing its token.');return}
    if(password!==confirm){setError('Passwords do not match.');return}
    setLoading(true)
    try{const data=await api.resetPassword(token,password);setMessage(data.message)}
    catch(e){setError(e.message)}
    finally{setLoading(false)}
  }

  return <div className="page center">
    <form className="card form" onSubmit={submit}>
      <span className="eyebrow">Secure recovery</span>
      <h2>Set a new password</h2>
      {error && <div className="error">{error}</div>}
      {message && <div className="success-box">{message} <Link to="/login">Log in</Link></div>}
      <label className="field-label">New password</label>
      <input className="input" type="password" minLength={8} required value={password} onChange={e=>setPassword(e.target.value)} placeholder="At least 8 characters" />
      <label className="field-label">Confirm password</label>
      <input className="input" type="password" minLength={8} required value={confirm} onChange={e=>setConfirm(e.target.value)} placeholder="Repeat your password" />
      <button className="btn primary" disabled={loading || !!message}>{loading?'Updating…':'Update password'}</button>
    </form>
  </div>
}
