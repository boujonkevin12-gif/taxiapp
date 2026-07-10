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
      console.log('new_ride recibido:', ride, 'available:', isAvailableRef.current, 'activeRide:', activeRideRef.current);
      if (isAvailableRef.current && !activeRideRef.current) {
        setPendingRides(prev => [ride, ...prev]);
      }
    };
    const onRideUpdate = (data) => {
      if (activeRideRef.current && data.rideId === activeRideRef.current.id) {
        if (data.status === 'cancelled') {
          setActiveRide(null);
          alert('El pasajero canceló el viaje');
        }
      }
    };
    socket.on('new_ride', onNewRide);
    socket.on('ride_update_global', onRideUpdate);
    return () => {
      socket.off('new_ride', onNewRide);
      socket.off('ride_update_global', onRideUpdate);
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
    <div className="h-screen flex flex-col bg-gray-100">
      <header className="bg-green-600 text-white p-4 flex justify-between items-center shadow-md z-10">
        <div className="flex items-center gap-2">
          <span className="text-xl">🚗</span>
          <span className="font-semibold">Modo Conductor</span>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => { loadEarnings(); setShowEarnings(true); }} 
            className="text-sm opacity-80 hover:opacity-100"
          >
            Ganancias
          </button>
          <button onClick={logout} className="text-sm bg-green-700 px-3 py-1 rounded-full">
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
                ? 'bg-red-500 text-white hover:bg-red-600'
                : 'bg-green-500 text-white hover:bg-green-600'
            }`}
          >
            {isAvailable ? '🔴 No disponible' : '🟢 Disponible para viajes'}
          </button>
        </div>

        {pendingRides.length > 0 && !activeRide && (
          <div className="absolute bottom-0 left-0 right-0 bg-white p-4 rounded-t-2xl shadow-lg max-h-[40vh] overflow-y-auto z-10">
            <h3 className="font-bold text-lg mb-3">Solicitudes pendientes ({pendingRides.length})</h3>
            {pendingRides.map((ride) => (
              <div key={ride.id} className="bg-gray-50 p-3 rounded-lg mb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">{ride.passenger_name || 'Pasajero'}</p>
                    <p className="text-sm text-gray-500">
                      ${ride.fare_estimate} • {ride.payment_method === 'cash' ? 'Efectivo' : 'Transferencia'}
                    </p>
                  </div>
                  <button
                    onClick={() => acceptRide(ride)}
                    className="bg-green-500 text-white px-4 py-2 rounded-lg font-medium"
                  >
                    Aceptar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeRide && (
          <div className="absolute bottom-0 left-0 right-0 bg-white p-4 rounded-t-2xl shadow-lg z-10">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-lg">Viaje activo</h3>
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                activeRide.status === 'accepted' ? 'bg-yellow-100 text-yellow-700' :
                activeRide.status === 'in_progress' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100'
              }`}>
                {activeRide.status === 'accepted' ? 'Dirigiéndote al pasajero' :
                 activeRide.status === 'in_progress' ? 'En viaje' : activeRide.status}
              </span>
            </div>

            <div className="space-y-2 text-sm mb-4">
              <div className="flex justify-between">
                <span className="text-gray-500">Pasajero</span>
                <span>{activeRide.passenger_name || 'Pasajero'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Origen</span>
                <span className="text-right max-w-[60%] truncate">{activeRide.pickup_address}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Destino</span>
                <span className="text-right max-w-[60%] truncate">{activeRide.dropoff_address}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span>Tarifa</span>
                <span className="text-green-600">${activeRide.fare_estimate}</span>
              </div>
            </div>

            <div className="flex gap-2">
              {activeRide.status === 'accepted' && (
                <button
                  onClick={startRide}
                  className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold"
                >
                  Iniciar viaje
                </button>
              )}
              {activeRide.status === 'in_progress' && (
                <button
                  onClick={completeRide}
                  className="flex-1 bg-green-600 text-white py-3 rounded-lg font-semibold"
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
