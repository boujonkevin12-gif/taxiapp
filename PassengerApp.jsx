import Header from '../components/passenger/Header';
import { useState, useEffect, useCallback, useRef } from 'react';
import Map from '../components/Map';
import { api } from '../services/api';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';

const GEO_KEY = import.meta.env.VITE_GEOAPIFY_KEY;

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

  const headerVisible = ['idle', 'select_pickup', 'select_dropoff'].includes(step);

  return (
    <div className="h-screen w-screen relative bg-base-950 overflow-hidden">
      <Map
        center={currentLocation}
        zoom={14}
        pickup={pickup}
        dropoff={dropoff}
        driverLocation={step === 'on_ride' ? driverLocation : null}
        onMapClick={handleMapClick}
        routeFrom={
          step === 'on_ride' && driverLocation
            ? driverLocation
            : step === 'confirm' || step === 'waiting'
              ? pickup
              : null
        }
        routeTo={
          step === 'on_ride'
            ? (currentRide?.status === 'accepted' ? pickup : dropoff)
            : step === 'confirm' || step === 'waiting'
              ? dropoff
              : null
        }
        className="h-full w-full"
      />

      {headerVisible && <Header user={user} logout={logout} loadHistory={loadHistory} />}

      <div className="absolute inset-0 pointer-events-none [&>*]:pointer-events-auto">
        {step === 'idle' && (
          <div className="absolute inset-x-0 bottom-0 z-20 p-5">
            <div className="card-voxa rounded-3xl p-5">
              <button
                onClick={() => {
                  setPickupSearch('');
                  setPickupResults([]);
                  setStep('select_pickup');
                }}
                className="w-full flex items-center gap-3 bg-base-700/70 border border-base-600 rounded-2xl px-4 py-3.5 text-left hover:bg-base-600/70 transition"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-base-500 shrink-0">
                  <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
                </svg>
                <span className="text-base-400">¿A dónde vamos?</span>
              </button>

              <div className="mt-5">
                <h3 className="text-sm font-semibold text-base-400 mb-2">Lugares frecuentes</h3>
                <div className="divide-y divide-base-700/70">
                  {[
                    { icon: '🏠', label: 'Casa', eta: '20 min' },
                    { icon: '💼', label: 'Trabajo', eta: '35 min' },
                    { icon: '✈️', label: 'Aeropuerto', eta: '45 min' },
                  ].map((p) => (
                    <button
                      key={p.label}
                      onClick={() => {
                        setPickupSearch('');
                        setPickupResults([]);
                        setStep('select_pickup');
                      }}
                      className="w-full flex items-center gap-3 py-3 text-left hover:bg-base-700/40 rounded-xl px-1.5 transition"
                    >
                      <span className="w-9 h-9 rounded-full bg-base-700/70 border border-base-600 flex items-center justify-center text-base shrink-0">{p.icon}</span>
                      <span className="text-white text-sm font-medium flex-1">{p.label}</span>
                      <span className="text-xs text-base-500">{p.eta}</span>
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => {
                  setPickupSearch('');
                  setPickupResults([]);
                  setStep('select_pickup');
                }}
                className="mt-4 w-full bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-400 hover:to-primary-500 transition-all duration-300 rounded-2xl py-4 text-white font-bold text-sm tracking-wide uppercase shadow-glow"
              >
                ¿A dónde vamos?
              </button>
            </div>
          </div>
        )}

        {step === 'select_pickup' && (
          <div className="absolute bottom-0 left-0 right-0 z-20 flex flex-col" style={{ maxHeight: '55vh' }}>
            <div className="card-voxa rounded-t-3xl p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-accent-500/15 rounded-full flex items-center justify-center shrink-0 border border-accent-500/30">
                  <div className="w-3.5 h-3.5 bg-accent-500 rounded-full"></div>
                </div>
                <div>
                  <span className="font-semibold text-sm text-white">¿Dónde te encontrás?</span>
                  <p className="text-xs text-base-500">Origen del viaje</p>
                </div>
              </div>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Buscá una dirección..."
                  value={pickupSearch}
                  onChange={(e) => onPickupSearch(e.target.value)}
                  className="w-full px-4 py-3 border border-base-600 rounded-xl text-sm text-white placeholder:text-base-500 bg-base-700/70 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/30 transition"
                  autoFocus
                />
                {searching && <div className="absolute right-4 top-3.5 animate-spin w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full"></div>}
              </div>
              {pickupResults.length > 0 && (
                <div className="mt-3 max-h-36 overflow-y-auto divide-y divide-base-600 rounded-xl border border-base-600">
                  {pickupResults.map((r, i) => (
                    <button
                      key={i}
                      onClick={() => selectPickup(r)}
                      className="w-full text-left px-4 py-3 text-sm hover:bg-base-600/60 transition flex items-start gap-3"
                    >
                      <span className="text-base-500 mt-0.5">📍</span>
                      <span className="text-base-300 leading-tight">{r.display}</span>
                    </button>
                  ))}
                </div>
              )}
              <div className="mt-3 text-xs text-base-500 text-center flex items-center justify-center gap-1">
                <span>👆</span> También tocá en el mapa
              </div>
              <button onClick={() => setStep('idle')} className="mt-3 w-full py-2.5 text-sm text-base-500 font-medium hover:text-white transition rounded-xl hover:bg-base-600/50">
                Cancelar
              </button>
            </div>
          </div>
        )}

        {step === 'select_dropoff' && (
          <div className="absolute bottom-0 left-0 right-0 z-20 flex flex-col" style={{ maxHeight: '55vh' }}>
            <div className="card-voxa rounded-t-3xl p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-red-500/15 rounded-full flex items-center justify-center shrink-0 border border-red-500/30">
                  <div className="w-3.5 h-3.5 bg-red-500 rounded-full"></div>
                </div>
                <div>
                  <span className="font-semibold text-sm text-white">¿Adónde vas?</span>
                  <p className="text-xs text-base-500">Destino del viaje</p>
                </div>
              </div>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Buscá una dirección..."
                  value={dropoffSearch}
                  onChange={(e) => onDropoffSearch(e.target.value)}
                  className="w-full px-4 py-3 border border-base-600 rounded-xl text-sm text-white placeholder:text-base-500 bg-base-700/70 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/30 transition"
                  autoFocus
                />
                {searching && <div className="absolute right-4 top-3.5 animate-spin w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full"></div>}
              </div>
              {dropoffResults.length > 0 && (
                <div className="mt-3 max-h-36 overflow-y-auto divide-y divide-base-600 rounded-xl border border-base-600">
                  {dropoffResults.map((r, i) => (
                    <button
                      key={i}
                      onClick={() => selectDropoff(r)}
                      className="w-full text-left px-4 py-3 text-sm hover:bg-base-600/60 transition flex items-start gap-3"
                    >
                      <span className="text-base-500 mt-0.5">📍</span>
                      <span className="text-base-300 leading-tight">{r.display}</span>
                    </button>
                  ))}
                </div>
              )}
              <div className="mt-3 text-xs text-base-500 text-center flex items-center justify-center gap-1">
                <span>👆</span> También tocá en el mapa
              </div>
              <div className="flex gap-3 mt-3">
                <button onClick={() => { setStep('select_pickup'); setDropoff(null); setDropoffSearch(''); setDropoffResults([]); }} className="flex-1 py-2.5 text-sm text-base-500 font-medium hover:text-white transition rounded-xl hover:bg-base-600/50">
                  Volver
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 'confirm' && estimate && (
          <div className="absolute bottom-0 left-0 right-0 card-voxa rounded-t-3xl p-5 z-20">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-primary-500/15 rounded-full flex items-center justify-center text-sm border border-primary-500/30">🚕</div>
              <h3 className="font-bold text-lg text-white">Confirmar viaje</h3>
            </div>
            <div className="bg-base-700/50 border border-base-600 rounded-xl p-3 mb-4 space-y-2 text-sm">
              <div className="flex items-start gap-2">
                <span className="text-accent-500 mt-0.5">🟢</span>
                <span className="text-base-300 text-xs leading-tight">{pickupAddress}</span>
              </div>
              <div className="border-l-2 border-dashed border-base-500 ml-2 h-2"></div>
              <div className="flex items-start gap-2">
                <span className="text-red-500 mt-0.5">🔴</span>
                <span className="text-base-300 text-xs leading-tight">{dropoffAddress}</span>
              </div>
            </div>
            <div className="space-y-3 mb-5">
              <div className="flex items-center justify-between bg-base-700/50 border border-base-600 rounded-xl px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="text-base-500">📏</span>
                  <span className="text-sm text-base-400">Distancia</span>
                </div>
                <span className="text-sm font-semibold text-white">{estimate.distance_km} km</span>
              </div>
              <div className="flex items-center justify-between bg-base-700/50 border border-base-600 rounded-xl px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="text-base-500">⏱</span>
                  <span className="text-sm text-base-400">Tiempo estimado</span>
                </div>
                <span className="text-sm font-semibold text-white">{estimate.duration_min} min</span>
              </div>
              <div className="flex items-center justify-between bg-primary-500/10 rounded-xl px-4 py-3 border border-primary-500/30">
                <span className="text-sm font-semibold text-white">Tarifa estimada</span>
                <span className="text-xl font-bold text-primary-300">${estimate.fare_estimate}</span>
              </div>
            </div>

            <div className="mb-5">
              <label className="block text-sm font-semibold text-white mb-3">Forma de pago</label>
              <div className="flex gap-3">
                <button
                  onClick={() => setPaymentMethod('cash')}
                  className={`flex-1 py-3 rounded-xl font-medium text-sm border-2 transition ${
                    paymentMethod === 'cash'
                      ? 'border-primary-500 bg-primary-500/10 text-primary-300'
                      : 'border-base-600 text-base-400 hover:border-base-500'
                  }`}
                >
                  💵 Efectivo
                </button>
                <button
                  onClick={() => setPaymentMethod('mercadopago_transfer')}
                  className={`flex-1 py-3 rounded-xl font-medium text-sm border-2 transition ${
                    paymentMethod === 'mercadopago_transfer'
                      ? 'border-primary-500 bg-primary-500/10 text-primary-300'
                      : 'border-base-600 text-base-400 hover:border-base-500'
                  }`}
                >
                  📱 Transferencia MP
                </button>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { setStep('idle'); setDropoff(null); setEstimate(null); }}
                className="flex-1 py-3.5 border-2 border-base-600 rounded-xl text-sm font-semibold text-base-400 hover:bg-base-700/50 transition"
              >
                Cancelar
              </button>
              <button
                onClick={requestRide}
                className="flex-1 py-3.5 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-400 hover:to-primary-500 text-white rounded-xl font-bold text-sm shadow-glow transition-all active:scale-[0.98]"
              >
                Confirmar $<span className="text-lg">{estimate.fare_estimate}</span>
              </button>
            </div>
          </div>
        )}

        {step === 'waiting' && (
          <div className="absolute bottom-0 left-0 right-0 card-voxa rounded-t-3xl p-6 z-20">
            <div className="text-center">
              <div className="relative mx-auto mb-5 w-16 h-16">
                <div className="absolute inset-0 animate-spin rounded-full border-4 border-primary-500/20 border-t-primary-500"></div>
                <div className="absolute inset-0 flex items-center justify-center text-2xl">🚕</div>
              </div>
              <h3 className="font-bold text-xl text-white">Buscando conductor</h3>
              <p className="text-base-500 text-sm mt-2">Esperá un momento, ya encontramos a alguien</p>
              <button onClick={cancelRide} className="mt-6 w-full py-3 border-2 border-red-500/30 text-red-400 rounded-xl font-semibold text-sm hover:bg-red-500/10 transition">
                Cancelar viaje
              </button>
            </div>
          </div>
        )}

        {step === 'on_ride' && currentRide && (
          <div className="absolute bottom-0 left-0 right-0 card-voxa rounded-t-3xl p-5 z-20">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-14 h-14 bg-primary-500/15 rounded-full flex items-center justify-center text-2xl border-2 border-primary-500/30">
                🚗
              </div>
              <div>
                <h3 className="font-bold text-lg text-white">{currentRide.driver_name || 'Conductor'}</h3>
                <p className="text-sm text-base-500">
                  {currentRide.vehicle_type} • {currentRide.plate}
                </p>
              </div>
            </div>
            <div className="bg-base-700/50 border border-base-600 rounded-xl p-4 space-y-3 text-sm mb-4">
              <div className="flex justify-between items-center">
                <span className="text-base-500">Estado</span>
                <span className={`font-semibold px-3 py-1 rounded-full text-xs ${
                  currentRide.status === 'accepted' ? 'bg-yellow-500/15 text-yellow-400' : 'bg-primary-500/15 text-primary-300'
                }`}>
                  {currentRide.status === 'accepted' ? 'Conductor en camino' : 'Viaje en progreso'}
                </span>
              </div>
              <div className="flex justify-between items-start">
                <span className="text-base-500 shrink-0">Origen</span>
                <span className="text-right max-w-[65%] text-base-300">{currentRide.pickup_address}</span>
              </div>
              <div className="flex justify-between items-start">
                <span className="text-base-500 shrink-0">Destino</span>
                <span className="text-right max-w-[65%] text-base-300">{currentRide.dropoff_address}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-base-600">
                <span className="font-semibold text-white">Tarifa</span>
                <span className="text-lg font-bold text-primary-300">${currentRide.fare_estimate}</span>
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
          <div className="absolute bottom-0 left-0 right-0 card-voxa rounded-t-3xl p-6 z-20">
            <h3 className="font-bold text-xl text-white text-center mb-2">Calificá tu viaje</h3>
            <p className="text-base-500 text-sm text-center mb-6">¿Cómo fue tu experiencia?</p>
            <div className="flex justify-center gap-3 mb-6">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  className={`text-4xl transition-all duration-150 ${
                    star <= rating ? 'text-yellow-400 scale-110' : 'text-base-600 hover:text-yellow-300'
                  }`}
                >
                  ★
                </button>
              ))}
            </div>
            <button
              onClick={rateRide}
              className="w-full py-3.5 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-400 hover:to-primary-500 text-white rounded-xl font-bold text-sm shadow-glow transition-all active:scale-[0.98]"
            >
              Enviar calificación
            </button>
          </div>
        )}
      </div>

      {showHistory && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end">
          <div className="card-voxa w-full max-h-[70vh] rounded-t-3xl p-4 overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg text-white">Mis viajes</h3>
              <button onClick={() => setShowHistory(false)} className="text-base-500 hover:text-white">✕</button>
            </div>
            {rides.length === 0 ? (
              <p className="text-base-500 text-center py-8">No tenés viajes aún</p>
            ) : (
              <div className="space-y-3">
                {rides.map((ride) => (
                  <div key={ride.id} className="bg-base-700/50 border border-base-600 p-3 rounded-xl">
                    <div className="flex justify-between">
                      <span className="text-sm text-base-500">
                        {new Date(ride.created_at).toLocaleDateString()}
                      </span>
                      <span className={`text-sm font-medium ${
                        ride.status === 'completed' ? 'text-accent-400' :
                        ride.status === 'cancelled' ? 'text-red-400' : 'text-yellow-400'
                      }`}>
                        {ride.status === 'completed' ? 'Completado' :
                         ride.status === 'cancelled' ? 'Cancelado' : ride.status}
                      </span>
                    </div>
                    <div className="text-sm mt-1 text-base-300">{ride.pickup_address} → {ride.dropoff_address}</div>
                    <div className="font-bold mt-1 text-white">${ride.fare_final || ride.fare_estimate}</div>
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
