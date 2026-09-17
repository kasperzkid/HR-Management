import { ArrowLeft, Construction } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'

function PlaceholderPage({ title, description }) {
  const location = useLocation()
  const pageTitle = title || location.pathname.split('/').pop().replace(/-/g, ' ').toUpperCase()

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link
          to="/employer/dashboard"
          className="p-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 transition-colors shadow-2xs dark:bg-[#15181d] dark:border-[#262b31] dark:hover:bg-[#1c2026] dark:text-gray-400"
        >
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-950 dark:text-gray-100 capitalize">{pageTitle}</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {description || `Manage and view ${pageTitle.toLowerCase()} settings and records.`}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-12 border border-gray-200 shadow-2xs text-center space-y-4 dark:bg-[#15181d] dark:border-[#262b31]">
        <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-700 mx-auto dark:bg-[#1c2026] dark:text-gray-300">
          <Construction size={24} />
        </div>
        <div>
          <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 capitalize">{pageTitle} Module</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 max-w-md mx-auto mt-1">
            This module is connected to the HRISELINK employer workspace. You can configure rules, view team analytics, or return to the employee directory.
          </p>
        </div>
        <div className="pt-2">
          <Link
            to="/employer/dashboard"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-950 text-white dark:bg-[#3a4149] dark:hover:bg-gray-600 text-xs font-semibold hover:bg-gray-800 transition-colors"
          >
            Back to Employee Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}

export default PlaceholderPage
