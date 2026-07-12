import { useState, useEffect, useCallback, useRef } from 'react';
import Map from '../components/Map';
import { api } from '../services/api';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';

const GEO_KEY = import.meta.env.VITE_GEOAPIFY_KEY || '89bd19294b5b4b1687157be957e39e96';

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
      <header className="absolute top-0 left-0 right-0 z-50 p-4">
        <div className="backdrop-blur-xl bg-slate-900/80 border border-slate-700 rounded-3xl shadow-xl p-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-green-500 flex items-center justify-center text-3xl">🚖</div>
              <div>
                <h1 className="text-white text-xl font-bold">Taxi App</h1>
                <p className="text-slate-400 text-sm">Hola {user?.name}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={loadHistory} className="bg-slate-800 hover:bg-slate-700 rounded-xl px-4 py-2 text-white">📋</button>
              <button onClick={logout} className="bg-red-500 hover:bg-red-600 rounded-xl px-4 py-2 text-white">Salir</button>
            </div>
          </div>
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
          <div className="absolute inset-x-0 bottom-0 z-20 p-5">
            <div className="bg-slate-900/90 backdrop-blur-xl rounded-t-3xl rounded-b-3xl border border-slate-700 shadow-2xl p-6">
              <h2 className="text-2xl font-bold text-white">¿A dónde vas?</h2>
              <p className="text-slate-400 mt-1">Pedí un taxi en segundos.</p>
              <button
                onClick={() => { setPickupSearch(""); setPickupResults([]); setStep("select_pickup"); }}
                className="mt-6 w-full bg-green-500 hover:bg-green-600 transition-all duration-300 rounded-2xl py-4 text-white font-bold text-lg shadow-lg shadow-green-500/30"
              >
                🚖 Pedir Taxi
              </button>
              <div className="grid grid-cols-2 gap-3 mt-4">
                <button className="bg-slate-800 rounded-2xl py-3 text-white hover:bg-slate-700 transition">🏠 Casa</button>
                <button className="bg-slate-800 rounded-2xl py-3 text-white hover:bg-slate-700 transition">💼 Trabajo</button>
              </div>
            </div>
          </div>
        )}

        {step === 'select_pickup' && (
          <div className="absolute bottom-0 left-0 right-0 z-20 flex flex-col" style={{ maxHeight: '55vh' }}>
            <div className="bg-slate-900/95 backdrop-blur-xl p-5 rounded-t-3xl border border-slate-700">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center shrink-0 border border-green-500/30">
                  <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                </div>
                <div>
                  <span className="font-semibold text-sm text-white">¿Dónde te encontás?</span>
                  <p className="text-xs text-slate-400">Origen del viaje</p>
                </div>
              </div>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Buscá una dirección..."
                  value={pickupSearch}
                  onChange={(e) => onPickupSearch(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-xl text-sm text-white placeholder-slate-400 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition"
                  autoFocus
                />
                {searching && <div className="absolute right-4 top-3.5 animate-spin w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full"></div>}
              </div>
              {pickupResults.length > 0 && (
                <div className="mt-3 max-h-36 overflow-y-auto divide-y divide-slate-700 rounded-xl border border-slate-700">
                  {pickupResults.map((r, i) => (
                    <button
                      key={i}
                      onClick={() => selectPickup(r)}
                      className="w-full text-left px-4 py-3 text-sm text-slate-200 hover:bg-slate-800 transition flex items-start gap-3"
                    >
                      <span className="text-slate-500 mt-0.5">📍</span>
                      <span className="leading-tight">{r.display}</span>
                    </button>
                  ))}
                </div>
              )}
              <div className="mt-3 text-xs text-slate-500 text-center">👆 También tocá en el mapa</div>
              <button onClick={() => setStep('idle')} className="mt-3 w-full py-2.5 text-sm text-slate-400 font-medium hover:text-white transition rounded-xl hover:bg-slate-800">
                Cancelar
              </button>
            </div>
          </div>
        )}

        {step === 'select_dropoff' && (
          <div className="absolute bottom-0 left-0 right-0 z-20 flex flex-col" style={{ maxHeight: '55vh' }}>
            <div className="bg-slate-900/95 backdrop-blur-xl p-5 rounded-t-3xl border border-slate-700">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center shrink-0 border border-red-500/30">
                  <div className="w-4 h-4 bg-red-500 rounded-full"></div>
                </div>
                <div>
                  <span className="font-semibold text-sm text-white">¿Adónde vas?</span>
                  <p className="text-xs text-slate-400">Destino del viaje</p>
                </div>
              </div>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Buscá una dirección..."
                  value={dropoffSearch}
                  onChange={(e) => onDropoffSearch(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-xl text-sm text-white placeholder-slate-400 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition"
                  autoFocus
                />
                {searching && <div className="absolute right-4 top-3.5 animate-spin w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full"></div>}
              </div>
              {dropoffResults.length > 0 && (
                <div className="mt-3 max-h-36 overflow-y-auto divide-y divide-slate-700 rounded-xl border border-slate-700">
                  {dropoffResults.map((r, i) => (
                    <button
                      key={i}
                      onClick={() => selectDropoff(r)}
                      className="w-full text-left px-4 py-3 text-sm text-slate-200 hover:bg-slate-800 transition flex items-start gap-3"
                    >
                      <span className="text-slate-500 mt-0.5">📍</span>
                      <span className="leading-tight">{r.display}</span>
                    </button>
                  ))}
                </div>
              )}
              <div className="mt-3 text-xs text-slate-500 text-center">👆 También tocá en el mapa</div>
              <button onClick={() => { setStep('select_pickup'); setDropoff(null); setDropoffSearch(''); setDropoffResults([]); }} className="mt-3 w-full py-2.5 text-sm text-slate-400 font-medium hover:text-white transition rounded-xl hover:bg-slate-800">
                Volver
              </button>
            </div>
          </div>
        )}

        {step === 'confirm' && estimate && (
          <div className="absolute bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-xl p-5 rounded-t-3xl border border-slate-700 z-10">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center text-sm border border-green-500/30">🚕</div>
              <h3 className="font-bold text-lg text-white">Confirmar viaje</h3>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-3 mb-4 space-y-2 text-sm">
              <div className="flex items-start gap-2">
                <span className="text-green-500 mt-0.5">🟢</span>
                <span className="text-slate-300 text-xs leading-tight">{pickupAddress}</span>
              </div>
              <div className="border-l-2 border-dashed border-slate-600 ml-2 h-2"></div>
              <div className="flex items-start gap-2">
                <span className="text-red-500 mt-0.5">🔴</span>
                <span className="text-slate-300 text-xs leading-tight">{dropoffAddress}</span>
              </div>
            </div>
            <div className="space-y-3 mb-5">
              <div className="flex items-center justify-between bg-slate-800/50 rounded-xl px-4 py-3">
                <span className="text-sm text-slate-400">📏 Distancia</span>
                <span className="text-sm font-semibold text-white">{estimate.distance_km} km</span>
              </div>
              <div className="flex items-center justify-between bg-slate-800/50 rounded-xl px-4 py-3">
                <span className="text-sm text-slate-400">⏱ Tiempo estimado</span>
                <span className="text-sm font-semibold text-white">{estimate.duration_min} min</span>
              </div>
              <div className="flex items-center justify-between bg-green-500/10 rounded-xl px-4 py-3 border border-green-500/20">
                <span className="text-sm font-semibold text-slate-300">Tarifa estimada</span>
                <span className="text-xl font-bold text-green-400">${estimate.fare_estimate}</span>
              </div>
            </div>

            <div className="mb-5">
              <label className="block text-sm font-semibold text-slate-300 mb-3">Forma de pago</label>
              <div className="flex gap-3">
                <button
                  onClick={() => setPaymentMethod('cash')}
                  className={`flex-1 py-3 rounded-xl font-medium text-sm border-2 transition ${
                    paymentMethod === 'cash'
                      ? 'border-green-500 bg-green-500/10 text-green-400'
                      : 'border-slate-600 text-slate-400 hover:border-slate-500'
                  }`}
                >
                  💵 Efectivo
                </button>
                <button
                  onClick={() => setPaymentMethod('mercadopago_transfer')}
                  className={`flex-1 py-3 rounded-xl font-medium text-sm border-2 transition ${
                    paymentMethod === 'mercadopago_transfer'
                      ? 'border-green-500 bg-green-500/10 text-green-400'
                      : 'border-slate-600 text-slate-400 hover:border-slate-500'
                  }`}
                >
                  📱 Transferencia MP
                </button>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => { setStep('idle'); setDropoff(null); setEstimate(null); }} className="flex-1 py-3.5 border-2 border-slate-600 rounded-xl text-sm font-semibold text-slate-400 hover:bg-slate-800 transition">
                Cancelar
              </button>
              <button onClick={requestRide} className="flex-1 py-3.5 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-green-500/30 transition-all active:scale-[0.98]">
                Confirmar $<span className="text-lg">{estimate.fare_estimate}</span>
              </button>
            </div>
          </div>
        )}

        {step === 'waiting' && (
          <div className="absolute bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-xl p-6 rounded-t-3xl border border-slate-700 z-10">
            <div className="text-center">
              <div className="relative mx-auto mb-5 w-16 h-16">
                <div className="absolute inset-0 animate-spin rounded-full border-4 border-slate-600 border-t-green-500"></div>
                <div className="absolute inset-0 flex items-center justify-center text-2xl">🚕</div>
              </div>
              <h3 className="font-bold text-xl text-white">Buscando conductor</h3>
              <p className="text-slate-400 text-sm mt-2">Esperá un momento, ya encontramos a alguien</p>
              <button onClick={cancelRide} className="mt-6 w-full py-3 border-2 border-red-500/30 text-red-400 rounded-xl font-semibold text-sm hover:bg-red-500/10 transition">
                Cancelar viaje
              </button>
            </div>
          </div>
        )}

        {step === 'on_ride' && currentRide && (
          <div className="absolute bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-xl p-5 rounded-t-3xl border border-slate-700 z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-14 h-14 bg-slate-800 rounded-full flex items-center justify-center text-2xl border-2 border-slate-600">🚗</div>
              <div>
                <h3 className="font-bold text-lg text-white">{currentRide.driver_name || 'Conductor'}</h3>
                <p className="text-sm text-slate-400">{currentRide.vehicle_type} • {currentRide.plate}</p>
              </div>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-4 space-y-3 text-sm mb-4">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Estado</span>
                <span className={`font-semibold px-3 py-1 rounded-full text-xs ${
                  currentRide.status === 'accepted' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-blue-500/20 text-blue-400'
                }`}>
                  {currentRide.status === 'accepted' ? 'Conductor en camino' : 'Viaje en progreso'}
                </span>
              </div>
              <div className="flex justify-between items-start">
                <span className="text-slate-400 shrink-0">Origen</span>
                <span className="text-right max-w-[65%] text-slate-300">{currentRide.pickup_address}</span>
              </div>
              <div className="flex justify-between items-start">
                <span className="text-slate-400 shrink-0">Destino</span>
                <span className="text-right max-w-[65%] text-slate-300">{currentRide.dropoff_address}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-slate-700">
                <span className="font-semibold text-slate-300">Tarifa</span>
                <span className="text-lg font-bold text-green-400">${currentRide.fare_estimate}</span>
              </div>
            </div>
            {currentRide.status === 'accepted' && (
              <button onClick={cancelRide} className="w-full py-3 border-2 border-red-500/30 text-red-400 rounded-xl font-semibold text-sm hover:bg-red-500/10 transition">
                Cancelar viaje
              </button>
            )}
          </div>
        )}

        {step === 'rate' && (
          <div className="absolute bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-xl p-6 rounded-t-3xl border border-slate-700 z-10">
            <h3 className="font-bold text-xl text-white text-center mb-2">Calificá tu viaje</h3>
            <p className="text-slate-400 text-sm text-center mb-6">¿Cómo fue tu experiencia?</p>
            <div className="flex justify-center gap-3 mb-6">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  className={`text-4xl transition-all duration-150 ${
                    star <= rating ? 'text-yellow-400 scale-110' : 'text-slate-600 hover:text-yellow-500'
                  }`}
                >
                  ★
                </button>
              ))}
            </div>
            <button onClick={rateRide} className="w-full py-3.5 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-green-500/30 transition-all active:scale-[0.98]">
              Enviar calificación
            </button>
          </div>
        )}
      </div>

      {showHistory && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-end">
          <div className="bg-slate-900 w-full max-h-[70vh] rounded-t-3xl p-4 overflow-y-auto border-t border-slate-700">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg text-white">Mis viajes</h3>
              <button onClick={() => setShowHistory(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            {rides.length === 0 ? (
              <p className="text-slate-500 text-center py-8">No tenés viajes aún</p>
            ) : (
              <div className="space-y-3">
                {rides.map((ride) => (
                  <div key={ride.id} className="bg-slate-800 p-3 rounded-xl">
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-400">{new Date(ride.created_at).toLocaleDateString()}</span>
                      <span className={`text-sm font-medium ${
                        ride.status === 'completed' ? 'text-green-400' : 
                        ride.status === 'cancelled' ? 'text-red-400' : 'text-yellow-400'
                      }`}>
                        {ride.status === 'completed' ? 'Completado' :
                         ride.status === 'cancelled' ? 'Cancelado' : ride.status}
                      </span>
                    </div>
                    <div className="text-sm mt-1 text-slate-300">{ride.pickup_address} → {ride.dropoff_address}</div>
                    <div className="font-bold mt-1 text-green-400">${ride.fare_final || ride.fare_estimate}</div>
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