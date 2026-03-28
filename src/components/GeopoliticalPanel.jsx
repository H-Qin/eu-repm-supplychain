import { GEO_CONDITIONS, GEO_CONFIGURATIONS } from '../data/geopoliticalData'

const FORECAST_YEARS = [2025, 2026, 2027, 2028, 2029, 2030]

const OUTCOME_LABELS = {
  size_growth:          'size growth',
  decentralise:         'decentralisation',
  robustness_improve:   'robustness improvement',
  loose_connection:     'loose connectivity',
  reachability_improve: 'reachability improvement',
  recycling_grow:       'recycling sector growth',
}

export default function GeopoliticalPanel({
  scenarioConfig,
  onConfigChange,
  scenarioMagnitude,
  onMagnitudeChange,
}) {
  function clearAll() {
    FORECAST_YEARS.forEach(y => onConfigChange(y, null))
  }

  // Unique configs that are actively selected for at least one year
  const activeConfigIds = [...new Set(
    FORECAST_YEARS.map(y => scenarioConfig[y]).filter(Boolean)
  )]
  const activeConfigs = activeConfigIds.map(id => GEO_CONFIGURATIONS.find(c => c.id === id))

  const pct = Math.round(scenarioMagnitude * 100)

  return (
    <div className="geo-panel">
      <div className="geo-panel__header">
        <h2>Geopolitical Scenarios</h2>
        {activeConfigIds.length > 0 && (
          <button className="geo-panel__clear" onClick={clearAll}>Clear all</button>
        )}
      </div>

      {/* Per-year selectors */}
      <div className="geo-panel__years">
        {FORECAST_YEARS.map(year => (
          <div className="geo-year-row" key={year}>
            <span className="geo-year-label">{year}</span>
            <select
              value={scenarioConfig[year] ?? ''}
              onChange={e => onConfigChange(year, e.target.value || null)}
            >
              <option value="">— None —</option>
              {GEO_CONFIGURATIONS.map(c => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </div>
        ))}
      </div>

      {/* Scenario strength slider */}
      <div className="geo-panel__magnitude">
        <label>Scenario strength: {pct}%</label>
        <input
          type="range"
          min="1"
          max="20"
          value={pct}
          onChange={e => onMagnitudeChange(Number(e.target.value) / 100)}
        />
      </div>

      {/* Active configuration summary cards */}
      {activeConfigs.map(config => (
        <div className="geo-config-card" key={config.id}>
          <p className="geo-config-card__title">{config.label}</p>
          <div className="geo-config-card__conditions">
            {GEO_CONDITIONS.map(cond => (
              <span
                key={cond.key}
                className={`geo-cond-pill ${config.conditions[cond.key] ? 'geo-cond-pill--on' : 'geo-cond-pill--off'}`}
              >
                {config.conditions[cond.key] ? '✓' : '✗'} {cond.label}
              </span>
            ))}
          </div>
          <p className="geo-config-card__outcomes">
            → {config.outcomes.map(k => OUTCOME_LABELS[k]).join(', ')}
          </p>
        </div>
      ))}

      <p className="geo-panel__note">
        Based on fsQCA analysis. Scenario strength adjusts forecast values by ±{pct}% per affected indicator.
      </p>
    </div>
  )
}
