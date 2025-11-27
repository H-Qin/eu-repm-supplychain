import { MapContainer, TileLayer, CircleMarker, Popup, Polyline, Marker, SVGOverlay } from 'react-leaflet'
import { useRef, Fragment } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import Legend from './Legend'
import Sidebar from './Sidebar'
import CurvedEdge from './CurvedEdge'

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
  'Process 1': '#d53e4f',
  'Process 2': '#fc8d59',
  'Process 3': '#fee08b',
  'Process 4': '#e6f598',
  'Process 5': '#99d594',
  'Process 6': '#3288bd'
}

function clamp01(v) {
  return Math.max(0, Math.min(1, Number(v ?? 0)))
}

// Equal-interval classification into 6 bins
function getEdgeColor(volume) {
  const v = clamp01(volume)
  if (v <= 0.03) return '#2171b5'
  if (v <= 0.06) return '#08519c'
  if (v <= 0.09) return '#08519c'
  if (v <= 0.2) return '#08306b'
  if (v <= 0.4) return '#08306b'
  return '#08306b'
}

// Optional: volume → opacity (low volume = faint, high = strong)
function getEdgeOpacity(volume) {
  const v = clamp01(volume)
  const minOpacity = 0.4
  const maxOpacity = 1
  return minOpacity + (maxOpacity - minOpacity) * v
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
  const radius = radiusFromSize(2) // All nodes size 2
  const processes = (node.process || []).map(p => `Process ${p}`)

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
          <div>{node.city ? `${node.city}, ` : ''}{node['country_branch/plant'] || ''}</div>
          {node.country_HQ && (
            <div><small>HQ: {node.country_HQ}</small></div>
          )}
          {node.process && node.process.length > 0 && (
            <div style={{ marginTop: 4 }}>
              <strong>Process(es):</strong> {node.process.join(', ')}
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
          const volume = e.volume ?? 0
          
          const color = getEdgeColor(volume)
          const opacity = getEdgeOpacity(volume)
          // const opacity = 1

          if (!a || !b) return null

          return (
            <CurvedEdge
              key={e.edge_id}
              from={[a.lat, a.lng]}
              to={[b.lat, b.lng]}
              color={color}
              weight={2}
              opacity={opacity}
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