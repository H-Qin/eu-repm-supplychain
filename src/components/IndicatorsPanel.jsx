import { useState, useMemo } from 'react'
import {
  ComposedChart, Line, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceDot,
} from 'recharts'
import { INDICATORS, INDICATOR_META, DIMENSIONS } from '../data/indicatorsData'
import { dampedHoltForecast } from '../utils/forecast'

function formatValue(value, format) {
  if (value == null) return '—'
  if (format === 'integer') return Math.round(value).toLocaleString()
  if (format === 'scientific') return Number(value).toExponential(2)
  return Number(value).toFixed(3)
}

function tickFormatter(format) {
  return (v) => formatValue(v, format)
}

const CustomTooltip = ({ active, payload, label, format }) => {
  if (!active || !payload || !payload.length) return null

  const byKey = {}
  payload.forEach(p => { byKey[p.dataKey] = p.value })

  const hasActual   = byKey.value    != null
  const hasForecast = byKey.forecast != null && byKey.lowerBase != null

  if (hasActual && !hasForecast) {
    return (
      <div className="ind-tooltip">
        <p className="ind-tooltip__year">{label}</p>
        <p className="ind-tooltip__value">{formatValue(byKey.value, format)}</p>
      </div>
    )
  }

  if (hasActual && hasForecast) {
    return (
      <div className="ind-tooltip">
        <p className="ind-tooltip__year">{label}</p>
        <p className="ind-tooltip__value">{formatValue(byKey.value, format)}</p>
      </div>
    )
  }

  if (!hasActual && hasForecast) {
    const lower = byKey.lowerBase
    const upper = lower != null && byKey.bandWidth != null ? lower + byKey.bandWidth : null
    return (
      <div className="ind-tooltip ind-tooltip--forecast">
        <p className="ind-tooltip__year">
          {label} <span className="ind-tooltip__fc-badge">forecast</span>
        </p>
        <p className="ind-tooltip__value">{formatValue(byKey.forecast, format)}</p>
        {upper != null && (
          <p className="ind-tooltip__ci">
            95% PI: {formatValue(lower, format)} – {formatValue(upper, format)}
          </p>
        )}
      </div>
    )
  }

  return null
}

