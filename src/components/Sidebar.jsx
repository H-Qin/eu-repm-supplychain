export default function Sidebar({ node, onClose }) {
if (!node) return null
return (
<aside className="sidebar">
<button className="close" onClick={onClose}>×</button>
<h2>{node.name}</h2>
<p><strong>Type:</strong> {node.type}</p>
{node.city || node.country ? (
<p><strong>Location:</strong> {node.city ? `${node.city}, ` : ''}{node.country || ''}</p>
) : null}
{node.info?.website && (
<p><a href={node.info.website} target="_blank" rel="noreferrer">Website</a></p>
)}
{node.info?.notes && <p>{node.info.notes}</p>}
</aside>
)
}