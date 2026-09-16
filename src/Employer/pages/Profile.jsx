const profileInfo = [
  { label: 'Full Name', value: 'Alex Johnson' },
  { label: 'Employee ID', value: 'EMP-2024-083' },
  { label: 'Department', value: 'Engineering' },
  { label: 'Role', value: 'Frontend Developer' },
  { label: 'Email', value: 'alex.johnson@ythr.com' },
  { label: 'Phone', value: '+1 (555) 014-8892' },
  { label: 'Date Joined', value: 'March 2023' },
]

function Profile() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Profile</h2>
        <p className="text-slate-500 mt-1">Your personal information</p>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 flex items-center gap-6">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-2xl font-bold shrink-0">
          AJ
        </div>
        <div>
          <h3 className="text-xl font-bold text-slate-900">Alex Johnson</h3>
          <p className="text-indigo-600 text-sm font-medium mt-1">Frontend Developer</p>
          <span className="inline-block mt-2 text-xs px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 font-medium">
            Active
          </span>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-900">Personal Details</h3>
        </div>
        <div className="divide-y divide-slate-50">
          {profileInfo.map((item) => (
            <div
              key={item.label}
              className="flex items-center justify-between px-6 py-4"
            >
              <p className="text-sm text-slate-500">{item.label}</p>
              <p className="text-sm font-medium text-slate-900">{item.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default Profile