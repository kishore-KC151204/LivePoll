import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Signup(){
  const {signup}=useAuth(),navigate=useNavigate()
  const [form,setForm]=useState({name:'',email:'',password:''}),[error,setError]=useState(''),[loading,setLoading]=useState(false)
  async function submit(e){
    e.preventDefault();setError('')
    if(form.password.length<8){setError('Use at least 8 characters for your password.');return}
    setLoading(true)
    try{await signup(form.name,form.email,form.password);navigate('/dashboard')}
    catch(e){setError(e.message)}finally{setLoading(false)}
  }
  return <div className="page center">
    <form className="card form" onSubmit={submit}>
      <span className="eyebrow">Creator account</span>
      <h2>Build your first live room.</h2>
      <p className="helper">Use an email inbox you control so password recovery can reach you later.</p>
      {error&&<div className="error">{error}</div>}
      <label className="field-label">Name</label>
      <input className="input" required minLength={2} value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Your name"/>
      <label className="field-label">Email</label>
      <input className="input" type="email" required value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="you@example.com"/>
      <label className="field-label">Password</label>
      <input className="input" type="password" required minLength={8} value={form.password} onChange={e=>setForm({...form,password:e.target.value})} placeholder="At least 8 characters"/>
      <button className="btn primary" disabled={loading}>{loading?'Creating workspace…':'Create free account →'}</button>
      <p className="muted small">Already registered? <Link to="/login">Sign in</Link></p>
    </form>
  </div>
}
