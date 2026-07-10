import { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import Map from '../components/Map';

export default function AdminPanel() {
  const { user, logout } = useAuth();
  const socket = useSocket();
  const [tab, setTab] = useState('dashboard');
  const [stats, setStats] = useState(null);
  const [rides, setRides] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [pricing, setPricing] = useState(null);
  const [dailyReport, setDailyReport] = useState([]);
  const [showAddDriver, setShowAddDriver] = useState(false);
  const [newDriver, setNewDriver] = useState({ name: '', email: '', phone: '', password: '', plate: '', license: '', vehicle_type: 'sedan' });
  const [driverLocations, setDriverLocations] = useState([]);
  const [currentLocation, setCurrentLocation] = useState([-31.8023, -58.2316]);
  const locationsRef = useRef({});

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => setCurrentLocation([pos.coords.latitude, pos.coords.longitude]),
      () => {}
    );
  }, []);

  useEffect(() => {
    loadDashboard();
  }, []);

  useEffect(() => {
    if (socket) {
      socket.on('driver_moved', (data) => {
        locationsRef.current[data.userId] = {
          ...(locationsRef.current[data.userId] || {}),
          lat: data.lat,
          lng: data.lng,
        };
        setDriverLocations(Object.values(locationsRef.current));
      });
      return () => {
        socket.off('driver_moved');
      };
    }
  }, [socket]);

  const loadDashboard = async () => {
    const [s, d, dr] = await Promise.all([
      api.admin.getStats(),
      api.admin.getRides(),
      api.admin.getDrivers(),
    ]);
    setStats(s);
    setRides(d);
    setDrivers(dr);
    const locs = {};
    dr.forEach(drv => {
      if (drv.current_lat && drv.current_lng) {
        const key = drv.user_id;
        locs[key] = { userId: key, lat: drv.current_lat, lng: drv.current_lng, name: drv.name, plate: drv.plate, status: drv.status };
      }
    });
    locationsRef.current = locs;
    setDriverLocations(Object.values(locs));
  };

  const loadPricing = async () => {
    const p = await api.passenger.pricing();
    setPricing(p);
  };

  const loadReport = async () => {
    const r = await api.admin.getDailyReport();
    setDailyReport(r);
  };

  const handleTabChange = (newTab) => {
    setTab(newTab);
    if (newTab === 'pricing') loadPricing();
    if (newTab === 'report') loadReport();
  };

  const updatePricing = async (field, value) => {
    try {
      await api.admin.updatePricing({ [field]: parseFloat(value) });
      setPricing(prev => ({ ...prev, [field]: value }));
    } catch (err) {
      alert(err.message);
    }
  };

  const approveDriver = async (id) => {
    await api.admin.approveDriver(id);
    setDrivers(prev => prev.map(d => d.id === id ? { ...d, approved: true } : d));
  };

  const rejectDriver = async (id) => {
    await api.admin.rejectDriver(id);
    setDrivers(prev => prev.map(d => d.id === id ? { ...d, approved: false } : d));
  };

  const addDriver = async (e) => {
    e.preventDefault();
    try {
      const driver = await api.admin.createDriver(newDriver);
      setDrivers(prev => [driver, ...prev]);
      setNewDriver({ name: '', email: '', phone: '', password: '', plate: '', license: '', vehicle_type: 'sedan' });
      setShowAddDriver(false);
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-gray-900 text-white p-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="text-xl">⚙️</span>
          <span className="font-semibold">Panel Admin</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm opacity-80">{user?.name}</span>
          <button onClick={logout} className="text-sm bg-gray-700 px-3 py-1 rounded-full">
            Salir
          </button>
        </div>
      </header>

      <nav className="bg-white border-b flex overflow-x-auto">
        {['dashboard', 'rides', 'drivers', 'pricing', 'report'].map((t) => (
          <button
            key={t}
            onClick={() => handleTabChange(t)}
            className={`px-4 py-3 text-sm font-medium whitespace-nowrap ${
              tab === t
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t === 'dashboard' ? 'Inicio' :
             t === 'rides' ? 'Viajes' :
             t === 'drivers' ? 'Conductores' :
             t === 'pricing' ? 'Tarifas' : 'Reportes'}
          </button>
        ))}
      </nav>

      <main className="p-4 max-w-4xl mx-auto">
        {tab === 'dashboard' && stats && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-xl shadow">
                <div className="text-2xl font-bold text-blue-600">{stats.active_rides}</div>
                <div className="text-sm text-gray-500">Viajes activos</div>
              </div>
              <div className="bg-white p-4 rounded-xl shadow">
                <div className="text-2xl font-bold text-green-600">{stats.drivers.available}</div>
                <div className="text-sm text-gray-500">Conductores disponibles</div>
              </div>
              <div className="bg-white p-4 rounded-xl shadow">
                <div className="text-2xl font-bold text-gray-800">{stats.rides.total}</div>
                <div className="text-sm text-gray-500">Total viajes</div>
              </div>
              <div className="bg-white p-4 rounded-xl shadow">
                <div className="text-2xl font-bold text-yellow-600">${stats.rides.revenue}</div>
                <div className="text-sm text-gray-500">Ingresos totales</div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow overflow-hidden" style={{ height: '400px' }}>
              <div className="p-3 border-b bg-gray-50 flex justify-between items-center">
                <h3 className="font-bold text-sm">Conductores en tiempo real</h3>
                <span className="text-xs text-gray-500">{driverLocations.length} conectados</span>
              </div>
              <div className="h-[calc(100%-44px)]">
                <Map
                  center={currentLocation}
                  zoom={13}
                  drivers={driverLocations}
                  className="h-full"
                />
              </div>
            </div>
          </div>
        )}

        {tab === 'rides' && (
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <div className="p-4 border-b">
              <h3 className="font-bold">Últimos viajes</h3>
            </div>
            <div className="divide-y max-h-[60vh] overflow-y-auto">
              {rides.map((ride) => (
                <div key={ride.id} className="p-4 hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium">{ride.passenger_name}</div>
                      <div className="text-sm text-gray-500">
                        {ride.pickup_address} → {ride.dropoff_address}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {new Date(ride.created_at).toLocaleString()}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">${ride.fare_final || ride.fare_estimate}</div>
                      <span className={`text-xs px-2 py-1 rounded ${
                        ride.status === 'completed' ? 'bg-green-100 text-green-700' :
                        ride.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {ride.status}
                      </span>
                    </div>
                  </div>
                  {ride.driver_name && (
                    <div className="text-xs text-gray-400 mt-1">
                      Conductor: {ride.driver_name}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'drivers' && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl shadow overflow-hidden">
              <div className="p-4 border-b flex justify-between items-center">
                <h3 className="font-bold">Conductores</h3>
                <button
                  onClick={() => setShowAddDriver(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium"
                >
                  + Agregar conductor
                </button>
              </div>
              <div className="divide-y">
                {drivers.map((driver) => (
                  <div key={driver.id} className="p-4 flex justify-between items-center">
                    <div>
                      <div className="font-medium">{driver.name}</div>
                      <div className="text-sm text-gray-500">{driver.phone} • {driver.plate}</div>
                      <div className="flex gap-2 mt-1">
                        <span className={`text-xs px-2 py-1 rounded ${
                          driver.status === 'available' ? 'bg-green-100 text-green-700' :
                          driver.status === 'busy' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-gray-100 text-gray-500'
                        }`}>
                          {driver.status}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded ${
                          driver.approved ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {driver.approved ? 'Aprobado' : 'Pendiente'}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {!driver.approved ? (
                        <button
                          onClick={() => approveDriver(driver.id)}
                          className="bg-green-500 text-white px-3 py-1 rounded text-sm"
                        >
                          Aprobar
                        </button>
                      ) : (
                        <button
                          onClick={() => rejectDriver(driver.id)}
                          className="bg-red-500 text-white px-3 py-1 rounded text-sm"
                        >
                          Rechazar
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {showAddDriver && (
              <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl p-6 w-full max-w-md">
                  <h3 className="font-bold text-lg mb-4">Agregar conductor</h3>
                  <form onSubmit={addDriver} className="space-y-3">
                    <input
                      type="text"
                      placeholder="Nombre completo"
                      value={newDriver.name}
                      onChange={(e) => setNewDriver({ ...newDriver, name: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg"
                      required
                    />
                    <input
                      type="email"
                      placeholder="Email"
                      value={newDriver.email}
                      onChange={(e) => setNewDriver({ ...newDriver, email: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg"
                      required
                    />
                    <input
                      type="tel"
                      placeholder="Teléfono"
                      value={newDriver.phone}
                      onChange={(e) => setNewDriver({ ...newDriver, phone: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg"
                      required
                    />
                    <input
                      type="password"
                      placeholder="Contraseña"
                      value={newDriver.password}
                      onChange={(e) => setNewDriver({ ...newDriver, password: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg"
                      required
                    />
                    <input
                      type="text"
                      placeholder="Patente del vehículo"
                      value={newDriver.plate}
                      onChange={(e) => setNewDriver({ ...newDriver, plate: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg"
                      required
                    />
                    <input
                      type="text"
                      placeholder="Licencia de conducir"
                      value={newDriver.license}
                      onChange={(e) => setNewDriver({ ...newDriver, license: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg"
                      required
                    />
                    <select
                      value={newDriver.vehicle_type}
                      onChange={(e) => setNewDriver({ ...newDriver, vehicle_type: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg"
                    >
                      <option value="sedan">Sedán</option>
                      <option value="hatchback">Hatchback</option>
                      <option value="van">Van</option>
                      <option value="pickup">Pickup</option>
                    </select>
                    <div className="flex gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowAddDriver(false)}
                        className="flex-1 py-2 border border-gray-300 rounded-lg"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="flex-1 py-2 bg-blue-600 text-white rounded-lg font-medium"
                      >
                        Crear conductor
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'pricing' && pricing && (
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="font-bold text-lg mb-4">Configurar tarifas</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tarifa base ($)
                </label>
                <input
                  type="number"
                  value={pricing.base_fare}
                  onChange={(e) => updatePricing('base_fare', e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Por kilómetro ($)
                </label>
                <input
                  type="number"
                  value={pricing.per_km}
                  onChange={(e) => updatePricing('per_km', e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Por minuto ($)
                </label>
                <input
                  type="number"
                  value={pricing.per_minute}
                  onChange={(e) => updatePricing('per_minute', e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mínimo ($)
                </label>
                <input
                  type="number"
                  value={pricing.minimum_fare}
                  onChange={(e) => updatePricing('minimum_fare', e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>
            </div>
          </div>
        )}

        {tab === 'report' && (
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <div className="p-4 border-b">
              <h3 className="font-bold">Reporte diario</h3>
            </div>
            <div className="divide-y">
              {dailyReport.map((day) => (
                <div key={day.date} className="p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-medium">{new Date(day.date).toLocaleDateString()}</div>
                      <div className="text-sm text-gray-500">{day.total_rides} viajes</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-green-600">${day.total_revenue}</div>
                      <div className="text-xs text-gray-400">
                        Efectivo: {day.cash_rides} • MP: {day.mp_rides}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
