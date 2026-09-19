import { useState, useEffect, useMemo, useRef } from 'react'
import {
  Plus,
  X,
  Download,
  AlertCircle,
  Pencil,
  Upload,
  FileSpreadsheet,
  Eye,
  Power,
  Trash2,
  Mail,
  MapPin,
  CalendarDays,
} from 'lucide-react'
import * as XLSX from 'xlsx'
import { SETTINGS } from '../../Employer/data/settingsData'
import { formatETB } from '../../Employer/lib/payroll'
import AddEmployeeModal from '../components/AddEmployeeModal'
import EmployeeDetailsModal from '../../Employer/components/EmployeeDetailsModal'
import OrgChartView from '../../Employer/components/OrgChartView'
import LuxuryDataTable from '../components/LuxuryDataTable'
import { fetchEmployeesApi, createEmployeeApi, authHeaders, importEmployeesApi } from '../../lib/hrApi'

const REQUIRED_COLUMNS = [
  'Employee ID',
  'Full Name',
  'Gender',
  'Date of Birth',
  'Join Date',
  'Job Title',
  'Department',
  'Employment Type',
  'Basic Salary',
  'Transport Allow.',
  'Housing Allow.',
  'Meal Allow.',
  'Other Allow.',
  'Bank Name',
  'Bank Account No.',
  'TIN',
  'Pension ID',
  'Phone',
  'Email',
  'Address',
  'Emergency Contact',
  'Employment Status',
  'Exit Date',
  'Notes',
  'Data Check',
]

