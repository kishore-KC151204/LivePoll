import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../services/api'

export default function CreatePoll() {
  const navigate = useNavigate()
  const [question, setQuestion] = useState('')
  const [options, setOptions] = useState(['', ''])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function updateOption(i, value) {
    const next = [...options]
    next[i] = value
    setOptions(next)
  }

  function addOption() {
    if (options.length >= 10) return
    setOptions([...options, ''])
  }

  function removeOption(i) {
    if (options.length <= 2) return
    setOptions(options.filter((_, idx) => idx !== i))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const poll = await api.createPoll({ question, options: options.filter((o) => o.trim() !== '') })
      navigate(`/results/${poll.id}`)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page center">
      <form className="card form" onSubmit={handleSubmit}>
        <h2>Create a poll</h2>
        {error && <div className="error">{error}</div>}
        <input placeholder="Ask a question" required minLength={3}
          value={question} onChange={(e) => setQuestion(e.target.value)} />

        {options.map((opt, i) => (
          <div className="row" key={i}>
            <input placeholder={`Option ${i + 1}`} required
              value={opt} onChange={(e) => updateOption(i, e.target.value)} />
            {options.length > 2 && (
              <button type="button" className="btn small" onClick={() => removeOption(i)}>✕</button>
            )}
          </div>
        ))}

        {options.length < 10 && (
          <button type="button" className="btn" onClick={addOption}>+ Add option</button>
        )}

        <button className="btn primary" disabled={loading} type="submit">
          {loading ? 'Creating...' : 'Create poll'}
        </button>
      </form>
    </div>
  )
}
