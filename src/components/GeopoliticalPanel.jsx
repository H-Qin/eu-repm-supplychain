import { useState } from 'react'
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

export default function GeopoliticalPanel({ scenarioConfig, onConfigChange }) {
  const [selectedYear, setSelectedYear] = useState(null)
  const [selectedEventType, setSelectedEventType] = useState(null)

  // The single active entry (only one year can be configured at a time)
  const activeYear = FORECAST_YEARS.find(y => scenarioConfig[y]) ?? null
  const activeConfig = activeYear ? GEO_CONFIGURATIONS.find(c => c.id === scenarioConfig[activeYear]) : null

  function clearActive() {
    if (activeYear) onConfigChange(activeYear, null)
    setSelectedYear(null)
    setSelectedEventType(null)
  }

  function handleYearSelect(year) {
    setSelectedYear(year)
    setSelectedEventType(null)
  }

  function handleEventTypeSelect(condKey) {
    setSelectedEventType(condKey)
  }

  function handleConfigSelect(configId) {
    // Clear any previously active year before setting the new one
    if (activeYear && activeYear !== selectedYear) onConfigChange(activeYear, null)
    onConfigChange(selectedYear, configId)
    setSelectedYear(null)
    setSelectedEventType(null)
  }

  // Configurations that match the selected primary event type
  const filteredConfigs = selectedEventType
    ? GEO_CONFIGURATIONS.filter(c => c.conditions[selectedEventType])
    : []

  return (
    <div className="geo-panel">
      <div className="geo-panel__header">
        <h2>Geopolitical Scenarios</h2>
        {activeConfig && (
          <button className="geo-panel__clear" onClick={clearActive}>Clear</button>
        )}
      </div>

      {/* Step 1: Year selection */}
      <div className="geo-step">
        <p className="geo-step__label">1. Select year</p>
        <div className="geo-year-pills">
          {FORECAST_YEARS.map(year => (
            <button
              key={year}
              className={[
                'geo-year-pill',
                selectedYear === year ? 'geo-year-pill--active' : '',
                activeYear === year ? 'geo-year-pill--has-config' : '',
              ].join(' ')}
              onClick={() => handleYearSelect(year)}
            >
              {year}
            </button>
          ))}
        </div>
      </div>

      {/* Step 2: Primary event type */}
      {selectedYear && (
        <div className="geo-step">
          <p className="geo-step__label">2. Select geopolitical event — {selectedYear}</p>
          <div className="geo-event-pills">
            {GEO_CONDITIONS.map(cond => (
              <button
                key={cond.key}
                className={`geo-event-pill ${selectedEventType === cond.key ? 'geo-event-pill--active' : ''}`}
                onClick={() => handleEventTypeSelect(cond.key)}
              >
                {cond.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 3: Configuration choice (filtered by event type) */}
      {selectedYear && selectedEventType && (
        <div className="geo-step">
          <p className="geo-step__label">3. Select configuration</p>
          <div className="geo-config-options">
            {filteredConfigs.map(config => (
              <button
                key={config.id}
                className={`geo-config-option ${scenarioConfig[selectedYear] === config.id ? 'geo-config-option--active' : ''}`}
                onClick={() => handleConfigSelect(config.id)}
              >
                <span className="geo-config-option__name">{config.label}</span>
                <span className="geo-config-option__outcomes">
                  → {config.outcomes.map(k => OUTCOME_LABELS[k]).join(', ')}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Active configuration card */}
      {activeYear && activeConfig && (
        <div className="geo-config-card">
          <div className="geo-config-card__header">
            <span className="geo-config-card__year">{activeYear}</span>
            <span className="geo-config-card__title">{activeConfig.label}</span>
          </div>
          <div className="geo-config-card__conditions">
            {GEO_CONDITIONS.map(cond => (
              <span
                key={cond.key}
                className={`geo-cond-pill ${activeConfig.conditions[cond.key] ? 'geo-cond-pill--on' : 'geo-cond-pill--off'}`}
              >
                {activeConfig.conditions[cond.key] ? '✓' : '✗'} {cond.label}
              </span>
            ))}
          </div>
          <p className="geo-config-card__outcomes">
            → {activeConfig.outcomes.map(k => OUTCOME_LABELS[k]).join(', ')}
          </p>
        </div>
      )}

      <p className="geo-panel__note">
        Based on fsQCA analysis. Scenario strength fixed at 5% per affected indicator.
      </p>
    </div>
  )
}
