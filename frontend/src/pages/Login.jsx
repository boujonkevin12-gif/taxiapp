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
    <div className="relative min-h-screen overflow-hidden bg-slate-950 flex items-center justify-center">

      {/* Fondo */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800" />

      <div className="absolute w-96 h-96 bg-green-500/20 blur-3xl rounded-full -top-20 -left-20"></div>
      <div className="absolute w-96 h-96 bg-blue-500/20 blur-3xl rounded-full bottom-0 right-0"></div>

      {/* Card */}
      <div className="relative w-full max-w-md bg-slate-900/80 backdrop-blur-xl border border-slate-700 rounded-3xl shadow-2xl p-10">

        <div className="text-center mb-10">

          <div className="w-24 h-24 rounded-full bg-green-500 flex items-center justify-center mx-auto shadow-lg shadow-green-500/30">

            <span className="text-5xl">🚖</span>

          </div>

          <h1 className="text-4xl font-bold text-white mt-6">
            Taxi App
          </h1>

          <p className="text-slate-400 mt-2">
            Concepción del Uruguay
          </p>

        </div>

        {error && (
          <div className="mb-5 rounded-xl bg-red-500/20 border border-red-500 p-3 text-red-300 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">

          <div>

            <label className="block text-slate-300 mb-2">
              Email
            </label>

            <input
              type="email"
              required
              value={email}
              onChange={(e)=>setEmail(e.target.value)}
              placeholder="correo@ejemplo.com"
              className="w-full rounded-xl bg-slate-800 border border-slate-700 px-4 py-4 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500 transition"
            />

          </div>

          <div>

            <label className="block text-slate-300 mb-2">
              Contraseña
            </label>

            <input
              type="password"
              required
              value={password}
              onChange={(e)=>setPassword(e.target.value)}
              placeholder="********"
              className="w-full rounded-xl bg-slate-800 border border-slate-700 px-4 py-4 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500 transition"
            />

          </div>

          <button
            disabled={loading}
            type="submit"
            className="w-full rounded-xl bg-green-500 hover:bg-green-600 transition py-4 text-lg font-bold text-white shadow-lg shadow-green-500/30 disabled:opacity-50"
          >
            {loading ? "Ingresando..." : "Iniciar sesión"}
          </button>

        </form>

        <div className="mt-8 text-center">

          <span className="text-slate-400">
            ¿No tenés cuenta?
          </span>

          <button
            onClick={onSwitch}
            className="ml-2 text-green-400 hover:text-green-300 font-semibold transition"
          >
            Registrate
          </button>

        </div>

      </div>

    </div>
  );
}