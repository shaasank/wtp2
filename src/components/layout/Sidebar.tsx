import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Users, Clock, Calendar,
  Settings, LogOut, ChevronRight, Tags,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/utils'

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
  { label: 'Employees', icon: Users, path: '/users' },
  {
    label: 'Attendance', icon: Clock, path: '/attendance',
    children: [
      { label: 'Records', path: '/attendance' },
      { label: 'Policies', path: '/attendance/policies' },
    ],
  },
  { label: 'Category', icon: Tags, path: '/categories' },
  { label: 'Leave Management', icon: Calendar, path: '/leaves' },
]

export default function Sidebar() {
  const { signOut, user } = useAuth()
  const location = useLocation()

  return (
    <aside className="w-64 flex-shrink-0 bg-sidebar border-r border-sidebar-border flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-sidebar-border">
        <img
          src="/favicon.png"
          alt="WorkTrackPro"
          className="w-9 h-9 rounded-xl object-cover shadow-lg"
        />
        <div>
          <p className="font-bold text-sm text-sidebar-foreground leading-none">WorkTrackPro</p>
          <p className="text-xs text-muted-foreground mt-0.5">Admin Portal</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map(item => {
          const isActive = item.children
            ? item.children.some(c => location.pathname === c.path)
            : location.pathname === item.path
          const isParentActive = item.children && item.children.some(c => location.pathname === c.path)

          return (
            <div key={item.path}>
              {item.children ? (
                <div>
                  <NavLink to={item.path} className={cn('nav-item', isParentActive && 'active')}>
                    <item.icon className="w-4 h-4 flex-shrink-0" />
                    <span className="flex-1 min-w-0 truncate">{item.label}</span>
                    <ChevronRight className={cn('w-3 h-3 transition-transform', isParentActive && 'rotate-90')} />
                  </NavLink>
                  {isParentActive && (
                    <div className="ml-7 mt-1 space-y-1">
                      {item.children.map(child => (
                        <NavLink
                          key={child.path}
                          to={child.path}
                          end
                          className={({ isActive }) =>
                            cn('block px-3 py-2 rounded-lg text-xs font-medium transition-all',
                              isActive
                                ? 'text-primary bg-primary/10'
                                : 'text-muted-foreground hover:text-foreground hover:bg-sidebar-accent')
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
                  className={({ isActive }) => cn('nav-item', isActive && 'active')}
                >
                  <item.icon className="w-4 h-4 flex-shrink-0" />
                  <span className="min-w-0 truncate">{item.label}</span>
                </NavLink>
              )}
            </div>
          )
        })}

        {/* Attendance sub-nav if on attendance page but children not showing */}
        {location.pathname === '/attendance' && !navItems.find(i => i.children?.some(c => c.path === location.pathname)) && null}
      </nav>

      {/* Bottom section */}
      <div className="px-3 py-4 border-t border-sidebar-border space-y-1">
        <NavLink
          to="/attendance/policies"
          className={({ isActive }) => cn('nav-item', isActive && 'active')}
        >
          <Settings className="w-4 h-4 flex-shrink-0" />
          <span className="min-w-0 truncate">Attendance Policy</span>
        </NavLink>

        <div className="px-3 py-3 rounded-lg bg-sidebar-accent/50 mt-2">
          <p className="text-xs font-medium text-sidebar-foreground truncate">{user?.email}</p>
          <p className="text-xs text-muted-foreground">Administrator</p>
        </div>

        <button
          onClick={() => signOut()}
          className="nav-item w-full text-red-400 hover:text-red-300 hover:bg-red-500/10"
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          <span className="min-w-0 truncate">Sign Out</span>
        </button>
      </div>
    </aside>
  )
}
