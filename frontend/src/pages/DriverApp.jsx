import { useState, useEffect, useRef } from 'react';
import Map from '../components/Map';
import { api } from '../services/api';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';

export default function DriverApp() {
  const { user, logout } = useAuth();
  const socket = useSocket();
  const [isAvailable, setIsAvailable] = useState(false);
  const [pendingRides, setPendingRides] = useState([]);
  const [activeRide, setActiveRide] = useState(null);
  const [earnings, setEarnings] = useState({ total_rides: 0, total_earnings: 0 });
  const [currentLocation, setCurrentLocation] = useState([-31.8023, -58.2316]);
  const [showEarnings, setShowEarnings] = useState(false);
  const isAvailableRef = useRef(isAvailable);
  const activeRideRef = useRef(activeRide);
  isAvailableRef.current = isAvailable;
  activeRideRef.current = activeRide;

  useEffect(() => {
    const watchId = navigator.geolocation?.watchPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCurrentLocation([loc.lat, loc.lng]);
        if (socket) {
          socket.emit('driver_location', { userId: user.id, ...loc });
        }
        if (isAvailableRef.current) {
          api.driver.updateLocation(loc.lat, loc.lng).catch(console.error);
        }
      },
      () => {},
      { enableHighAccuracy: true }
    );
    return () => navigator.geolocation?.clearWatch(watchId);
  }, [socket, user]);

  useEffect(() => {
    if (!socket) return;
    const onNewRide = (ride) => {
      setPendingRides(prev => [ride, ...prev]);
    };
    const onRideUpdate = (data) => {
      if (activeRideRef.current && data.rideId === activeRideRef.current.id) {
        if (data.status === 'cancelled') {
          setActiveRide(null);
          alert('El pasajero canceló el viaje');
        }
        if (data.status === 'completed') {
          setActiveRide(null);
        }
      }
    };
    socket.on('new_ride', onNewRide);
    socket.on('ride_update_global', onRideUpdate);
    socket.on('ride_status_update', onRideUpdate);
    return () => {
      socket.off('new_ride', onNewRide);
      socket.off('ride_update_global', onRideUpdate);
      socket.off('ride_status_update', onRideUpdate);
    };
  }, [socket]);

  const toggleAvailability = async () => {
    try {
      const newStatus = isAvailable ? 'offline' : 'available';
      await api.driver.updateStatus(newStatus);
      setIsAvailable(!isAvailable);
      if (!isAvailable) {
        api.driver.updateLocation(currentLocation[0], currentLocation[1]);
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const acceptRide = async (ride) => {
    try {
      await api.driver.acceptRide(ride.id);
      socket?.emit('driver_track_ride', { rideId: ride.id });
      setActiveRide(ride);
      setPendingRides([]);
    } catch (err) {
      alert(err.message);
    }
  };

  const startRide = async () => {
    try {
      await api.driver.startRide(activeRide.id);
      setActiveRide(prev => ({ ...prev, status: 'in_progress' }));
    } catch (err) {
      alert(err.message);
    }
  };

  const completeRide = async () => {
    try {
      const fare = activeRide.fare_estimate;
      await api.driver.completeRide(activeRide.id, fare);
      setActiveRide(null);
      loadEarnings();
    } catch (err) {
      alert(err.message);
    }
  };

  const loadEarnings = async () => {
    const data = await api.driver.getEarnings();
    setEarnings(data);
  };

  return (
    <div className="h-screen flex flex-col bg-base-950">
      <header className="bg-base-900/95 backdrop-blur-xl border-b border-base-700 text-white px-4 pt-4 pb-3 flex justify-between items-center z-20">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-gradient-to-br from-accent-500 to-accent-700 rounded-xl flex items-center justify-center text-sm shadow-glow-accent">🚗</div>
          <span className="font-bold text-lg tracking-tight">Conductor</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { loadEarnings(); setShowEarnings(true); }}
            className="text-xs font-medium px-3 py-1.5 bg-base-700/70 border border-base-600 rounded-full hover:bg-base-600 transition"
          >
            Ganancias
          </button>
          <button onClick={logout} className="text-xs font-medium px-3 py-1.5 bg-red-500/15 border border-red-500/30 text-red-300 rounded-full hover:bg-red-500/25 transition">
            Salir
          </button>
        </div>
      </header>

      <div className="flex-1 relative">
        <Map
          center={currentLocation}
          pickup={
            activeRide
              ? { lat: activeRide.pickup_lat, lng: activeRide.pickup_lng }
              : pendingRides[0]
                ? { lat: pendingRides[0].pickup_lat, lng: pendingRides[0].pickup_lng }
                : null
          }
          dropoff={
            activeRide
              ? { lat: activeRide.dropoff_lat, lng: activeRide.dropoff_lng }
              : pendingRides[0]
                ? { lat: pendingRides[0].dropoff_lat, lng: pendingRides[0].dropoff_lng }
                : null
          }
          driverLocation={activeRide ? { lat: currentLocation[0], lng: currentLocation[1] } : null}
          routeFrom={
            activeRide?.status === 'accepted'
              ? { lat: currentLocation[0], lng: currentLocation[1] }
              : pendingRides[0] && !activeRide
                ? { lat: pendingRides[0].pickup_lat, lng: pendingRides[0].pickup_lng }
                : null
          }
          routeTo={
            activeRide?.status === 'accepted'
              ? { lat: activeRide.pickup_lat, lng: activeRide.pickup_lng }
              : activeRide?.status === 'in_progress'
                ? { lat: activeRide.dropoff_lat, lng: activeRide.dropoff_lng }
                : pendingRides[0] && !activeRide
                  ? { lat: pendingRides[0].dropoff_lat, lng: pendingRides[0].dropoff_lng }
                  : null
          }
          className="h-full"
        />

        <div className="absolute top-4 left-4 right-4 z-10">
          <button
            onClick={toggleAvailability}
            className={`w-full py-3 rounded-2xl font-semibold border transition ${
              isAvailable
                ? 'bg-accent-500/15 border-accent-500/40 text-accent-300 shadow-glow-accent'
                : 'bg-red-500/15 border-red-500/40 text-red-300'
            } backdrop-blur-xl`}
          >
            {isAvailable ? '🟢 Disponible' : '🔴 No disponible'}
          </button>
        </div>

        {isAvailable && pendingRides.length > 0 && !activeRide && (
          <div className="absolute bottom-0 left-0 right-0 card-voxa rounded-t-3xl p-5 max-h-[45vh] overflow-y-auto z-10">
            <h3 className="font-bold text-lg text-white mb-4">Solicitudes ({pendingRides.length})</h3>
            {pendingRides.map((ride) => (
              <div key={ride.id} className="bg-base-700/50 border border-base-600 p-4 rounded-xl mb-3">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-base-500">👤</span>
                    <p className="font-semibold text-white">{ride.passenger_name || 'Pasajero'}</p>
                    <span className="text-xs bg-accent-500/15 text-accent-300 px-2 py-0.5 rounded-full font-medium border border-accent-500/30">${ride.fare_estimate}</span>
                  </div>
                  <button
                    onClick={() => acceptRide(ride)}
                    className="bg-gradient-to-r from-accent-500 to-accent-600 text-white px-5 py-2.5 rounded-xl font-semibold text-sm shadow-glow-accent hover:from-accent-400 hover:to-accent-500 transition-all active:scale-95"
                  >
                    Aceptar
                  </button>
                </div>
                <div className="space-y-1.5 ml-1 border-l-2 border-dashed border-base-500 pl-3">
                  <div className="flex items-start gap-2">
                    <span className="text-accent-500 text-xs mt-0.5">🟢</span>
                    <span className="text-xs text-base-400 leading-tight">{ride.pickup_address || 'Sin dirección'}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-red-500 text-xs mt-0.5">🔴</span>
                    <span className="text-xs text-base-400 leading-tight">{ride.dropoff_address || 'Sin dirección'}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-2 ml-1">
                  <span className="text-xs text-base-500">{ride.payment_method === 'cash' ? '💵 Efectivo' : '📱 Transferencia'}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeRide && (
          <div className="absolute bottom-0 left-0 right-0 card-voxa rounded-t-3xl p-5 z-10">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg text-white">Viaje activo</h3>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                activeRide.status === 'accepted' ? 'bg-yellow-500/15 text-yellow-400' :
                activeRide.status === 'in_progress' ? 'bg-primary-500/15 text-primary-300' : 'bg-base-600 text-base-300'
              }`}>
                {activeRide.status === 'accepted' ? 'En camino' :
                 activeRide.status === 'in_progress' ? 'En viaje' : activeRide.status}
              </span>
            </div>

            <div className="bg-base-700/50 border border-base-600 rounded-xl p-4 space-y-3 text-sm mb-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="text-base-500">👤</span>
                  <span className="text-base-500">Pasajero</span>
                </div>
                <span className="font-semibold text-white">{activeRide.passenger_name || 'Pasajero'}</span>
              </div>
              <div className="flex justify-between items-start">
                <span className="text-base-500 shrink-0">📍 Origen</span>
                <span className="text-right max-w-[60%] text-base-300">{activeRide.pickup_address}</span>
              </div>
              <div className="flex justify-between items-start">
                <span className="text-base-500 shrink-0">🏁 Destino</span>
                <span className="text-right max-w-[60%] text-base-300">{activeRide.dropoff_address}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-base-600">
                <span className="font-semibold text-white">Tarifa</span>
                <span className="text-lg font-bold text-accent-400">${activeRide.fare_estimate}</span>
              </div>
            </div>

            <div className="flex gap-3">
              {activeRide.status === 'accepted' && (
                <button
                  onClick={startRide}
                  className="flex-1 py-3.5 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl font-bold text-sm shadow-glow hover:from-primary-400 hover:to-primary-500 transition-all active:scale-[0.98]"
                >
                  Iniciar viaje
                </button>
              )}
              {activeRide.status === 'in_progress' && (
                <button
                  onClick={completeRide}
                  className="flex-1 py-3.5 bg-gradient-to-r from-accent-500 to-accent-600 text-white rounded-xl font-bold text-sm shadow-glow-accent hover:from-accent-400 hover:to-accent-500 transition-all active:scale-[0.98]"
                >
                  Completar viaje
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {showEarnings && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="card-voxa rounded-3xl p-6 w-full max-w-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg text-white">Ganancias de hoy</h3>
              <button onClick={() => setShowEarnings(false)} className="text-base-500 hover:text-white">✕</button>
            </div>
            <div className="text-center py-6">
              <div className="text-4xl font-bold text-accent-400 mb-2">
                ${earnings.total_earnings}
              </div>
              <div className="text-base-500">
                {earnings.total_rides} viajes realizados
              </div>
            </div>
            <button
              onClick={() => setShowEarnings(false)}
              className="w-full bg-base-700 hover:bg-base-600 py-3 rounded-xl font-medium text-white transition"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
