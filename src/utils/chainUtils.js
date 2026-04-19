/**
 * Shared supply-chain graph utilities.
 * Used by Sidebar (chain display + SRI) and SupplyMap (chain highlighting).
 */


// ─── Graph construction ───────────────────────────────────────────────────────

/**
 * Build forward / backward adjacency maps for the given year.
 * Also detects graph-structural sources (no incoming edges) and
 * sinks (no outgoing edges) so callers need no hard-coded process numbers.
 *
 * @param {object[]} edges
 * @param {object[]} nodes
 * @param {number}   year
 * @returns {{ forward: Map, backward: Map, sourceIds: Set, sinkIds: Set }}
 */
export function buildAdjMaps(edges, nodes, year) {
  const forward  = new Map()
  const backward = new Map()

  const activeNodeIds = new Set(
    nodes
      .filter(n => Array.isArray(n.active_years) && n.active_years.includes(year))
      .map(n => n.node_id)
  )

  for (const e of edges) {
    if (year && !(Array.isArray(e.active_years) && e.active_years.includes(year))) continue
    if (!activeNodeIds.has(e.source) || !activeNodeIds.has(e.target)) continue

    if (!forward.has(e.source))  forward.set(e.source,  new Set())
    if (!backward.has(e.target)) backward.set(e.target, new Set())
    forward.get(e.source).add(e.target)
    backward.get(e.target).add(e.source)
  }

  const sourceIds = new Set()
  const sinkIds   = new Set()
  for (const id of activeNodeIds) {
    if (!backward.has(id)) sourceIds.add(id)
    if (!forward.has(id))  sinkIds.add(id)
  }

  return { forward, backward, sourceIds, sinkIds }
}

// ─── Path finding ─────────────────────────────────────────────────────────────

/**
 * DFS upstream from startId to graph-structural source nodes (nodes with no
 * incoming edges in the active year).  No process-level ordering is assumed —
 * the real NdFeB supply chain has legitimate same-level and cross-level flows
 * (e.g. P2 alloy producer → P2/P3 integrated producer → P4 motor maker).
 * Cycles are prevented by the `visited` set; depth is capped at `maxDepth`.
 *
 * @returns {string[][]}  Each entry is [startId, …, sourceId] (start-first).
 */
export function findUpstreamPaths(startId, backward, sourceIds, nodeById, maxDepth = 12) {
  if (sourceIds.has(startId)) return [[startId]]

  const results = []

  function dfs(currentId, path, visited) {
    for (const prevId of (backward.get(currentId) || [])) {
      if (visited.has(prevId)) continue
      if (!nodeById[prevId]) continue

      path.push(prevId)
      visited.add(prevId)

      if (sourceIds.has(prevId)) {
        results.push([...path])
      } else if (path.length < maxDepth) {
        dfs(prevId, path, visited)
      }

      path.pop()
      visited.delete(prevId)
    }
  }

  dfs(startId, [startId], new Set([startId]))
  if (results.length === 0) results.push([startId])
  return results
}

/**
 * DFS downstream from startId to graph-structural sink nodes (nodes with no
 * outgoing edges in the active year).  Same rationale as findUpstreamPaths —
 * no process ordering assumed.
 *
 * @returns {string[][]}  Each entry is [startId, …, sinkId].
 */
export function findDownstreamPaths(startId, forward, sinkIds, nodeById, maxDepth = 12) {
  if (sinkIds.has(startId)) return [[startId]]

  const results = []

  function dfs(currentId, path, visited) {
    for (const nextId of (forward.get(currentId) || [])) {
      if (visited.has(nextId)) continue
      if (!nodeById[nextId]) continue

      path.push(nextId)
      visited.add(nextId)

      if (sinkIds.has(nextId)) {
        results.push([...path])
      } else if (path.length < maxDepth) {
        dfs(nextId, path, visited)
      }

      path.pop()
      visited.delete(nextId)
    }
  }

  dfs(startId, [startId], new Set([startId]))
  if (results.length === 0) results.push([startId])
  return results
}

// ─── Chain assembly ───────────────────────────────────────────────────────────

/**
 * Build all complete chains that pass through selectedId.
 * A chain runs from a graph-structural source (no incoming edges) to a
 * graph-structural sink (no outgoing edges) in the active year's graph.
 *
 * @returns {string[][]}  Deduplicated list of chains (arrays of node IDs, source→sink).
 */
export function buildCompleteChains(selectedId, forward, backward, sourceIds, sinkIds, nodeById) {
  const upPaths   = findUpstreamPaths(selectedId, backward, sourceIds, nodeById)
  const downPaths = findDownstreamPaths(selectedId, forward, sinkIds, nodeById)

  const seen   = new Set()
  const chains = []
  for (const up of upPaths) {
    for (const down of downPaths) {
      // up is [startId, …, sourceId]; reverse to get [sourceId, …, startId]
      // down is [startId, …, sinkId]; slice(1) to avoid duplicating startId
      const chain = [...[...up].reverse(), ...down.slice(1)]
      const key   = chain.join('|')
      if (!seen.has(key)) { seen.add(key); chains.push(chain) }
    }
  }
  return chains
}
