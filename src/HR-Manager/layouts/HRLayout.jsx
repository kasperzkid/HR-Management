import { useState } from 'react'
import { Outlet } from 'react-router-dom'

import HRSidebar from '../components/HRSidebar'
import HRTopbar from '../components/HRTopbar'

function HRLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen bg-[#F3F4F6]">
      <HRSidebar
        mobileOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="min-h-screen lg:pl-64">
        <HRTopbar
          onMenuClick={() => setSidebarOpen(true)}
        />

        <main className="min-h-[calc(100vh-4rem)]">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default HRLayout