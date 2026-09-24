import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Landing() {
  const { user } = useAuth()
  return (
    <div className="page center">
      <h1>LivePoll</h1>
      <p className="subtitle">Create a poll, share the link, watch results update live — no refresh, ever.</p>
      <div className="actions">
        {user ? (
          <Link className="btn primary" to="/dashboard">Go to dashboard</Link>
        ) : (
          <>
            <Link className="btn primary" to="/signup">Get started</Link>
            <Link className="btn" to="/login">Log in</Link>
          </>
        )}
      </div>
    </div>
  )
}
