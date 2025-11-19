import { MapContainer, TileLayer, CircleMarker, Popup, Polyline, Marker, SVGOverlay } from 'react-leaflet'
import { useRef, Fragment } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import Legend from './Legend'
import Sidebar from './Sidebar'

// Calculate curved path between two points
function getCurvedPath(lat1, lng1, lat2, lng2) {
  // Calculate midpoint
  const midLat = (lat1 + lat2) / 2
  const midLng = (lng1 + lng2) / 2

  // Calculate perpendicular offset for the curve
  const dx = lng2 - lng1
  const dy = lat2 - lat1
  const distance = Math.sqrt(dx * dx + dy * dy)

  // Offset amount (adjust this to control curve intensity)
  const offset = distance * 0.15

  // Perpendicular vector
  const perpLat = -dx * offset
  const perpLng = dy * offset

  // Control point for the curve
  const controlLat = midLat + perpLat
  const controlLng = midLng + perpLng

  // Generate points along the curve using quadratic bezier
  const points = []
  const segments = 20
  for (let i = 0; i <= segments; i++) {
    const t = i / segments
    const invT = 1 - t
    const lat = invT * invT * lat1 + 2 * invT * t * controlLat + t * t * lat2
    const lng = invT * invT * lng1 + 2 * invT * t * controlLng + t * t * lng2
    points.push([lat, lng])
  }

  return points
}

function visibleInYear(item, year) {
  return Array.isArray(item.active_years) && item.active_years.includes(year)
}

function radiusFromSize(size) {
  // Map 1–10 to 6–24 pixels
  const s = Math.min(10, Math.max(1, Number(size || 1)))
  return 6 + (s - 1) * (18 / 9)
}

// Process color mapping
const PROCESS_COLORS = {
  'Process 1': '#80b1d3',
  'Process 2': '#fb8072',
  'Process 3': '#bc80bd',
  'Process 4': '#fdb462',
  'Process 5': '#8dd3c7',
  'Process 6': '#b3de69'
}

// Create SVG pie chart for multi-process nodes
function createPieChartSVG(processes, radius) {
  const size = radius * 2
  const centerX = radius
  const centerY = radius
  const colors = processes.map(process => PROCESS_COLORS[process] || '#2b6cb0')

  if (processes.length === 1) {
    // Single color circle
    return `
      <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
        <circle cx="${centerX}" cy="${centerY}" r="${radius}"
                fill="${colors[0]}" stroke="#333333" stroke-width="1" opacity="0.8"/>
      </svg>
    `
  }

  // Multiple processes - create pie chart
  const angleStep = (2 * Math.PI) / processes.length
  let paths = ''

  for (let i = 0; i < processes.length; i++) {
    const startAngle = i * angleStep - Math.PI / 2
    const endAngle = (i + 1) * angleStep - Math.PI / 2

    const x1 = centerX + radius * Math.cos(startAngle)
    const y1 = centerY + radius * Math.sin(startAngle)
    const x2 = centerX + radius * Math.cos(endAngle)
    const y2 = centerY + radius * Math.sin(endAngle)

    const largeArcFlag = angleStep > Math.PI ? 1 : 0

    paths += `
      <path d="M ${centerX},${centerY} L ${x1},${y1} A ${radius},${radius} 0 ${largeArcFlag},1 ${x2},${y2} Z"
            fill="${colors[i]}" stroke="#333333" stroke-width="1" opacity="0.8"/>
    `
  }

  return `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      ${paths}
    </svg>
  `
}

// Separate component for each node marker to handle hover/click
function NodeMarker({ node, onSelectNode }) {
  const markerRef = useRef(null)
  const radius = radiusFromSize(node.company_size || node.size)
  const processes = node.tiers || []

  const handleMouseOver = () => {
    if (markerRef.current) {
      markerRef.current.openPopup()
    }
  }

  const handleMouseOut = () => {
    if (markerRef.current) {
      markerRef.current.closePopup()
    }
  }

  const handleClick = () => {
    onSelectNode(node)
  }

  // Create custom icon with pie chart
  const svgIcon = L.divIcon({
    html: createPieChartSVG(processes, radius),
    className: 'custom-marker-icon',
    iconSize: [radius * 2, radius * 2],
    iconAnchor: [radius, radius],
    popupAnchor: [0, -radius]
  })

  return (
    <Marker
      ref={markerRef}
      position={[node.lat, node.lng]}
      icon={svgIcon}
      eventHandlers={{
        mouseover: handleMouseOver,
        mouseout: handleMouseOut,
        click: handleClick
      }}
    >
      <Popup closeButton={false} autoClose={false} closeOnClick={false}>
        <div style={{ minWidth: 200 }}>
          <strong>{node.company_name}</strong>
          <div><small>ID: {node.node_id}</small></div>
          <div>{node.city ? `${node.city}, ` : ''}{node.country || ''}</div>
          {node.hq_country && (
            <div><small>HQ: {node.hq_country}</small></div>
          )}
          {node.tiers && node.tiers.length > 0 && (
            <div style={{ marginTop: 4 }}>
              <strong>Type(s):</strong> {node.tiers.join(', ')}
            </div>
          )}
          {node.website && (
            <div style={{ marginTop: 4 }}>
              <a href={node.website} target="_blank" rel="noreferrer">Visit Website</a>
            </div>
          )}
        </div>
      </Popup>
    </Marker>
  )
}

export default function SupplyMap({ year, nodes, edges, selectedNode, onSelectNode, onCloseSidebar }) {
  const nodeById = Object.fromEntries(nodes.map((n) => [n.node_id, n]))

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
          if (!a || !b) return null

          return (
            <Polyline
              key={e.edge_id}
              positions={[[a.lat, a.lng], [b.lat, b.lng]]}
              weight={2}
              opacity={0.6}
              color="#4a5568"
            />
          )
        })}

        {visibleNodes.map((n) => (
          <NodeMarker
            key={n.node_id}
            node={n}
            onSelectNode={onSelectNode}
          />
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