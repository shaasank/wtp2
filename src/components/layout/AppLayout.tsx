import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import { Toaster } from '@/components/ui/toaster'
import { SidebarProvider } from '@/contexts/SidebarContext'

export default function AppLayout() {
  return (
    <SidebarProvider>
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar />

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <TopBar />
          <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 text-left sm:p-6">
            <Outlet />
          </main>
        </div>

        <Toaster />
      </div>
    </SidebarProvider>
  )
}
