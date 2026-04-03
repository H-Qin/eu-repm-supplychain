const PROCESS_LABELS = {
  1: 'Raw Material Extraction',
  2: 'Alloy & Powder Production',
  3: 'Magnet Manufacturing',
  4: 'Magnetic Assembly & System Integration',
  5: 'End-Use Applications',
  6: 'Recycling & Circular Recovery',
}

// P4 and P5 are potential end-of-chain; only show "no customers" note for P1/2/3/6
function isTerminalNode(node) {
  const procs = Array.isArray(node.process) ? node.process : []
  return procs.length > 0 && procs.every(p => p === 4 || p === 5)
}

function processTag(proc) {
  return `P${proc}${PROCESS_LABELS[proc] ? ` · ${PROCESS_LABELS[proc]}` : ''}`
}

function NodeInfo({ node }) {
  return (
    <span className="sb-node-name">
      {node.company_name}
      <span className="sb-node-loc">
        {node.city ? `${node.city}, ` : ''}{node['country_branch/plant'] || ''}
      </span>
      {Array.isArray(node.process) && node.process.length > 0 && (
        <span className="sb-node-procs">
          {node.process.map(p => (
            <span key={p} className="sb-proc-pill">{processTag(p)}</span>
          ))}
        </span>
      )}
    </span>
  )
}

export default function Sidebar({ node, edge, nodes, edges, year, onClose }) {
  if (!node && !edge) return null

  const nodeById = Array.isArray(nodes)
    ? Object.fromEntries(nodes.map(n => [n.node_id, n]))
    : {}

  // For node view: filter edges active in the selected year that connect to this node
  let suppliers = []
  let customers = []
  if (node && Array.isArray(edges)) {
    const activeEdges = edges.filter(e =>
      !year || (Array.isArray(e.active_years) && e.active_years.includes(year))
    )
    suppliers = activeEdges
      .filter(e => e.target === node.node_id && nodeById[e.source])
      .map(e => nodeById[e.source])
    customers = activeEdges
      .filter(e => e.source === node.node_id && nodeById[e.target])
      .map(e => nodeById[e.target])
  }

  return (
    <aside className="sidebar">
      <button className="close" onClick={onClose}>×</button>

      {/* NODE VIEW */}
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

          {(suppliers.length > 0 || customers.length > 0) && (
            <div className="sb-chain">
              <p className="sb-chain__title">
                Supply chain connections{year ? ` in ${year}` : ''}
              </p>

              {/* Flow diagram */}
              <div className="sb-flow">
                {/* Suppliers */}
                {suppliers.length > 0 ? (
                  <div className="sb-flow__group">
                    <div className="sb-flow__label">Suppliers</div>
                    {suppliers.map(s => (
                      <div key={s.node_id} className="sb-flow__node sb-flow__node--supplier">
                        <NodeInfo node={s} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="sb-flow__group">
                    <div className="sb-flow__label sb-flow__label--empty">No suppliers in {year}</div>
                  </div>
                )}

                {/* Arrow down */}
                <div className="sb-flow__arrow">↓</div>

                {/* This node */}
                <div className="sb-flow__group">
                  <div className="sb-flow__node sb-flow__node--self">
                    <NodeInfo node={node} />
                  </div>
                </div>

                {/* Arrow down + Customers — omitted for pure P4/P5 nodes with no customers */}
                {(customers.length > 0 || !isTerminalNode(node)) && (
                  <>
                    <div className="sb-flow__arrow">↓</div>

                    {customers.length > 0 ? (
                      <div className="sb-flow__group">
                        <div className="sb-flow__label">Customers</div>
                        {customers.map(c => (
                          <div key={c.node_id} className="sb-flow__node sb-flow__node--customer">
                            <NodeInfo node={c} />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="sb-flow__group">
                        <div className="sb-flow__label sb-flow__label--empty">
                          No customer information collected/available in {year}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {suppliers.length === 0 && customers.length === 0 && (
            <p className="sb-no-links">
              {isTerminalNode(node)
                ? `No supply chain links active in ${year}.`
                : `No customer information collected/available in ${year}.`}
            </p>
          )}
        </>
      )}

      {/* EDGE VIEW */}
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
