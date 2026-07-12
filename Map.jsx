import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';

/* ---------------------------------------------------------------------- */
/*  Utilidades de animación (interpolación suave estilo Uber)             */
/* ---------------------------------------------------------------------- */

// Ease-out cúbico: arranque rápido, llegada suave (igual que las
// transiciones de cámara / marcadores de Uber).
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

// Diferencia angular más corta entre dos rumbos (evita que el auto
// gire "para el lado largo" al pasar de 359° a 1°, por ejemplo).
function shortestAngleDiff(from, to) {
  return ((to - from + 540) % 360) - 180;
}

/* ---------------------------------------------------------------------- */
/*  Icono de auto (misma silueta, ahora con "motor" de rotación aparte    */
/*  para poder animarlo con requestAnimationFrame sin recrear el DOM)     */
/* ---------------------------------------------------------------------- */

function buildCarIcon(color = '#3b82f6') {
  const size = 30;
  return L.divIcon({
    html: `
      <div class="car-marker-shadow"></div>
      <div class="car-marker-rotor" style="width:${size}px;height:${size}px;">
        <svg viewBox="0 0 24 24" fill="${color}" xmlns="http://www.w3.org/2000/svg" style="filter:drop-shadow(0 2px 5px rgba(0,0,0,0.45))">
          <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
        </svg>
      </div>`,
    className: 'car-marker-icon',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

// Pin de pickup/dropoff con anillos tipo "radar" (la animación clásica
// de Uber al confirmar una ubicación).
function buildDotIcon(color = '#22c55e', size = 16, pulse = false) {
  return L.divIcon({
    html: `
      <div class="dot-marker marker-drop-in" style="--dot-color:${color}">
        ${pulse ? '<span class="pulse-ring"></span><span class="pulse-ring pulse-ring-delay"></span>' : ''}
        <div class="dot-core"></div>
      </div>`,
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

/* ---------------------------------------------------------------------- */
/*  Marcador de auto animado: se desliza suavemente entre posiciones      */
/*  en vez de "saltar" (igual que los autos en el mapa de Uber)           */
/* ---------------------------------------------------------------------- */

function AnimatedCarMarker({ position, heading = 0, color = '#3b82f6', duration = 1000 }) {
  const markerRef = useRef(null);
  const frameRef = useRef(null);
  const currentPos = useRef(position);
  const currentHeading = useRef(heading);
  const mountedAt = useRef(null);

  const icon = useMemo(() => buildCarIcon(color), [color]);

  useEffect(() => {
    if (!position) return;
    const marker = markerRef.current;
    if (!marker) return;

    // Primer render: ubicar sin animar y guardar estado base.
    if (!mountedAt.current) {
      mountedAt.current = true;
      currentPos.current = position;
      currentHeading.current = heading;
      marker.setLatLng([position.lat, position.lng]);
      const el = marker.getElement();
      const rotor = el && el.querySelector('.car-marker-rotor');
      if (rotor) rotor.style.transform = `rotate(${heading}deg)`;
      return;
    }

    const startPos = currentPos.current || position;
    const startHeading = currentHeading.current;
    const headingDiff = shortestAngleDiff(startHeading, heading);
    const deltaLat = position.lat - startPos.lat;
    const deltaLng = position.lng - startPos.lng;
    const startTime = performance.now();

    if (frameRef.current) cancelAnimationFrame(frameRef.current);

    function step(now) {
      const t = Math.min(1, (now - startTime) / duration);
      const eased = easeOutCubic(t);
      const lat = startPos.lat + deltaLat * eased;
      const lng = startPos.lng + deltaLng * eased;
      const h = (startHeading + headingDiff * eased + 360) % 360;

      marker.setLatLng([lat, lng]);
      const el = marker.getElement();
      const rotor = el && el.querySelector('.car-marker-rotor');
      if (rotor) rotor.style.transform = `rotate(${h}deg)`;

      currentPos.current = { lat, lng };
      currentHeading.current = h;

      if (t < 1) frameRef.current = requestAnimationFrame(step);
    }
    frameRef.current = requestAnimationFrame(step);
    return () => frameRef.current && cancelAnimationFrame(frameRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [position?.lat, position?.lng, heading, duration]);

  if (!position) return null;
  return <Marker ref={markerRef} position={[position.lat, position.lng]} icon={icon} />;
}

/* ---------------------------------------------------------------------- */
/*  Cámara: paneos y encuadres suaves (flyTo) en vez de saltos            */
/* ---------------------------------------------------------------------- */

function MapUpdater({ center, zoom }) {
  const map = useMap();
  const isFirst = useRef(true);
  useEffect(() => {
    if (!center) return;
    if (isFirst.current) {
      isFirst.current = false;
      map.setView(center, zoom || 15);
      return;
    }
    map.flyTo(center, zoom || map.getZoom(), { duration: 1.1, easeLinearity: 0.25 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center, zoom, map]);
  return null;
}

function FitBoundsOnLoad({ pickup, dropoff, driverLocation }) {
  const map = useMap();
  useEffect(() => {
    const pts = [];
    if (pickup) pts.push([pickup.lat, pickup.lng]);
    if (dropoff) pts.push([dropoff.lat, dropoff.lng]);
    if (driverLocation?.lat) pts.push([driverLocation.lat, driverLocation.lng]);
    if (pts.length >= 2) {
      map.flyToBounds(L.latLngBounds(pts.map((p) => L.latLng(p[0], p[1]))), {
        padding: [70, 70],
        maxZoom: 16,
        duration: 1.1,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

/* ---------------------------------------------------------------------- */
/*  Ruta: se "dibuja" progresivamente al llegar (como el trazo azul       */
/*  de Uber cuando calcula el viaje) en vez de aparecer de golpe          */
/* ---------------------------------------------------------------------- */

function RouteLine({ from, to, color = '#3b82f6' }) {
  const [fullCoords, setFullCoords] = useState(null);
  const [drawnCoords, setDrawnCoords] = useState(null);
  const drawFrame = useRef(null);

  useEffect(() => {
    if (!from || !to) { setFullCoords(null); setDrawnCoords(null); return; }
    setFullCoords(null);
    setDrawnCoords(null);
    fetch(`https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?geometries=geojson&overview=full`)
      .then((r) => r.json())
      .then((data) => {
        if (data.routes?.[0]?.geometry?.coordinates) {
          setFullCoords(data.routes[0].geometry.coordinates.map((c) => [c[1], c[0]]));
        }
      })
      .catch(() => setFullCoords(null));
  }, [from?.lat, from?.lng, to?.lat, to?.lng]);

  useEffect(() => {
    if (!fullCoords || fullCoords.length < 2) return;
    const total = fullCoords.length;
    const duration = Math.min(900, 300 + total * 4);
    const startTime = performance.now();

    if (drawFrame.current) cancelAnimationFrame(drawFrame.current);
    function step(now) {
      const t = Math.min(1, (now - startTime) / duration);
      const eased = easeOutCubic(t);
      const count = Math.max(2, Math.round(total * eased));
      setDrawnCoords(fullCoords.slice(0, count));
      if (t < 1) drawFrame.current = requestAnimationFrame(step);
    }
    drawFrame.current = requestAnimationFrame(step);
    return () => drawFrame.current && cancelAnimationFrame(drawFrame.current);
  }, [fullCoords]);

  if (!drawnCoords) return null;
  return (
    <>
      <Polyline positions={drawnCoords} pathOptions={{ color: '#000', weight: 9, opacity: 0.18 }} />
      <Polyline positions={drawnCoords} pathOptions={{ color, weight: 5, opacity: 0.9, lineCap: 'round' }} />
    </>
  );
}

/* ---------------------------------------------------------------------- */
/*  Mapa principal                                                        */
/* ---------------------------------------------------------------------- */

export default function Map({
  center = [-31.8, -58.23], zoom = 14,
  pickup = null, dropoff = null,
  driverLocation = null, drivers = null,
  className = '', onMapClick = null,
  routeFrom = null, routeTo = null,
}) {
  const mapRef = useRef(null);

  const MapClickHandler = () => {
    const map = useMap();
    useEffect(() => {
      if (onMapClick) map.on('click', (e) => onMapClick(e.latlng));
      return () => map.off('click');
    }, [map, onMapClick]);
    return null;
  };

  const routeColor = '#3b82f6';
  const hasActiveRide = !!(routeFrom || routeTo);

  const pickupIcon = useMemo(() => buildDotIcon('#22c55e', 18, hasActiveRide), [hasActiveRide]);
  const dropoffIcon = useMemo(() => buildDotIcon('#ef4444', 18, hasActiveRide), [hasActiveRide]);

  return (
    <div className={`relative map-uber ${className}`}>
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <MapContainer
        center={center}
        zoom={zoom}
        className="h-full w-full"
        ref={mapRef}
        zoomControl={false}
        attributionControl={true}
        fadeAnimation
        zoomAnimation
        markerZoomAnimation
      >
        {/* Estilo de tiles oscuro y minimalista, en la misma línea visual
            que el mapa nocturno de Uber: fondo casi negro, calles sutiles,
            sin ruido de POIs. */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          subdomains="abcd"
          maxZoom={20}
        />

        <MapUpdater center={center} zoom={zoom} />
        <MapClickHandler />
        <FitBoundsOnLoad pickup={pickup} dropoff={dropoff} driverLocation={driverLocation} />

        {pickup && <Marker key={`pickup-${pickup.lat}-${pickup.lng}`} position={[pickup.lat, pickup.lng]} icon={pickupIcon} />}
        {dropoff && <Marker key={`dropoff-${dropoff.lat}-${dropoff.lng}`} position={[dropoff.lat, dropoff.lng]} icon={dropoffIcon} />}

        {driverLocation?.lat && (
          <AnimatedCarMarker position={driverLocation} heading={driverLocation.heading || 0} color="#3b82f6" />
        )}

        {drivers?.map((d, i) => (
          <AnimatedCarMarker key={d.userId || i} position={d} heading={d.heading || 0} color="#6366f1" />
        ))}

        {(routeFrom || pickup) && (routeTo || dropoff) && (
          <RouteLine from={routeFrom || pickup} to={routeTo || dropoff} color={routeColor} />
        )}
      </MapContainer>
    </div>
  );
}
