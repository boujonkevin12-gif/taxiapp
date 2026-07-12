import { useState, useEffect, useRef, useMemo } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import Map from '../components/Map';

/* ---------------------------------------------------------------------- */
/*  Iconos de línea (estilo minimalista, igual al del mockup)             */
/* ---------------------------------------------------------------------- */
const Icon = {
  dashboard: (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></svg>,
  rides: (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v7a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-1h12v1a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-7l-2.08-5.99Z" /><circle cx="6.5" cy="14.5" r="1.2" /><circle cx="17.5" cy="14.5" r="1.2" /></svg>,
  drivers: (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" /></svg>,
  users: (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>,
  vehicles: (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 17h14M6 17a2 2 0 1 1-4 0 2 2 0 0 1 4 0Zm16 0a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z" /><path d="M3 17V9.5a1 1 0 0 1 .3-.7l3-3A1 1 0 0 1 7 5.5h10a1 1 0 0 1 .7.3l3 3a1 1 0 0 1 .3.7V17" /></svg>,
  payments: (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" /></svg>,
  promotions: (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m20.59 13.41-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82Z" /><circle cx="7" cy="7" r="1.4" /></svg>,
  reports: (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18" /><rect x="7" y="12" width="3" height="6" /><rect x="12.5" y="8" width="3" height="10" /><rect x="18" y="5" width="3" height="13" /></svg>,
  settings: (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" /></svg>,
  support: (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6" /><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3ZM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3Z" /></svg>,
  logout: (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="M16 17l5-5-5-5" /><path d="M21 12H9" /></svg>,
  shield: (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2 4 6v6c0 5 3.4 8.7 8 10 4.6-1.3 8-5 8-10V6l-8-4Z" /><path d="m9.5 12 2 2 3.5-3.5" /></svg>,
  bell: (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6" /><path d="M10.3 20a1.9 1.9 0 0 0 3.4 0" /></svg>,
};

const NAV_ITEMS = [
  { key: 'dashboard', label: 'Dashboard', icon: Icon.dashboard, real: true },
  { key: 'rides', label: 'Viajes', icon: Icon.rides, real: true },
  { key: 'drivers', label: 'Conductores', icon: Icon.drivers, real: true },
  { key: 'users', label: 'Usuarios', icon: Icon.users, real: false },
  { key: 'vehicles', label: 'Vehículos', icon: Icon.vehicles, real: false },
  { key: 'payments', label: 'Pagos', icon: Icon.payments, real: false },
  { key: 'promotions', label: 'Promociones', icon: Icon.promotions, real: false },
  { key: 'report', label: 'Reportes', icon: Icon.reports, real: true },
  { key: 'pricing', label: 'Configuración', icon: Icon.settings, real: true },
  { key: 'support', label: 'Soporte', icon: Icon.support, real: false },
];

const STATUS_META = {
  completed: { label: 'Completado', color: '#34d17e', badge: 'bg-accent-500/15 text-accent-300' },
  cancelled: { label: 'Cancelado', color: '#ef4444', badge: 'bg-red-500/15 text-red-300' },
  pending: { label: 'Pendiente', color: '#eab308', badge: 'bg-yellow-500/15 text-yellow-300' },
  accepted: { label: 'En progreso', color: '#eab308', badge: 'bg-yellow-500/15 text-yellow-300' },
  in_progress: { label: 'En progreso', color: '#eab308', badge: 'bg-yellow-500/15 text-yellow-300' },
};
const statusMeta = (s) => STATUS_META[s] || { label: s, color: '#7c8093', badge: 'bg-base-600 text-base-400' };

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const min = Math.max(0, Math.round(diffMs / 60000));
  if (min < 1) return 'Recién';
  if (min < 60) return `Hace ${min} min`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `Hace ${hr} h`;
  return `Hace ${Math.round(hr / 24)} d`;
}

/* ---------------------------------------------------------------------- */
/*  Mini gráfico de línea con área (sin dependencias externas)            */
/* ---------------------------------------------------------------------- */
function LineChart({ data, width = 560, height = 190 }) {
  if (!data || data.length < 2) {
    return <div className="h-full flex items-center justify-center text-sm text-base-500">Sin datos suficientes todavía</div>;
  }
  const pad = 10;
  const values = data.map((d) => d.value);
  const max = Math.max(...values, 1);
  const min = 0;
  const stepX = (width - pad * 2) / (data.length - 1);
  const points = data.map((d, i) => {
    const x = pad + i * stepX;
    const y = pad + (1 - (d.value - min) / (max - min || 1)) * (height - pad * 2);
    return [x, y];
  });
  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L ${points[points.length - 1][0].toFixed(1)} ${height - pad} L ${points[0][0].toFixed(1)} ${height - pad} Z`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id="lineFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7c4dff" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#7c4dff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#lineFill)" />
      <path d={linePath} fill="none" stroke="#8b6bff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {points.map((p, i) => (
        <circle key={i} cx={p[0]} cy={p[1]} r="3" fill="#0d0d14" stroke="#a894ff" strokeWidth="2" />
      ))}
    </svg>
  );
}

/* ---------------------------------------------------------------------- */
/*  Donut chart (conic-gradient, sin dependencias)                        */
/* ---------------------------------------------------------------------- */
function DonutChart({ segments, total }) {
  const sum = segments.reduce((a, s) => a + s.value, 0) || 1;
  let acc = 0;
  const stops = segments.map((s) => {
    const start = (acc / sum) * 360;
    acc += s.value;
    const end = (acc / sum) * 360;
    return `${s.color} ${start}deg ${end}deg`;
  }).join(', ');

  return (
    <div className="flex items-center gap-6">
      <div className="relative w-28 h-28 shrink-0 rounded-full" style={{ background: `conic-gradient(${stops})` }}>
        <div className="absolute inset-2.5 bg-base-800 rounded-full flex flex-col items-center justify-center">
          <span className="text-lg font-bold text-white">{total}</span>
          <span className="text-[10px] text-base-500">Total</span>
        </div>
      </div>
      <div className="space-y-2 flex-1 min-w-0">
        {segments.map((s) => (
          <div key={s.label} className="flex items-center gap-2 text-sm">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: s.color }} />
            <span className="text-base-400 flex-1 truncate">{s.label}</span>
            <span className="text-white font-medium">{s.value}</span>
            <span className="text-base-600 text-xs w-10 text-right">{Math.round((s.value / sum) * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ComingSoon({ label, icon: IconComp }) {
  return (
    <div className="card-voxa rounded-2xl p-14 flex flex-col items-center justify-center text-center">
      <div className="w-14 h-14 rounded-2xl bg-info-500/15 border border-info-500/30 flex items-center justify-center text-info-300 mb-4">
        <IconComp width="24" height="24" />
      </div>
      <h3 className="text-white font-bold text-lg">{label}</h3>
      <p className="text-base-500 text-sm mt-1.5 max-w-xs">
        Esta sección está en construcción y estará disponible próximamente.
      </p>
    </div>
  );
}

/* ---------------------------------------------------------------------- */

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
    loadReport();
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

  const inputClass = "w-full px-4 py-2.5 bg-base-700/70 border border-base-600 rounded-lg text-white placeholder:text-base-500 focus:outline-none focus:ring-2 focus:ring-info-500 focus:border-info-500 transition";

  /* -------------------------- Datos derivados -------------------------- */

  const statusBreakdown = useMemo(() => {
    const counts = {};
    rides.forEach((r) => {
      const key = r.status === 'accepted' || r.status === 'in_progress' ? 'accepted' : r.status;
      counts[key] = (counts[key] || 0) + 1;
    });
    return Object.entries(counts).map(([status, value]) => ({
      label: statusMeta(status).label,
      value,
      color: statusMeta(status).color,
    }));
  }, [rides]);

  const uniquePassengers = useMemo(() => new Set(rides.map((r) => r.passenger_name)).size, [rides]);

  const trend = useMemo(() => {
    if (dailyReport.length < 2) return {};
    const sorted = [...dailyReport].sort((a, b) => new Date(a.date) - new Date(b.date));
    const last = sorted[sorted.length - 1];
    const prev = sorted[sorted.length - 2];
    const pct = (curr, before) => (before > 0 ? Math.round(((curr - before) / before) * 100) : null);
    return {
      rides: pct(Number(last.total_rides), Number(prev.total_rides)),
      revenue: pct(Number(last.total_revenue), Number(prev.total_revenue)),
    };
  }, [dailyReport]);

  const chartData = useMemo(() => {
    return [...dailyReport]
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(-14)
      .map((d) => ({ label: d.date, value: Number(d.total_rides) }));
  }, [dailyReport]);

  const alerts = useMemo(() => {
    const items = [];
    const pendingDriver = drivers.find((d) => !d.approved);
    if (pendingDriver) items.push({ type: 'warn', title: 'Nuevo conductor registrado', detail: `${pendingDriver.name} se registró`, time: pendingDriver.created_at });
    const lastPaid = rides.find((r) => r.status === 'completed');
    if (lastPaid) items.push({ type: 'ok', title: 'Viaje completado', detail: `Pago de $${lastPaid.fare_final || lastPaid.fare_estimate} recibido`, time: lastPaid.completed_at || lastPaid.created_at });
    const lastCancelled = rides.find((r) => r.status === 'cancelled');
    if (lastCancelled) items.push({ type: 'bad', title: 'Viaje cancelado', detail: `Viaje #${lastCancelled.id} cancelado`, time: lastCancelled.created_at });
    return items;
  }, [drivers, rides]);

  const alertDot = { warn: 'bg-yellow-400', ok: 'bg-accent-400', bad: 'bg-red-400' };

  const activeDrivers = drivers.filter((d) => d.status === 'available').slice(0, 6);
  const driverStatusBadge = (s) =>
    s === 'available' ? 'bg-accent-500/15 text-accent-300' :
    s === 'busy' ? 'bg-yellow-500/15 text-yellow-300' : 'bg-base-600 text-base-400';
  const driverStatusLabel = (s) => s === 'available' ? 'En línea' : s === 'busy' ? 'Ocupado' : 'Desconectado';

  return (
    <div className="min-h-screen bg-base-950 flex">
      {/* Sidebar */}
      <aside className="hidden md:flex w-64 shrink-0 flex-col bg-base-900 border-r border-base-700 p-4">
        <div className="flex items-center gap-2.5 px-2 mb-8">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-info-500 to-info-700 flex items-center justify-center text-white shadow-lg">
            <Icon.shield width="18" height="18" />
          </div>
          <div>
            <div className="text-white font-bold leading-tight tracking-tight">VOXA</div>
            <div className="text-base-500 text-[10px] uppercase tracking-wider">Admin</div>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.key}
              onClick={() => handleTabChange(item.key)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                tab === item.key
                  ? 'bg-info-500/15 text-info-300 border border-info-500/30'
                  : 'text-base-400 hover:bg-base-700/60 hover:text-white border border-transparent'
              }`}
            >
              <item.icon width="17" height="17" className="shrink-0" />
              {item.label}
            </button>
          ))}
        </nav>

        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-300 hover:bg-red-500/10 transition"
        >
          <Icon.logout width="17" height="17" /> Cerrar sesión
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
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-info-500 to-info-700 flex items-center justify-center text-white text-sm font-bold">
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
                  ? 'text-info-300 border-info-500'
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
              {/* Tarjetas de estadísticas */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Viajes totales', value: stats.rides.total, color: 'text-info-400', delta: trend.rides },
                  { label: 'Pasajeros (recientes)', value: uniquePassengers, color: 'text-primary-400', delta: null },
                  { label: 'Conductores', value: stats.drivers.total, color: 'text-accent-400', delta: null },
                  { label: 'Ingresos totales', value: `$${stats.rides.revenue}`, color: 'text-yellow-400', delta: trend.revenue },
                ].map((c) => (
                  <div key={c.label} className="card-voxa rounded-2xl p-4">
                    <div className="flex items-start justify-between">
                      <div className={`text-2xl font-bold ${c.color}`}>{c.value}</div>
                      {c.delta != null && (
                        <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-md ${c.delta >= 0 ? 'text-accent-300 bg-accent-500/10' : 'text-red-300 bg-red-500/10'}`}>
                          {c.delta >= 0 ? '+' : ''}{c.delta}%
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-base-500 mt-1">{c.label}</div>
                  </div>
                ))}
              </div>

              {/* Chart + Donut */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                <div className="lg:col-span-2 card-voxa rounded-2xl p-5">
                  <h3 className="font-bold text-sm text-white mb-4">Viajes por día (últimos 14 días)</h3>
                  <div className="h-48">
                    <LineChart data={chartData} />
                  </div>
                </div>
                <div className="card-voxa rounded-2xl p-5">
                  <h3 className="font-bold text-sm text-white mb-4">Viajes por estado</h3>
                  {statusBreakdown.length > 0 ? (
                    <DonutChart segments={statusBreakdown} total={rides.length} />
                  ) : (
                    <div className="text-sm text-base-500">Sin viajes todavía</div>
                  )}
                </div>
              </div>

              {/* Recientes + Conductores activos */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                <div className="lg:col-span-2 card-voxa rounded-2xl overflow-hidden">
                  <div className="p-4 border-b border-base-700 flex justify-between items-center">
                    <h3 className="font-bold text-sm text-white">Viajes recientes</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-base-500 text-xs uppercase tracking-wide">
                          <th className="px-4 py-2 font-medium">Usuario</th>
                          <th className="px-4 py-2 font-medium hidden sm:table-cell">Destino</th>
                          <th className="px-4 py-2 font-medium">Tarifa</th>
                          <th className="px-4 py-2 font-medium">Estado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-base-700/70">
                        {rides.slice(0, 6).map((r) => (
                          <tr key={r.id} className="hover:bg-base-700/30 transition">
                            <td className="px-4 py-2.5 text-white font-medium whitespace-nowrap">{r.passenger_name}</td>
                            <td className="px-4 py-2.5 text-base-400 hidden sm:table-cell truncate max-w-[180px]">{r.dropoff_address}</td>
                            <td className="px-4 py-2.5 text-white">${r.fare_final || r.fare_estimate}</td>
                            <td className="px-4 py-2.5">
                              <span className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${statusMeta(r.status).badge}`}>
                                {statusMeta(r.status).label}
                              </span>
                            </td>
                          </tr>
                        ))}
                        {rides.length === 0 && (
                          <tr><td colSpan={4} className="px-4 py-6 text-center text-base-500">Todavía no hay viajes</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="card-voxa rounded-2xl overflow-hidden">
                  <div className="p-4 border-b border-base-700 flex justify-between items-center">
                    <h3 className="font-bold text-sm text-white">Conductores activos</h3>
                    <span className="text-xs text-base-500">Ver todos</span>
                  </div>
                  <div className="divide-y divide-base-700/70">
                    {activeDrivers.map((d) => (
                      <div key={d.id} className="p-3.5 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-accent-500 to-accent-700 flex items-center justify-center text-white text-xs font-bold shrink-0">
                          {d.name?.[0]?.toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm text-white font-medium truncate">{d.name}</div>
                          <div className="text-xs text-base-500">{d.plate}</div>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full shrink-0 ${driverStatusBadge(d.status)}`}>
                          {driverStatusLabel(d.status)}
                        </span>
                      </div>
                    ))}
                    {activeDrivers.length === 0 && (
                      <div className="p-4 text-center text-sm text-base-500">Nadie en línea ahora mismo</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Mapa + Alertas */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                <div className="lg:col-span-2 card-voxa rounded-2xl overflow-hidden" style={{ height: '360px' }}>
                  <div className="p-3.5 border-b border-base-700 flex justify-between items-center">
                    <h3 className="font-bold text-sm text-white">Mapa en tiempo real</h3>
                    <span className="text-xs text-base-500">{driverLocations.length} conectados</span>
                  </div>
                  <div className="h-[calc(100%-46px)]">
                    <Map center={currentLocation} zoom={13} drivers={driverLocations} className="h-full" />
                  </div>
                </div>

                <div className="card-voxa rounded-2xl overflow-hidden" style={{ height: '360px' }}>
                  <div className="p-4 border-b border-base-700 flex items-center gap-2">
                    <Icon.bell width="16" height="16" className="text-base-400" />
                    <h3 className="font-bold text-sm text-white">Alertas y notificaciones</h3>
                  </div>
                  <div className="divide-y divide-base-700/70 overflow-y-auto" style={{ maxHeight: 'calc(100% - 53px)' }}>
                    {alerts.map((a, i) => (
                      <div key={i} className="p-3.5 flex gap-3">
                        <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${alertDot[a.type]}`} />
                        <div className="min-w-0">
                          <div className="text-sm text-white font-medium">{a.title}</div>
                          <div className="text-xs text-base-500 truncate">{a.detail}</div>
                          <div className="text-[11px] text-base-600 mt-0.5">{timeAgo(a.time)}</div>
                        </div>
                      </div>
                    ))}
                    {alerts.length === 0 && (
                      <div className="p-4 text-center text-sm text-base-500">Todo tranquilo por ahora</div>
                    )}
                  </div>
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
                        <span className={`text-xs px-2 py-1 rounded-full ${statusMeta(ride.status).badge}`}>
                          {statusMeta(ride.status).label}
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
                    className="bg-gradient-to-r from-info-500 to-info-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:from-info-400 hover:to-info-500 transition"
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
                          <span className={`text-xs px-2 py-1 rounded-full ${driverStatusBadge(driver.status)}`}>
                            {driverStatusLabel(driver.status)}
                          </span>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            driver.approved ? 'bg-info-500/15 text-info-300' : 'bg-red-500/15 text-red-300'
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
                          className="flex-1 py-2.5 bg-gradient-to-r from-info-500 to-info-600 text-white rounded-lg font-medium hover:from-info-400 hover:to-info-500 transition"
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

          {tab === 'users' && <ComingSoon label="Usuarios" icon={Icon.users} />}
          {tab === 'vehicles' && <ComingSoon label="Vehículos" icon={Icon.vehicles} />}
          {tab === 'payments' && <ComingSoon label="Pagos" icon={Icon.payments} />}
          {tab === 'promotions' && <ComingSoon label="Promociones" icon={Icon.promotions} />}
          {tab === 'support' && <ComingSoon label="Soporte" icon={Icon.support} />}

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
