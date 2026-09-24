import { Link } from 'react-router-dom'

const items=[
  {icon:'⚡',title:'True realtime',text:'Watch votes move instantly through Redis + WebSockets.',to:'/dashboard',action:'Open live analytics'},
  {icon:'⌁',title:'One-scan access',text:'Turn any room into a QR-powered audience experience.',to:'/dashboard',action:'View your rooms'},
  {icon:'◈',title:'Creator analytics',text:'Track totals, percentages and response distribution.',to:'/dashboard',action:'Open analytics'},
]

export default function FeatureHub(){
  return <div className="feature-grid">
    {items.map(item=><article className="feature feature-action" key={item.title}>
      <div className="feature-icon">{item.icon}</div>
      <h3>{item.title}</h3>
      <p>{item.text}</p>
      <Link className="feature-link" to={item.to}>{item.action} <span>→</span></Link>
    </article>)}
  </div>
}
