import { Fragment, useState } from 'react'
import { buildAdjMaps, buildCompleteChains } from '../utils/chainUtils'

const PROCESS_LABELS = {
  1: 'Raw Material Extraction',
  2: 'Alloy & Powder Production',
  3: 'Magnet Manufacturing',
  4: 'Magnetic Assembly & System Integration',
  5: 'End-Use Applications',
  6: 'Recycling & Circular Recovery',
}

function processTag(proc) {
  return `P${proc}${PROCESS_LABELS[proc] ? ` · ${PROCESS_LABELS[proc]}` : ''}`
}

// ─── Structural Resilience Index ─────────────────────────────────────────────
//
// Three node-level indicators, each normalised to [0, 1]:
//
//  1. In-degree (ID) — for every non-source node n_i (i > 0):
//       id_i = inDegree(n_i) / maxInDegree_in_graph
//     Chain ID = mean(id_i).  Captures upstream supply redundancy.
//
//  2. Supply Substitutability (SS) — for every non-terminal node n_i (i < k):
//       alts_i = (# active nodes sharing a process with n_i that have ≥1 outgoing edge) − 1
//       ss_i   = alts_i / maxAlts_across_all_process_types
//     Chain SS = mean(ss_i).  Captures how replaceable each chain node is.
//
//  3. Reachability (R) — for every non-terminal node n_i (i < k):
//       r_i = (# P4/P5/P6 sink nodes reachable from n_i via BFS) / maxReachable_in_graph
//     Chain R = mean(r_i).  Captures downstream market access breadth.
//
//  SRI = (ID + SS + R) / 3

/**
 * Precompute graph-level statistics needed for resilience scoring.
 * Called once per sidebar open (per clicked node × year).
 */
function buildResilienceContext(forward, backward, nodes, year, nodeById, sinkIds) {
  const activeNodes = nodes.filter(n =>
    Array.isArray(n.active_years) && n.active_years.includes(year)
  )

  // --- In-degree ---
  const inDegreeMap = new Map()
  for (const n of activeNodes) inDegreeMap.set(n.node_id, 0)
  for (const [targetId, sources] of backward) {
    if (inDegreeMap.has(targetId)) inDegreeMap.set(targetId, sources.size)
  }
  const maxInDegree = Math.max(1, ...inDegreeMap.values())

  // --- Supply substitutability pool ---
  // For each process code p, collect active nodes with that process AND at least one outgoing edge.
  // These are the potential substitutes for a node playing role p in a chain.
  const processPools = new Map() // process → Set<nodeId>
  for (const n of activeNodes) {
    const hasOut = (forward.get(n.node_id) || new Set()).size > 0
    if (!hasOut) continue
    for (const p of (n.process || [])) {
      if (!processPools.has(p)) processPools.set(p, new Set())
      processPools.get(p).add(n.node_id)
    }
  }
  // Largest pool size across all process types (used as denominator)
  const maxPoolSize = Math.max(1, ...[...processPools.values()].map(s => s.size))

  // --- Reachability ---
  // sinkIds passed in from buildAdjMaps (graph-structural: no outgoing edges)

  // Lazy BFS cache: nodeId → count of P4/P5/P6 sinks reachable from that node
  const reachCache = new Map()

  // First pass: find the maximum reachable-sink count across all active nodes.
  // We compute this upfront so we can normalise properly.
  let maxReachable = 1
  for (const n of activeNodes) {
    const visited = new Set([n.node_id])
    const queue = [n.node_id]
    let count = 0
    while (queue.length) {
      const cur = queue.shift()
      if (sinkIds.has(cur)) count++
      for (const nxt of (forward.get(cur) || [])) {
        if (!visited.has(nxt)) { visited.add(nxt); queue.push(nxt) }
      }
    }
    reachCache.set(n.node_id, count)
    if (count > maxReachable) maxReachable = count
  }

  function reachabilityScore(nodeId) {
    return (reachCache.get(nodeId) ?? 0) / maxReachable
  }

  return { inDegreeMap, maxInDegree, processPools, maxPoolSize, sinkIds, reachabilityScore }
}

/**
 * Compute the three sub-scores and the composite SRI for one complete chain.
 * @param {string[]} chain   Ordered array of node IDs from source to sink.
 * @param {object}   ctx     Resilience context from buildResilienceContext().
 * @param {object}   nodeById
 * @returns {{ sri, id, ss, r }}  All values in [0, 1].
 */
