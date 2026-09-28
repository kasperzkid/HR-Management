import { useEffect, useState } from 'react'
import { Bot, MessageCircle, Send, Sparkles, X } from 'lucide-react'
import { Link } from 'react-router-dom'

const API_URL = '/api/hr-manager'

function rows(data) {
  if (Array.isArray(data)) return data
  return data?.employees || data?.requests || data?.records || data?.payroll || []
}

function tomorrowMonthDay() {
  const date = new Date()
  date.setDate(date.getDate() + 1)
  return `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export default function HRAssistant({ open, onClose }) {
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [context, setContext] = useState({ employees: [], leaves: [], payroll: [] })
  const [messages, setMessages] = useState([
    { role: 'assistant', text: 'Hi! I can help you find HR information and navigate employee, leave, payroll, and attendance workflows.' },
  ])

  useEffect(() => {
    if (!open) return
    let cancelled = false
    async function loadContext() {
      setLoading(true)
      try {
        const month = new Date().toISOString().slice(0, 7)
        const [employeeResponse, leaveResponse, payrollResponse] = await Promise.all([
          fetch(`${API_URL}/employees`, { cache: 'no-store' }),
          fetch(`${API_URL}/leave`, { cache: 'no-store' }),
          fetch(`${API_URL}/payroll?payrollMonth=${month}`, { cache: 'no-store' }),
        ])
        const [employeeData, leaveData, payrollData] = await Promise.all([
          employeeResponse.ok ? employeeResponse.json() : [],
          leaveResponse.ok ? leaveResponse.json() : [],
          payrollResponse.ok ? payrollResponse.json() : [],
        ])
        if (!cancelled) setContext({ employees: rows(employeeData), leaves: rows(leaveData), payroll: rows(payrollData) })
      } catch {
        if (!cancelled) setContext({ employees: [], leaves: [], payroll: [] })
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    loadContext()
    return () => { cancelled = true }
  }, [open])

  if (!open) return null

  function answer(text) {
    const query = text.toLowerCase()
    const pendingLeaves = context.leaves.filter((item) => item.approvalStatus === 'Pending').length
    const activeEmployees = context.employees.filter((employee) => (employee.status || employee.employmentStatus || '').toLowerCase() === 'active').length
    const grossPayroll = context.payroll.reduce((total, item) => total + Number(item.grossSalary || 0), 0)
    const tomorrow = tomorrowMonthDay()
    const birthdays = context.employees.filter((employee) => {
      const date = String(employee.dateOfBirth || employee.dob || '').split('T')[0]
      return date.slice(5, 10) === tomorrow
    })

    if (/leave|vacation|time off/.test(query)) {
      return { text: `There ${pendingLeaves === 1 ? 'is' : 'are'} ${pendingLeaves} pending leave request${pendingLeaves === 1 ? '' : 's'} in the HR review inbox.`, action: 'Open leave review', href: '/hr-manager/leave#leave-review-inbox' }
    }
    if (/payroll|salary|pay run/.test(query)) {
      const month = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      return { text: `${month} has ${context.payroll.length} saved payroll record${context.payroll.length === 1 ? '' : 's'}${context.payroll.length ? `, with total gross pay of ${new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(grossPayroll)}.` : '.'}`, action: 'Open payroll', href: '/hr-manager/payroll' }
    }
    if (/birthday/.test(query)) {
      const names = birthdays.map((person) => person.name || [person.firstName, person.lastName].filter(Boolean).join(' ')).filter(Boolean)
      return { text: names.length ? `Tomorrow's birthday${names.length === 1 ? '' : 's'}: ${names.join(', ')}.` : 'I found no employee birthdays for tomorrow.', action: 'Open employees', href: '/hr-manager/employees' }
    }
    if (/employee|headcount|staff|team/.test(query)) {
      return { text: `There are ${context.employees.length} employee records, including ${activeEmployees} marked active.`, action: 'Open employees', href: '/hr-manager/employees' }
    }
    if (/attendance|late|check.?in|check.?out/.test(query)) {
      return { text: 'Attendance records and daily check-in status are available in Attendance. Check-in time windows and office geofence rules can be adjusted in HR Settings.', action: 'Open attendance', href: '/hr-manager/attendance' }
    }
    return { text: 'I can help with employee headcount, pending leave, payroll totals, birthdays, or attendance workflows. Try one of the suggested questions below.' }
  }

  function submit(text = input) {
    const prompt = text.trim()
    if (!prompt) return
    setInput('')
    setMessages((current) => [...current, { role: 'user', text: prompt }])
    const response = answer(prompt)
    setMessages((current) => [...current, { role: 'assistant', ...response }])
  }

  const suggestions = ['How many employees are active?', 'How many leave requests are pending?', 'Is payroll ready?', 'Whose birthday is tomorrow?']

  return (
    <div className="fixed inset-0 z-[100] flex justify-end bg-slate-950/20 backdrop-blur-[1px]" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section className="flex h-full w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-2xl" aria-label="HR AI Assistant">
        <header className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-50 text-[#0092B8]"><Sparkles size={19} /></div>
            <div><h2 className="text-sm font-bold text-slate-900">HR AI Assistant</h2><p className="mt-0.5 text-xs text-slate-500">HR workspace helper</p></div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close assistant" className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X size={18} /></button>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto bg-slate-50/70 p-4">
          {messages.map((message, index) => (
            <div key={`${message.role}-${index}`} className={`flex gap-2.5 ${message.role === 'user' ? 'justify-end' : ''}`}>
              {message.role === 'assistant' && <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-cyan-50 text-[#0092B8]"><Bot size={16} /></div>}
              <div className={`max-w-[85%] rounded-2xl px-3.5 py-3 text-sm leading-6 ${message.role === 'user' ? 'bg-slate-900 text-white' : 'border border-slate-100 bg-white text-slate-700 shadow-sm'}`}>
                <p>{message.text}</p>
                {message.action && <Link to={message.href} onClick={onClose} className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-[#0092B8] hover:underline">{message.action} <span aria-hidden="true">→</span></Link>}
              </div>
              {message.role === 'user' && <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-200 text-slate-600"><MessageCircle size={15} /></div>}
            </div>
          ))}
          {loading && <p className="pl-10 text-xs text-slate-400">Loading HR data…</p>}
          <div className="pl-10">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">Suggested questions</p>
            <div className="flex flex-wrap gap-2">{suggestions.map((suggestion) => <button key={suggestion} type="button" onClick={() => submit(suggestion)} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-left text-[11px] font-medium text-slate-600 hover:border-cyan-200 hover:text-[#0092B8]">{suggestion}</button>)}</div>
          </div>
        </div>

        <form onSubmit={(event) => { event.preventDefault(); submit() }} className="flex gap-2 border-t border-slate-100 bg-white p-4">
          <input value={input} onChange={(event) => setInput(event.target.value)} placeholder="Ask about your HR data…" className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none focus:border-[#0092B8] focus:ring-4 focus:ring-cyan-100" />
          <button type="submit" disabled={!input.trim()} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#0092B8] text-white hover:bg-[#007a99] disabled:opacity-40" aria-label="Send question"><Send size={16} /></button>
        </form>
      </section>
    </div>
  )
}
