import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import FeatureHub from '../components/FeatureHub'

export default function Landing(){
  const {user}=useAuth()
  return <main className="hero">
    <span className="hero-orb one"/><span className="hero-orb two"/>
    <div className="hero-content">
      <span className="eyebrow">Realtime audience platform</span>
      <h1><span className="gradient-text">Ask. Share. Watch.</span><br/>Live, together.</h1>
      <p className="subtitle" style={{margin:'24px auto 0'}}>LivePoll turns a simple question into an interactive room with instant votes, live analytics, share links and QR-powered audience access.</p>
      <div className="actions">
        <Link className="btn primary" to={user?'/dashboard':'/signup'}>{user?'Open creator studio':'Create your first poll →'}</Link>
        {!user&&<Link className="btn" to="/login">I already have an account</Link>}
      </div>
      <FeatureHub />
    </div>
  </main>
}