export default function IndicatorsPanel({ year }) {
  const [selectedDim, setSelectedDim]           = useState(DIMENSIONS[0].key)
  const [selectedIndicator, setSelectedIndicator] = useState(DIMENSIONS[0].indicators[0])

  const currentDim    = DIMENSIONS.find(d => d.key === selectedDim)
  const dimIndicators = INDICATOR_META.filter(m => currentDim.indicators.includes(m.key))
  const currentMeta   = INDICATOR_META.find(m => m.key === selectedIndicator)

  const chartData = useMemo(
    () => dampedHoltForecast(INDICATORS, selectedIndicator),
    [selectedIndicator]
  )

  function handleDimClick(dim) {
    setSelectedDim(dim.key)
    setSelectedIndicator(dim.indicators[0])
  }

  const yDomain = useMemo(() => {
    const vals = []
    for (const d of chartData) {
      if (d.value != null) vals.push(d.value)
      if (d.forecast != null) vals.push(d.forecast)
      if (d.lowerBase != null && d.bandWidth != null) {
        vals.push(d.lowerBase)
        vals.push(d.lowerBase + d.bandWidth)
      }
    }
    if (vals.length === 0) return ['auto', 'auto']
    const min = Math.min(...vals)
    const max = Math.max(...vals)
    const pad = (max - min) * 0.08 || Math.abs(max) * 0.05 || 1
    return [min - pad, max + pad]
  }, [chartData])

  const yearDotPoint = useMemo(() => {
    const d = chartData.find(p => p.year === year)
    if (!d) return null
    const y = d.value ?? d.forecast
    if (y == null) return null
    return { x: year, y }
  }, [chartData, year])

  return (
    <div className="indicators-panel">
      <div className="indicators-panel__header">
        <h2>Network Indicators</h2>
      </div>

      {/* Level 1: dimension buttons */}
      <div className="indicators-panel__dims">
        {DIMENSIONS.map(dim => (
          <button
            key={dim.key}
            className={`ind-dim-tag${selectedDim === dim.key ? ' ind-dim-tag--active' : ''}`}
            aria-pressed={selectedDim === dim.key}
            onClick={() => handleDimClick(dim)}
          >
            {dim.label}
          </button>
        ))}
      </div>

      {/* Level 2: indicator pills for the selected dimension */}
      <div className="indicators-panel__tags">
        {dimIndicators.map(ind => (
          <button
            key={ind.key}
            className={`ind-tag${selectedIndicator === ind.key ? ' ind-tag--active' : ''}`}
            aria-pressed={selectedIndicator === ind.key}
            onClick={() => setSelectedIndicator(ind.key)}
          >
            {ind.label}
          </button>
        ))}
      </div>

      {/* Chart */}
      <div className="indicators-panel__chart">
        <p className="ind-chart-title">{currentMeta.description}</p>

        <div className="indicators-panel__plot">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 8, right: 15, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="year"
                tick={{ fontSize: 12, fill: '#6b7280' }}
                tickLine={false}
                axisLine={{ stroke: '#e5e7eb' }}
                ticks={[2004, 2010, 2016, 2022, 2030]}
              />
              <YAxis
                tick={{ fontSize: 12, fill: '#6b7280' }}
                tickLine={false}
                axisLine={false}
                width={70}
                tickFormatter={tickFormatter(currentMeta.format)}
                domain={yDomain}
                allowDataOverflow
              />
              <Tooltip
                content={<CustomTooltip format={currentMeta.format} />}
                cursor={{ stroke: '#9ca3af', strokeWidth: 1, strokeDasharray: '3 3' }}
              />

              {/*
                95% Prediction Interval band using stacked Areas:
                - Area 1 (lowerBase, transparent): invisible fill from 0 → lower bound
                - Area 2 (bandWidth, orange):      visible fill from lower bound → upper bound
              */}
              <Area
                type="monotone"
                dataKey="lowerBase"
                stackId="ci"
                stroke="none"
                fill="transparent"
                isAnimationActive={false}
                allowDataOverflow
              />
              <Area
                type="monotone"
                dataKey="bandWidth"
                stackId="ci"
                stroke="none"
                fill="#f97316"
                fillOpacity={0.18}
                isAnimationActive={false}
                allowDataOverflow
              />

              {/* Historical line (solid blue, 2004–2024) */}
              <Line
                type="monotone"
                dataKey="value"
                stroke="#3288bd"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: '#3288bd', strokeWidth: 0 }}
                isAnimationActive={false}
              />

              {/* Base forecast line (dashed orange, 2024–2030) */}
              <Line
                type="monotone"
                dataKey="forecast"
                stroke="#f97316"
                strokeWidth={2}
                strokeDasharray="5 4"
                dot={false}
                activeDot={{ r: 4, fill: '#f97316', strokeWidth: 0 }}
                isAnimationActive={false}
              />

              {yearDotPoint && (
                <ReferenceDot
                  x={yearDotPoint.x}
                  y={yearDotPoint.y}
                  r={5}
                  fill="#1e4f72"
                  stroke="#fff"
                  strokeWidth={2}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Chart legend */}
        <div className="ind-chart-legend">
          <span className="ind-legend-item">
            <span className="ind-legend-line ind-legend-line--hist" />
            Historical
          </span>
          <span className="ind-legend-item">
            <span className="ind-legend-line ind-legend-line--forecast" />
            Damped Holt's forecast
          </span>
          <span className="ind-legend-item">
            <span className="ind-legend-band" />
            95% PI
          </span>
        </div>

        <p className="ind-method-note">
          Damped Holt's ETS(A,Ad,N); α, β, φ fitted by minimising SSE
        </p>
      </div>
    </div>
  )
}
