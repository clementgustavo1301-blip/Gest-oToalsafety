import L from 'leaflet';
import 'leaflet-routing-machine';
import { useEffect } from 'react';
import { useMap } from 'react-leaflet';

interface RoutingMachineProps {
  start: [number, number];
  end: [number, number];
  color?: string;
}

export default function RoutingMachine({ start, end, color = '#00e5ff' }: RoutingMachineProps) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    // Ensure leaflet-routing-machine is loaded
    if (!(L as any).Routing) {
      console.error("Leaflet Routing Machine is not available on L.Routing");
      return;
    }

    let routingControl: any;

    try {
      routingControl = (L as any).Routing.control({
        waypoints: [
          L.latLng(start[0], start[1]),
          L.latLng(end[0], end[1])
        ],
        router: (L as any).Routing.osrmv1({
          timeout: 60000,
          profile: 'driving'
        }),
        lineOptions: {
          styles: [
            // Base contínua e visível do trajeto
            { color: color, weight: 6, opacity: 0.8 },
            // Luz branca percorrendo o caminho
            { color: '#ffffff', weight: 4, opacity: 1, className: 'route-light-animation' }
          ],
          extendToWaypoints: false,
          missingRouteTolerance: 0
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
      });

      routingControl.on('routingerror', (e: any) => {
        console.warn('Routing failed or timed out:', e);
        // routeLoaded remains false, fallback line will continue to show
      });

      routingControl.addTo(map);
    } catch (err) {
      console.error('Error creating Routing Control:', err);
    }

    return () => {
      if (routingControl && map) {
        try {
          map.removeControl(routingControl);
        } catch (e) {
          // ignore
        }
      }
    };
  }, [map, start[0], start[1], end[0], end[1], color]);

  return null;
}
