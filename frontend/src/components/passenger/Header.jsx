export default function Header({ user, logout, loadHistory }) {
  return (
    <header className="absolute top-0 left-0 right-0 z-50 p-4">

      <div className="backdrop-blur-xl bg-slate-900/80 border border-slate-700 rounded-3xl shadow-xl p-4">

        <div className="flex justify-between items-center">

          <div className="flex items-center gap-4">

            <div className="w-14 h-14 rounded-2xl bg-green-500 flex items-center justify-center text-3xl">
              🚖
            </div>

            <div>

              <h1 className="text-white text-xl font-bold">
                Taxi App
              </h1>

              <p className="text-slate-400 text-sm">
                Hola {user?.name}
              </p>

            </div>

          </div>

          <div className="flex gap-2">

            <button
              onClick={loadHistory}
              className="bg-slate-800 hover:bg-slate-700 rounded-xl px-4 py-2 text-white"
            >
              📋
            </button>

            <button
              onClick={logout}
              className="bg-red-500 hover:bg-red-600 rounded-xl px-4 py-2 text-white"
            >
              Salir
            </button>

          </div>

        </div>

      </div>

    </header>
  );
}