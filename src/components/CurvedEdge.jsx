import { useEffect } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet-polylinedecorator'

// Map projected distance → curvature factor (how far the center is from the midpoint)
// Short links → small k (flatter), long links → large k (rounder, near half-circle)
function curvatureFromDistance(distPx) {
  const minDist = 100      // pixels: below this almost straight
  const maxDist = 500     // above this treated as "very far"

  const clamped =
    Math.min(Math.max((distPx - minDist) / (maxDist - minDist), 0), 1)

  // Smoothstep easing to avoid sudden jumps
  const eased = clamped * clamped * (3 - 2 * clamped)

  const minK = 1.5       // center offset factor for very short links, bigger - more straight
  const maxK = 0.9         // center offset factor for very long links, smaller - more round

  return minK + (maxK - minK) * eased
}

// Build a circular arc between two [lat, lng] points
function makeCircularArc(map, from, to, segments = 80) {
  const [lat1, lng1] = from
  const [lat2, lng2] = to

  // Use a low zoom for geometry so values are reasonable but consistent
  const zoom = 2
  const p1 = map.project(L.latLng(lat1, lng1), zoom)
  const p2 = map.project(L.latLng(lat2, lng2), zoom)

  const x1 = p1.x
  const y1 = p1.y
  const x2 = p2.x
  const y2 = p2.y

  const midX = (x1 + x2) / 2
  const midY = (y1 + y2) / 2

  const dx = x2 - x1
  const dy = y2 - y1
  const dist = Math.hypot(dx, dy)

  if (dist === 0) {
    // Same point, just return one point
    return [[lat1, lng1]]
  }

  // Unit perpendicular to the chord
  let perpX = -dy / dist
  let perpY = dx / dist

  // Hemisphere rule: use middle latitude
  const midLat = (lat1 + lat2) / 2
  const hemisphereSign = midLat >= 0 ? -1 : 1
  // Note the minus sign: on WebMercator y increases downward in screen coords
  perpX *= hemisphereSign
  perpY *= hemisphereSign

  // How far to move from midpoint to center (in px)
  const k = curvatureFromDistance(dist)
  const offset = dist * k

  const cx = midX + perpX * offset
  const cy = midY + perpY * offset

  // Radius of the circle in px
  const r = Math.hypot(x1 - cx, y1 - cy)

  // Angles of the endpoints relative to center
  let startAngle = Math.atan2(y1 - cy, x1 - cx)
  let endAngle = Math.atan2(y2 - cy, x2 - cx)

  // Choose direction that gives the *smaller* arc
  let delta = endAngle - startAngle
  if (delta > Math.PI) delta -= 2 * Math.PI
  if (delta < -Math.PI) delta += 2 * Math.PI

  const points = []
  for (let i = 0; i <= segments; i++) {
    const t = i / segments
    const angle = startAngle + delta * t
    const x = cx + r * Math.cos(angle)
    const y = cy + r * Math.sin(angle)
    const latlng = map.unproject(L.point(x, y), zoom)
    points.push([latlng.lat, latlng.lng])
  }

  return points
}

export default function CurvedEdge({ from, to, color = '#7c3aed', weight = 2, opacity, onClick, edge, nodeById}) {
  const map = useMap()

  useEffect(() => {
    const latlngs = makeCircularArc(map, from, to)

    const line = L.polyline(latlngs, {
      color,
      weight,
      opacity
    }).addTo(map)

    // Add popup with edge information that follows cursor
    if (edge && nodeById) {
      const sourceNode = nodeById[edge.source]
      const targetNode = nodeById[edge.target]

      const popupContent = `
        <div style="min-width: 200px;">
          <strong>Flow: ${edge.edge_id || 'N/A'}</strong>
          ${edge.active_years && edge.active_years.length > 0 ? `<div><small>Years: ${edge.active_years.join(', ')}</small></div>` : ''}
          <hr style="margin: 8px 0;" />
          <div><strong>From:</strong> ${sourceNode ? sourceNode.company_name : 'Unknown'}</div>
          ${sourceNode ? `<div style="margin-left: 8px;"><small>${sourceNode.city ? sourceNode.city + ', ' : ''}${sourceNode['country_branch/plant'] || ''}</small></div>` : ''}
          <div style="margin-top: 4px;"><strong>To:</strong> ${targetNode ? targetNode.company_name : 'Unknown'}</div>
          ${targetNode ? `<div style="margin-left: 8px;"><small>${targetNode.city ? targetNode.city + ', ' : ''}${targetNode['country_branch/plant'] || ''}</small></div>` : ''}
        </div>
      `

      let popup = null

      // Add hover handlers
      line.on('mouseover', (e) => {
        popup = L.popup({
          closeButton: false,
          autoClose: false,
          closeOnClick: false
        })
          .setLatLng(e.latlng)
          .setContent(popupContent)
          .openOn(map)
      })

      line.on('mousemove', (e) => {
        if (popup) {
          popup.setLatLng(e.latlng)
        }
      })

      line.on('mouseout', () => {
        if (popup) {
          map.closePopup(popup)
          popup = null
        }
      })

      // Close popup on click as well
      if (onClick) {
        line.on('click', () => {
          if (popup) {
            map.closePopup(popup)
            popup = null
          }
          onClick()
        })
      }
    } else if (onClick) {
      line.on('click', () => onClick())
    }

    const decorator = L.polylineDecorator(line, {
      patterns: [
        {
          offset: '80%',
          repeat: 0,
          symbol: L.Symbol.arrowHead({
            pixelSize: 15,
            headAngle: 25,
            polygon: true,
            pathOptions: {
              color,
              fillColor: color,
              fillOpacity: opacity,
              weight: 0
            }
          })
        }
      ]
    }).addTo(map)

    return () => {
      map.removeLayer(line)
      map.removeLayer(decorator)
    }
  }, [map, from, to, color, weight, opacity, onClick, edge, nodeById])

  return null
}