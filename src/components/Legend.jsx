export default function Legend({ className = 'legend' }) {
  const tiers = [
    { color: '#80b1d3', label: 'Tier 1', description: 'Raw Material Extraction' },
    { color: '#fb8072', label: 'Tier 2', description: 'Alloy & Powder Production' },
    { color: '#bc80bd', label: 'Tier 3', description: 'Magnet Manufacturing' },
    { color: '#fdb462', label: 'Tier 4', description: 'Magnetic Assembly & System Integration' },
    { color: '#8dd3c7', label: 'Tier 5', description: 'End-Use Applications' },
    { color: '#b3de69', label: 'Tier 6', description: 'Recycling & Circular Recovery' }
  ]

  return (
    <div className={className}>
      <div style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '13px' }}>Supply Chain Tiers</div>
      {tiers.map((tier) => (
        <div key={tier.label} className="legend-row">
          <span
            className="dot"
            style={{ background: tier.color }}
          />
          <span>
            <strong>{tier.label}:</strong> {tier.description}
          </span>
        </div>
      ))}
    </div>
  )
}