function Employees() {
  const [employees, setEmployees] = useState([])
  const [dbError, setDbError] = useState('')

  // Department/status filter options now come from SETTINGS (no sample data)
  const DEPARTMENTS = ['All Departments', ...(SETTINGS.departments || [])]
  const STATUSES = ['All Statuses', ...(SETTINGS.employmentStatuses || [])]
  const [activeTab, setActiveTab] = useState('list')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedDept, setSelectedDept] = useState('All Departments')
  const [selectedStatus, setSelectedStatus] = useState('All Statuses')

  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [importFile, setImportFile] = useState(null)
  const [importPreview, setImportPreview] = useState(null)
  const [importProgress, setImportProgress] = useState(null)
  const fileInputRef = useRef(null)
  const [editingEmployee, setEditingEmployee] = useState(null)
  const [selectedEmployee, setSelectedEmployee] = useState(null)
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)
  const [toastMessage, setToastMessage] = useState(null)

  const showToast = (title, detail) => {
    setToastMessage({ title, detail })
    setTimeout(() => setToastMessage(null), 4500)
  }

  useEffect(() => {
    let cancelled = false

    async function loadEmployees() {
      try {
        const data = await fetchEmployeesApi()
        if (!cancelled && Array.isArray(data) && data.length > 0) {
          setEmployees(data)
          setDbError('')
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Load employees error:', err)
          setDbError(err.message || 'Unable to load employees from the database')
        }
      }
    }

    loadEmployees()

    return () => {
      cancelled = true
    }
  }, [])

  const toApiPayload = (emp) => ({
    ...emp,
    identityType: emp.identityType ?? emp.identityIdType ?? '',
    identityNumber: emp.identityNumber ?? emp.identityIdNumber ?? '',
    identityIssueDate: emp.identityIssueDate ?? emp.identityIssuedDate ?? '',
    certifications: Array.isArray(emp.certificates)
      ? emp.certificates.map((c) => ({
          name: c.title || c.name || 'Untitled',
          issuer: c.issuer || '',
          issueDate: c.issueDate || '',
          expiryDate: c.expiryDate || '',
          fileName: c.name || '',
          mimeType: c.type || '',
          fileSize: c.size || 0,
        }))
      : emp.certifications,
  })

  const filteredEmployees = useMemo(() => {
    return employees
      .filter((emp) => {
        const matchesSearch =
          emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          emp.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          emp.employeeId.toLowerCase().includes(searchTerm.toLowerCase()) ||
          emp.jobTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
          emp.department.toLowerCase().includes(searchTerm.toLowerCase())

        const matchesDept = selectedDept === 'All Departments' || emp.department === selectedDept
        const matchesStatus =
          selectedStatus === 'All Statuses' ||
          emp.employmentStatus === selectedStatus ||
          emp.status === selectedStatus

        return matchesSearch && matchesDept && matchesStatus
      })
  }, [employees, searchTerm, selectedDept, selectedStatus])

  const handleAddEmployee = async (newEmp) => {
    try {
      const created = await createEmployeeApi(toApiPayload(newEmp))
      setEmployees((prev) => [created, ...prev])

      const creds = created.credentialsEmail
      const emailSentTo = (created.email || newEmp.email || '').trim()
      if (creds?.emailed) {
        showToast(`Added ${created.name || newEmp.name}`, emailSentTo ? `Portal login sent to ${emailSentTo}` : 'Portal login sent to their email')
      } else if (creds?.reason || creds?.emailError) {
        showToast(`Added ${created.name || newEmp.name}`, creds.reason || creds.emailError)
      } else {
        showToast(`Added ${created.name || newEmp.name} to the team`)
      }
    } catch (err) {
      console.error('Create employee error:', err)
      // Keep the UI responsive: add locally and surface the reason
      setEmployees((prev) => [newEmp, ...prev])
      showToast('Could not save to database', err.message || 'Added locally — a database write failed')
    }
  }

  const handleUpdateStatus = (id, newStatus) => {
    setEmployees(employees.map((e) => (e.id === id ? { ...e, status: newStatus, employmentStatus: newStatus } : e)))
    if (selectedEmployee?.id === id) setSelectedEmployee((prev) => ({ ...prev, status: newStatus }))
    const label = newStatus.toUpperCase()
    showToast('Status updated', label === 'ACTIVE' ? 'Employee is now active' : `Employee is now ${newStatus.toLowerCase()}`)
  }

  const handleUpdateEmployee = (updated) => {
    setEmployees((prev) => prev.map((e) => (e.id === updated.id ? { ...e, ...updated } : e)))
    if (selectedEmployee?.id === updated.id) setSelectedEmployee(updated)
    showToast('Employee updated', `${updated.name}'s record was saved`)
  }

  const handleDeleteEmployee = (id) => {
    setEmployees(employees.filter((e) => e.id !== id))
    showToast('Employee deleted', 'The record was removed from the registry')
    // Best-effort delete from the database (id may be a local-only record)
    fetch(`/api/hr-manager/employees/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    }).catch(() => {})
  }

  const handleExportCSV = () => {
    const list = filteredEmployees
    const headers = ['Employee ID', 'Name', 'Gender', 'Job Title', 'Department', 'Employment Type', 'Basic Salary', 'TIN', 'Status']
    const rows = list.map((e) => [
      `"${e.employeeId}"`,
      `"${e.name}"`,
      `"${e.gender}"`,
      `"${e.jobTitle}"`,
      `"${e.department}"`,
      `"${e.employmentType}"`,
      `"${e.basicSalary}"`,
      `"${e.tin}"`,
      `"${e.employmentStatus}"`,
    ])
    const csv = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const link = document.createElement('a')
    link.href = encodeURI(csv)
    link.download = `employees_${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    showToast('Export complete', `${list.length} employees written to CSV`)
  }

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.type !== 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' &&
        !file.name.toLowerCase().endsWith('.xlsx')) {
      showToast('Unsupported file', 'Only .xlsx files are accepted')
      setImportFile(null)
      setImportPreview(null)
      return
    }
    setImportFile(file)
    setImportProgress({ step: 'reading', total: 0, done: 0 })
    // Validate structure client-side and build preview
    try {
      const data = new Uint8Array(await file.arrayBuffer())
      const workbook = XLSX.read(data, { type: 'array' })
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
      const raw = XLSX.utils.sheet_to_json(firstSheet, { defval: '' })
      if (!raw || raw.length < 2) {
        showToast('Empty spreadsheet', 'The file has no data rows')
        setImportFile(null)
        setImportPreview(null)
        return
      }
      const headerKeys = Object.keys(raw[0])
      const headerLabels = headerKeys.map((k) => raw[0][k])
      const missing = REQUIRED_COLUMNS.filter(
        (c) => !headerLabels.includes(c)
      )
      if (missing.length > 0) {
        showToast('Missing columns', `Expected columns not found: ${missing.join(', ')}`)
        setImportFile(null)
        setImportPreview(null)
        return
      }
      // Build preview of first five data rows
      const previewRows = raw.slice(1, 6).map((r, idx) => {
        const vals = headerKeys.map((k) => r[k])
        return { row: idx + 2, values: vals, raw }
      })
      setImportPreview({ headerLabels, previewRows, totalRows: raw.length - 1, raw, headerKeys })
      setImportProgress({ step: 'ready', total: raw.length - 1, done: 0 })
    } catch (err) {
      showToast('Could not read file', err.message)
      setImportFile(null)
      setImportPreview(null)
    }
  }

  const handleImportSubmit = async () => {
    if (!importFile) return
    setImportProgress({ step: 'uploading', total: 0, done: 0 })
    try {
      await importEmployeesApi(importFile)
      setImportProgress({ step: 'importing', total: importPreview?.totalRows || 0, done: 0 })
      // Reload employee list
      const data = await fetchEmployeesApi()
      if (Array.isArray(data) && data.length > 0) {
        setEmployees(data)
      }
      showToast('Import complete', `${importPreview?.totalRows || 0} employees processed`)
      setImportModalOpen(false)
      setImportFile(null)
      setImportPreview(null)
      setImportProgress(null)
      fileInputRef.current && (fileInputRef.current.value = '')
    } catch (err) {
      showToast('Import failed', err.message || 'Could not import the spreadsheet')
    }
  }

  const handleCloseImport = () => {
    setImportModalOpen(false)
    setImportFile(null)
    setImportPreview(null)
    setImportProgress(null)
    fileInputRef.current && (fileInputRef.current.value = '')
  }

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-[1600px] mx-auto">
      {toastMessage && (
        <div className="fixed top-5 right-5 z-[100] bg-gray-950 text-white dark:bg-[#3a4149] px-4 py-3 rounded-xl shadow-xl flex items-start gap-3 text-xs font-medium animate-in fade-in duration-200 max-w-sm">
          <span className="mt-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0" />
          <div className="min-w-0">
            <p className="font-semibold text-[13px] leading-tight">{toastMessage.title}</p>
            {toastMessage.detail && (
              <p className="text-gray-400 dark:text-gray-300 mt-0.5 leading-snug break-words">{toastMessage.detail}</p>
            )}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-950 dark:text-gray-100">Employees</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Master employee registry — {employees.length} records, {SETTINGS.standardMonthlyHours} standard hours/mo</p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setImportModalOpen(true)}
            className="px-3 py-2 rounded-lg border border-gray-200 dark:border-[#262b31] bg-white dark:bg-[#15181d] hover:bg-gray-50 dark:hover:bg-[#1c2026] text-gray-800 dark:text-gray-200 text-xs font-semibold transition-colors flex items-center gap-1.5"
          >
            <Upload size={14} />
            Import XLSX
          </button>
          <button
            onClick={handleExportCSV}
            className="px-4 py-2 rounded-lg border border-gray-200 dark:border-[#262b31] bg-white dark:bg-[#15181d] hover:bg-gray-50 dark:hover:bg-[#1c2026] text-gray-800 dark:text-gray-200 text-xs font-semibold transition-colors flex items-center gap-2"
          >
            <Download size={14} />
            Export CSV
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2 rounded-lg bg-gray-950 hover:bg-gray-800 text-white text-xs font-semibold transition-colors flex items-center gap-1.5"
          >
            <Plus size={15} />
            Add new
          </button>
        </div>
      </div>

      {/* Database status banner */}
      {dbError && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-medium text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-400">
          <AlertCircle size={14} />
          <span>{dbError}</span>
        </div>
      )}

      {/* View switcher */}
      <div className="flex items-center justify-between gap-3">
        <div className="inline-flex p-1 bg-[#eceef1] dark:bg-[#1a1d21] rounded-xl border border-gray-200/70 dark:border-[#262b31] w-fit">
          {[
            { id: 'list', label: 'Table' },
            { id: 'directory', label: 'Grid' },
            { id: 'org', label: 'ORG Chart' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === t.id ? 'bg-white dark:bg-[#15181d] text-gray-950 dark:text-gray-100 shadow-2xs' : 'text-gray-600 dark:text-gray-400 hover:text-gray-950 dark:hover:text-gray-100'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main view */}
      {activeTab === 'org' ? (
        <OrgChartView
          employees={filteredEmployees}
          onSelectEmployee={(emp) => { setSelectedEmployee(emp); setIsDetailsModalOpen(true) }}
        />
      ) : activeTab === 'directory' ? (
        <LuxuryDataTable
          title="Employee Directory"
          subtitle={`${filteredEmployees.length} employees across ${new Set(filteredEmployees.map((e) => e.department)).size} departments`}
          columns={[
            {
              key: 'name',
              header: 'Name of Employee',
              sortable: true,
              render: (emp) => (
                <div className="flex items-center gap-3 min-w-[220px]">
                  <img
                    src={emp.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'}
                    alt={emp.name}
                    className="w-9 h-9 rounded-full object-cover bg-gray-100 dark:bg-[#1c2026] shrink-0 border border-gray-100 dark:border-[#262b31]"
                    onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80' }}
                  />
                  <div className="min-w-0">
                    <p
                      onClick={() => { setSelectedEmployee(emp); setIsDetailsModalOpen(true) }}
                      className="font-semibold text-gray-950 dark:text-gray-100 hover:text-emerald-600 dark:hover:text-emerald-400 cursor-pointer truncate"
                    >
                      {emp.name}
                    </p>
                    <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate">{emp.email}</p>
                  </div>
                </div>
              ),
            },
            {
              key: 'employeeId',
              header: 'Employee ID',
              sortable: true,
              render: (emp) => (
                <span
                  onClick={() => { setSelectedEmployee(emp); setIsDetailsModalOpen(true) }}
                  className="font-medium text-gray-900 dark:text-gray-100 underline underline-offset-2 decoration-gray-400 dark:decoration-gray-600 cursor-pointer hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors whitespace-nowrap"
                >
                  {emp.employeeId}
                </span>
              ),
            },
            { key: 'jobTitle', header: 'Job Title', sortable: true, render: (emp) => emp.jobTitle || '—' },
            { key: 'department', header: 'Department', sortable: true, render: (emp) => emp.department || '—' },
            { key: 'basicSalary', header: 'Basic', sortable: true, align: 'right', render: (emp) => <span className="whitespace-nowrap font-medium">{formatETB(emp.basicSalary)}</span> },
            { key: 'joinDate', header: 'Join Date', sortable: true, render: (emp) => <span className="whitespace-nowrap text-gray-500 dark:text-gray-400">{emp.joinDate}</span> },
            {
              key: 'status',
              header: 'Status',
              align: 'center',
              render: (emp) => {
                const rawStatus = emp.employmentStatus || emp.status || ''
                const status = rawStatus === 'Active' ? 'Active'
                  : rawStatus === 'On Leave' || rawStatus === 'Onboarding' ? 'On Board'
                  : rawStatus === 'Inactive' || rawStatus === 'Resigned' || rawStatus === 'Terminated' ? 'Inactive'
                  : rawStatus || '—'
                const badgeColor =
                  status === 'Active'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/60'
                    : status === 'On Board'
                      ? 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/60'
                      : 'bg-rose-50 text-rose-600 border-rose-300 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800/60'
                return (
                  <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold inline-block border ${badgeColor}`}>
                    {status}
                  </span>
                )
              },
            },
          ]}
          data={filteredEmployees}
          searchable
          searchKeys={['name', 'email', 'employeeId', 'jobTitle', 'department']}
          searchPlaceholder="Search name, ID, email, department..."
          exportable
          exportFilename="Employee_Directory"
          paginated
          defaultPageSize={10}
          loading={false}
          emptyMessage="No employees match your search or filter criteria."
          allowViewModeToggle
          defaultViewMode="grid"
          renderGridCard={(emp) => {
            const rawStatus = emp.employmentStatus || emp.status || ''
            const status = rawStatus === 'Active' ? 'Active'
              : rawStatus === 'On Leave' || rawStatus === 'Onboarding' ? 'On Board'
              : rawStatus === 'Inactive' || rawStatus === 'Resigned' || rawStatus === 'Terminated' ? 'Inactive'
              : rawStatus || '—'
            const dotColor =
              status === 'Active' ? 'bg-emerald-500'
                : status === 'On Board' ? 'bg-amber-500'
                  : 'bg-rose-500'
            return (
              <div key={emp.id} className="bg-white dark:bg-[#15181d] rounded-2xl p-4 border border-gray-200/90 dark:border-[#262b31] shadow-2xs hover:shadow-md hover:border-gray-300 dark:hover:border-gray-700 transition-all flex flex-col justify-between group">
                <div>
                  <div className="flex items-start justify-between">
                    <div className="relative">
                      <img
                        src={emp.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'}
                        alt={emp.name}
                        className="w-12 h-12 rounded-xl object-cover bg-gray-100 dark:bg-[#1c2026] border border-gray-100 dark:border-[#262b31]"
                        onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80' }}
                      />
                      <span className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white dark:border-gray-900 ${dotColor}`} />
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${
                      status === 'Active'
                        ? 'border-emerald-300 text-emerald-700 dark:border-emerald-800/60 dark:text-emerald-400'
                        : status === 'On Board'
                          ? 'border-amber-300 text-amber-700 dark:border-amber-800/60 dark:text-amber-400'
                          : 'border-rose-300 text-rose-600 dark:border-rose-800/60 dark:text-rose-400'
                    }`}>
                      {status}
                    </span>
                  </div>
                  <div className="mt-3.5">
                    <h4
                      onClick={() => { setSelectedEmployee(emp); setIsDetailsModalOpen(true) }}
                      className="font-bold text-gray-900 dark:text-gray-100 text-sm hover:text-emerald-600 cursor-pointer transition-colors truncate"
                    >
                      {emp.name}
                    </h4>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-0.5 truncate">{emp.jobTitle}</p>
                    <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate">{emp.department}</p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-gray-100 dark:border-[#262b31] space-y-1.5 text-xs text-gray-500 dark:text-gray-400">
                    <div className="flex items-center gap-2 truncate">
                      <Mail size={13} className="text-gray-400 shrink-0 dark:text-gray-500" />
                      <span className="truncate">{emp.email}</span>
                    </div>
                    <div className="flex items-center gap-2 truncate">
                      <MapPin size={13} className="text-gray-400 shrink-0 dark:text-gray-500" />
                      <span className="truncate">{emp.location || emp.address || 'Remote'}</span>
                    </div>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-gray-100 dark:border-[#262b31] flex items-center justify-between">
                  <span className="text-[11px] font-mono text-gray-400 dark:text-gray-500 underline decoration-gray-300 dark:decoration-gray-700">
                    {emp.employeeId}
                  </span>
                  <button
                    onClick={() => { setSelectedEmployee(emp); setIsDetailsModalOpen(true) }}
                    className="text-xs font-semibold text-gray-700 dark:text-gray-300 hover:text-gray-950 dark:hover:text-white px-2 py-1 rounded-md hover:bg-gray-100 dark:hover:bg-[#1c2026] transition-colors cursor-pointer"
                  >
                    View Profile
                  </button>
                </div>
              </div>
            )
          }}
          primaryAction={{
            label: 'View Details',
            icon: Eye,
            onClick: (emp) => { setSelectedEmployee(emp); setIsDetailsModalOpen(true) },
          }}
          dropdownActions={[
            {
              label: 'Edit Employee',
              icon: Pencil,
              onClick: (emp) => { setEditingEmployee(emp); },
            },
            {
              label: 'Toggle Active/Inactive',
              icon: Power,
              onClick: (emp) => handleUpdateStatus(emp.id, emp.status === 'Active' ? 'Inactive' : 'Active'),
            },
            {
              label: 'Delete Employee',
              icon: Trash2,
              destructive: true,
              onClick: (emp) => handleDeleteEmployee(emp.id),
            },
          ]}
          filterControls={[
            {
              label: 'Department',
              value: selectedDept,
              options: DEPARTMENTS,
              onChange: (v) => { setSelectedDept(v); },
            },
            {
              label: 'Status',
              value: selectedStatus,
              options: STATUSES,
              onChange: (v) => { setSelectedStatus(v); },
            },
          ].map((f) => (
            <div key={f.label} className="flex items-center gap-1.5">
              <span className="text-xs text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap">{f.label}:</span>
              <select
                value={f.value}
                onChange={(e) => f.onChange(e.target.value)}
                className="h-9 pl-2.5 pr-7 text-xs border border-gray-200 dark:border-[#262b31] rounded-xl bg-white dark:bg-[#1c2026] text-gray-800 dark:text-gray-200 appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
              >
                {f.options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
          ))}
        />
      ) : (
        <LuxuryDataTable
          title="Employee Registry"
          subtitle={`${filteredEmployees.length} employees · ${SETTINGS.standardMonthlyHours} standard hours/mo`}
          columns={[
            {
              key: 'name',
              header: 'Name of Employee',
              sortable: true,
              render: (emp) => (
                <div className="flex items-center gap-3 min-w-[220px]">
                  <img
                    src={emp.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'}
                    alt={emp.name}
                    className="w-9 h-9 rounded-full object-cover bg-gray-100 dark:bg-[#1c2026] shrink-0 border border-gray-100 dark:border-[#262b31]"
                    onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80' }}
                  />
                  <div className="min-w-0">
                    <p
                      onClick={() => { setSelectedEmployee(emp); setIsDetailsModalOpen(true) }}
                      className="font-semibold text-gray-950 dark:text-gray-100 hover:text-emerald-600 dark:hover:text-emerald-400 cursor-pointer truncate"
                    >
                      {emp.name}
                    </p>
                    <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate">{emp.email}</p>
                  </div>
                </div>
              ),
            },
            {
              key: 'employeeId',
              header: 'Employee ID',
              sortable: true,
              render: (emp) => (
                <span
                  onClick={() => { setSelectedEmployee(emp); setIsDetailsModalOpen(true) }}
                  className="font-medium text-gray-900 dark:text-gray-100 underline underline-offset-2 decoration-gray-400 dark:decoration-gray-600 cursor-pointer hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors whitespace-nowrap"
                >
                  {emp.employeeId}
                </span>
              ),
            },
            { key: 'jobTitle', header: 'Job Title', sortable: true, render: (emp) => emp.jobTitle || '—' },
            { key: 'department', header: 'Department', sortable: true, render: (emp) => emp.department || '—' },
            { key: 'basicSalary', header: 'Basic', sortable: true, align: 'right', render: (emp) => <span className="whitespace-nowrap font-medium">{formatETB(emp.basicSalary)}</span> },
            { key: 'joinDate', header: 'Join Date', sortable: true, render: (emp) => <span className="whitespace-nowrap text-gray-500 dark:text-gray-400">{emp.joinDate}</span> },
            {
              key: 'status',
              header: 'Status',
              align: 'center',
              render: (emp) => {
                const rawStatus = emp.employmentStatus || emp.status || ''
                const status = rawStatus === 'Active' ? 'Active'
                  : rawStatus === 'On Leave' || rawStatus === 'Onboarding' ? 'On Board'
                  : rawStatus === 'Inactive' || rawStatus === 'Resigned' || rawStatus === 'Terminated' ? 'Inactive'
                  : rawStatus || '—'
                const badgeColor =
                  status === 'Active'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/60'
                    : status === 'On Board'
                      ? 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/60'
                      : 'bg-rose-50 text-rose-600 border-rose-300 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800/60'
                return (
                  <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold inline-block border ${badgeColor}`}>
                    {status}
                  </span>
                )
              },
            },
          ]}
          data={filteredEmployees}
          searchable
          searchKeys={['name', 'email', 'employeeId', 'jobTitle', 'department']}
          searchPlaceholder="Search name, ID, email, department..."
          exportable
          exportFilename="Employee_Registry"
          paginated
          defaultPageSize={10}
          loading={false}
          emptyMessage="No employees match your search or filter criteria."
          allowViewModeToggle
          defaultViewMode="list"
          renderGridCard={(emp) => {
            const rawStatus = emp.employmentStatus || emp.status || ''
            const status = rawStatus === 'Active' ? 'Active'
              : rawStatus === 'On Leave' || rawStatus === 'Onboarding' ? 'On Board'
              : rawStatus === 'Inactive' || rawStatus === 'Resigned' || rawStatus === 'Terminated' ? 'Inactive'
              : rawStatus || '—'
            const dotColor =
              status === 'Active' ? 'bg-emerald-500'
                : status === 'On Board' ? 'bg-amber-500'
                  : 'bg-rose-500'
            return (
              <div key={emp.id} className="bg-white dark:bg-[#15181d] rounded-2xl p-4 border border-gray-200/90 dark:border-[#262b31] shadow-2xs hover:shadow-md hover:border-gray-300 dark:hover:border-gray-700 transition-all flex flex-col justify-between group">
                <div>
                  <div className="flex items-start justify-between">
                    <div className="relative">
                      <img
                        src={emp.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'}
                        alt={emp.name}
                        className="w-12 h-12 rounded-xl object-cover bg-gray-100 dark:bg-[#1c2026] border border-gray-100 dark:border-[#262b31]"
                        onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80' }}
                      />
                      <span className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white dark:border-gray-900 ${dotColor}`} />
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${
                      status === 'Active'
                        ? 'border-emerald-300 text-emerald-700 dark:border-emerald-800/60 dark:text-emerald-400'
                        : status === 'On Board'
                          ? 'border-amber-300 text-amber-700 dark:border-amber-800/60 dark:text-amber-400'
                          : 'border-rose-300 text-rose-600 dark:border-rose-800/60 dark:text-rose-400'
                    }`}>
                      {status}
                    </span>
                  </div>
                  <div className="mt-3.5">
                    <h4
                      onClick={() => { setSelectedEmployee(emp); setIsDetailsModalOpen(true) }}
                      className="font-bold text-gray-900 dark:text-gray-100 text-sm hover:text-emerald-600 cursor-pointer transition-colors truncate"
                    >
                      {emp.name}
                    </h4>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-0.5 truncate">{emp.jobTitle}</p>
                    <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate">{emp.department}</p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-gray-100 dark:border-[#262b31] space-y-1.5 text-xs text-gray-500 dark:text-gray-400">
                    <div className="flex items-center gap-2 truncate">
                      <Mail size={13} className="text-gray-400 shrink-0 dark:text-gray-500" />
                      <span className="truncate">{emp.email}</span>
                    </div>
                    <div className="flex items-center gap-2 truncate">
                      <MapPin size={13} className="text-gray-400 shrink-0 dark:text-gray-500" />
                      <span className="truncate">{emp.location || emp.address || 'Remote'}</span>
                    </div>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-gray-100 dark:border-[#262b31] flex items-center justify-between">
                  <span className="text-[11px] font-mono text-gray-400 dark:text-gray-500 underline decoration-gray-300 dark:decoration-gray-700">
                    {emp.employeeId}
                  </span>
                  <button
                    onClick={() => { setSelectedEmployee(emp); setIsDetailsModalOpen(true) }}
                    className="text-xs font-semibold text-gray-700 dark:text-gray-300 hover:text-gray-950 dark:hover:text-white px-2 py-1 rounded-md hover:bg-gray-100 dark:hover:bg-[#1c2026] transition-colors cursor-pointer"
                  >
                    View Profile
                  </button>
                </div>
              </div>
            )
          }}
          primaryAction={{
            label: 'View Details',
            icon: Eye,
            onClick: (emp) => { setSelectedEmployee(emp); setIsDetailsModalOpen(true) },
          }}
          dropdownActions={[
            {
              label: 'Edit Employee',
              icon: Pencil,
              onClick: (emp) => { setEditingEmployee(emp); },
            },
            {
              label: 'Toggle Active/Inactive',
              icon: Power,
              onClick: (emp) => handleUpdateStatus(emp.id, emp.status === 'Active' ? 'Inactive' : 'Active'),
            },
            {
              label: 'Delete Employee',
              icon: Trash2,
              destructive: true,
              onClick: (emp) => handleDeleteEmployee(emp.id),
            },
          ]}
          filterControls={[
            {
              label: 'Department',
              value: selectedDept,
              options: DEPARTMENTS,
              onChange: (v) => { setSelectedDept(v); },
            },
            {
              label: 'Status',
              value: selectedStatus,
              options: STATUSES,
              onChange: (v) => { setSelectedStatus(v); },
            },
          ].map((f) => (
            <div key={f.label} className="flex items-center gap-1.5">
              <span className="text-xs text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap">{f.label}:</span>
              <select
                value={f.value}
                onChange={(e) => f.onChange(e.target.value)}
                className="h-9 pl-2.5 pr-7 text-xs border border-gray-200 dark:border-[#262b31] rounded-xl bg-white dark:bg-[#1c2026] text-gray-800 dark:text-gray-200 appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
              >
                {f.options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
          ))}
        />
      )}

      <AddEmployeeModal
        key={editingEmployee ? editingEmployee.id : 'new-employee'}
        isOpen={isAddModalOpen || Boolean(editingEmployee)}
        editingEmployee={editingEmployee}
        onClose={() => { setIsAddModalOpen(false); setEditingEmployee(null) }}
        onSave={handleAddEmployee}
        onEdit={handleUpdateEmployee}
        existingEmployees={employees}
      />
      <EmployeeDetailsModal
        isOpen={isDetailsModalOpen}
        employee={selectedEmployee}
        onClose={() => { setIsDetailsModalOpen(false); setSelectedEmployee(null) }}
        onUpdateStatus={handleUpdateStatus}
        onDelete={handleDeleteEmployee}
        onEdit={(emp) => {
          setIsDetailsModalOpen(false)
          setSelectedEmployee(null)
          setEditingEmployee(emp)
        }}
      />

      {/* ── Import XLSX Modal ── */}
      {importModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-6 animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
          aria-labelledby="import-title"
        >
          <div className="bg-white dark:bg-[#15181d] rounded-2xl shadow-2xl dark:shadow-black/40 border border-gray-200 dark:border-[#262b31] w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 dark:border-[#262b31] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 flex items-center justify-center">
                  <FileSpreadsheet size={20} />
                </div>
                <div>
                  <h3 id="import-title" className="text-base font-black text-gray-950 dark:text-gray-100">
                    Import Employees from XLSX
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Upload a spreadsheet with the exact columns shown below
                  </p>
                </div>
              </div>
              <button
                onClick={handleCloseImport}
                className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#1c2026] rounded-lg transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
              {/* Drop zone / file picker */}
              {!importPreview && (
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-gray-300 dark:border-[#2a3139] rounded-xl p-8 text-center hover:border-indigo-400 dark:hover:border-indigo-600 transition-colors cursor-pointer"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload size={32} className="mx-auto text-gray-400 dark:text-gray-500 mb-3" />
                    <p className="text-gray-700 dark:text-gray-300 font-medium">
                      Drop your .xlsx file here or click to browse
                    </p>
                    <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">
                      Only .xlsx files are accepted
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx"
                      className="hidden"
                      onChange={handleFileSelect}
                    />
                  </div>

                  {/* Required column list */}
                  <div className="bg-gray-50 dark:bg-[#1c2026] rounded-xl border border-gray-200 dark:border-[#262b31] p-4">
                    <p className="text-xs font-bold text-gray-800 dark:text-gray-200 mb-2">Required columns (exact headers):</p>
                    <div className="flex flex-wrap gap-1.5">
                      {REQUIRED_COLUMNS.map((col) => (
                        <span key={col} className="px-2 py-0.5 rounded-md bg-white dark:bg-[#15181d] border border-gray-200 dark:border-[#262b31] text-[10px] font-mono text-gray-600 dark:text-gray-400">
                          {col}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Preview / import progress */}
              {importPreview && (
                <div className="space-y-4">
                  {/* File info */}
                  <div className="flex items-center justify-between bg-gray-50 dark:bg-[#1c2026] rounded-xl border border-gray-200 dark:border-[#262b31] px-4 py-3">
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet size={16} className="text-indigo-600 dark:text-indigo-400" />
                      <div>
                        <p className="text-xs font-semibold text-gray-900 dark:text-gray-100">{importFile?.name}</p>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400">
                          {importPreview.totalRows} rows · {REQUIRED_COLUMNS.length} columns verified
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => { setImportPreview(null); setImportFile(null) }}
                      className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-xs"
                    >
                      Change file
                    </button>
                  </div>

                  {/* Preview table */}
                  <div>
                    <p className="text-xs font-bold text-gray-800 dark:text-gray-200 mb-2">Preview (first 5 rows):</p>
                    <div className="overflow-x-auto border border-gray-200 dark:border-[#262b31] rounded-xl">
                      <table className="w-full text-left text-[11px]">
                        <thead>
                          <tr className="bg-gray-100 dark:bg-[#1c2026] border-b border-gray-200 dark:border-[#262b31]">
                            {importPreview.headerLabels.map((h, i) => (
                              <th key={i} className="px-2.5 py-2 font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap">
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {importPreview.previewRows.map((pr) => (
                            <tr key={pr.row} className="border-b border-gray-100 dark:border-[#262b31] hover:bg-gray-50 dark:hover:bg-[#1c2026] transition-colors">
                              {pr.values.map((v, i) => (
                                <td key={i} className="px-2.5 py-1.5 text-gray-600 dark:text-gray-400 whitespace-nowrap max-w-[120px] truncate">
                                  {String(v ?? '')}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Import button */}
                  <div className="flex justify-end">
                    <button
                      onClick={handleImportSubmit}
                      className="px-5 py-2.5 bg-gray-950 hover:bg-black text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-2 shadow-sm"
                    >
                      <Upload size={14} />
                      Import {importPreview.totalRows} Employees
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Employees