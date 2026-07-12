export default function Header({ user, logout, loadHistory }) {
  return (
    <header className="absolute top-0 left-0 right-0 z-50 p-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-white text-xl font-bold flex items-center gap-1.5 drop-shadow-lg">
            Hola, {user?.name?.split(' ')[0] || 'Kevin'} <span>👋</span>
          </h1>
        </div>

        <div className="flex gap-2">
          <button
            onClick={loadHistory}
            className="w-10 h-10 rounded-full bg-base-900/80 backdrop-blur-xl border border-base-600/60 flex items-center justify-center text-base-300 hover:text-white hover:bg-base-800 transition shadow-lg"
            aria-label="Historial"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 3v5h5" /><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8" /><path d="M12 7v5l4 2" />
            </svg>
          </button>
          <button
            onClick={logout}
            className="w-10 h-10 rounded-full bg-base-900/80 backdrop-blur-xl border border-base-600/60 flex items-center justify-center text-red-300 hover:bg-red-500/15 transition shadow-lg"
            aria-label="Salir"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="M16 17l5-5-5-5" /><path d="M21 12H9" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}
