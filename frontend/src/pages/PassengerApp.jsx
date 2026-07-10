import { useState, useEffect, useCallback, useRef } from 'react';
import Map from '../components/Map';
import { api } from '../services/api';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';

const GEO_KEY = import.meta.env.VITE_GEOAPIFY_KEY;

function cleanAddress(r) {
  if (r.formatted) return r.formatted;
  const addr = r.address || {};
  const road = addr.road || addr.pedestrian || addr.cycleway || '';
  const number = addr.house_number || '';
  const suburb = addr.suburb || addr.city_district || addr.neighbourhood || '';
  const city = addr.city || addr.town || addr.municipality || '';
  const street = [road, number].filter(Boolean).join(' ');
  const parts = [];
  if (street) parts.push(street);
  if (suburb && !street.toLowerCase().includes(suburb.toLowerCase())) parts.push(suburb);
  if (city) parts.push(city);
  return parts.join(', ') || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
}

async function geocode(query) {
  if (!query || query.length < 3 || !GEO_KEY) return [];
  const text = query.toLowerCase().includes('concepción') ? query : `${query}, Concepción del Uruguay`;
  const params = new URLSearchParams({
    text,
    apiKey: GEO_KEY,
    limit: '8',
    country: 'argentina',
    filter: 'circle:-58.2322,-32.4826,20000',
    bias: 'proximity:-58.2322,-32.4826',
    format: 'json',
  });
  try {
    const res = await fetch(`https://api.geoapify.com/v1/geocode/search?${params}`);
    const data = await res.json();
    return (data.results || []).map(r => ({
      lat: r.lat,
      lng: r.lon,
      display: r.formatted || r.address_line1 || `${r.lat}, ${r.lon}`,
    }));
  } catch {
    return [];
  }
}

