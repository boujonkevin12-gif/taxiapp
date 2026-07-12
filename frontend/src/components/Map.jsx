import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';

const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const driverIcon = L.divIcon({
  html: `<div style="background: #2563eb; width: 30px; height: 30px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;">
    <span style="color: white; font-size: 14px;">🚗</span>
  </div>`,
  className: '',
  iconSize: [30, 30],
  iconAnchor: [15, 15]
});

const pickupIcon = L.divIcon({
  html: `<div style="background: #22c55e; width: 25px; height: 25px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"></div>`,
  className: '',
  iconSize: [25, 25],
  iconAnchor: [12, 12]
});

const dropoffIcon = L.divIcon({
  html: `<div style="background: #ef4444; width: 25px; height: 25px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"></div>`,
  className: '',
  iconSize: [25, 25],
  iconAnchor: [12, 12]
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
      pathOptions={{ color: '#3b82f6', weight: 4, opacity: 0.7 }}
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
    <div className={`relative ${className}`}>
      <MapContainer
        center={center}
        zoom={zoom}
        className="h-full w-full"
        ref={mapRef}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> | &copy; <a href="https://geoapify.com">Geoapify</a>'
          url={`https://maps.geoapify.com/v1/tile/osm-carto/{z}/{x}/{y}.png?apiKey=${import.meta.env.VITE_GEOAPIFY_KEY || '89bd19294b5b4b1687157be957e39e96'}`}
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
              <div className={`text-xs ${d.status === 'available' ? 'text-green-600' : d.status === 'busy' ? 'text-yellow-600' : 'text-gray-400'}`}>
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
