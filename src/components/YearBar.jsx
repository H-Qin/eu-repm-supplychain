export default function YearBar({ year, setYear, years }) {
  const min = years[0]
  const max = years[years.length - 1]

  function nearestYear(value) {
    return years.reduce((prev, curr) =>
      Math.abs(curr - value) < Math.abs(prev - value) ? curr : prev
    )
  }

  // Show label for every 2 years, plus first and last
  const shouldShowLabel = (y) => {
    return y === min || y === max || (y - min) % 2 === 0
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
          onChange={(e) => setYear(Number(e.target.value))}
        />
        <div className="ticks-grid" style={{ gridTemplateColumns: `repeat(${years.length}, 1fr)` }}>
          {years.map((y) => (
            <span key={y} className={`tick ${y === year ? 'active' : ''}`}>
              {shouldShowLabel(y) ? y : ''}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}