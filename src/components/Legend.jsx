export default function Legend({ className = 'legend' }) {
  const processes = [
    { color: '#d53e4f', label: 'Process 1', description: 'Raw Material Extraction' },
    { color: '#fc8d59', label: 'Process 2', description: 'Alloy & Powder Production' },
    { color: '#fee08b', label: 'Process 3', description: 'Magnet Manufacturing' },
    { color: '#e6f598', label: 'Process 4', description: 'Magnetic Assembly & System Integration' },
    { color: '#99d594', label: 'Process 5', description: 'End-Use Applications' },
    { color: '#3288bd', label: 'Process 6', description: 'Recycling & Circular Recovery' }
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