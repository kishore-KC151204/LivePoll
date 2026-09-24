import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(form.email, form.password)
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
        <h2>Log in</h2>
        {error && <div className="error">{error}</div>}
        <input placeholder="Email" type="email" required
          value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <div className="row between">
          <label className="field-label">Password</label>
          <Link className="muted small" to="/forgot-password">Forgot password?</Link>
        </div>
        <input placeholder="Password" type="password" required
          value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        <button className="btn primary" disabled={loading} type="submit">
          {loading ? 'Logging in...' : 'Log in'}
        </button>
        <p className="muted">No account? <Link to="/signup">Sign up</Link></p>
      </form>
    </div>
  )
}
