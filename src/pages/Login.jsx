import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Login({ onSwitch }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-base-950 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gradient-to-br from-base-950 via-base-900 to-base-800" />
      <div className="absolute w-96 h-96 bg-primary-600/20 blur-3xl rounded-full -top-20 -left-20" />
      <div className="absolute w-96 h-96 bg-accent-500/15 blur-3xl rounded-full bottom-0 right-0" />

      <div className="relative w-full max-w-md card-voxa rounded-3xl p-10">
        <div className="text-center mb-10">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center mx-auto shadow-glow">
            <span className="text-3xl font-black text-white tracking-tighter">T</span>
          </div>
          <h1 className="text-4xl font-bold text-white mt-6 tracking-tight">
            TaxiApp
          </h1>
          <p className="text-base-500 mt-2 text-sm">
            Movilidad para Concepción del Uruguay
          </p>
        </div>

        {error && (
          <div className="mb-5 rounded-xl bg-red-500/10 border border-red-500/40 p-3 text-red-300 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-base-500 text-sm mb-2">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="correo@ejemplo.com"
              className="w-full rounded-xl bg-base-700/70 border border-base-600 px-4 py-3.5 text-white placeholder:text-base-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition"
            />
          </div>

          <div>
            <label className="block text-base-500 text-sm mb-2">Contraseña</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="********"
              className="w-full rounded-xl bg-base-700/70 border border-base-600 px-4 py-3.5 text-white placeholder:text-base-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition"
            />
          </div>

          <button
            disabled={loading}
            type="submit"
            className="w-full rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-400 hover:to-primary-500 transition py-4 text-base font-bold text-white shadow-glow disabled:opacity-50"
          >
            {loading ? 'Ingresando...' : 'Iniciar sesión'}
          </button>
        </form>

        <div className="mt-8 text-center text-sm space-y-2">
          <div>
            <span className="text-base-500">¿No tenés cuenta?</span>
            <button
              onClick={onSwitch}
              className="ml-2 text-accent-400 hover:text-accent-300 font-semibold transition"
            >
              Registrate
            </button>
          </div>
          <button
            type="button"
            onClick={() => { setEmail('admin@taxiapp.com'); setPassword('admin123'); }}
            className="text-xs text-primary-500 hover:text-primary-400 transition"
          >
            Acceder como admin
          </button>
        </div>
      </div>
    </div>
  );
}
