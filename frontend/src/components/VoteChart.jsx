import { useMemo } from 'react'

export default function VoteChart({options,total}){
  const max=useMemo(()=>Math.max(1,...options.map(o=>o.voteCount||0)),[options])
  return <div className="chart-card">
    <div className="row between chart-head">
      <div><span className="eyebrow">Live distribution</span><h3>Votes by choice</h3></div>
      <strong>{total} total</strong>
    </div>
    <div className="chart-bars">
      {options.map((o,i)=>{
        const count=o.voteCount||0
        const pct=total?Math.round(count/total*100):0
        return <div className="chart-item" key={o.id}>
          <div className="chart-value">{count}</div>
          <div className="chart-column-wrap">
            <div className="chart-column" style={{height:`${Math.max(5,count/max*100)}%`}}>
              <span>{pct}%</span>
            </div>
          </div>
          <div className="chart-name" title={o.text}>{i+1}. {o.text}</div>
        </div>
      })}
    </div>
    <div className="chart-axis"><span>0</span><span>Higher response volume</span></div>
  </div>
}
