import L from 'leaflet';
import 'leaflet-routing-machine';
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css';
import { useEffect } from 'react';
import { useMap } from 'react-leaflet';

interface RoutingMachineProps {
  start: [number, number];
  end: [number, number];
  color?: string;
}

export default function RoutingMachine({ start, end, color = '#2563eb' }: RoutingMachineProps) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    // Check if start and end are identical or missing
    if (!start || !end) return;
    const isSame = Math.abs(start[0] - end[0]) < 0.0001 && Math.abs(start[1] - end[1]) < 0.0001;
    if (isSame) return;

    // Ensure leaflet-routing-machine is loaded
    if (!(L as any).Routing) {
      console.error("Leaflet Routing Machine is not available on L.Routing");
      return;
    }

    let routingControl: any = null;
    let fallbackPolyline: L.Polyline | null = null;
    let fallbackGlow: L.Polyline | null = null;

    // Create an immediate visual fallback so the user always sees the route connecting
    // while OSRM loads, or if public OSRM is slow/offline
    try {
      fallbackPolyline = L.polyline([start, end], {
        color: color,
        weight: 6,
        opacity: 0.8,
        dashArray: '8, 12'
      }).addTo(map);

      fallbackGlow = L.polyline([start, end], {
        color: '#ffffff',
        weight: 4,
        opacity: 1,
        className: 'route-light-animation'
      }).addTo(map);
    } catch (e) {
      console.warn('Could not add fallback polyline:', e);
    }

    const removeFallback = () => {
      if (fallbackPolyline && map.hasLayer(fallbackPolyline)) {
        map.removeLayer(fallbackPolyline);
        fallbackPolyline = null;
      }
      if (fallbackGlow && map.hasLayer(fallbackGlow)) {
        map.removeLayer(fallbackGlow);
        fallbackGlow = null;
      }
    };

    try {
      routingControl = (L as any).Routing.control({
        waypoints: [
          L.latLng(start[0], start[1]),
          L.latLng(end[0], end[1])
        ],
        router: (L as any).Routing.osrmv1({
          serviceUrl: 'https://router.project-osrm.org/route/v1',
          suppressDemoServerWarning: true,
          timeout: 25000,
          profile: 'driving'
        }),
        lineOptions: {
          styles: [
            // Solid road route
            { color: color, weight: 6, opacity: 0.85 },
            // White light pulsing through the road
            { color: '#ffffff', weight: 4, opacity: 1, className: 'route-light-animation' }
          ],
          extendToWaypoints: true,
          missingRouteTolerance: 10
        },
        createMarker: () => null as any, // Hide default routing markers
        show: false, // Hide the instructions panel
        fitSelectedRoutes: false,
        addWaypoints: false,
        draggableWaypoints: false,
        routeWhileDragging: false,
        showAlternatives: false,
      });

      routingControl.on('routesfound', () => {
        // High accuracy road route loaded; remove the straight-line fallback
        removeFallback();
      });

      routingControl.on('routingerror', (e: any) => {
        console.warn('OSRM routing timed out or failed, retaining fallback line:', e);
        // Fallback line remains visible so route is never missing
      });

      routingControl.addTo(map);
    } catch (err) {
      console.error('Error creating Routing Control:', err);
    }

    return () => {
      removeFallback();
      if (routingControl && map) {
        try {
          map.removeControl(routingControl);
        } catch {
          // ignore
        }
      }
    };
  }, [map, start[0], start[1], end[0], end[1], color]);

  return null;
}
