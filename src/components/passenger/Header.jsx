export default function Header({ user, logout, loadHistory }) {
  return (
    <header className="absolute top-0 left-0 right-0 z-30 p-4">
      <div className="card-voxa rounded-3xl p-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-glow shrink-0">
              <span className="text-lg font-black text-white">T</span>
            </div>
            <div className="min-w-0">
              <h1 className="text-white text-base font-bold leading-tight">
                Hola {user?.name?.split(' ')[0] || ''} 👋
              </h1>
              <p className="text-base-500 text-xs">¿A dónde vamos hoy?</p>
            </div>
          </div>

          <div className="flex gap-2 shrink-0">
            <button
              onClick={loadHistory}
              className="w-10 h-10 flex items-center justify-center bg-base-700/70 hover:bg-base-600 border border-base-600 rounded-xl text-white transition"
              title="Historial"
            >
              📋
            </button>
            <button
              onClick={logout}
              className="px-4 h-10 flex items-center justify-center bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 rounded-xl text-red-300 text-sm font-medium transition"
            >
              Salir
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
