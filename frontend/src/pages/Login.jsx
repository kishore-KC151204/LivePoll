import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login(){
  const {login}=useAuth(),navigate=useNavigate()
  const [form,setForm]=useState({email:'',password:''}),[error,setError]=useState(''),[loading,setLoading]=useState(false)
  async function submit(e){
    e.preventDefault();setError('');setLoading(true)
    try{await login(form.email,form.password);navigate('/dashboard')}
    catch(e){setError(e.message)}finally{setLoading(false)}
  }
  return <div className="page center">
    <form className="card form" onSubmit={submit}>
      <span className="eyebrow">Creator access</span>
      <h2>Welcome back.</h2>
      <p className="helper">Sign in to create, share and manage your live rooms.</p>
      {error&&<div className="error">{error}</div>}
      <label className="field-label">Email</label>
      <input className="input" type="email" required value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="you@example.com"/>
      <div className="row between">
        <label className="field-label">Password</label>
        <Link className="muted small" to="/forgot-password">Forgot password?</Link>
      </div>
      <input className="input" type="password" required value={form.password} onChange={e=>setForm({...form,password:e.target.value})} placeholder="Your password"/>
      <button className="btn primary" disabled={loading}>{loading?'Signing in…':'Sign in →'}</button>
      <p className="muted small">New to LivePoll? <Link to="/signup">Create an account</Link></p>
    </form>
  </div>
}
