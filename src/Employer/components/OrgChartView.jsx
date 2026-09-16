function OrgChartView({ employees, onSelectEmployee }) {
  // Group by departments
  const departments = [
    {
      name: 'Management Team',
      lead: employees.find(e => e.department === 'Management Team') || employees[6],
      members: employees.filter(e => e.department === 'Management Team')
    },
    {
      name: 'Design Team',
      lead: employees.find(e => e.department === 'Design Team' && e.jobTitle.includes('UI Designer')) || employees[0],
      members: employees.filter(e => e.department === 'Design Team' || e.department === 'Team Design')
    },
    {
      name: 'Developer Team',
      lead: employees.find(e => e.department === 'Developer Team' && e.jobTitle.includes('Back-End')) || employees[4],
      members: employees.filter(e => e.department === 'Developer Team')
    },
    {
      name: 'Marketing Team',
      lead: employees.find(e => e.department === 'Marketing Team' && e.jobTitle.includes('Sales')) || employees[8],
      members: employees.filter(e => e.department === 'Marketing Team')
    }
  ]

  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-200/90 shadow-2xs space-y-8 overflow-x-auto">
      <div>
        <h3 className="font-bold text-gray-900 text-base">Organizational Hierarchy</h3>
        <p className="text-xs text-gray-500 mt-0.5">Visual representation of team reporting structure and roles</p>
      </div>

      {/* Root Node / Executive */}
      <div className="flex flex-col items-center">
        <div className="bg-gray-950 text-white p-4 rounded-2xl shadow-md flex items-center gap-3 w-64">
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white font-bold text-sm flex items-center justify-center">
            WB
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-300">Executive Leadership</p>
            <p className="text-sm font-bold text-white">Wishbone Global Org</p>
          </div>
        </div>
        <div className="w-0.5 h-8 bg-gray-300" />
      </div>

      {/* Departments Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative">
        {departments.map((dept) => (
          <div key={dept.name} className="flex flex-col items-center">
            {/* Department Lead Card */}
            <div
              onClick={() => dept.lead && onSelectEmployee(dept.lead)}
              className="w-full bg-gray-50 hover:bg-gray-100/80 p-4 rounded-xl border border-gray-200 cursor-pointer transition-all hover:shadow-xs group"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                  {dept.name}
                </span>
                <span className="text-xs text-gray-400">{dept.members.length} members</span>
              </div>
              {dept.lead && (
                <div className="flex items-center gap-2.5 mt-2">
                  <img
                    src={dept.lead.avatar}
                    alt={dept.lead.name}
                    className="w-9 h-9 rounded-lg object-cover"
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-gray-900 truncate group-hover:text-indigo-600">
                      {dept.lead.name}
                    </p>
                    <p className="text-[11px] text-gray-500 truncate">{dept.lead.jobTitle}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Connecting line */}
            <div className="w-0.5 h-4 bg-gray-200" />

            {/* Department Members List */}
            <div className="w-full space-y-2">
              {dept.members.map((member) => (
                <div
                  key={member.id}
                  onClick={() => onSelectEmployee(member)}
                  className="bg-white p-2.5 rounded-lg border border-gray-100 hover:border-gray-300 flex items-center justify-between cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <img
                      src={member.avatar}
                      alt={member.name}
                      className="w-7 h-7 rounded-md object-cover"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-gray-800 truncate">{member.name}</p>
                      <p className="text-[10px] text-gray-400 truncate">{member.jobTitle}</p>
                    </div>
                  </div>
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ml-2 ${
                      member.status === 'Active'
                        ? 'bg-emerald-500'
                        : member.status === 'Onboarding'
                        ? 'bg-amber-500'
                        : 'bg-rose-500'
                    }`}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default OrgChartView
