import { useState } from 'react'
import { Outlet } from 'react-router-dom'

import HRSidebar from '../components/HRSidebar'
import HRTopbar from '../components/HRTopbar'

function HRLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  return (
    <div className="min-h-screen bg-[#F3F4F6]">
      <HRSidebar
        mobileOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((current) => !current)}
      />

      <div
        className={[
          'min-h-screen transition-[padding] duration-300 ease-in-out',
          sidebarCollapsed ? 'lg:pl-20' : 'lg:pl-64',
        ].join(' ')}
      >
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