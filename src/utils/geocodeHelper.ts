/**
 * Utilitário de Geocodificação com fallback para cidades frequentes
 */
export const KNOWN_CITIES: Record<string, [number, number]> = {
  'mossoró': [-5.1878, -37.3442],
  'mossoro': [-5.1878, -37.3442],
  'joão pessoa': [-7.1153, -34.861],
  'joao pessoa': [-7.1153, -34.861],
  'costa e silva': [-7.1815, -34.8964],
  'campina grande': [-7.2214, -35.8845],
  'queimadas': [-7.364, -35.9016],
  'natal': [-5.7945, -35.211],
  'parnamirim': [-5.9156, -35.2628],
  'caicó': [-6.4586, -37.0978],
  'caico': [-6.4586, -37.0978],
  'açu': [-5.5764, -36.9083],
  'assu': [-5.5764, -36.9083],
  'fortaleza': [-3.7172, -38.5434],
  'recife': [-8.0476, -34.877]
};

/**
 * Resolve coordenadas imediatamente usando lat/lng válidos ou dicionário de cidades conhecidas
 */
export function resolveCoordinates(
  address?: string | null,
  lat?: number | null,
  lng?: number | null,
  baseCoords: [number, number] = [-5.2056619002795514, -37.32918467893605]
): [number, number] | null {
  if (typeof lat === 'number' && typeof lng === 'number' && !isNaN(lat) && !isNaN(lng)) {
    const isBase = Math.abs(lat - baseCoords[0]) < 0.0001 && Math.abs(lng - baseCoords[1]) < 0.0001;
    if (!isBase) {
      return [lat, lng];
    }
  }

  if (address) {
    const lower = address.toLowerCase();
    for (const [key, coords] of Object.entries(KNOWN_CITIES)) {
      if (lower.includes(key)) {
        return coords;
      }
    }
  }

  return null;
}

export async function geocodeAddress(address: string): Promise<[number, number] | null> {
  if (!address || !address.trim()) return null;
  const lower = address.toLowerCase();

  // 1. Consulta rápida no mapa de cidades conhecidas
  for (const [key, coords] of Object.entries(KNOWN_CITIES)) {
    if (lower.includes(key)) {
      return coords;
    }
  }

  // 2. Consulta via Nominatim OpenStreetMap
  try {
    const cleanQuery = address.replace(/[-–—,;|]/g, ' ').replace(/\s+/g, ' ').trim() + ', Brazil';
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cleanQuery)}&limit=1`, {
      headers: { 'User-Agent': 'ecoclinic-tv-app' }
    });
    const data = await res.json();
    if (data && data.length > 0) {
      return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
    }
  } catch {
    // Silently continue to fallback
  }

  return null;
}

