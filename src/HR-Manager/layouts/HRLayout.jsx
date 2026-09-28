import { useState } from 'react'
import { Outlet } from 'react-router-dom'

import HRSidebar from '../components/HRSidebar'
import HRTopbar from '../components/HRTopbar'
import { MessagingProvider } from '../../Employer/context/MessagingContext'

function HRLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  return (
    <MessagingProvider portalType="hr">
    <div className="h-screen overflow-hidden bg-[#F3F4F6]">
      <HRSidebar
        mobileOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((current) => !current)}
      />

      <div
        className={[
          'flex h-screen min-h-0 flex-col transition-[padding] duration-300 ease-in-out',
          sidebarCollapsed ? 'lg:pl-20' : 'lg:pl-64',
        ].join(' ')}
      >
        <HRTopbar
          onMenuClick={() => setSidebarOpen(true)}
        />

        <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <Outlet />
        </main>
      </div>
    </div>
    </MessagingProvider>
  )
}

export default HRLayout
