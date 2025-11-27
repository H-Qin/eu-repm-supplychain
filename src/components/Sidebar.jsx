export default function Sidebar({ node, onClose }) {
if (!node) return null
return (
<aside className="sidebar">
<button className="close" onClick={onClose}>×</button>
<h2>{node.company_name}</h2>
<p><strong>Node ID:</strong> {node.node_id}</p>
{(node.city || node['country_branch/plant']) && (
<p><strong>Location:</strong> {node.city ? `${node.city}, ` : ''}{node['country_branch/plant'] || ''}</p>
)}
{node.country_HQ && (
<p><strong>Headquarters:</strong> {node.country_HQ}</p>
)}
{node.process && node.process.length > 0 && (
<p><strong>Process(es):</strong> {node.process.join(', ')}</p>
)}
{node.active_years && node.active_years.length > 0 && (
<p><strong>Active years:</strong> {node.active_years.join(', ')}</p>
)}
</aside>
)
}