async function reverseGeocode(lat, lng) {
  if (!GEO_KEY) return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  const params = new URLSearchParams({
    lat: lat.toString(),
    lon: lng.toString(),
    apiKey: GEO_KEY,
    format: 'json',
  });
  try {
    const res = await fetch(`https://api.geoapify.com/v1/geocode/reverse?${params}`);
    const data = await res.json();
    if (data.results && data.results[0]) {
      return data.results[0].formatted || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    }
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  } catch {
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }
}

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
  const [pickupSearch, setPickupSearch] = useState('');
  const [dropoffSearch, setDropoffSearch] = useState('');
  const [pickupResults, setPickupResults] = useState([]);
  const [dropoffResults, setDropoffResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const pickupTimeout = useRef(null);
  const dropoffTimeout = useRef(null);

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => setCurrentLocation([pos.coords.latitude, pos.coords.longitude]),
      () => {}
    );
  }, []);

  useEffect(() => {
    if (socket && currentRide) {
      socket.emit('passenger_track_ride', { rideId: currentRide.id });
      socket.on('ride_status_update', async (data) => {
        if (data.rideId === currentRide.id) {
          setCurrentRide(prev => ({ ...prev, status: data.status }));
          if (data.status === 'accepted') {
            try {
              const details = await api.passenger.getRide(data.rideId);
              setCurrentRide(details);
              setStep('on_ride');
            } catch (e) {
              console.error(e);
            }
          }
          if (data.status === 'in_progress') {
            setStep('on_ride');
          }
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

  const doGeocode = async (query, setResults) => {
    if (query.length < 3) { setResults([]); return; }
    setSearching(true);
    try {
      const results = await geocode(query);
      setResults(results);
    } catch { setResults([]); }
    setSearching(false);
  };

  const onPickupSearch = (val) => {
    setPickupSearch(val);
    clearTimeout(pickupTimeout.current);
    pickupTimeout.current = setTimeout(() => doGeocode(val, setPickupResults), 400);
  };

  const onDropoffSearch = (val) => {
    setDropoffSearch(val);
    clearTimeout(dropoffTimeout.current);
    dropoffTimeout.current = setTimeout(() => doGeocode(val, setDropoffResults), 400);
  };

  const selectPickup = (result) => {
    setPickup({ lat: result.lat, lng: result.lng });
    setPickupAddress(result.display);
    setPickupSearch(result.display);
    setPickupResults([]);
    setStep('select_dropoff');
  };

  const selectDropoff = (result) => {
    setDropoff({ lat: result.lat, lng: result.lng });
    setDropoffAddress(result.display);
    setDropoffSearch(result.display);
    setDropoffResults([]);
    setStep('confirm');
  };

  const handleMapClick = useCallback((latlng) => {
    if (step === 'select_pickup') {
      setPickup({ lat: latlng.lat, lng: latlng.lng });
      setPickupAddress(`${latlng.lat.toFixed(4)}, ${latlng.lng.toFixed(4)}`);
      setPickupSearch(`${latlng.lat.toFixed(4)}, ${latlng.lng.toFixed(4)}`);
      setStep('select_dropoff');
      reverseGeocode(latlng.lat, latlng.lng).then(addr => {
        setPickupAddress(addr);
        setPickupSearch(addr);
      });
    } else if (step === 'select_dropoff') {
      setDropoff({ lat: latlng.lat, lng: latlng.lng });
      setDropoffAddress(`${latlng.lat.toFixed(4)}, ${latlng.lng.toFixed(4)}`);
      setDropoffSearch(`${latlng.lat.toFixed(4)}, ${latlng.lng.toFixed(4)}`);
      setStep('confirm');
      reverseGeocode(latlng.lat, latlng.lng).then(addr => {
        setDropoffAddress(addr);
        setDropoffSearch(addr);
      });
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
    <div className="h-screen flex flex-col bg-gray-50">
      <header className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white px-4 pt-4 pb-3 flex justify-between items-center shadow-lg z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-sm">🚕</div>
          <span className="font-bold text-lg tracking-tight">TaxiApp</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadHistory} className="text-xs font-medium px-3 py-1.5 bg-white/15 rounded-full hover:bg-white/25 transition">
            Mis viajes
          </button>
          <button onClick={logout} className="text-xs font-medium px-3 py-1.5 bg-white/15 rounded-full hover:bg-white/25 transition">
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
          <div className="absolute bottom-0 left-0 right-0 p-5 z-10">
            <button
              onClick={() => { setStep('select_pickup'); setPickupSearch(''); setPickupResults([]); }}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 rounded-2xl font-bold text-lg shadow-xl hover:shadow-2xl hover:from-blue-700 hover:to-indigo-700 transition-all active:scale-[0.98]"
            >
              Pedir taxi
            </button>
          </div>
        )}

        {step === 'select_pickup' && (
          <div className="absolute bottom-0 left-0 right-0 z-20 flex flex-col" style={{ maxHeight: '55vh' }}>
            <div className="bg-white p-5 rounded-t-3xl shadow-2xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center shrink-0">
                  <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                </div>
                <div>
                  <span className="font-semibold text-sm text-gray-700">¿Dónde te encontás?</span>
                  <p className="text-xs text-gray-400">Origen del viaje</p>
                </div>
              </div>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Buscá una dirección..."
                  value={pickupSearch}
                  onChange={(e) => onPickupSearch(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition bg-gray-50"
                  autoFocus
                />
                {searching && <div className="absolute right-4 top-3.5 animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>}
              </div>
              {pickupResults.length > 0 && (
                <div className="mt-3 max-h-36 overflow-y-auto divide-y rounded-xl border border-gray-100">
                  {pickupResults.map((r, i) => (
                    <button
                      key={i}
                      onClick={() => selectPickup(r)}
                      className="w-full text-left px-4 py-3 text-sm hover:bg-blue-50 transition flex items-start gap-3"
                    >
                      <span className="text-gray-400 mt-0.5">📍</span>
                      <span className="text-gray-700 leading-tight">{r.display}</span>
                    </button>
                  ))}
                </div>
              )}
              <div className="mt-3 text-xs text-gray-400 text-center flex items-center justify-center gap-1">
                <span>👆</span> También tocá en el mapa
              </div>
              <button onClick={() => setStep('idle')} className="mt-3 w-full py-2.5 text-sm text-gray-500 font-medium hover:text-gray-700 transition rounded-xl hover:bg-gray-50">
                Cancelar
              </button>
            </div>
          </div>
        )}

        {step === 'select_dropoff' && (
          <div className="absolute bottom-0 left-0 right-0 z-20 flex flex-col" style={{ maxHeight: '55vh' }}>
            <div className="bg-white p-5 rounded-t-3xl shadow-2xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center shrink-0">
                  <div className="w-4 h-4 bg-red-500 rounded-full"></div>
                </div>
                <div>
                  <span className="font-semibold text-sm text-gray-700">¿Adónde vas?</span>
                  <p className="text-xs text-gray-400">Destino del viaje</p>
                </div>
              </div>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Buscá una dirección..."
                  value={dropoffSearch}
                  onChange={(e) => onDropoffSearch(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition bg-gray-50"
                  autoFocus
                />
                {searching && <div className="absolute right-4 top-3.5 animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>}
              </div>
              {dropoffResults.length > 0 && (
                <div className="mt-3 max-h-36 overflow-y-auto divide-y rounded-xl border border-gray-100">
                  {dropoffResults.map((r, i) => (
                    <button
                      key={i}
                      onClick={() => selectDropoff(r)}
                      className="w-full text-left px-4 py-3 text-sm hover:bg-blue-50 transition flex items-start gap-3"
                    >
                      <span className="text-gray-400 mt-0.5">📍</span>
                      <span className="text-gray-700 leading-tight">{r.display}</span>
                    </button>
                  ))}
                </div>
              )}
              <div className="mt-3 text-xs text-gray-400 text-center flex items-center justify-center gap-1">
                <span>👆</span> También tocá en el mapa
              </div>
              <div className="flex gap-3 mt-3">
                <button onClick={() => { setStep('select_pickup'); setDropoff(null); setDropoffSearch(''); setDropoffResults([]); }} className="flex-1 py-2.5 text-sm text-gray-500 font-medium hover:text-gray-700 transition rounded-xl hover:bg-gray-50">
                  Volver
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 'confirm' && estimate && (
          <div className="absolute bottom-0 left-0 right-0 bg-white p-5 rounded-t-3xl shadow-2xl z-10">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm">🚕</div>
              <h3 className="font-bold text-lg text-gray-800">Confirmar viaje</h3>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 mb-4 space-y-2 text-sm">
              <div className="flex items-start gap-2">
                <span className="text-green-500 mt-0.5">🟢</span>
                <span className="text-gray-600 text-xs leading-tight">{pickupAddress}</span>
              </div>
              <div className="border-l-2 border-dashed border-gray-300 ml-2 h-2"></div>
              <div className="flex items-start gap-2">
                <span className="text-red-500 mt-0.5">🔴</span>
                <span className="text-gray-600 text-xs leading-tight">{dropoffAddress}</span>
              </div>
            </div>
            <div className="space-y-3 mb-5">
              <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="text-gray-400">📏</span>
                  <span className="text-sm text-gray-500">Distancia</span>
                </div>
                <span className="text-sm font-semibold text-gray-700">{estimate.distance_km} km</span>
              </div>
              <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="text-gray-400">⏱</span>
                  <span className="text-sm text-gray-500">Tiempo estimado</span>
                </div>
                <span className="text-sm font-semibold text-gray-700">{estimate.duration_min} min</span>
              </div>
              <div className="flex items-center justify-between bg-blue-50 rounded-xl px-4 py-3 border border-blue-100">
                <span className="text-sm font-semibold text-gray-700">Tarifa estimada</span>
                <span className="text-xl font-bold text-blue-600">${estimate.fare_estimate}</span>
              </div>
            </div>

            <div className="mb-5">
              <label className="block text-sm font-semibold text-gray-700 mb-3">Forma de pago</label>
              <div className="flex gap-3">
                <button
                  onClick={() => setPaymentMethod('cash')}
                  className={`flex-1 py-3 rounded-xl font-medium text-sm border-2 transition ${
                    paymentMethod === 'cash'
                      ? 'border-blue-600 bg-blue-50 text-blue-700'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  💵 Efectivo
                </button>
                <button
                  onClick={() => setPaymentMethod('mercadopago_transfer')}
                  className={`flex-1 py-3 rounded-xl font-medium text-sm border-2 transition ${
                    paymentMethod === 'mercadopago_transfer'
                      ? 'border-blue-600 bg-blue-50 text-blue-700'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  📱 Transferencia MP
                </button>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { setStep('idle'); setDropoff(null); setEstimate(null); }}
                className="flex-1 py-3.5 border-2 border-gray-200 rounded-xl text-sm font-semibold text-gray-500 hover:bg-gray-50 transition"
              >
                Cancelar
              </button>
              <button
                onClick={requestRide}
                className="flex-1 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold text-sm shadow-lg hover:shadow-xl hover:from-blue-700 hover:to-indigo-700 transition-all active:scale-[0.98]"
              >
                Confirmar $<span className="text-lg">{estimate.fare_estimate}</span>
              </button>
            </div>
          </div>
        )}

        {step === 'waiting' && (
          <div className="absolute bottom-0 left-0 right-0 bg-white p-6 rounded-t-3xl shadow-2xl z-10">
            <div className="text-center">
              <div className="relative mx-auto mb-5 w-16 h-16">
                <div className="absolute inset-0 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600"></div>
                <div className="absolute inset-0 flex items-center justify-center text-2xl">🚕</div>
              </div>
              <h3 className="font-bold text-xl text-gray-800">Buscando conductor</h3>
              <p className="text-gray-400 text-sm mt-2">Esperá un momento, ya encontramos a alguien</p>
              <button onClick={cancelRide} className="mt-6 w-full py-3 border-2 border-red-100 text-red-500 rounded-xl font-semibold text-sm hover:bg-red-50 transition">
                Cancelar viaje
              </button>
            </div>
          </div>
        )}

        {step === 'on_ride' && currentRide && (
          <div className="absolute bottom-0 left-0 right-0 bg-white p-5 rounded-t-3xl shadow-2xl z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center text-2xl border-2 border-blue-200">
                🚗
              </div>
              <div>
                <h3 className="font-bold text-lg text-gray-800">{currentRide.driver_name || 'Conductor'}</h3>
                <p className="text-sm text-gray-500">
                  {currentRide.vehicle_type} • {currentRide.plate}
                </p>
              </div>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 space-y-3 text-sm mb-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Estado</span>
                <span className={`font-semibold px-3 py-1 rounded-full text-xs ${
                  currentRide.status === 'accepted' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'
                }`}>
                  {currentRide.status === 'accepted' ? 'Conductor en camino' : 'Viaje en progreso'}
                </span>
              </div>
              <div className="flex justify-between items-start">
                <span className="text-gray-500 shrink-0">Origen</span>
                <span className="text-right max-w-[65%] text-gray-700">{currentRide.pickup_address}</span>
              </div>
              <div className="flex justify-between items-start">
                <span className="text-gray-500 shrink-0">Destino</span>
                <span className="text-right max-w-[65%] text-gray-700">{currentRide.dropoff_address}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                <span className="font-semibold text-gray-700">Tarifa</span>
                <span className="text-lg font-bold text-blue-600">${currentRide.fare_estimate}</span>
              </div>
            </div>
            {currentRide.status === 'accepted' && (
              <button onClick={cancelRide} className="w-full py-3 border-2 border-red-100 text-red-500 rounded-xl font-semibold text-sm hover:bg-red-50 transition">
                Cancelar viaje
              </button>
            )}
          </div>
        )}

        {step === 'rate' && (
          <div className="absolute bottom-0 left-0 right-0 bg-white p-6 rounded-t-3xl shadow-2xl z-10">
            <h3 className="font-bold text-xl text-gray-800 text-center mb-2">Calificá tu viaje</h3>
            <p className="text-gray-400 text-sm text-center mb-6">¿Cómo fue tu experiencia?</p>
            <div className="flex justify-center gap-3 mb-6">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  className={`text-4xl transition-all duration-150 ${
                    star <= rating ? 'text-yellow-400 scale-110' : 'text-gray-200 hover:text-yellow-300'
                  }`}
                >
                  ★
                </button>
              ))}
            </div>
            <button
              onClick={rateRide}
              className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold text-sm shadow-lg hover:shadow-xl hover:from-blue-700 hover:to-indigo-700 transition-all active:scale-[0.98]"
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
