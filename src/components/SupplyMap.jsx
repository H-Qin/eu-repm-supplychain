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
function createPieChartSVG(processes, radius, strokeColor = '#333333', opacity = 0.8) {
  const size = radius * 2
  const centerX = radius
  const centerY = radius
  const colors = processes.map(process => PROCESS_COLORS[process] || '#2b6cb0')

  if (processes.length === 1) {
    // Single color circle
    return `
      <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
        <circle cx="${centerX}" cy="${centerY}" r="${radius}"
                fill="${colors[0]}" stroke="${strokeColor}" stroke-width="1" opacity="${opacity}"/>
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
            fill="${colors[i]}" stroke="${strokeColor}" stroke-width="1" opacity="${opacity}"/>
    `
  }

  return `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      ${paths}
    </svg>
  `
}

// Separate component for each node marker to handle hover/click
function NodeMarker({ node, isHighlighted, isDimmed, onSelectNode }) {
  const markerRef = useRef(null)
  const baseRadius = radiusFromSize(2) // All nodes size 2
  const radius = isHighlighted ? baseRadius + 2 : baseRadius
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

  const strokeColor = isHighlighted ? '#f97316' : '#333333'
  const opacity = isDimmed ? 0.25 : 0.8

  // Create custom icon with pie chart
  const svgIcon = L.divIcon({
    html: createPieChartSVG(processes, radius, strokeColor, opacity),
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

export default function SupplyMap({ year, nodes, edges, selectedNode, selectedEdge, onSelectNode, onSelectEdge, onCloseSidebar }) {
  const nodeById = Object.fromEntries(nodes.map((n) => [n.node_id, n]))

  const visibleNodes = nodes.filter((n) => visibleInYear(n, year))
  const visibleEdges = edges
    .filter((e) => visibleInYear(e, year))
    .filter((e) => nodeById[e.source] && nodeById[e.target])

  const selectedNodeId = selectedNode?.node_id || null
  const selectedEdgeId = selectedEdge?.edge_id || null

  const highlightedNodeIds = new Set()
  const highlightedEdgeIds = new Set()

  if (selectedNodeId) {
    highlightedNodeIds.add(selectedNodeId)
    visibleEdges.forEach((e) => {
      if (e.source === selectedNodeId || e.target === selectedNodeId) {
        highlightedEdgeIds.add(e.edge_id)
        highlightedNodeIds.add(e.source)
        highlightedNodeIds.add(e.target)
      }
    })
  } else if (selectedEdgeId) {
    const baseEdge = visibleEdges.find((e) => e.edge_id === selectedEdgeId)
    if (baseEdge) {
      highlightedEdgeIds.add(baseEdge.edge_id)
      highlightedNodeIds.add(baseEdge.source)
      highlightedNodeIds.add(baseEdge.target)

      visibleEdges.forEach((e) => {
        const sharesNode =
          e.source === baseEdge.source ||
          e.target === baseEdge.source ||
          e.source === baseEdge.target ||
          e.target === baseEdge.target
        if (sharesNode) {
          highlightedEdgeIds.add(e.edge_id)
          highlightedNodeIds.add(e.source)
          highlightedNodeIds.add(e.target)
        }
      })
    }
  }

  const hasSelection = !!(selectedNodeId || selectedEdgeId)

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
          attribution='Built and maintained by Dr Qin (h.qin@qub.ac.uk)<br/><div style="text-align: right;"> &copy; 2025 RiSC+, Queen&#39;s University Belfast. All rights reserved.</div>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          noWrap={true}
        />

        {/* EDGES */}
        {visibleEdges.map((e) => {
          const a = nodeById[e.source]
          const b = nodeById[e.target]
          if (!a || !b) return null

          const volume = e.volume ?? 0
          const baseOpacity = getEdgeOpacity(volume)
          const color = getEdgeColor(volume)
          
          const isHighlighted = highlightedEdgeIds.has(e.edge_id)
          const isDimmed = hasSelection && !isHighlighted

          const opacity = isDimmed
            ? baseOpacity * 0.2
            : isHighlighted
            ? Math.max(baseOpacity, 0.9)
            : baseOpacity

          const weight = isHighlighted ? 2 : 1

          return (
            <CurvedEdge
              key={e.edge_id}
              from={[a.lat, a.lng]}
              to={[b.lat, b.lng]}
              color={color}
              weight={weight}
              opacity={opacity}
              onClick={() => onSelectEdge && onSelectEdge(e)}
              edge={e}
              nodeById={nodeById}
            />
          )
        })}

        {/* NODES */}
        {visibleNodes.map((n) => {
          const isHighlighted = highlightedNodeIds.has(n.node_id)
          const isDimmed = hasSelection && !isHighlighted

          return (
            <NodeMarker
              key={n.node_id}
              node={n}
              isHighlighted={isHighlighted}
              isDimmed={isDimmed}
              onSelectNode={onSelectNode}
            />
          )
        })}
      </MapContainer>

      {/* Legend overlay on the right */}
      <Legend className="legend legend-right" />

      {/* Sidebar overlay on the right (still node-only for now) */}
      {(selectedNode || selectedEdge) && (
        <div className="sidebar-overlay">
          <Sidebar
            node={selectedNode}
            edge={selectedEdge}
            nodes={nodes}
            onClose={onCloseSidebar}
          />
        </div>
      )}
    </div>
  )
}