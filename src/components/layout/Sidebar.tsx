import { useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  Clock,
  Calendar,
  Settings,
  LogOut,
  ChevronRight,
  Tags,
  X,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useSidebar } from '@/contexts/SidebarContext'
import { cn } from '@/lib/utils'

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
  { label: 'Employees', icon: Users, path: '/users' },
  {
    label: 'Attendance',
    icon: Clock,
    path: '/attendance',
    children: [
      { label: 'Records', path: '/attendance' },
      { label: 'Policies', path: '/attendance/policies' },
    ],
  },
  { label: 'Category', icon: Tags, path: '/categories' },
  { label: 'Leave Management', icon: Calendar, path: '/leaves' },
]

type SidebarContentProps = {
  collapsed?: boolean
  onNavigate?: () => void
  showCloseButton?: boolean
  onClose?: () => void
}

function SidebarContent({
  collapsed = false,
  onNavigate,
  showCloseButton = false,
  onClose,
}: SidebarContentProps) {
  const { signOut, user } = useAuth()
  const location = useLocation()

  return (
    <>
      <div
        className={cn(
          'relative flex items-center border-b border-sidebar-border py-4',
          collapsed ? 'justify-center px-2' : 'gap-3 px-4',
        )}
      >
        <img
          src="/favicon.png"
          alt="WorkTrackPro"
          className="h-9 w-9 flex-shrink-0 rounded-xl object-cover shadow-lg"
        />
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold leading-none text-sidebar-foreground">
              WorkTrackPro
            </p>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">Admin Portal</p>
          </div>
        )}
        {showCloseButton && onClose && (
          <button
            type="button"
            onClick={onClose}
            className="ml-auto flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            aria-label="Close navigation"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <nav className={cn('flex-1 space-y-1 overflow-y-auto py-4', collapsed ? 'px-2' : 'px-3')}>
        {navItems.map((item) => {
          const isParentActive =
            item.children?.some((child) => location.pathname === child.path) ?? false

          return (
            <div key={item.path}>
              {item.children ? (
                <div>
                  <NavLink
                    to={item.path}
                    title={collapsed ? item.label : undefined}
                    onClick={onNavigate}
                    className={cn('nav-item', collapsed && 'justify-center px-0', isParentActive && 'active')}
                  >
                    <item.icon className="h-4 w-4 flex-shrink-0" />
                    {!collapsed && (
                      <span className="min-w-0 flex-1 truncate">{item.label}</span>
                    )}
                    {!collapsed && (
                      <ChevronRight
                        className={cn(
                          'h-3 w-3 flex-shrink-0 transition-transform',
                          isParentActive && 'rotate-90',
                        )}
                      />
                    )}
                  </NavLink>
                  {isParentActive && !collapsed && (
                    <div className="ml-7 mt-1 space-y-1">
                      {item.children.map((child) => (
                        <NavLink
                          key={child.path}
                          to={child.path}
                          end
                          onClick={onNavigate}
                          className={({ isActive }) =>
                            cn(
                              'block rounded-lg px-3 py-2 text-xs font-medium transition-all',
                              isActive
                                ? 'bg-primary/10 text-primary'
                                : 'text-muted-foreground hover:bg-sidebar-accent hover:text-foreground',
                            )
                          }
                        >
                          {child.label}
                        </NavLink>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <NavLink
                  to={item.path}
                  title={collapsed ? item.label : undefined}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    cn('nav-item', collapsed && 'justify-center px-0', isActive && 'active')
                  }
                >
                  <item.icon className="h-4 w-4 flex-shrink-0" />
                  {!collapsed && <span className="min-w-0 truncate">{item.label}</span>}
                </NavLink>
              )}
            </div>
          )
        })}
      </nav>

      <div className={cn('space-y-1 border-t border-sidebar-border py-4', collapsed ? 'px-2' : 'px-3')}>
        <NavLink
          to="/attendance/policies"
          title={collapsed ? 'Attendance Policy' : undefined}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn('nav-item', collapsed && 'justify-center px-0', isActive && 'active')
          }
        >
          <Settings className="h-4 w-4 flex-shrink-0" />
          {!collapsed && <span className="min-w-0 truncate">Attendance Policy</span>}
        </NavLink>

        {!collapsed && (
          <div className="mt-2 rounded-lg bg-sidebar-accent/50 px-3 py-3">
            <p className="truncate text-xs font-medium text-sidebar-foreground">{user?.email}</p>
            <p className="text-xs text-muted-foreground">Administrator</p>
          </div>
        )}

        <button
          type="button"
          onClick={() => {
            onNavigate?.()
            signOut()
          }}
          title={collapsed ? 'Sign Out' : undefined}
          className={cn(
            'nav-item w-full text-red-400 hover:bg-red-500/10 hover:text-red-300',
            collapsed && 'justify-center px-0',
          )}
        >
          <LogOut className="h-4 w-4 flex-shrink-0" />
          {!collapsed && <span className="min-w-0 truncate">Sign Out</span>}
        </button>
      </div>
    </>
  )
}

export default function Sidebar() {
  const { collapsed, mobileOpen, isMobile, setMobileOpen } = useSidebar()
  const location = useLocation()

  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname, setMobileOpen])

  useEffect(() => {
    if (!mobileOpen) return

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMobileOpen(false)
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [mobileOpen, setMobileOpen])

  return (
    <>
      <aside
        className={cn(
          'hidden h-full flex-shrink-0 flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-300 lg:flex',
          collapsed ? 'w-[4.5rem]' : 'w-64',
        )}
      >
        <SidebarContent collapsed={collapsed} />
      </aside>

      {isMobile && mobileOpen && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation overlay"
          />
          <aside
            className="fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col border-r border-sidebar-border bg-sidebar shadow-2xl animate-slide-in lg:hidden"
            aria-label="Mobile navigation"
          >
            <SidebarContent
              onNavigate={() => setMobileOpen(false)}
              showCloseButton
              onClose={() => setMobileOpen(false)}
            />
          </aside>
        </>
      )}
    </>
  )
}
