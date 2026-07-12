import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Register({ onSwitch }) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(form);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fields = [
    { name: 'name', label: 'Nombre completo', type: 'text', placeholder: 'Juan Pérez' },
    { name: 'email', label: 'Email', type: 'email', placeholder: 'tu@email.com' },
    { name: 'phone', label: 'Teléfono', type: 'tel', placeholder: '3442-XXXXXX' },
    { name: 'password', label: 'Contraseña', type: 'password', placeholder: '••••••••', minLength: 6 },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden bg-base-950 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gradient-to-br from-base-950 via-base-900 to-base-800" />
      <div className="absolute w-96 h-96 bg-accent-500/15 blur-3xl rounded-full -top-20 -right-20" />
      <div className="absolute w-96 h-96 bg-primary-600/20 blur-3xl rounded-full bottom-0 -left-20" />

      <div className="relative w-full max-w-md card-voxa rounded-3xl p-10">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center mx-auto shadow-glow">
            <span className="text-2xl font-black text-white tracking-tighter">T</span>
          </div>
          <h1 className="text-2xl font-bold text-white mt-5">Crear cuenta</h1>
          <p className="text-base-500 mt-1 text-sm">Concepción del Uruguay</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-xl bg-red-500/10 border border-red-500/40 p-3 text-red-300 text-sm">
              {error}
            </div>
          )}

          {fields.map((f) => (
            <div key={f.name}>
              <label className="block text-base-500 text-sm mb-2">{f.label}</label>
              <input
                type={f.type}
                name={f.name}
                value={form[f.name]}
                onChange={handleChange}
                placeholder={f.placeholder}
                minLength={f.minLength}
                className="w-full rounded-xl bg-base-700/70 border border-base-600 px-4 py-3 text-white placeholder:text-base-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition"
                required
              />
            </div>
          ))}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-gradient-to-r from-accent-500 to-accent-600 hover:from-accent-400 hover:to-accent-500 transition py-3.5 font-bold text-white shadow-glow-accent disabled:opacity-50"
          >
            {loading ? 'Creando cuenta...' : 'Crear cuenta'}
          </button>
        </form>

        <p className="text-center mt-6 text-base-500 text-sm">
          ¿Ya tenés cuenta?{' '}
          <button onClick={onSwitch} className="text-accent-400 font-semibold hover:text-accent-300 transition">
            Iniciá sesión
          </button>
        </p>
      </div>
    </div>
  );
}
