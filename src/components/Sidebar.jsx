export default function Sidebar({ node, onClose }) {
if (!node) return null
return (
<aside className="sidebar">
<button className="close" onClick={onClose}>×</button>
<h2>{node.company_name}</h2>
<p><strong>Node ID:</strong> {node.node_id}</p>
{node.city || node.country ? (
<p><strong>Location:</strong> {node.city ? `${node.city}, ` : ''}{node.country || ''}</p>
) : null}
{node.hq_country && (
<p><strong>Headquarters:</strong> {node.hq_country}</p>
)}
{node.processes && node.processes.length > 0 && (
<p><strong>Process(es):</strong> {node.processes.join(', ')}</p>
)}
{node.website && (
<p><a href={node.website} target="_blank" rel="noreferrer">Visit Website</a></p>
)}
{(node.company_size || node.size) && (
<p><strong>Size:</strong> {node.company_size || node.size}</p>
)}
{node.active_years && node.active_years.length > 0 && (
<p><strong>Active Years:</strong> {node.active_years.join(', ')}</p>
)}
</aside>
)
}