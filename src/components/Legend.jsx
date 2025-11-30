export default function Legend({ className = 'legend', selectedProcesses = [], onToggleProcess, }) {
  const processes = [
    { id: 1, color: '#d53e4f', label: 'Process 1', description: 'Raw Material Extraction' },
    { id: 2, color: '#fc8d59', label: 'Process 2', description: 'Alloy & Powder Production' },
    { id: 3, color: '#fee08b', label: 'Process 3', description: 'Magnet Manufacturing' },
    { id: 4, color: '#e6f598', label: 'Process 4', description: 'Magnetic Assembly & System Integration' },
    { id: 5, color: '#99d594', label: 'Process 5', description: 'End-Use Applications' },
    { id: 6, color: '#3288bd', label: 'Process 6', description: 'Recycling & Circular Recovery' }
  ]

  return (
    <div className={className}>
      <div style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '13px' }}>Supply Chain Processes</div>
      {processes.map((process) => {
        const active = selectedProcesses.includes(process.id)
        return (
          <div
            key={process.label}
            className={`legend-row legend-row-clickable ${
              active ? 'legend-row-active' : ''
            }`}
            onClick={() => onToggleProcess && onToggleProcess(process.id)}
          >
            <span
              className="dot"
              style={{ background: process.color }}
            />
            <span>
              <strong>{process.label}:</strong> {process.description}
            </span>
          </div>
        )
      })}
    </div>
  )
}