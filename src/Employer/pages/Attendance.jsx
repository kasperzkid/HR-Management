const attendanceDays = [
  { day: 'Mon', date: '12', status: 'present' },
  { day: 'Tue', date: '13', status: 'present' },
  { day: 'Wed', date: '14', status: 'present' },
  { day: 'Thu', date: '15', status: 'late' },
  { day: 'Fri', date: '16', status: 'present' },
]

const statusStyles = {
  present: 'bg-emerald-100 text-emerald-700',
  late: 'bg-amber-100 text-amber-700',
  absent: 'bg-rose-100 text-rose-700',
}

function Attendance() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Attendance</h2>
        <p className="text-slate-500 mt-1">Your work hours for this week</p>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
        <h3 className="font-semibold text-slate-900 mb-4">This Week</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {attendanceDays.map((d) => (
            <div
              key={d.date}
              className="p-4 rounded-lg bg-slate-50 border border-slate-100 text-center"
            >
              <p className="text-sm text-slate-500">{d.day}</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{d.date}</p>
              <span
                className={`inline-block mt-2 text-xs px-2.5 py-1 rounded-full font-medium capitalize ${statusStyles[d.status]}`}
              >
                {d.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Hours', value: '38.5h' },
          { label: 'Late Arrivals', value: '1' },
          { label: 'Overtime', value: '2.5h' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
            <p className="text-2xl font-bold text-slate-900">{s.value}</p>
            <p className="text-sm text-slate-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export default Attendance