/**
 * Damped Holt's Exponential Smoothing forecast with 95% prediction intervals.
 *
 * Model: ETS(A,Ad,N) — additive error, additive damped trend, no seasonality.
 *
 * State equations (error-correction form):
 *   ŷ_{t|t-1} = L_{t-1} + φ·T_{t-1}
 *   e_t        = y_t − ŷ_{t|t-1}
 *   L_t        = L_{t-1} + φ·T_{t-1} + α·e_t
 *   T_t        = φ·T_{t-1} + αβ·e_t
 *
 * h-step forecast from final state (L, T):
 *   ŷ_{T+h} = L + Φ_h·T,   where Φ_h = φ(1−φʰ)/(1−φ)
 *
 * 95% prediction interval (analytical ETS state-space formula):
 *   ŷ_{T+h} ± t_{0.025,df} · σ̂ · √(1 + Σ_{j=1}^{h−1} ψ_j²)
 *   ψ_j = α(1 + β·Φ_j),   Φ_j = φ(1−φʲ)/(1−φ)
 *   σ̂² = RSS / df,   df = (n−1) − 3  (n−1 one-step errors minus 3 fitted params)
 *
 * Parameters (α, β, φ) are fitted by grid search minimising the sum of squared
 * one-step-ahead in-sample errors (SSE). φ is restricted to [0.80, 0.98] which
 * enforces damping (φ < 1) while retaining meaningful trend persistence.
 *
 * Reference: Hyndman et al. "Forecasting with Exponential Smoothing" (2008),
 *            Ch. 6 (ETS(A,Ad,N) state-space model).
 *
 * @param {Array}  historicalData  Array of objects {year, ...metrics}
 * @param {string} indicatorKey   Key of the metric to forecast
 * @returns {Array} chartData     27-element array (2004–2030) with keys:
 *                                  year, value, forecast, lowerBase, bandWidth
 */

const T95_DF17 = 2.110  // t_{0.025, 17}: df = (n−1) − 3 = 20 − 3 = 17

export function dampedHoltForecast(historicalData, indicatorKey) {
  const ys = historicalData.map(d => d[indicatorKey])
  const n  = ys.length  // 21

  // ── Step 1: fit (α, β, φ) by grid-search on one-step-ahead SSE ──────────
  // Initialise: L₀ = y₀, T₀ = y₁ − y₀ (level = first obs, trend = first diff)
  function computeSSE(alpha, beta, phi) {
    let L = ys[0]
    let T = ys[1] - ys[0]
    let ss = 0
    for (let i = 1; i < n; i++) {
      const e = ys[i] - (L + phi * T)
      ss += e * e
      const L2 = L + phi * T + alpha * e
      const T2 = phi * T + alpha * beta * e
      L = L2; T = T2
    }
    return ss
  }

  let bestSSE = Infinity
  let alpha = 0.3, beta = 0.1, phi = 0.9

  // Coarse grid: ~1 900 combinations; trivially fast for 21-point series
  for (let a = 0.05; a <= 0.95; a += 0.05) {
    for (let b = 0.01; b <= 0.50; b += 0.05) {
      for (let p = 0.80; p <= 0.98; p += 0.02) {
        const s = computeSSE(a, b, p)
        if (s < bestSSE) { bestSSE = s; alpha = a; beta = b; phi = p }
      }
    }
  }

  // ── Step 2: re-run with best params; record final state & residuals ──────
  let L = ys[0]
  let T = ys[1] - ys[0]
  const residuals = []
  for (let i = 1; i < n; i++) {
    const yhat = L + phi * T
    const e    = ys[i] - yhat
    residuals.push(e)
    const L2 = L + phi * T + alpha * e
    const T2 = phi * T + alpha * beta * e
    L = L2; T = T2
  }
  // (L, T) now hold the smoothed state after absorbing all 21 observations

  const df    = residuals.length - 3   // 20 − 3 = 17
  const sigma = Math.sqrt(residuals.reduce((s, e) => s + e * e, 0) / df)

  // ── Step 3: analytical PI helpers ────────────────────────────────────────
  // Damped cumulative sum:  Φ_h = φ(1−φʰ)/(1−φ)
  const dampedSum = h => phi * (1 - Math.pow(phi, h)) / (1 - phi)

  // ETS ψ-weight at lag j (≥1):  ψ_j = α(1 + β·Φ_j)
  const psi = j => alpha * (1 + beta * dampedSum(j))

  // PI half-width for horizon h
  function margin(h) {
    let sumPsi2 = 1   // ψ_0 = 1 by convention
    for (let j = 1; j < h; j++) sumPsi2 += psi(j) ** 2
    return T95_DF17 * sigma * Math.sqrt(sumPsi2)
  }

  // ── Step 4: build chart array 2004–2030 ──────────────────────────────────
  const chartData = historicalData.map(d => {
    if (d.year === 2024) {
      // Bridge point: show the actual value; anchor forecast line here; open CI band
      const m = margin(1)
      return {
        year:      d.year,
        value:     d[indicatorKey],
        forecast:  d[indicatorKey],   // forecast line starts at last known value
        lowerBase: d[indicatorKey] - m,
        bandWidth: 2 * m,
      }
    }
    return { year: d.year, value: d[indicatorKey], forecast: null, lowerBase: null, bandWidth: null }
  })

  for (let h = 1; h <= 6; h++) {
    const fc = L + dampedSum(h) * T
    const m  = margin(h)
    chartData.push({
      year:      2024 + h,
      value:     null,
      forecast:  fc,
      lowerBase: fc - m,
      bandWidth: 2 * m,
    })
  }

  return chartData
}
