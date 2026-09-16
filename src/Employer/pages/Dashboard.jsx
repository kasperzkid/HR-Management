const stats = [
  { label: 'Days Present', value: '21', change: '+3 this month', color: 'bg-emerald-500' },
  { label: 'Leave Taken', value: '2', change: 'of 12 remaining', color: 'bg-amber-500' },
  { label: 'Deadlines Met', value: '96%', change: '+2% vs last month', color: 'bg-indigo-500' },
  { label: 'Next Payout', value: '$2,400', change: 'In 5 days', color: 'bg-rose-500' },
]

const upcoming = [
  { title: 'Team Standup', time: '9:00 AM', today: true },
  { title: 'Sprint Review', time: '2:30 PM', today: true },
  { title: '1:1 with Manager', time: 'Tomorrow 11:00 AM', today: false },
]

const recentActivity = [
  { action: 'Clock-in recorded', time: '8:47 AM', type: 'attendance' },
  { action: 'Leave request approved', time: 'Yesterday', type: 'leave' },
  { action: 'Monthly salary processed', time: '3 days ago', type: 'salary' },
]

function Dashboard() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Dashboard</h2>
          <p className="text-slate-500 mt-1">Welcome back, Alex!</p>
        </div>
        <button className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors">
          Request Leave
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
            <div className={`w-2 h-2 rounded-full ${stat.color} mb-3`} />
            <p className="text-3xl font-bold text-slate-900">{stat.value}</p>
            <p className="text-sm text-slate-500 mt-1">{stat.label}</p>
            <p className="text-xs text-slate-400 mt-2">{stat.change}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <h3 className="font-semibold text-slate-900 mb-4">Upcoming Schedule</h3>
          <div className="space-y-3">
            {upcoming.map((item) => (
              <div
                key={item.title}
                className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100"
              >
                <div>
                  <p className="text-sm font-medium text-slate-800">{item.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{item.time}</p>
                </div>
                {item.today && (
                  <span className="text-xs px-2 py-1 rounded-full bg-indigo-100 text-indigo-700 font-medium">
                    Today
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <h3 className="font-semibold text-slate-900 mb-4">Recent Activity</h3>
          <div className="space-y-3">
            {recentActivity.map((item) => (
              <div
                key={item.action}
                className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100"
              >
                <span className="text-lg">
                  {item.type === 'attendance'
                    ? '🕐'
                    : item.type === 'leave'
                      ? '🗓️'
                      : '💰'}
                </span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-800">{item.action}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{item.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard