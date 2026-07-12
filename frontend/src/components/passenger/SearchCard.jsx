export default function SearchCard({ onRequest }) {

  return (

<div className="absolute bottom-8 left-5 right-5 z-40">

<div className="bg-slate-900/90 backdrop-blur-xl rounded-3xl p-5 shadow-2xl border border-slate-700">

<h2 className="text-white text-2xl font-bold">

¿A dónde vas?

</h2>

<p className="text-slate-400 mt-1">

Solicitá un taxi en segundos

</p>

<button

onClick={onRequest}

className="mt-5 w-full bg-green-500 hover:bg-green-600 transition rounded-2xl py-4 text-white font-bold text-lg"

>

Pedir Taxi

</button>

</div>

</div>

  );

}