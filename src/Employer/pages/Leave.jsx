const leaveRequests = [
  { type: 'Annual Leave', dates: 'Jul 20 - Jul 24', days: 5, status: 'approved' },
  { type: 'Sick Leave', dates: 'Mar 02 - Mar 03', days: 2, status: 'approved' },
  { type: 'Personal Leave', dates: 'Jun 10 - Jun 11', days: 2, status: 'pending' },
]

const statusStyles = {
  approved: 'bg-emerald-100 text-emerald-700',
  pending: 'bg-amber-100 text-amber-700',
  rejected: 'bg-rose-100 text-rose-700',
}

function Leave() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Leave Requests</h2>
          <p className="text-slate-500 mt-1">Manage your time off</p>
        </div>
        <button className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors">
          New Request
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Annual Leave', value: '10 / 15 days', pct: '67%' },
          { label: 'Sick Leave', value: '8 / 10 days', pct: '80%' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
            <p className="text-sm text-slate-500">{s.label}</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{s.value}</p>
            <div className="mt-3 h-2 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-indigo-500"
                style={{ width: s.pct }}
              />
            </div>
            <p className="text-xs text-slate-400 mt-2">{s.pct} used</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-900">Request History</h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500 border-b border-slate-100">
              <th className="px-6 py-3 font-medium">Type</th>
              <th className="px-6 py-3 font-medium">Dates</th>
              <th className="px-6 py-3 font-medium">Days</th>
              <th className="px-6 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {leaveRequests.map((r) => (
              <tr key={r.type + r.dates} className="border-b border-slate-50 last:border-0">
                <td className="px-6 py-4 font-medium text-slate-800">{r.type}</td>
                <td className="px-6 py-4 text-slate-600">{r.dates}</td>
                <td className="px-6 py-4 text-slate-600">{r.days}</td>
                <td className="px-6 py-4">
                  <span
                    className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${statusStyles[r.status]}`}
                  >
                    {r.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default Leave