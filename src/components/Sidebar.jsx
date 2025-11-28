export default function Sidebar({ node, edge, nodes, onClose }) {
if (!node && !edge) return null

const nodeById = Array.isArray(nodes)
    ? Object.fromEntries(nodes.map(n => [n.node_id, n]))
    : {}

return (
<aside className="sidebar">
<button className="close" onClick={onClose}>×</button>

    {/* NODE VIEW */}
    {node && (
    <>
        <h2>{node.company_name}</h2>

        <p><strong>Node ID:</strong> {node.node_id}</p>

        {(node.city || node["country_branch/plant"]) && (
        <p>
            <strong>Location:</strong>{" "}
            {node.city ? `${node.city}, ` : ""}
            {node["country_branch/plant"] || ""}
        </p>
        )}

        {node.country_HQ && (
        <p><strong>Headquarters:</strong> {node.country_HQ}</p>
        )}

        {Array.isArray(node.process) && node.process.length > 0 && (
        <p><strong>Process(es):</strong> {node.process.join(", ")}</p>
        )}

        {Array.isArray(node.active_years) && node.active_years.length > 0 && (
        <p><strong>Active years:</strong> {node.active_years.join(", ")}</p>
        )}
    </>
    )}

    {/* EDGE VIEW */}
      {edge && (
        <>
          <h2>Flow details</h2>

          {edge.edge_id && (
            <p> <strong>Edge ID:</strong> {edge.edge_id} </p>
          )}

          {Array.isArray(edge.active_years) && (
            <p><strong>Years active:</strong> {edge.active_years.join(", ")}</p>
          )}

          <hr />

          {/* Source node */}
          <h3>From</h3>
          {nodeById[edge.source] ? (
            <p>
              <strong>{nodeById[edge.source].company_name}</strong><br />
              {nodeById[edge.source].city ? `${nodeById[edge.source].city}, ` : ""}
              {nodeById[edge.source]["country_branch/plant"] || ""}
            </p>
          ) : (
            <p>(Unknown node ID: {edge.source})</p>
          )}

          {/* Target node */}
          <h3>To</h3>
          {nodeById[edge.target] ? (
            <p>
              <strong>{nodeById[edge.target].company_name}</strong><br />
              {nodeById[edge.target].city ? `${nodeById[edge.target].city}, ` : ""}
              {nodeById[edge.target]["country_branch/plant"] || ""}
            </p>
          ) : (
            <p>(Unknown node ID: {edge.target})</p>
          )}
        </>
      )}
    </aside>
  )
}