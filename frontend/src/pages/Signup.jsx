import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Signup() {
  const { signup } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signup(form.name, form.email, form.password)
      navigate('/dashboard')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page center">
      <form className="card form" onSubmit={handleSubmit}>
        <h2>Create account</h2>
        {error && <div className="error">{error}</div>}
        <input placeholder="Name" required minLength={2}
          value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input placeholder="Email" type="email" required
          value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input placeholder="Password (min 8 characters)" type="password" required minLength={8}
          value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        <button className="btn primary" disabled={loading} type="submit">
          {loading ? 'Creating...' : 'Sign up'}
        </button>
        <p className="muted">Already have an account? <Link to="/login">Log in</Link></p>
      </form>
    </div>
  )
}
