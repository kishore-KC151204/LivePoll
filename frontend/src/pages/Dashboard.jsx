import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../services/api'
import { useAuth } from '../context/AuthContext'

export default function Dashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [polls, setPolls] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user) { navigate('/login'); return }
    api.listMyPolls()
      .then(setPolls)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [user, navigate])

  function copyLink(id) {
    navigator.clipboard.writeText(`${window.location.origin}/poll/${id}`)
  }

  return (
    <div className="page">
      <div className="row between">
        <h2>Your polls</h2>
        <div>
          <Link className="btn primary" to="/create">+ New poll</Link>
          <button className="btn" onClick={() => { logout(); navigate('/') }}>Log out</button>
        </div>
      </div>

      {loading && <p>Loading...</p>}
      {error && <div className="error">{error}</div>}

      {!loading && polls.length === 0 && (
        <p className="muted">No polls yet. Create your first one.</p>
      )}

      <div className="grid">
        {polls.map((poll) => (
          <div className="card" key={poll.id}>
            <h3>{poll.question}</h3>
            <span className={`badge ${poll.status === 'ACTIVE' ? 'active' : 'closed'}`}>{poll.status}</span>
            <p className="muted small">Created {new Date(poll.createdAt).toLocaleString()}</p>
            <div className="actions">
              <Link className="btn" to={`/results/${poll.id}`}>View results</Link>
              <button className="btn" onClick={() => copyLink(poll.id)}>Copy voter link</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
