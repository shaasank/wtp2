import { Bell, Menu, PanelLeftClose, PanelLeftOpen, RefreshCw } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { useSidebar } from '@/contexts/SidebarContext'
import { format } from 'date-fns'

const routeTitles: Record<string, { title: string; subtitle: string }> = {
  '/dashboard': { title: 'Dashboard', subtitle: 'Overview & analytics' },
  '/users': { title: 'Employee Management', subtitle: 'Manage your workforce' },
  '/attendance': { title: 'Attendance Records', subtitle: 'Track check-ins and check-outs' },
  '/attendance/policies': { title: 'Attendance Policies', subtitle: 'Configure work rules' },
  '/categories': { title: 'Category History', subtitle: 'View daily work category check-ins' },
  '/leaves': { title: 'Leave Management', subtitle: 'Approve and track leave requests' },
}

export default function TopBar() {
  const location = useLocation()
  const qc = useQueryClient()
  const { collapsed, toggleCollapsed, toggleMobile } = useSidebar()
  const meta = routeTitles[location.pathname] ?? { title: 'WorkTrackPro', subtitle: '' }
  const now = format(new Date(), 'EEEE, dd MMMM yyyy')

  return (
    <header className="flex h-14 flex-shrink-0 items-center justify-between gap-3 border-b border-border bg-card/50 px-4 backdrop-blur-sm sm:h-16 sm:gap-4 sm:px-6">
      <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="flex-shrink-0 lg:hidden"
          onClick={toggleMobile}
          title="Open navigation"
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="hidden flex-shrink-0 lg:inline-flex"
          onClick={toggleCollapsed}
          title={collapsed ? 'Expand navigation' : 'Collapse navigation'}
          aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}
        >
          {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </Button>

        <div className="min-w-0 text-left">
          <h1 className="truncate text-sm font-semibold text-foreground sm:text-base">{meta.title}</h1>
          <p className="truncate text-xs text-muted-foreground">{meta.subtitle}</p>
        </div>
      </div>

      <div className="flex flex-shrink-0 items-center gap-1 sm:gap-3">
        <span className="hidden text-xs text-muted-foreground xl:inline">{now}</span>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => qc.invalidateQueries()}
          title="Refresh data"
          id="refresh-data-btn"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>

        <Button variant="ghost" size="icon" id="notifications-btn">
          <Bell className="h-4 w-4" />
        </Button>

        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-xs font-bold text-white">
          A
        </div>
      </div>
    </header>
  )
}
