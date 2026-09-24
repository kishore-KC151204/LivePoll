import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '../services/api'
import { connectPollSocket } from '../services/ws'
import ResultsBars from '../components/ResultsBars'

export default function PollResults() {
  const { id } = useParams()
  const [poll, setPoll] = useState(null)
  const [results, setResults] = useState(null)
  const [error, setError] = useState('')
  const [connected, setConnected] = useState(false)
  const [closing, setClosing] = useState(false)

  const shareUrl = `${window.location.origin}/poll/${id}`

  useEffect(() => {
    Promise.all([api.getPoll(id), api.getResults(id)])
      .then(([pollData, resultsData]) => { setPoll(pollData); setResults(resultsData) })
      .catch((e) => setError(e.message))
  }, [id])

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

  async function handleClose() {
    setClosing(true)
    try {
      await api.closePoll(id)
      setPoll((p) => ({ ...p, status: 'CLOSED' }))
    } catch (e) {
      setError(e.message)
    } finally {
      setClosing(false)
    }
  }

  if (error && !poll) return <div className="page center"><div className="error">{error}</div></div>
  if (!poll) return <div className="page center"><p>Loading...</p></div>

  return (
    <div className="page center">
      <div className="card wide">
        <span className={`badge ${connected ? 'active' : 'closed'}`}>{connected ? 'Live' : 'Connecting...'}</span>
        <h2>{poll.question}</h2>
        <div className="share-row">
          <input readOnly value={shareUrl} onFocus={(e) => e.target.select()} />
          <button className="btn" onClick={() => navigator.clipboard.writeText(shareUrl)}>Copy link</button>
        </div>

        {results && <ResultsBars options={results.options} total={results.total} />}

        {poll.status === 'ACTIVE' ? (
          <button className="btn" disabled={closing} onClick={handleClose}>
            {closing ? 'Closing...' : 'Close poll'}
          </button>
        ) : (
          <p className="muted">This poll is closed. No further votes are accepted.</p>
        )}
        {error && <div className="error">{error}</div>}
      </div>
    </div>
  )
}
