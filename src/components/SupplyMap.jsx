import { MapContainer, TileLayer, CircleMarker, Popup, Polyline } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import Legend from './Legend'
import Sidebar from './Sidebar'

function visibleInYear(item, year) {
  return Array.isArray(item.active_years) && item.active_years.includes(year)
}

function radiusFromSize(size) {
  // Map 1–10 to 4–18 pixels
  const s = Math.min(10, Math.max(1, Number(size || 1)))
  return 4 + (s - 1) * (14 / 9)
}

export default function SupplyMap({ year, nodes, edges, selectedNode, onSelectNode, onCloseSidebar }) {
  const nodeById = Object.fromEntries(nodes.map((n) => [n.id, n]))

  const visibleNodes = nodes.filter((n) => visibleInYear(n, year))
  const visibleEdges = edges
    .filter((e) => visibleInYear(e, year))
    .filter((e) => nodeById[e.source] && nodeById[e.target])

  return (
    // Centered map “card” with max-width
    <div className="mapwrap">
      <MapContainer
        center={[50, 10]}
        zoom={4}
        minZoom={2}
        style={{ height: '80vh', width: '100%' }}
        worldCopyJump={false}
        maxBounds={[[-85, -180], [85, 180]]}
        maxBoundsViscosity={1.0}
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          noWrap={true}
        />

        {visibleEdges.map((e) => {
          const a = nodeById[e.source]
          const b = nodeById[e.target]
          return (
            <Polyline
              key={e.id}
              positions={[[a.lat, a.lng], [b.lat, b.lng]]}
              weight={2}
              opacity={0.6}
            />
          )
        })}

        {visibleNodes.map((n) => (
          <CircleMarker
            key={n.id}
            center={[n.lat, n.lng]}
            radius={radiusFromSize(n.size)}
            pathOptions={{ color: '#2b6cb0', fillOpacity: 0.7 }}
            eventHandlers={{ click: () => onSelectNode(n) }}
          >
            <Popup>
              <div style={{ minWidth: 200 }}>
                <strong>{n.name}</strong>
                <div>{n.type}</div>
                <div>{n.city ? `${n.city}, ` : ''}{n.country || ''}</div>
                {n.info?.website && (
                  <div>
                    <a href={n.info.website} target="_blank" rel="noreferrer">Website</a>
                  </div>
                )}
                {n.info?.notes && <div style={{ marginTop: 6 }}>{n.info.notes}</div>}
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>

      {/* Legend overlay on the right */}
      <Legend className="legend legend-right" />

      {/* Sidebar as an overlay to the right of the map (only if a node is selected) */}
      {selectedNode && (
        <div className="sidebar-overlay">
          <Sidebar node={selectedNode} onClose={onCloseSidebar} />
        </div>
      )}
    </div>
  )
}