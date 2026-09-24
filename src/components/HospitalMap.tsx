import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { LocateFixed, Plus, Minus, RotateCcw, Navigation, Clock, X, MapPin } from 'lucide-react';
import { Hospital } from '../types';
import { fetchDrivingRoute, RouteResult } from '../utils/routing';

interface HospitalMapProps {
  hospitals: (Hospital & { distance?: number })[];
  userCoords?: { lat: number; lng: number } | null;
  selectedHospitalId?: string | null;
  onSelectHospital?: (hospital: Hospital) => void;
  height?: string;
  routeDestinationHospital?: Hospital | null;
  onClearRoute?: () => void;
  onRequestUserLocation?: () => void;
}

export const HospitalMap: React.FC<HospitalMapProps> = ({
  hospitals,
  userCoords,
  selectedHospitalId,
  onSelectHospital,
  height = '420px',
  routeDestinationHospital,
  onClearRoute,
  onRequestUserLocation
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Layer[]>([]);
  const routeLayersRef = useRef<L.Layer[]>([]);
  const initialFitDoneRef = useRef<boolean>(false);
  const lastCoordsKeyRef = useRef<string>('');
  const lastSelectedHospitalRef = useRef<string | null | undefined>(undefined);

  // Active route state
  const [activeHospital, setActiveHospital] = useState<Hospital | null>(routeDestinationHospital || null);
  const [routeLoading, setRouteLoading] = useState<boolean>(false);
  const [routeInfo, setRouteInfo] = useState<RouteResult | null>(null);

  // Sync external routeDestinationHospital prop with internal active state
  useEffect(() => {
    setActiveHospital(routeDestinationHospital || null);
  }, [routeDestinationHospital]);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      // Center on user location if available, otherwise Vijayawada / AP centroid
      const centerLat = userCoords?.lat || 16.5062;
      const centerLng = userCoords?.lng || 80.648;

      const map = L.map(mapContainerRef.current, {
        center: [centerLat, centerLng],
        zoom: userCoords ? 13 : 11,
        zoomControl: false, // We provide modern smooth zoom buttons
        scrollWheelZoom: true,
        zoomSnap: 0.25, // Fractional zoom levels for buttery smooth scaling
        zoomDelta: 0.5, // Smooth step increment
        wheelPxPerZoomLevel: 120, // Prevents erratic mouse wheel jumpiness
        wheelDebounceTime: 35,
        zoomAnimation: true,
        zoomAnimationThreshold: 8,
        fadeAnimation: true,
        markerZoomAnimation: true,
        easeLinearity: 0.25,
        inertia: true,
        inertiaDeceleration: 3000
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
        minZoom: 4,
        keepBuffer: 6, // Keeps surrounding tiles in memory for flicker-free zooming
        updateWhenZooming: false, // Avoids tile churn during smooth zoom animation
        updateWhenIdle: true
      }).addTo(map);

      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;

    // Invalidate size to ensure crisp tiles
    const timer = setTimeout(() => {
      if (map) {
        map.invalidateSize();
      }
    }, 200);

    return () => clearTimeout(timer);
  }, []);

  // Listen for popup "Get Directions" custom event
  useEffect(() => {
    const handlePopupDirections = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      const hospId = customEvent.detail;
      const hosp = hospitals.find((h) => h.id === hospId);
      if (hosp) {
        setActiveHospital(hosp);
      }
    };

    window.addEventListener('map-get-directions', handlePopupDirections);
    return () => window.removeEventListener('map-get-directions', handlePopupDirections);
  }, [hospitals]);

  // Update Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear existing markers & accuracy circles
    markersRef.current.forEach((layer) => layer.remove());
    markersRef.current = [];

    // 1. Add User location marker & accuracy circle if userCoords is active
    let userMarkerInstance: L.Marker | null = null;
    if (userCoords) {
      const userIcon = L.divIcon({
        className: 'custom-user-marker',
        html: `
          <div class="relative flex items-center justify-center w-10 h-10">
            <div class="absolute w-10 h-10 bg-blue-500 rounded-full opacity-35 animate-ping"></div>
            <div class="relative w-6 h-6 bg-blue-600 rounded-full border-2 border-white shadow-xl flex items-center justify-center text-white">
              <div class="w-2.5 h-2.5 bg-white rounded-full"></div>
            </div>
          </div>
        `,
        iconSize: [40, 40],
        iconAnchor: [20, 20]
      });

      userMarkerInstance = L.marker([userCoords.lat, userCoords.lng], { icon: userIcon, zIndexOffset: 1000 })
        .addTo(map)
        .bindPopup(`
          <div class="p-2 font-sans text-xs">
            <div class="flex items-center gap-1 text-blue-700 font-bold mb-1">
              <span>📍 Your Live Location</span>
            </div>
            <p class="text-slate-600 leading-snug">GPS: ${userCoords.lat.toFixed(4)}°N, ${userCoords.lng.toFixed(4)}°E</p>
            <span class="inline-block mt-1 px-2 py-0.5 rounded bg-blue-50 text-blue-800 text-[10px] font-semibold border border-blue-200">
              Showing nearby public facilities with correct distance
            </span>
          </div>
        `);

      markersRef.current.push(userMarkerInstance);

      // Add accuracy radar circle
      const radarCircle = L.circle([userCoords.lat, userCoords.lng], {
        radius: 750,
        color: '#2563eb',
        fillColor: '#3b82f6',
        fillOpacity: 0.12,
        weight: 1.5,
        dashArray: '4, 4'
      }).addTo(map);

      markersRef.current.push(radarCircle);
    }

    // 2. Add Hospital markers
    hospitals.forEach((hosp) => {
      const isSelected = hosp.id === selectedHospitalId;
      const isRouteDest = hosp.id === activeHospital?.id;
      const isDistrict = hosp.hospitalType === 'District Hospital';
      const isCHC = hosp.hospitalType === 'Community Health Centre (CHC)';
      const colorBg = isRouteDest
        ? 'bg-rose-600 ring-4 ring-rose-300'
        : isDistrict
        ? 'bg-emerald-600'
        : isCHC
        ? 'bg-teal-600'
        : 'bg-cyan-700';

      const hospitalIcon = L.divIcon({
        className: 'custom-hosp-marker',
        html: `
          <div class="cursor-pointer transition-transform duration-200 ${isSelected || isRouteDest ? 'scale-125 z-50' : 'hover:scale-110'}">
            <div class="${colorBg} text-white font-bold p-1.5 rounded-xl shadow-lg border-2 ${isSelected || isRouteDest ? 'border-amber-400 ring-2 ring-amber-300' : 'border-white'} flex items-center gap-1">
              <span class="text-xs">🏥</span>
              <span class="text-[10px] leading-none whitespace-nowrap hidden sm:inline max-w-[90px] truncate">${hosp.name.split(',')[0]}</span>
              ${hosp.distance !== undefined ? `<span class="text-[9px] bg-black/25 px-1 py-0.5 rounded text-white/95">${hosp.distance}km</span>` : ''}
            </div>
            <div class="w-2 h-2 ${colorBg} mx-auto transform rotate-45 -mt-1"></div>
          </div>
        `,
        iconSize: [120, 36],
        iconAnchor: [60, 36]
      });

      const marker = L.marker([hosp.latitude, hosp.longitude], { icon: hospitalIcon })
        .addTo(map)
        .bindPopup(`
          <div class="p-2 font-sans max-w-[260px]">
            <div class="flex items-center gap-1.5 mb-1.5 flex-wrap">
              <span class="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">${hosp.hospitalType}</span>
              ${hosp.emergencyAvailable ? '<span class="text-[10px] px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 font-bold">24x7 Emergency</span>' : ''}
              ${hosp.distance !== undefined ? `<span class="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-bold ml-auto">${hosp.distance} km away</span>` : ''}
            </div>
            <h4 class="font-bold text-xs text-slate-900 leading-tight mb-1">${hosp.name}</h4>
            <p class="text-[11px] text-slate-600 mb-2">${hosp.address}, ${hosp.district}</p>
            <div class="flex items-center justify-between gap-2 text-xs text-slate-700 pt-1.5 border-t border-slate-200">
              <span class="font-semibold text-amber-600">⭐ ${hosp.rating} / 5.0</span>
              <button
                type="button"
                id="popup-get-directions-${hosp.id}"
                onclick="window.dispatchEvent(new CustomEvent('map-get-directions', { detail: '${hosp.id}' }))"
                class="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold rounded-lg flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
              >
                🧭 Get Directions
              </button>
            </div>
          </div>
        `);

      marker.on('click', () => {
        if (onSelectHospital) {
          onSelectHospital(hosp);
        }
      });

      markersRef.current.push(marker);
    });

    // 3. Smart Camera Positioning (if not routing)
    if (!activeHospital) {
      const currentCoordsKey = userCoords ? `${userCoords.lat.toFixed(4)},${userCoords.lng.toFixed(4)}` : '';
      const coordsChanged = currentCoordsKey !== '' && currentCoordsKey !== lastCoordsKeyRef.current;
      const selectionChanged = selectedHospitalId !== undefined && selectedHospitalId !== lastSelectedHospitalRef.current;
      lastSelectedHospitalRef.current = selectedHospitalId;

      if (!initialFitDoneRef.current) {
        if (userCoords) {
          const sorted = [...hospitals].sort((a, b) => (a.distance ?? 9999) - (b.distance ?? 9999));
          const nearest = sorted.slice(0, 4);

          if (nearest.length > 0) {
            const points: [number, number][] = [
              [userCoords.lat, userCoords.lng],
              ...nearest.map((h) => [h.latitude, h.longitude] as [number, number])
            ];
            map.fitBounds(L.latLngBounds(points), { padding: [50, 50], maxZoom: 14, animate: true });
          } else {
            map.flyTo([userCoords.lat, userCoords.lng], 13, { duration: 1 });
          }

          if (userMarkerInstance) {
            userMarkerInstance.openPopup();
          }
          lastCoordsKeyRef.current = currentCoordsKey;
        } else if (hospitals.length > 0) {
          const bounds = L.latLngBounds(hospitals.map((h) => [h.latitude, h.longitude]));
          map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13, animate: true });
        }
        initialFitDoneRef.current = true;
      } else if (coordsChanged) {
        lastCoordsKeyRef.current = currentCoordsKey;
        const sorted = [...hospitals].sort((a, b) => (a.distance ?? 9999) - (b.distance ?? 9999));
        const nearest = sorted.slice(0, 4);

        if (nearest.length > 0) {
          const points: [number, number][] = [
            [userCoords!.lat, userCoords!.lng],
            ...nearest.map((h) => [h.latitude, h.longitude] as [number, number])
          ];
          map.flyToBounds(L.latLngBounds(points), { padding: [50, 50], maxZoom: 14, duration: 1.2 });
        } else {
          map.flyTo([userCoords!.lat, userCoords!.lng], 13, { duration: 1.2 });
        }

        if (userMarkerInstance) {
          userMarkerInstance.openPopup();
        }
      } else if (selectionChanged && selectedHospitalId) {
        const hosp = hospitals.find((h) => h.id === selectedHospitalId);
        if (hosp) {
          map.flyTo([hosp.latitude, hosp.longitude], 14.5, { duration: 0.8 });
        }
      }
    }
  }, [hospitals, userCoords, selectedHospitalId, onSelectHospital, activeHospital]);

  // Actual Driving Route Calculation & Polyline Rendering
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear previous route layers
    routeLayersRef.current.forEach((layer) => layer.remove());
    routeLayersRef.current = [];

    if (!activeHospital) {
      setRouteInfo(null);
      setRouteLoading(false);
      return;
    }

    let isMounted = true;
    setRouteLoading(true);

    const startLat = userCoords?.lat || 16.5062;
    const startLng = userCoords?.lng || 80.648;
    const destLat = activeHospital.latitude;
    const destLng = activeHospital.longitude;

    fetchDrivingRoute(startLat, startLng, destLat, destLng)
      .then((res) => {
        if (!isMounted || !mapInstanceRef.current) return;
        setRouteInfo(res);
        setRouteLoading(false);

        const mapInst = mapInstanceRef.current;
        const coords = res.coordinates;

        if (coords.length > 0) {
          // 1. Darker casing outline for clear visual contrast
          const outerLine = L.polyline(coords, {
            color: '#1e3a8a', // Indigo/Blue deep casing
            weight: 8,
            opacity: 0.85,
            lineCap: 'round',
            lineJoin: 'round'
          }).addTo(mapInst);

          // 2. High-visibility driving route polyline
          const mainLine = L.polyline(coords, {
            color: '#2563eb', // Vibrant Blue route
            weight: 5,
            opacity: 1,
            lineCap: 'round',
            lineJoin: 'round'
          }).addTo(mapInst);

          // 3. Start Point Marker (User Location)
          const startIcon = L.divIcon({
            className: 'custom-route-start-pin',
            html: `
              <div class="flex items-center gap-1 bg-blue-600 text-white font-bold text-[10px] px-2.5 py-1 rounded-full shadow-xl border-2 border-white ring-2 ring-blue-400 whitespace-nowrap">
                <span>📍 Starting Point (You)</span>
              </div>
            `,
            iconAnchor: [45, 14]
          });
          const startMarker = L.marker(coords[0], { icon: startIcon, zIndexOffset: 2000 })
            .addTo(mapInst)
            .bindPopup(`
              <div class="p-1.5 text-xs">
                <p class="font-bold text-blue-700">📍 Your Departure Point</p>
                <p class="text-slate-600 text-[11px]">${userCoords ? 'Real-time GPS Location' : 'Regional Reference Point'}</p>
              </div>
            `);

          // 4. Destination Marker (Hospital)
          const destIcon = L.divIcon({
            className: 'custom-route-dest-pin',
            html: `
              <div class="flex items-center gap-1.5 bg-emerald-600 text-white font-bold text-[11px] px-3 py-1.5 rounded-xl shadow-2xl border-2 border-white ring-2 ring-emerald-400 whitespace-nowrap">
                <span>🏥 Destination: ${activeHospital.name.split(',')[0]}</span>
              </div>
            `,
            iconAnchor: [70, 38]
          });
          const destMarker = L.marker(coords[coords.length - 1], { icon: destIcon, zIndexOffset: 2001 })
            .addTo(mapInst)
            .bindPopup(`
              <div class="p-1.5 text-xs">
                <p class="font-bold text-emerald-800">🏁 Destination</p>
                <p class="font-semibold text-slate-800">${activeHospital.name}</p>
                <p class="text-slate-500 text-[11px]">${activeHospital.address}</p>
              </div>
            `);

          routeLayersRef.current = [outerLine, mainLine, startMarker, destMarker];

          // 5. Fit bounds with smooth zoom to display the entire driving route
          mapInst.fitBounds(L.latLngBounds(coords), {
            padding: [60, 60],
            maxZoom: 15,
            animate: true
          });
        }
      })
      .catch((err) => {
        console.error('Failed to draw driving route:', err);
        if (isMounted) {
          setRouteLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [activeHospital, userCoords]);

  const handleClearRoute = useCallback(() => {
    setActiveHospital(null);
    setRouteInfo(null);
    routeLayersRef.current.forEach((layer) => layer.remove());
    routeLayersRef.current = [];
    if (onClearRoute) {
      onClearRoute();
    }
  }, [onClearRoute]);

  const handleZoomIn = () => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.zoomIn(0.5, { animate: true });
  };

  const handleZoomOut = () => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.zoomOut(0.5, { animate: true });
  };

  const handleResetView = () => {
    if (!mapInstanceRef.current) return;
    if (activeHospital && routeLayersRef.current.length > 0) {
      // Re-fit to route bounds
      const bounds = L.latLngBounds([
        [userCoords?.lat || 16.5062, userCoords?.lng || 80.648],
        [activeHospital.latitude, activeHospital.longitude]
      ]);
      mapInstanceRef.current.fitBounds(bounds, { padding: [60, 60], maxZoom: 15, animate: true });
    } else if (userCoords) {
      mapInstanceRef.current.flyTo([userCoords.lat, userCoords.lng], 13.5, { duration: 0.8 });
    } else if (hospitals.length > 0) {
      const bounds = L.latLngBounds(hospitals.map((h) => [h.latitude, h.longitude]));
      mapInstanceRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 13, animate: true });
    }
  };

  return (
    <div className="relative w-full rounded-2xl overflow-hidden shadow-xs border border-slate-200 bg-slate-100">
      <div ref={mapContainerRef} style={{ height }} className="w-full z-0" />

      {/* Modern Smooth Zoom Controls */}
      <div className="absolute top-3 left-3 z-10 flex flex-col bg-white/95 backdrop-blur-xs rounded-xl shadow-md border border-slate-200 overflow-hidden">
        <button
          type="button"
          onClick={handleZoomIn}
          className="p-2 text-slate-700 hover:text-blue-600 hover:bg-slate-50 transition-colors border-b border-slate-100 cursor-pointer flex items-center justify-center active:bg-blue-50"
          title="Zoom In smoothly (+0.5)"
          aria-label="Zoom in"
        >
          <Plus className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={handleZoomOut}
          className="p-2 text-slate-700 hover:text-blue-600 hover:bg-slate-50 transition-colors cursor-pointer flex items-center justify-center active:bg-blue-50"
          title="Zoom Out smoothly (-0.5)"
          aria-label="Zoom out"
        >
          <Minus className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={handleResetView}
          className="p-2 text-slate-500 hover:text-blue-600 hover:bg-slate-50 transition-colors border-t border-slate-100 cursor-pointer flex items-center justify-center"
          title="Reset Map View"
          aria-label="Reset map view"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Floating Active Driving Route HUD Panel */}
      {activeHospital && (
        <div className="absolute bottom-4 left-4 right-4 sm:right-auto sm:max-w-md z-10 bg-white/95 backdrop-blur-md p-4 rounded-2xl shadow-xl border border-blue-200 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse"></span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700">
                  Driving Route Active
                </span>
                {routeLoading && (
                  <span className="text-[10px] text-slate-500 animate-pulse">Calculating road network...</span>
                )}
              </div>
              <h4 className="text-sm font-bold text-slate-900 leading-tight">
                {activeHospital.name}
              </h4>
              <p className="text-xs text-slate-500 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate">{activeHospital.address}, {activeHospital.district}</span>
              </p>
            </div>

            <button
              type="button"
              id="btn-close-route"
              onClick={handleClearRoute}
              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
              title="Close Driving Route"
              aria-label="Close route"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Driving Route Stats: Distance & Duration */}
          {routeInfo && (
            <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-2 p-2 rounded-xl bg-blue-50/70 border border-blue-100">
                <Navigation className="w-4 h-4 text-blue-600 shrink-0" />
                <div>
                  <span className="text-[10px] text-blue-600 font-bold block leading-none">Driving Distance</span>
                  <span className="text-xs font-bold text-slate-900">{routeInfo.distanceKm} km</span>
                </div>
              </div>

              <div className="flex items-center gap-2 p-2 rounded-xl bg-emerald-50/70 border border-emerald-100">
                <Clock className="w-4 h-4 text-emerald-600 shrink-0" />
                <div>
                  <span className="text-[10px] text-emerald-600 font-bold block leading-none">Est. Travel Time</span>
                  <span className="text-xs font-bold text-slate-900">~{routeInfo.durationMinutes} mins</span>
                </div>
              </div>
            </div>
          )}

          {/* Notice if user location is regional reference */}
          {!userCoords && onRequestUserLocation && (
            <div className="mt-2.5 flex items-center justify-between gap-2 text-[11px] bg-amber-50 text-amber-800 p-2 rounded-xl border border-amber-200">
              <span>Using reference origin. Enable GPS for live start location:</span>
              <button
                type="button"
                onClick={onRequestUserLocation}
                className="px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg shrink-0 cursor-pointer transition-colors"
              >
                Use GPS
              </button>
            </div>
          )}
        </div>
      )}

      {/* Map Legend (hidden when route HUD is active on small screens) */}
      <div className={`absolute top-3 right-3 z-10 bg-white/95 backdrop-blur-xs px-3 py-1.5 rounded-xl shadow-xs text-xs font-medium text-slate-700 ${activeHospital ? 'hidden sm:flex' : 'flex'} items-center gap-2.5 border border-slate-200`}>
        {activeHospital ? (
          <div className="flex items-center gap-2">
            <span className="w-4 h-1.5 rounded-full bg-blue-600"></span>
            <span className="text-[11px] font-bold text-blue-700">Driving Route Line</span>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
              <span className="text-[11px] font-semibold text-slate-700">Public Hospitals</span>
            </div>
            <div className="h-3 w-px bg-slate-200"></div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
              <span className="text-[11px] font-semibold text-slate-700">You (GPS)</span>
            </div>
          </>
        )}
      </div>

      {/* Re-center button if userCoords available and not routing */}
      {userCoords && !activeHospital && (
        <button
          type="button"
          onClick={handleResetView}
          className="absolute bottom-4 right-4 z-10 bg-white hover:bg-slate-50 text-blue-600 px-3 py-2 rounded-xl shadow-md border border-slate-200 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
          title="Recenter map on your location"
        >
          <LocateFixed className="w-4 h-4 text-blue-600" />
          <span>Recenter on Me</span>
        </button>
      )}
    </div>
  );
};
