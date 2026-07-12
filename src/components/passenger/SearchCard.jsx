export default function SearchCard({ onRequest }) {
  return (
    <div className="absolute bottom-5 left-4 right-4 z-30">
      <div className="card-voxa rounded-3xl p-6">
        <h2 className="text-white text-2xl font-bold">¿A dónde vas?</h2>
        <p className="text-base-500 mt-1">Solicitá un taxi en segundos</p>
        <button
          onClick={onRequest}
          className="mt-5 w-full bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-400 hover:to-primary-500 transition rounded-2xl py-4 text-white font-bold text-lg shadow-glow"
        >
          🚖 Pedir Taxi
        </button>
      </div>
    </div>
  );
}
