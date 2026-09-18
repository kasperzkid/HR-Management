import { useState } from 'react'
import { Outlet } from 'react-router-dom'

import HRSidebar from '../components/HRSidebar'
import HRTopbar from '../components/HRTopbar'

function HRLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#F3F4F6]">
      <div className="relative flex flex-1 overflow-hidden">
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <HRSidebar
          mobileOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        <main className="min-w-0 flex-1 overflow-y-auto">
          <HRTopbar onMenuClick={() => setSidebarOpen(true)} />
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default HRLayout