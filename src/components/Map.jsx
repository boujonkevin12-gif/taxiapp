import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';

const driverIcon = L.divIcon({
  html: `<div style="background: #7c4dff; width: 32px; height: 32px; border-radius: 50%; border: 3px solid #0d0d14; box-shadow: 0 0 0 2px #7c4dff55, 0 4px 10px rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center;">
    <span style="font-size: 15px;">🚗</span>
  </div>`,
  className: '',
  iconSize: [32, 32],
  iconAnchor: [16, 16]
});

const pickupIcon = L.divIcon({
  html: `<div style="background: #1db866; width: 22px; height: 22px; border-radius: 50%; border: 3px solid #0d0d14; box-shadow: 0 0 0 4px #1db86633;"></div>`,
  className: '',
  iconSize: [22, 22],
  iconAnchor: [11, 11]
});

const dropoffIcon = L.divIcon({
  html: `<div style="background: #f43f5e; width: 22px; height: 22px; border-radius: 50%; border: 3px solid #0d0d14; box-shadow: 0 0 0 4px #f43f5e33;"></div>`,
  className: '',
  iconSize: [22, 22],
  iconAnchor: [11, 11]
});

function MapUpdater({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, zoom || 15);
    }
  }, [center, zoom, map]);
  return null;
}

function RouteLine({ from, to }) {
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
    <Polyline
      positions={coords}
      pathOptions={{ color: '#7c4dff', weight: 4, opacity: 0.85 }}
    />
  );
}

export default function Map({
  center = [-31.8, -58.23],
  zoom = 14,
  pickup = null,
  dropoff = null,
  driverLocation = null,
  drivers = null,
  className = '',
  onMapClick = null,
  routeFrom = null,
  routeTo = null,
  dark = true,
}) {
  const mapRef = useRef(null);

  const MapClickHandler = () => {
    const map = useMap();
    useEffect(() => {
      if (onMapClick) {
        map.on('click', (e) => {
          onMapClick(e.latlng);
        });
      }
      return () => map.off('click');
    }, [map, onMapClick]);
    return null;
  };

  return (
    <div className={`relative ${className} ${dark ? 'map-dark' : ''}`}>
      <MapContainer
        center={center}
        zoom={zoom}
        className="h-full w-full"
        ref={mapRef}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapUpdater center={center} zoom={zoom} />
        <MapClickHandler />

        {pickup && (
          <Marker position={[pickup.lat, pickup.lng]} icon={pickupIcon}>
            <Popup>Pickup</Popup>
          </Marker>
        )}

        {dropoff && (
          <Marker position={[dropoff.lat, dropoff.lng]} icon={dropoffIcon}>
            <Popup>Destino</Popup>
          </Marker>
        )}

        {driverLocation && (
          <Marker
            position={[driverLocation.lat, driverLocation.lng]}
            icon={driverIcon}
          >
            <Popup>Tu conductor</Popup>
          </Marker>
        )}

        {drivers && drivers.map((d, i) => (
          <Marker
            key={d.userId || i}
            position={[d.lat, d.lng]}
            icon={driverIcon}
          >
            <Popup>
              <div className="text-sm font-medium">{d.name}</div>
              <div className="text-xs text-gray-500">{d.plate}</div>
              <div className={`text-xs ${d.status === 'available' ? 'text-accent-600' : d.status === 'busy' ? 'text-yellow-600' : 'text-gray-400'}`}>
                {d.status === 'available' ? 'Disponible' : d.status === 'busy' ? 'En viaje' : 'Offline'}
              </div>
            </Popup>
          </Marker>
        ))}

        {(routeFrom || pickup) && (routeTo || dropoff) && (
          <RouteLine from={routeFrom || pickup} to={routeTo || dropoff} />
        )}
      </MapContainer>
    </div>
  );
}
