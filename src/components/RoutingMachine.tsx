import L from 'leaflet';
import 'leaflet-routing-machine';
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css';
import { useEffect } from 'react';
import { useMap } from 'react-leaflet';

interface RoutingMachineProps {
  start?: [number, number];
  end?: [number, number];
  waypoints?: [number, number][];
  color?: string;
}

export default function RoutingMachine({ start, end, waypoints, color = '#2563eb' }: RoutingMachineProps) {
  const map = useMap();

  const waypointsKey = waypoints ? waypoints.map(p => `${p[0]},${p[1]}`).join(';') : '';
  const startEndKey = start && end ? `${start[0]},${start[1]}->${end[0]},${end[1]}` : '';

  useEffect(() => {
    if (!map) return;

    const rawPoints: [number, number][] = waypoints && waypoints.length >= 2
      ? waypoints
      : (start && end ? [start, end] : []);

    // Filter out undefined/NaN or consecutive duplicates
    const cleanPoints: [number, number][] = [];
    for (const pt of rawPoints) {
      if (!pt || isNaN(pt[0]) || isNaN(pt[1])) continue;
      if (cleanPoints.length > 0) {
        const prev = cleanPoints[cleanPoints.length - 1];
        if (Math.abs(prev[0] - pt[0]) < 0.0001 && Math.abs(prev[1] - pt[1]) < 0.0001) {
          continue;
        }
      }
      cleanPoints.push(pt);
    }

    if (cleanPoints.length < 2) return;

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
      fallbackPolyline = L.polyline(cleanPoints, {
        color: color,
        weight: 6,
        opacity: 0.8,
        dashArray: '8, 12'
      }).addTo(map);

      fallbackGlow = L.polyline(cleanPoints, {
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
        waypoints: cleanPoints.map(pt => L.latLng(pt[0], pt[1])),
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
  }, [map, waypointsKey, startEndKey, color]);

  return null;
}
