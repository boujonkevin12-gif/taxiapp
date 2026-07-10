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
      console.log('new_ride recibido:', ride);
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
    <div className="h-screen flex flex-col bg-gray-50">
      <header className="bg-gradient-to-r from-green-600 to-emerald-700 text-white px-4 pt-4 pb-3 flex justify-between items-center shadow-lg z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-sm">🚗</div>
          <span className="font-bold text-lg tracking-tight">Conductor</span>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => { loadEarnings(); setShowEarnings(true); }} 
            className="text-xs font-medium px-3 py-1.5 bg-white/15 rounded-full hover:bg-white/25 transition"
          >
            Ganancias
          </button>
          <button onClick={logout} className="text-xs font-medium px-3 py-1.5 bg-white/15 rounded-full hover:bg-white/25 transition">
            Salir
          </button>
        </div>
      </header>

      <div className="flex-1 relative">
        <Map
          center={currentLocation}
          driverLocation={activeRide ? { lat: currentLocation[0], lng: currentLocation[1] } : null}
          className="h-full"
        />

        <div className="absolute top-4 left-4 right-4 z-10">
          <button
            onClick={toggleAvailability}
            className={`w-full py-3 rounded-xl font-semibold shadow-lg transition ${
              isAvailable
                ? 'bg-green-500 text-white hover:bg-green-600'
                : 'bg-red-500 text-white hover:bg-red-600'
            }`}
          >
            {isAvailable ? '🟢 Disponible' : '🔴 No disponible'}
          </button>
        </div>

        {isAvailable && pendingRides.length > 0 && !activeRide && (
          <div className="absolute bottom-0 left-0 right-0 bg-white p-5 rounded-t-3xl shadow-2xl max-h-[45vh] overflow-y-auto z-10">
            <h3 className="font-bold text-lg text-gray-800 mb-4">Solicitudes ({pendingRides.length})</h3>
            {pendingRides.map((ride) => (
              <div key={ride.id} className="bg-gray-50 p-4 rounded-xl mb-3 border border-gray-100">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-gray-400">👤</span>
                      <p className="font-semibold text-gray-800">{ride.passenger_name || 'Pasajero'}</p>
                    </div>
                    <p className="text-sm text-gray-500 ml-6">
                      ${ride.fare_estimate} • {ride.payment_method === 'cash' ? 'Efectivo' : 'Transferencia'}
                    </p>
                  </div>
                  <button
                    onClick={() => acceptRide(ride)}
                    className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-5 py-2.5 rounded-xl font-semibold text-sm shadow-md hover:shadow-lg hover:from-green-600 hover:to-emerald-700 transition-all active:scale-95"
                  >
                    Aceptar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeRide && (
          <div className="absolute bottom-0 left-0 right-0 bg-white p-5 rounded-t-3xl shadow-2xl z-10">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg text-gray-800">Viaje activo</h3>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                activeRide.status === 'accepted' ? 'bg-yellow-100 text-yellow-700' :
                activeRide.status === 'in_progress' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100'
              }`}>
                {activeRide.status === 'accepted' ? 'En camino' :
                 activeRide.status === 'in_progress' ? 'En viaje' : activeRide.status}
              </span>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 space-y-3 text-sm mb-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="text-gray-400">👤</span>
                  <span className="text-gray-500">Pasajero</span>
                </div>
                <span className="font-semibold text-gray-800">{activeRide.passenger_name || 'Pasajero'}</span>
              </div>
              <div className="flex justify-between items-start">
                <span className="text-gray-500 shrink-0">📍 Origen</span>
                <span className="text-right max-w-[60%] text-gray-700">{activeRide.pickup_address}</span>
              </div>
              <div className="flex justify-between items-start">
                <span className="text-gray-500 shrink-0">🏁 Destino</span>
                <span className="text-right max-w-[60%] text-gray-700">{activeRide.dropoff_address}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                <span className="font-semibold text-gray-700">Tarifa</span>
                <span className="text-lg font-bold text-emerald-600">${activeRide.fare_estimate}</span>
              </div>
            </div>

            <div className="flex gap-3">
              {activeRide.status === 'accepted' && (
                <button
                  onClick={startRide}
                  className="flex-1 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold text-sm shadow-lg hover:shadow-xl hover:from-blue-700 hover:to-indigo-700 transition-all active:scale-[0.98]"
                >
                  Iniciar viaje
                </button>
              )}
              {activeRide.status === 'in_progress' && (
                <button
                  onClick={completeRide}
                  className="flex-1 py-3.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-bold text-sm shadow-lg hover:shadow-xl hover:from-green-600 hover:to-emerald-700 transition-all active:scale-[0.98]"
                >
                  Completar viaje
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {showEarnings && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg">Ganancias de hoy</h3>
              <button onClick={() => setShowEarnings(false)} className="text-gray-500">✕</button>
            </div>
            <div className="text-center py-6">
              <div className="text-4xl font-bold text-green-600 mb-2">
                ${earnings.total_earnings}
              </div>
              <div className="text-gray-500">
                {earnings.total_rides} viajes realizados
              </div>
            </div>
            <button
              onClick={() => setShowEarnings(false)}
              className="w-full bg-gray-100 py-3 rounded-lg font-medium"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
