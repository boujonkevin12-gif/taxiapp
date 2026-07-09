import { useState, useEffect, useCallback } from 'react';
import Map from '../components/Map';
import { api } from '../services/api';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';

export default function PassengerApp() {
  const { user, logout } = useAuth();
  const socket = useSocket();
  const [step, setStep] = useState('idle');
  const [pickup, setPickup] = useState(null);
  const [dropoff, setDropoff] = useState(null);
  const [pickupAddress, setPickupAddress] = useState('');
  const [dropoffAddress, setDropoffAddress] = useState('');
  const [estimate, setEstimate] = useState(null);
  const [currentRide, setCurrentRide] = useState(null);
  const [driverLocation, setDriverLocation] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [rides, setRides] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [rating, setRating] = useState(5);
  const [currentLocation, setCurrentLocation] = useState([-31.8023, -58.2316]);

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => setCurrentLocation([pos.coords.latitude, pos.coords.longitude]),
      () => {}
    );
  }, []);

  useEffect(() => {
    if (socket && currentRide) {
      socket.emit('passenger_track_ride', { rideId: currentRide.id });
      socket.on('ride_status_update', (data) => {
        if (data.rideId === currentRide.id) {
          setCurrentRide(prev => ({ ...prev, status: data.status }));
          if (data.status === 'completed') {
            setStep('rate');
          }
          if (data.status === 'cancelled') {
            setStep('idle');
            setCurrentRide(null);
          }
        }
      });
      socket.on('driver_moved', (data) => {
        setDriverLocation({ lat: data.lat, lng: data.lng });
      });
      return () => {
        socket.off('ride_status_update');
        socket.off('driver_moved');
      };
    }
  }, [socket, currentRide]);

  const handleMapClick = useCallback((latlng) => {
    if (step === 'select_pickup') {
      setPickup({ lat: latlng.lat, lng: latlng.lng });
      setPickupAddress(`${latlng.lat.toFixed(4)}, ${latlng.lng.toFixed(4)}`);
      setStep('select_dropoff');
    } else if (step === 'select_dropoff') {
      setDropoff({ lat: latlng.lat, lng: latlng.lng });
      setDropoffAddress(`${latlng.lat.toFixed(4)}, ${latlng.lng.toFixed(4)}`);
      setStep('confirm');
    }
  }, [step]);

  useEffect(() => {
    if (step === 'confirm' && pickup && dropoff) {
      api.passenger.estimate({
        pickup_lat: pickup.lat,
        pickup_lng: pickup.lng,
        dropoff_lat: dropoff.lat,
        dropoff_lng: dropoff.lng,
      }).then(setEstimate);
    }
  }, [step, pickup, dropoff]);

  const requestRide = async () => {
    try {
      const ride = await api.passenger.createRide({
        pickup_lat: pickup.lat,
        pickup_lng: pickup.lng,
        pickup_address: pickupAddress,
        dropoff_lat: dropoff.lat,
        dropoff_lng: dropoff.lng,
        dropoff_address: dropoffAddress,
        fare_estimate: estimate.fare_estimate,
        payment_method: paymentMethod,
      });
      setCurrentRide(ride);
      setStep('waiting');
    } catch (err) {
      alert(err.message);
    }
  };

  const cancelRide = async () => {
    try {
      await api.passenger.cancelRide(currentRide.id);
      setStep('idle');
      setCurrentRide(null);
      setPickup(null);
      setDropoff(null);
      setEstimate(null);
    } catch (err) {
      alert(err.message);
    }
  };

  const rateRide = async () => {
    try {
      await api.passenger.rateRide(currentRide.id, rating, '');
      setStep('idle');
      setCurrentRide(null);
      setPickup(null);
      setDropoff(null);
      setEstimate(null);
      setRating(5);
    } catch (err) {
      alert(err.message);
    }
  };

  const loadHistory = async () => {
    const data = await api.passenger.getRides();
    setRides(data);
    setShowHistory(true);
  };

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      <header className="bg-blue-600 text-white p-4 flex justify-between items-center shadow-md z-10">
        <div className="flex items-center gap-2">
          <span className="text-xl">🚕</span>
          <span className="font-semibold">Taxi App</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={loadHistory} className="text-sm opacity-80 hover:opacity-100">
            Mis viajes
          </button>
          <span className="text-sm opacity-80">{user?.name}</span>
          <button onClick={logout} className="text-sm bg-blue-700 px-3 py-1 rounded-full">
            Salir
          </button>
        </div>
      </header>

      <div className="flex-1 relative">
        <Map
          center={currentLocation}
          pickup={pickup}
          dropoff={dropoff}
          driverLocation={driverLocation}
          onMapClick={handleMapClick}
          className="h-full"
        />

        {step === 'idle' && (
          <div className="absolute bottom-0 left-0 right-0 p-4 z-10">
            <button
              onClick={() => setStep('select_pickup')}
              className="w-full bg-blue-600 text-white py-4 rounded-xl font-semibold text-lg shadow-lg hover:bg-blue-700 transition"
            >
              Pedir taxi
            </button>
          </div>
        )}

        {step === 'select_pickup' && (
          <div className="absolute bottom-0 left-0 right-0 bg-white p-4 rounded-t-2xl shadow-lg z-10">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="font-medium">Tocá el mapa para elegir el punto de recolección</span>
            </div>
            <button onClick={() => setStep('idle')} className="text-gray-500 text-sm">
              Cancelar
            </button>
          </div>
        )}

        {step === 'select_dropoff' && (
          <div className="absolute bottom-0 left-0 right-0 bg-white p-4 rounded-t-2xl shadow-lg z-10">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span className="font-medium">Ahora tocá el mapa para elegir el destino</span>
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setStep('select_pickup'); setDropoff(null); }} className="text-gray-500 text-sm">
                Volver
              </button>
            </div>
          </div>
        )}

        {step === 'confirm' && estimate && (
          <div className="absolute bottom-0 left-0 right-0 bg-white p-4 rounded-t-2xl shadow-lg z-10">
            <h3 className="font-bold text-lg mb-3">Confirmar viaje</h3>
            
            <div className="space-y-2 mb-4 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Distancia</span>
                <span>{estimate.distance_km} km</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Tiempo estimado</span>
                <span>{estimate.duration_min} min</span>
              </div>
              <div className="flex justify-between text-lg font-bold">
                <span>Tarifa estimada</span>
                <span className="text-blue-600">${estimate.fare_estimate}</span>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Forma de pago</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setPaymentMethod('cash')}
                  className={`flex-1 py-2 rounded-lg border ${
                    paymentMethod === 'cash'
                      ? 'border-blue-600 bg-blue-50 text-blue-600'
                      : 'border-gray-300'
                  }`}
                >
                  Efectivo
                </button>
                <button
                  onClick={() => setPaymentMethod('mercadopago_transfer')}
                  className={`flex-1 py-2 rounded-lg border ${
                    paymentMethod === 'mercadopago_transfer'
                      ? 'border-blue-600 bg-blue-50 text-blue-600'
                      : 'border-gray-300'
                  }`}
                >
                  Transferencia MP
                </button>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => { setStep('idle'); setDropoff(null); setEstimate(null); }}
                className="flex-1 py-3 border border-gray-300 rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={requestRide}
                className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-semibold"
              >
                Confirmar ${estimate.fare_estimate}
              </button>
            </div>
          </div>
        )}

        {step === 'waiting' && (
          <div className="absolute bottom-0 left-0 right-0 bg-white p-4 rounded-t-2xl shadow-lg z-10">
            <div className="text-center">
              <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-3"></div>
              <h3 className="font-bold text-lg">Buscando conductor...</h3>
              <p className="text-gray-500 text-sm mt-1">Esperá un momento</p>
              <button onClick={cancelRide} className="mt-4 text-red-500 text-sm font-medium">
                Cancelar viaje
              </button>
            </div>
          </div>
        )}

        {step === 'rate' && (
          <div className="absolute bottom-0 left-0 right-0 bg-white p-4 rounded-t-2xl shadow-lg z-10">
            <h3 className="font-bold text-lg mb-3">Calificá tu viaje</h3>
            <div className="flex justify-center gap-2 mb-4">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  className={`text-3xl ${star <= rating ? 'text-yellow-400' : 'text-gray-300'}`}
                >
                  ★
                </button>
              ))}
            </div>
            <button
              onClick={rateRide}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold"
            >
              Enviar calificación
            </button>
          </div>
        )}
      </div>

      {showHistory && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
          <div className="bg-white w-full max-h-[70vh] rounded-t-2xl p-4 overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg">Mis viajes</h3>
              <button onClick={() => setShowHistory(false)} className="text-gray-500">✕</button>
            </div>
            {rides.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No tenés viajes aún</p>
            ) : (
              <div className="space-y-3">
                {rides.map((ride) => (
                  <div key={ride.id} className="bg-gray-50 p-3 rounded-lg">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">
                        {new Date(ride.created_at).toLocaleDateString()}
                      </span>
                      <span className={`text-sm font-medium ${
                        ride.status === 'completed' ? 'text-green-600' : 
                        ride.status === 'cancelled' ? 'text-red-600' : 'text-yellow-600'
                      }`}>
                        {ride.status === 'completed' ? 'Completado' :
                         ride.status === 'cancelled' ? 'Cancelado' : ride.status}
                      </span>
                    </div>
                    <div className="text-sm mt-1">{ride.pickup_address} → {ride.dropoff_address}</div>
                    <div className="font-bold mt-1">${ride.fare_final || ride.fare_estimate}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
