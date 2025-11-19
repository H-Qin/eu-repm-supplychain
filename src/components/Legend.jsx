export default function Legend({ className = 'legend' }) {
  const processes = [
    { color: '#80b1d3', label: 'Process 1', description: 'Raw Material Extraction' },
    { color: '#fb8072', label: 'Process 2', description: 'Alloy & Powder Production' },
    { color: '#bc80bd', label: 'Process 3', description: 'Magnet Manufacturing' },
    { color: '#fdb462', label: 'Process 4', description: 'Magnetic Assembly & System Integration' },
    { color: '#8dd3c7', label: 'Process 5', description: 'End-Use Applications' },
    { color: '#b3de69', label: 'Process 6', description: 'Recycling & Circular Recovery' }
  ]

  return (
    <div className={className}>
      <div style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '13px' }}>Supply Chain Processes</div>
      {processes.map((process) => (
        <div key={process.label} className="legend-row">
          <span
            className="dot"
            style={{ background: process.color }}
          />
          <span>
            <strong>{process.label}:</strong> {process.description}
          </span>
        </div>
      ))}
    </div>
  )
}