function computeChainResilience(chain, ctx, nodeById) {
  const { inDegreeMap, maxInDegree, processPools, maxPoolSize, sinkIds, reachabilityScore } = ctx

  const idScores = []
  const ssScores = []
  const rScores  = []

  chain.forEach((nodeId, i) => {
    const n = nodeById[nodeId]
    if (!n) return

    // In-degree: every node except the first (source has no upstream)
    if (i > 0) {
      idScores.push((inDegreeMap.get(nodeId) ?? 0) / maxInDegree)
    }

    // Supply substitutability + Reachability: every node except the last (sink is the endpoint)
    if (i < chain.length - 1) {
      // SS — how many other active nodes share this node's process role(s) and can pass supply on
      const procs = n.process || []
      if (procs.length > 0) {
        const alts = Math.max(
          0,
          Math.max(...procs.map(p => (processPools.get(p)?.size ?? 0) - 1)) // -1 excludes self
        )
        ssScores.push(alts / Math.max(1, maxPoolSize - 1))
      } else {
        ssScores.push(0)
      }

      // R — fraction of total reachable downstream market accessible from this node
      if (!sinkIds.has(nodeId)) {
        rScores.push(reachabilityScore(nodeId))
      }
    }
  })

  const avg = arr => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0

  const id  = avg(idScores)
  const ss  = avg(ssScores)
  const r   = avg(rScores)
  const sri = (id + ss + r) / 3

  return { sri, id, ss, r }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function sriLevel(score) {
  if (score >= 0.6) return 'high'
  if (score >= 0.35) return 'mid'
  return 'low'
}

const pct = v => Math.round(v * 100)

// ─── Sub-components ──────────────────────────────────────────────────────────

function ResilienceBar({ label, tooltip, value }) {
  return (
    <div className="sb-res-bar-row" title={tooltip}>
      <span className="sb-res-bar-label">{label}</span>
      <div className="sb-res-bar-track">
        <div className="sb-res-bar-fill" style={{ width: `${pct(value)}%` }} />
      </div>
      <span className="sb-res-bar-val">{pct(value)}</span>
    </div>
  )
}

const CHAIN_PAGE_SIZE = 10

// ─── Main component ───────────────────────────────────────────────────────────

export default function Sidebar({ node, edge, nodes, edges, year, onClose }) {
  const [showAll, setShowAll] = useState(false)

  if (!node && !edge) return null

  const nodeById = Array.isArray(nodes)
    ? Object.fromEntries(nodes.map(n => [n.node_id, n]))
    : {}

  // Build chains + resilience context once per render
  let chains = []
  let resCtx = null
  if (node && Array.isArray(edges) && Array.isArray(nodes)) {
    const { forward, backward, sourceIds, sinkIds } = buildAdjMaps(edges, nodes, year)
    chains = buildCompleteChains(node.node_id, forward, backward, sourceIds, sinkIds, nodeById)
    resCtx = buildResilienceContext(forward, backward, nodes, year, nodeById, sinkIds)
  }

  const displayedChains = showAll ? chains : chains.slice(0, CHAIN_PAGE_SIZE)

  return (
    <aside className="sidebar">
      <button className="close" onClick={onClose}>×</button>

      {/* ── NODE VIEW ─────────────────────────────────────────────────── */}
      {node && (
        <>
          <h2 style={{ marginBottom: 2 }}>{node.company_name}</h2>

          <div className="sb-meta">
            {(node.city || node['country_branch/plant']) && (
              <p><strong>Location:</strong>{' '}
                {node.city ? `${node.city}, ` : ''}
                {node['country_branch/plant'] || ''}
              </p>
            )}
            {node.country_HQ && (
              <p><strong>Headquarters:</strong> {node.country_HQ}</p>
            )}
            {Array.isArray(node.process) && node.process.length > 0 && (
              <p><strong>Process(es):</strong>{' '}
                {node.process.map(p => (
                  <span key={p} className="sb-proc-pill sb-proc-pill--lg">{processTag(p)}</span>
                ))}
              </p>
            )}
          </div>

          {chains.length > 0 ? (
            <div className="sb-chains">
              <p className="sb-chains__title">
                Complete supply chains in {year}
                <span className="sb-chains__count"> — {chains.length} chain{chains.length !== 1 ? 's' : ''}</span>
              </p>

              {displayedChains.map((chain, i) => {
                const res = resCtx ? computeChainResilience(chain, resCtx, nodeById) : null
                const level = res ? sriLevel(res.sri) : 'mid'

                return (
                  <div key={i} className="sb-chain-block">
                    {/* Node badge row */}
                    <div className="sb-chain-row">
                      {chain.map((nodeId, j) => {
                        const n = nodeById[nodeId]
                        if (!n) return null
                        const isSelf = nodeId === node.node_id
                        return (
                          <Fragment key={nodeId + '-' + j}>
                            {j > 0 && <span className="sb-chain-arrow">›</span>}
                            <div className={`sb-chain-badge ${isSelf ? 'sb-chain-badge--self' : ''}`}>
                              <span className="sb-chain-badge__name">{n.company_name}</span>
                              <span className="sb-chain-badge__proc">
                                {(n.process || []).map(p => `P${p}`).join('/')}
                                {n['country_branch/plant'] ? ` · ${n['country_branch/plant']}` : ''}
                              </span>
                            </div>
                          </Fragment>
                        )
                      })}
                    </div>

                    {/* Resilience scores */}
                    {res && (
                      <div className="sb-resilience">
                        <div className="sb-resilience__header">
                          <span className="sb-resilience__label">Structural Resilience Index</span>
                          <span className={`sb-sri-badge sb-sri-badge--${level}`}>
                            {pct(res.sri)}
                          </span>
                        </div>
                        <div className="sb-res-bars">
                          <ResilienceBar
                            label="ID"
                            tooltip="In-degree: average number of active suppliers per chain node, relative to the most-supplied node in the network. Higher = more upstream redundancy."
                            value={res.id}
                          />
                          <ResilienceBar
                            label="SS"
                            tooltip="Supply Substitutability: average share of process-equivalent alternative suppliers available for each chain node. Higher = easier to reroute supply if a node fails."
                            value={res.ss}
                          />
                          <ResilienceBar
                            label="R"
                            tooltip="Reachability: average fraction of downstream end-use markets reachable from each chain node, relative to the best-connected node in the network. Higher = broader market access."
                            value={res.r}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}

              {chains.length > CHAIN_PAGE_SIZE && (
                <button className="sb-show-more" onClick={() => setShowAll(v => !v)}>
                  {showAll
                    ? 'Show less'
                    : `Show ${chains.length - CHAIN_PAGE_SIZE} more chain${chains.length - CHAIN_PAGE_SIZE !== 1 ? 's' : ''}`}
                </button>
              )}

              {/* Legend */}
              <div className="sb-res-legend">
                <strong>SRI indicators:</strong>
                {' '}ID = In-degree · SS = Supply Substitutability · R = Reachability
                <br />
                Score 0–100; higher is more resilient.
                <span className="sb-sri-badge sb-sri-badge--high" style={{marginLeft:4}}>≥60 High</span>
                <span className="sb-sri-badge sb-sri-badge--mid"  style={{marginLeft:4}}>35–59 Mid</span>
                <span className="sb-sri-badge sb-sri-badge--low"  style={{marginLeft:4}}>&#60;35 Low</span>
              </div>
            </div>
          ) : (
            <p className="sb-no-links">No complete supply chains found in {year}.</p>
          )}
        </>
      )}

      {/* ── EDGE VIEW ─────────────────────────────────────────────────── */}
      {edge && (
        <>
          <h2>Flow details</h2>
          {Array.isArray(edge.active_years) && (
            <p><strong>Years active:</strong> {edge.active_years.join(', ')}</p>
          )}
          <hr />
          <h3>From</h3>
          {nodeById[edge.source] ? (
            <p>
              <strong>{nodeById[edge.source].company_name}</strong><br />
              {nodeById[edge.source].city ? `${nodeById[edge.source].city}, ` : ''}
              {nodeById[edge.source]['country_branch/plant'] || ''}
            </p>
          ) : (
            <p>(Unknown node ID: {edge.source})</p>
          )}
          <h3>To</h3>
          {nodeById[edge.target] ? (
            <p>
              <strong>{nodeById[edge.target].company_name}</strong><br />
              {nodeById[edge.target].city ? `${nodeById[edge.target].city}, ` : ''}
              {nodeById[edge.target]['country_branch/plant'] || ''}
            </p>
          ) : (
            <p>(Unknown node ID: {edge.target})</p>
          )}
        </>
      )}
    </aside>
  )
}
