export default function Legend({ className = 'legend' }) {
  return (
    <div className={className}>
      <div className="legend-row"><span className="dot dot-sep" /> Separator</div>
      <div className="legend-row"><span className="dot dot-metal" /> Metal/Alloy maker</div>
      <div className="legend-row"><span className="line" /> Flow</div>
    </div>
  )
}