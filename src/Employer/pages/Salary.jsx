const salaryBreakdown = [
  { label: 'Base Salary', amount: 2800, type: 'base' },
  { label: 'Housing Allowance', amount: 500, type: 'allowance' },
  { label: 'Transport Allowance', amount: 200, type: 'allowance' },
  { label: 'Tax Deduction', amount: -320, type: 'deduction' },
  { label: 'Insurance', amount: -80, type: 'deduction' },
]

const total = salaryBreakdown.reduce((sum, item) => sum + item.amount, 0)

function Salary() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Salary</h2>
        <p className="text-slate-500 mt-1">Your compensation breakdown</p>
      </div>

      <div className="bg-gradient-to-r from-indigo-600 to-violet-600 rounded-xl p-6 text-white shadow-lg">
        <p className="text-sm text-indigo-200">Net Monthly Salary</p>
        <p className="text-4xl font-bold mt-1">
          ${total.toLocaleString()}
        </p>
        <p className="text-sm text-indigo-200 mt-3">Paid on the 1st of each month</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-900">Breakdown</h3>
        </div>
        <div className="divide-y divide-slate-50">
          {salaryBreakdown.map((item) => (
            <div
              key={item.label}
              className="flex items-center justify-between px-6 py-4"
            >
              <div className="flex items-center gap-3">
                <span
                  className={`w-2 h-2 rounded-full ${
                    item.type === 'base'
                      ? 'bg-indigo-500'
                      : item.type === 'allowance'
                        ? 'bg-emerald-500'
                        : 'bg-rose-500'
                  }`}
                />
                <p className="text-sm font-medium text-slate-800">{item.label}</p>
              </div>
              <p
                className={`text-sm font-semibold ${
                  item.amount > 0 ? 'text-slate-900' : 'text-rose-600'
                }`}
              >
                {item.amount > 0 ? '+' : ''}${item.amount.toLocaleString()}
              </p>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-t border-slate-100">
          <p className="text-sm font-semibold text-slate-900">Total</p>
          <p className="text-sm font-bold text-indigo-600">${total.toLocaleString()}</p>
        </div>
      </div>
    </div>
  )
}

export default Salary