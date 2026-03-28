/**
 * fsQCA-derived geopolitical configurations for the EU NdFeB supply chain.
 *
 * Four geopolitical condition clusters were identified from official documents:
 *   wto      — WTO dispute resolution events
 *   green    — Green transition policy events
 *   china    — China export controls events
 *   security — Strategic security policy events
 *
 * Four configurations (Boolean combinations) were found to drive distinct
 * supply chain outcomes based on fsQCA analysis:
 *   1. WTO + Green (no China, no Security) → size growth, decentralisation, robustness improvement
 *   2. Green + China (no WTO, no Security) → size growth, decentralisation, loose connectivity
 *   3. Green only (no WTO, no China, no Security) → decentralisation, reachability improvement
 *   4. Security only (no WTO, no Green, no China) → decentralisation, recycling sector growth
 */

export const GEO_CONDITIONS = [
  { key: 'wto',      label: 'WTO Dispute Resolution' },
  { key: 'green',    label: 'Green Transition Policy' },
  { key: 'china',    label: 'China Export Controls' },
  { key: 'security', label: 'Strategic Security Policy' },
]

export const GEO_CONFIGURATIONS = [
  {
    id: 'wto_green',
    label: 'WTO + Green Policy',
    conditions: { wto: true, green: true, china: false, security: false },
    outcomes: ['size_growth', 'decentralise', 'robustness_improve'],
  },
  {
    id: 'green_china',
    label: 'Green + China Export Controls',
    conditions: { wto: false, green: true, china: true, security: false },
    outcomes: ['size_growth', 'decentralise', 'loose_connection'],
  },
  {
    id: 'green_only',
    label: 'Green Policy Only',
    conditions: { wto: false, green: true, china: false, security: false },
    outcomes: ['decentralise', 'reachability_improve'],
  },
  {
    id: 'security_only',
    label: 'Strategic Security Only',
    conditions: { wto: false, green: false, china: false, security: true },
    outcomes: ['decentralise', 'recycling_grow'],
  },
]

/**
 * Maps each outcome to the indicator keys it affects and the expected direction.
 * Note: global_efficiency appears in both robustness_improve (+1) and loose_connection (-1).
 * The correct sign is resolved per-configuration because each config has its own outcomes array.
 */
export const OUTCOME_EFFECTS = {
  size_growth: {
    indicators: [
      'nodes_total', 'edges_total', 'upstream_group_counts',
      'downstream_group_counts', 'recycling_group_counts', 'recycling_presence_share',
    ],
    direction: +1,
  },
  decentralise: {
    indicators: [
      'in_degree_centralisation', 'out_degree_centralisation', 'betweenness_centralisation',
    ],
    direction: -1,
  },
  robustness_improve: {
    indicators: [
      'reachability', 'global_efficiency', 'average_in_degree',
      'upstream_to_downstream_substitutability_ratio',
    ],
    direction: +1,
  },
  loose_connection: {
    indicators: [
      'density', 'global_efficiency', 'largest_weakly_connected_component_propotion',
    ],
    direction: -1,
  },
  reachability_improve: {
    indicators: ['reachability'],
    direction: +1,
  },
  recycling_grow: {
    indicators: ['recycling_group_counts', 'recycling_presence_share'],
    direction: +1,
  },
}

/**
 * Returns +1, -1, or 0 (no identified effect) for a given configuration × indicator pair.
 * @param {string} configId      One of the GEO_CONFIGURATIONS ids
 * @param {string} indicatorKey  One of the INDICATOR_META keys
 */
export function getIndicatorEffect(configId, indicatorKey) {
  const config = GEO_CONFIGURATIONS.find(c => c.id === configId)
  if (!config) return 0
  for (const outcomeKey of config.outcomes) {
    const effect = OUTCOME_EFFECTS[outcomeKey]
    if (effect.indicators.includes(indicatorKey)) return effect.direction
  }
  return 0
}
