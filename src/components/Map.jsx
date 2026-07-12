import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';

function CarIcon({ heading = 0, color = '#3b82f6' }) {
  const size = 28;
  return L.divIcon({
    html: `<div style="transform:rotate(${heading}deg);width:${size}px;height:${size}px;transition:transform 0.5s">
      <svg viewBox="0 0 24 24" fill="${color}" xmlns="http://www.w3.org/2000/svg" style="filter:drop-shadow(0 2px 6px rgba(0,0,0,0.4))">
        <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
      </svg>
    </div>`,
    className: '', iconSize: [size, size], iconAnchor: [size/2, size/2],
  });
}

function DotIcon(color, size = 14, pulse = false) {
  const pulseClass = pulse ? 'pulse-dot' : '';
  return L.divIcon({
    html: `<div class="${pulseClass}" style="width:${size}px;height:${size}px;background:${color};border-radius:50%;border:3px solid #08080c;box-shadow:0 0 0 4px ${color}22,0 2px 8px rgba(0,0,0,0.3)"></div>`,
    className: '', iconSize: [size, size], iconAnchor: [size/2, size/2],
  });
}

function MapUpdater({ center, zoom }) {
  const map = useMap();
  useEffect(() => { if (center) map.setView(center, zoom || 15); }, [center, zoom, map]);
  return null;
}

function RouteLine({ from, to, color = '#3b82f6' }) {
  const [coords, setCoords] = useState(null);
  useEffect(() => {
    if (!from || !to) { setCoords(null); return; }
    setCoords(null);
    fetch(`https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?geometries=geojson&overview=full`)
      .then(r => r.json())
      .then(data => {
        if (data.routes?.[0]?.geometry?.coordinates) {
          setCoords(data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]));
        }
      })
      .catch(() => setCoords(null));
  }, [from, to]);
  if (!coords) return null;
  return (
    <>
      <Polyline positions={coords} pathOptions={{ color: '#000', weight: 9, opacity: 0.15 }} />
      <Polyline positions={coords} pathOptions={{ color, weight: 5, opacity: 0.85 }} />
    </>
  );
}

function FitBoundsOnLoad({ pickup, dropoff, driverLocation }) {
  const map = useMap();
  useEffect(() => {
    const pts = [];
    if (pickup) pts.push([pickup.lat, pickup.lng]);
    if (dropoff) pts.push([dropoff.lat, dropoff.lng]);
    if (driverLocation?.lat) pts.push([driverLocation.lat, driverLocation.lng]);
    if (pts.length >= 2) {
      map.fitBounds(L.latLngBounds(pts.map(p => L.latLng(p[0], p[1]))), { padding: [60, 60], maxZoom: 16 });
    }
  }, []);
  return null;
}

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
  const hasActiveRide = routeFrom || routeTo;

  return (
    <div className={`relative ${className}`}>
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <MapContainer center={center} zoom={zoom} className="h-full w-full" ref={mapRef} zoomControl={false}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
        />
        <MapUpdater center={center} zoom={zoom} />
        <MapClickHandler />
        <FitBoundsOnLoad pickup={pickup} dropoff={dropoff} driverLocation={driverLocation} />

        {pickup && <Marker position={[pickup.lat, pickup.lng]} icon={DotIcon('#22c55e', 16, hasActiveRide)} />}
        {dropoff && <Marker position={[dropoff.lat, dropoff.lng]} icon={DotIcon('#ef4444', 16, hasActiveRide)} />}

        {driverLocation?.lat && (
          <Marker position={[driverLocation.lat, driverLocation.lng]} icon={CarIcon({ heading: driverLocation.heading || 0 })} />
        )}

        {drivers?.map((d, i) => (
          <Marker key={d.userId || i} position={[d.lat, d.lng]} icon={CarIcon({ heading: d.heading || 0, color: '#6366f1' })} />
        ))}

        {(routeFrom || pickup) && (routeTo || dropoff) && (
          <RouteLine from={routeFrom || pickup} to={routeTo || dropoff} color={routeColor} />
        )}
      </MapContainer>
    </div>
  );
}
