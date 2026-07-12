import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';

function createCarIcon(angle, color = '#7c4dff') {
  const size = 36;
  return L.divIcon({
    html: `<div style="transform: rotate(${angle || 0}deg); width: ${size}px; height: ${size}px; display: flex; align-items: center; justify-content: center; filter: drop-shadow(0 4px 8px rgba(0,0,0,0.5));">
      <svg width="${size-8}" height="${size-8}" viewBox="0 0 24 24" fill="${color}" xmlns="http://www.w3.org/2000/svg">
        <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
      </svg>
    </div>`,
    className: '',
    iconSize: [size, size],
    iconAnchor: [size/2, size/2],
  });
}

const pickupIcon = L.divIcon({
  html: `<div style="background:#1db866;width:14px;height:14px;border-radius:50%;border:3px solid #08080c;box-shadow:0 0 0 6px #1db86622;"></div>`,
  className: '', iconSize: [14, 14], iconAnchor: [7, 7],
});

const dropoffIcon = L.divIcon({
  html: `<div style="background:#f43f5e;width:14px;height:14px;border-radius:50%;border:3px solid #08080c;box-shadow:0 0 0 6px #f43f5e22;"></div>`,
  className: '', iconSize: [14, 14], iconAnchor: [7, 7],
});

const pulseIcon = L.divIcon({
  html: `<div class="driver-pulse"><div class="driver-pulse-inner"></div></div>`,
  className: '', iconSize: [48, 48], iconAnchor: [24, 24],
});

function MapUpdater({ center, zoom }) {
  const map = useMap();
  useEffect(() => { if (center) map.setView(center, zoom || 15); }, [center, zoom, map]);
  return null;
}

function AnimatedMarker({ position, icon, prevPosition }) {
  const markerRef = useRef(null);
  const map = useMap();

  useEffect(() => {
    if (!markerRef.current) {
      markerRef.current = L.marker(position, { icon }).addTo(map);
    }
    const marker = markerRef.current;
    if (prevPosition && prevPosition.lat !== position.lat) {
      marker.setLatLng(position);
    } else {
      marker.setLatLng(position);
    }
    return () => { if (markerRef.current) { map.removeLayer(markerRef.current); markerRef.current = null; } };
  }, [position, icon, map, prevPosition]);

  return null;
}

function RouteLine({ from, to, color = '#7c4dff' }) {
  const [coords, setCoords] = useState(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!from || !to) { setCoords(null); return; }
    setLoading(true);
    setCoords(null);
    fetch(`https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?geometries=geojson&overview=full&alternatives=false&steps=false`)
      .then(r => r.json())
      .then(data => {
        if (data.routes?.[0]?.geometry?.coordinates) {
          setCoords(data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]));
        }
      })
      .catch(() => setCoords(null))
      .finally(() => setLoading(false));
  }, [from, to]);
  return (
    <>
      {loading && from && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-[1000] bg-base-900/80 backdrop-blur rounded-lg px-3 py-1.5 text-xs text-white flex items-center gap-2">
          <div className="w-3 h-3 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          Calculando ruta...
        </div>
      )}
      {coords && (
        <>
          <Polyline positions={coords} pathOptions={{ color, weight: 5, opacity: 0.9 }} />
          <Polyline positions={coords} pathOptions={{ color: '#00000022', weight: 9, opacity: 0.3 }} />
        </>
      )}
    </>
  );
}

export default function Map({
  center = [-31.8, -58.23],
  zoom = 14,
  pickup = null, dropoff = null,
  driverLocation = null, drivers = null,
  className = '', onMapClick = null,
  routeFrom = null, routeTo = null,
}) {
  const mapRef = useRef(null);
  const [mapReady, setMapReady] = useState(false);

  const MapClickHandler = () => {
    const map = useMap();
    useEffect(() => {
      if (onMapClick) { map.on('click', (e) => onMapClick(e.latlng)); }
      return () => map.off('click');
    }, [map, onMapClick]);
    return null;
  };

  const FitBounds = () => {
    const map = useMap();
    useEffect(() => {
      if (!mapReady) return;
      const pts = [];
      if (pickup) pts.push([pickup.lat, pickup.lng]);
      if (dropoff) pts.push([dropoff.lat, dropoff.lng]);
      if (driverLocation && driverLocation.lat) pts.push([driverLocation.lat, driverLocation.lng]);
      if (pts.length >= 2) {
        const bounds = L.latLngBounds(pts.map(p => L.latLng(p[0], p[1])));
        map.fitBounds(bounds, { padding: [60, 60], maxZoom: 16 });
      } else if (center) {
        map.setView(center, zoom);
      }
    }, [pickup, dropoff, driverLocation, map, mapReady]);
    return null;
  };

  return (
    <div className={`relative ${className}`}>
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <MapContainer
        center={center} zoom={zoom}
        className="h-full w-full"
        ref={mapRef}
        zoomControl={false}
        whenReady={() => setMapReady(true)}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
        />
        <MapUpdater center={center} zoom={zoom} />
        <MapClickHandler />
        <FitBounds />

        {pickup && <Marker position={[pickup.lat, pickup.lng]} icon={pickupIcon} />}
        {dropoff && <Marker position={[dropoff.lat, dropoff.lng]} icon={dropoffIcon} />}

        {driverLocation && driverLocation.lat && (
          (() => {
            const angle = driverLocation.heading || 0;
            const icon = createCarIcon(angle);
            return <Marker position={[driverLocation.lat, driverLocation.lng]} icon={icon} />;
          })()
        )}

        {drivers && drivers.map((d, i) => (
          <Marker
            key={d.userId || i}
            position={[d.lat, d.lng]}
            icon={createCarIcon(d.heading || 0, '#3b82f6')}
          />
        ))}

        {(routeFrom || pickup) && (routeTo || dropoff) && (
          <RouteLine
            from={routeFrom || pickup}
            to={routeTo || dropoff}
            color={driverLocation ? '#3b82f6' : '#7c4dff'}
          />
        )}
      </MapContainer>
    </div>
  );
}
