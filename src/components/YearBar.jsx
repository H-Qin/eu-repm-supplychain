export default function YearBar({ year, setYear, years }) {
  const min = years[0]
  const max = years[years.length - 1]

  function nearestYear(value) {
    return years.reduce((prev, curr) =>
      Math.abs(curr - value) < Math.abs(prev - value) ? curr : prev
    )
  }

  return (
    <div className="yearbar">
      <span className="year">{year}</span>
      <div className="range-wrap">
        <input
          type="range"
          min={min}
          max={max}
          step={1}
          value={year}
          onChange={(e) => setYear(nearestYear(Number(e.target.value)))}
        />
        <div className="ticks-grid" style={{ gridTemplateColumns: `repeat(${years.length}, 1fr)` }}>
          {years.map((y) => (
            <span key={y} className={`tick ${y === year ? 'active' : ''}`}>{y}</span>
          ))}
        </div>
      </div>
    </div>
  )
}