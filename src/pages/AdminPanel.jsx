import { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import Map from '../components/Map';

const NAV_ITEMS = [
  { key: 'dashboard', label: 'Dashboard', icon: '📊' },
  { key: 'rides', label: 'Viajes', icon: '🚕' },
  { key: 'drivers', label: 'Conductores', icon: '🧑\u200d✈️' },
  { key: 'pricing', label: 'Tarifas', icon: '💲' },
  { key: 'report', label: 'Reportes', icon: '📈' },
];

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

  const inputClass = "w-full px-4 py-2.5 bg-base-700/70 border border-base-600 rounded-lg text-white placeholder:text-base-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition";

  return (
    <div className="min-h-screen bg-base-950 flex">
      {/* Sidebar */}
      <aside className="hidden md:flex w-60 shrink-0 flex-col bg-base-900 border-r border-base-700 p-4">
        <div className="flex items-center gap-2.5 px-2 mb-8">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center font-black text-white shadow-glow">T</div>
          <div>
            <div className="text-white font-bold leading-tight">TaxiApp</div>
            <div className="text-base-500 text-[10px] uppercase tracking-wider">Admin</div>
          </div>
        </div>

        <nav className="flex-1 space-y-1">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.key}
              onClick={() => handleTabChange(item.key)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                tab === item.key
                  ? 'bg-primary-500/15 text-primary-300 border border-primary-500/30'
                  : 'text-base-400 hover:bg-base-700/60 hover:text-white border border-transparent'
              }`}
            >
              <span>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-300 hover:bg-red-500/10 transition"
        >
          <span>🚪</span> Cerrar sesión
        </button>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="bg-base-900/80 backdrop-blur-xl border-b border-base-700 px-4 md:px-6 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-white font-bold text-lg capitalize">
              {NAV_ITEMS.find(i => i.key === tab)?.label || 'Dashboard'}
            </h1>
            <p className="text-base-500 text-xs">Panel de administración</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-base-400 hidden sm:block">{user?.name}</span>
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white text-sm font-bold">
              {user?.name?.[0]?.toUpperCase() || 'A'}
            </div>
            <button onClick={logout} className="md:hidden text-xs bg-base-700 px-3 py-1.5 rounded-full text-white">
              Salir
            </button>
          </div>
        </header>

        {/* Mobile tabs */}
        <nav className="md:hidden bg-base-900 border-b border-base-700 flex overflow-x-auto">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.key}
              onClick={() => handleTabChange(item.key)}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition ${
                tab === item.key
                  ? 'text-primary-300 border-primary-500'
                  : 'text-base-500 border-transparent'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {tab === 'dashboard' && stats && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Viajes activos', value: stats.active_rides, color: 'primary' },
                  { label: 'Conductores disponibles', value: stats.drivers.available, color: 'accent' },
                  { label: 'Total viajes', value: stats.rides.total, color: 'white' },
                  { label: 'Ingresos totales', value: `$${stats.rides.revenue}`, color: 'yellow' },
                ].map((c) => (
                  <div key={c.label} className="card-voxa rounded-2xl p-4">
                    <div className={`text-2xl font-bold ${
                      c.color === 'primary' ? 'text-primary-400' :
                      c.color === 'accent' ? 'text-accent-400' :
                      c.color === 'yellow' ? 'text-yellow-400' : 'text-white'
                    }`}>{c.value}</div>
                    <div className="text-sm text-base-500 mt-1">{c.label}</div>
                  </div>
                ))}
              </div>

              <div className="card-voxa rounded-2xl overflow-hidden" style={{ height: '420px' }}>
                <div className="p-3.5 border-b border-base-700 flex justify-between items-center">
                  <h3 className="font-bold text-sm text-white">Conductores en tiempo real</h3>
                  <span className="text-xs text-base-500">{driverLocations.length} conectados</span>
                </div>
                <div className="h-[calc(100%-46px)]">
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
            <div className="card-voxa rounded-2xl overflow-hidden">
              <div className="p-4 border-b border-base-700">
                <h3 className="font-bold text-white">Últimos viajes</h3>
              </div>
              <div className="divide-y divide-base-700 max-h-[65vh] overflow-y-auto">
                {rides.map((ride) => (
                  <div key={ride.id} className="p-4 hover:bg-base-700/40 transition">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium text-white">{ride.passenger_name}</div>
                        <div className="text-sm text-base-500">
                          {ride.pickup_address} → {ride.dropoff_address}
                        </div>
                        <div className="text-xs text-base-600 mt-1">
                          {new Date(ride.created_at).toLocaleString()}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-white">${ride.fare_final || ride.fare_estimate}</div>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          ride.status === 'completed' ? 'bg-accent-500/15 text-accent-300' :
                          ride.status === 'cancelled' ? 'bg-red-500/15 text-red-300' :
                          'bg-yellow-500/15 text-yellow-300'
                        }`}>
                          {ride.status}
                        </span>
                      </div>
                    </div>
                    {ride.driver_name && (
                      <div className="text-xs text-base-500 mt-1">
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
              <div className="card-voxa rounded-2xl overflow-hidden">
                <div className="p-4 border-b border-base-700 flex justify-between items-center">
                  <h3 className="font-bold text-white">Conductores</h3>
                  <button
                    onClick={() => setShowAddDriver(true)}
                    className="bg-gradient-to-r from-primary-500 to-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-glow hover:from-primary-400 hover:to-primary-500 transition"
                  >
                    + Agregar conductor
                  </button>
                </div>
                <div className="divide-y divide-base-700">
                  {drivers.map((driver) => (
                    <div key={driver.id} className="p-4 flex justify-between items-center">
                      <div>
                        <div className="font-medium text-white">{driver.name}</div>
                        <div className="text-sm text-base-500">{driver.phone} • {driver.plate}</div>
                        <div className="flex gap-2 mt-1.5">
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            driver.status === 'available' ? 'bg-accent-500/15 text-accent-300' :
                            driver.status === 'busy' ? 'bg-yellow-500/15 text-yellow-300' :
                            'bg-base-600 text-base-400'
                          }`}>
                            {driver.status}
                          </span>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            driver.approved ? 'bg-primary-500/15 text-primary-300' : 'bg-red-500/15 text-red-300'
                          }`}>
                            {driver.approved ? 'Aprobado' : 'Pendiente'}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {!driver.approved ? (
                          <button
                            onClick={() => approveDriver(driver.id)}
                            className="bg-accent-500 hover:bg-accent-600 text-white px-3 py-1.5 rounded-lg text-sm transition"
                          >
                            Aprobar
                          </button>
                        ) : (
                          <button
                            onClick={() => rejectDriver(driver.id)}
                            className="bg-red-500/80 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg text-sm transition"
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
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                  <div className="card-voxa rounded-2xl p-6 w-full max-w-md">
                    <h3 className="font-bold text-lg mb-4 text-white">Agregar conductor</h3>
                    <form onSubmit={addDriver} className="space-y-3">
                      <input
                        type="text"
                        placeholder="Nombre completo"
                        value={newDriver.name}
                        onChange={(e) => setNewDriver({ ...newDriver, name: e.target.value })}
                        className={inputClass}
                        required
                      />
                      <input
                        type="email"
                        placeholder="Email"
                        value={newDriver.email}
                        onChange={(e) => setNewDriver({ ...newDriver, email: e.target.value })}
                        className={inputClass}
                        required
                      />
                      <input
                        type="tel"
                        placeholder="Teléfono"
                        value={newDriver.phone}
                        onChange={(e) => setNewDriver({ ...newDriver, phone: e.target.value })}
                        className={inputClass}
                        required
                      />
                      <input
                        type="password"
                        placeholder="Contraseña"
                        value={newDriver.password}
                        onChange={(e) => setNewDriver({ ...newDriver, password: e.target.value })}
                        className={inputClass}
                        required
                      />
                      <input
                        type="text"
                        placeholder="Patente del vehículo"
                        value={newDriver.plate}
                        onChange={(e) => setNewDriver({ ...newDriver, plate: e.target.value })}
                        className={inputClass}
                        required
                      />
                      <input
                        type="text"
                        placeholder="Licencia de conducir"
                        value={newDriver.license}
                        onChange={(e) => setNewDriver({ ...newDriver, license: e.target.value })}
                        className={inputClass}
                        required
                      />
                      <select
                        value={newDriver.vehicle_type}
                        onChange={(e) => setNewDriver({ ...newDriver, vehicle_type: e.target.value })}
                        className={inputClass}
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
                          className="flex-1 py-2.5 border border-base-600 rounded-lg text-base-300 hover:bg-base-700/50 transition"
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          className="flex-1 py-2.5 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-lg font-medium shadow-glow hover:from-primary-400 hover:to-primary-500 transition"
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
            <div className="card-voxa rounded-2xl p-6">
              <h3 className="font-bold text-lg mb-4 text-white">Configurar tarifas</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { key: 'base_fare', label: 'Tarifa base ($)' },
                  { key: 'per_km', label: 'Por kilómetro ($)' },
                  { key: 'per_minute', label: 'Por minuto ($)' },
                  { key: 'minimum_fare', label: 'Mínimo ($)' },
                ].map((f) => (
                  <div key={f.key}>
                    <label className="block text-sm font-medium text-base-400 mb-1.5">
                      {f.label}
                    </label>
                    <input
                      type="number"
                      value={pricing[f.key]}
                      onChange={(e) => updatePricing(f.key, e.target.value)}
                      className={inputClass}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'report' && (
            <div className="card-voxa rounded-2xl overflow-hidden">
              <div className="p-4 border-b border-base-700">
                <h3 className="font-bold text-white">Reporte diario</h3>
              </div>
              <div className="divide-y divide-base-700">
                {dailyReport.map((day) => (
                  <div key={day.date} className="p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-medium text-white">{new Date(day.date).toLocaleDateString()}</div>
                        <div className="text-sm text-base-500">{day.total_rides} viajes</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-accent-400">${day.total_revenue}</div>
                        <div className="text-xs text-base-600">
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
    </div>
  );
}
