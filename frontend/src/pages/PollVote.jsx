import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '../services/api'
import { connectPollSocket } from '../services/ws'
import ResultsBars from '../components/ResultsBars'

// Anonymous audience voting needs a stable per-browser id so the backend
// can enforce "one vote per person" without requiring an account. This is
// a documented tradeoff, not a strong identity guarantee (see README).
function getVoterId() {
  let id = localStorage.getItem('livepoll_voter_id')
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem('livepoll_voter_id', id)
  }
  return id
}

export default function PollVote() {
  const { id } = useParams()
  const [poll, setPoll] = useState(null)
  const [results, setResults] = useState(null)
  const [selected, setSelected] = useState(null)
  const [voted, setVoted] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [connected, setConnected] = useState(false)

  const votedKey = `livepoll_voted_${id}`

  useEffect(() => {
    Promise.all([api.getPoll(id), api.getResults(id)])
      .then(([pollData, resultsData]) => {
        setPoll(pollData)
        setResults(resultsData)
        if (localStorage.getItem(votedKey)) setVoted(true)
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [id, votedKey])

  useEffect(() => {
    const disconnect = connectPollSocket(id, {
      onOpen: () => setConnected(true),
      onClose: () => setConnected(false),
      onMessage: (event) => {
        if (event.type === 'results' || event.type === 'closed') {
          setResults(event)
          if (event.type === 'closed') setPoll((p) => (p ? { ...p, status: 'CLOSED' } : p))
        }
      },
    })
    return disconnect
  }, [id])

  const submitVote = useCallback(async () => {
    if (!selected) return
    setError('')
    try {
      const res = await api.vote(id, { optionId: selected, voterId: getVoterId() })
      setResults(res.results)
      setVoted(true)
      localStorage.setItem(votedKey, '1')
    } catch (e) {
      setError(e.message)
    }
  }, [id, selected, votedKey])

  if (loading) return <div className="page center"><p>Loading poll...</p></div>
  if (error && !poll) return <div className="page center"><div className="error">{error}</div></div>

  const closed = poll.status === 'CLOSED'

  return (
    <div className="page center">
      <div className="card wide">
        <span className={`badge ${connected ? 'active' : 'closed'}`}>{connected ? 'Live' : 'Connecting...'}</span>
        <h2>{poll.question}</h2>
        {error && <div className="error">{error}</div>}

        {closed && <p className="muted">This poll is closed. Here are the final results.</p>}

        {!voted && !closed ? (
          <>
            <div className="options">
              {poll.options.map((opt) => (
                <label className={`option ${selected === opt.id ? 'selected' : ''}`} key={opt.id}>
                  <input type="radio" name="option" checked={selected === opt.id}
                    onChange={() => setSelected(opt.id)} />
                  {opt.text}
                </label>
              ))}
            </div>
            <button className="btn primary" disabled={!selected} onClick={submitVote}>Submit vote</button>
          </>
        ) : (
          results && <ResultsBars options={results.options} total={results.total} />
        )}
      </div>
    </div>
  )
}
