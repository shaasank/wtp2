import { Bell, RefreshCw } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
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
  const meta = routeTitles[location.pathname] ?? { title: 'WorkTrackPro', subtitle: '' }
  const now = format(new Date(), 'EEEE, dd MMMM yyyy')

  return (
    <header className="h-16 border-b border-border bg-card/50 backdrop-blur-sm flex items-center justify-between gap-4 px-6 flex-shrink-0">
      <div className="min-w-0 text-left">
        <h1 className="text-base font-semibold text-foreground">{meta.title}</h1>
        <p className="text-xs text-muted-foreground truncate">{meta.subtitle}</p>
      </div>

      <div className="flex flex-shrink-0 items-center gap-3">
        <span className="text-xs text-muted-foreground hidden md:block">{now}</span>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => qc.invalidateQueries()}
          title="Refresh data"
          id="refresh-data-btn"
        >
          <RefreshCw className="w-4 h-4" />
        </Button>

        <Button variant="ghost" size="icon" id="notifications-btn">
          <Bell className="w-4 h-4" />
        </Button>

        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-xs font-bold text-white">
          A
        </div>
      </div>
    </header>
  )
}
