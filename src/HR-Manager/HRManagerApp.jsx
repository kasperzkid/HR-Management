import { Link } from 'react-router-dom'

function HRManagerApp() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-900 flex flex-col items-center justify-center text-white px-6">
      <h1 className="text-3xl font-bold tracking-tight mb-2 text-emerald-400">HR Manager Portal</h1>
      <p className="text-slate-400 mb-8">Coming soon — this section is under construction.</p>
      <Link
        to="/"
        className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-semibold transition-colors"
      >
        ← Back to Home
      </Link>
    </div>
  )
}

export default HRManagerApp