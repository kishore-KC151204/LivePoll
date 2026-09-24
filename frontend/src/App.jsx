import { Routes, Route } from 'react-router-dom'
import Landing from './pages/Landing'
import Signup from './pages/Signup'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import CreatePoll from './pages/CreatePoll'
import PollVote from './pages/PollVote'
import PollResults from './pages/PollResults'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/login" element={<Login />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/create" element={<CreatePoll />} />
      <Route path="/poll/:id" element={<PollVote />} />
      <Route path="/results/:id" element={<PollResults />} />
    </Routes>
  )
}
