export interface RouteResult {
  coordinates: [number, number][]; // [lat, lng] array
  distanceKm: number;
  durationMinutes: number;
  summary?: string;
  source: 'osrm' | 'interpolated';
}

/**
 * Calculates straight line Haversine distance in kilometers
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

/**
 * Fetches actual driving route coordinates from OSRM driving engine.
 * If network fails or times out, falls back to realistic road-corridor interpolation.
 */
export async function fetchDrivingRoute(
  startLat: number,
  startLng: number,
  destLat: number,
  destLng: number
): Promise<RouteResult> {
  const url = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${destLng},${destLat}?overview=full&geometries=geojson`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const rawCoords: [number, number][] = route.geometry.coordinates;

        // OSRM GeoJSON gives [lng, lat] -> Leaflet requires [lat, lng]
        const coordinates: [number, number][] = rawCoords.map(([lng, lat]) => [lat, lng]);
        const distanceKm = Math.round((route.distance / 1000) * 10) / 10;
        const durationMinutes = Math.max(1, Math.round(route.duration / 60));

        return {
          coordinates,
          distanceKm,
          durationMinutes,
          summary: route.legs?.[0]?.summary || '',
          source: 'osrm'
        };
      }
    }
  } catch (err) {
    console.warn('OSRM route fetch fallback to road-path interpolation:', err);
  }

  // Graceful fallback: generate a realistic road corridor path between start and dest
  return generateInterpolatedRoute(startLat, startLng, destLat, destLng);
}

/**
 * Generates realistic road-corridor coordinates with driving distance & ETA
 */
export function generateInterpolatedRoute(
  startLat: number,
  startLng: number,
  destLat: number,
  destLng: number
): RouteResult {
  const straightDist = calculateHaversineDistance(startLat, startLng, destLat, destLng);
  // Real driving road distance is typically 1.25x - 1.35x straight line
  const roadFactor = 1.28;
  const distanceKm = Math.round(straightDist * roadFactor * 10) / 10;
  // Estimated driving speed ~35 km/h in city/suburb
  const durationMinutes = Math.max(2, Math.round((distanceKm / 35) * 60));

  // Generate intermediate waypoint points simulating city arterial road grid
  const steps = 16;
  const coordinates: [number, number][] = [];
  coordinates.push([startLat, startLng]);

  // Perpendicular offset vector for natural road curve
  const perpLat = -(destLng - startLng) * 0.12;
  const perpLng = (destLat - startLat) * 0.12;

  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    // Quadratic curve factor
    const curveFactor = Math.sin(Math.PI * t);
    // Subtle road wobble
    const wobble = Math.sin(t * Math.PI * 4) * 0.0015;
    const lat = (1 - t) * startLat + t * destLat + perpLat * curveFactor + wobble;
    const lng = (1 - t) * startLng + t * destLng + perpLng * curveFactor - wobble;
    coordinates.push([lat, lng]);
  }

  coordinates.push([destLat, destLng]);

  return {
    coordinates,
    distanceKm,
    durationMinutes,
    source: 'interpolated'
  };
}
