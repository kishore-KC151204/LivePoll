import { Link, useLocation } from 'react-router-dom'
import { Routes, Route } from 'react-router-dom'
import Landing from './pages/Landing'
import Signup from './pages/Signup'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import CreatePoll from './pages/CreatePoll'
import PollVote from './pages/PollVote'
import PollResults from './pages/PollResults'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import { useAuth } from './context/AuthContext'

function Nav() {
  const { user, logout } = useAuth()
  const location = useLocation()
  if (location.pathname.startsWith('/poll/')) return null

  return (
    <header className="nav">
      <div className="nav-inner">
        <Link className="brand" to="/">
          <span className="brand-mark">✦</span>
          LivePoll
        </Link>
        <div className="nav-actions">
          {user ? (
            <>
              <Link className="btn small hide-mobile" to="/dashboard">Dashboard</Link>
              <Link className="btn small primary" to="/create">Create poll</Link>
              <button className="btn small" onClick={logout}>Log out</button>
            </>
          ) : (
            <>
              <Link className="btn small hide-mobile" to="/login">Log in</Link>
              <Link className="btn small primary" to="/signup">Get started</Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}

export default function App() {
  return (
    <>
      <Nav />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/create" element={<CreatePoll />} />
        <Route path="/poll/:id" element={<PollVote />} />
        <Route path="/results/:id" element={<PollResults />} />
      </Routes>
    </>
  )
}
