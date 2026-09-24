export default function ResultsBars({ options, total }) {
  return (
    <div className="results">
      {options.map((opt) => {
        const pct = total > 0 ? Math.round((opt.voteCount / total) * 100) : 0
        return (
          <div className="result-row" key={opt.id}>
            <div className="result-label">
              <span>{opt.text}</span>
              <span>{opt.voteCount} · {pct}%</span>
            </div>
            <div className="bar-track">
              <div className="bar-fill" style={{ width: `${pct}%` }} />
            </div>
          </div>
        )
      })}
      <p className="muted small">{total} total vote{total === 1 ? '' : 's'}</p>
    </div>
  )
}
