import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Users, Clock, Calendar,
  Settings, LogOut, ChevronRight, Tags, PanelLeftClose, PanelLeftOpen,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/utils'
import { useState } from 'react'

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
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside className={cn(
      'flex h-full flex-shrink-0 flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300',
      collapsed ? 'w-20' : 'w-64',
    )}>
      {/* Logo */}
      <div className={cn(
        'flex items-center border-b border-sidebar-border py-5',
        collapsed ? 'justify-center px-3' : 'gap-3 px-5',
      )}>
        <img
          src="/favicon.png"
          alt="WorkTrackPro"
          className="w-9 h-9 rounded-xl object-cover shadow-lg"
        />
        {!collapsed && <div className="min-w-0 flex-1">
          <p className="font-bold text-sm text-sidebar-foreground leading-none">WorkTrackPro</p>
          <p className="text-xs text-muted-foreground mt-0.5">Admin Portal</p>
        </div>}
        <button
          type="button"
          onClick={() => setCollapsed((value) => !value)}
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-lg text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
            collapsed ? 'absolute left-14 top-5 border border-sidebar-border bg-sidebar' : 'ml-auto',
          )}
          title={collapsed ? 'Expand navigation' : 'Collapse navigation'}
          aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}
        >
          {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </button>
      </div>

      {/* Nav */}
      <nav className={cn('flex-1 space-y-1 overflow-y-auto py-4', collapsed ? 'px-2' : 'px-3')}>
        {navItems.map(item => {
          const isActive = item.children
            ? item.children.some(c => location.pathname === c.path)
            : location.pathname === item.path
          const isParentActive = item.children && item.children.some(c => location.pathname === c.path)

          return (
            <div key={item.path}>
              {item.children ? (
                <div>
                  <NavLink
                    to={item.path}
                    title={collapsed ? item.label : undefined}
                    className={cn('nav-item', collapsed && 'justify-center px-0', isParentActive && 'active')}
                  >
                    <item.icon className="w-4 h-4 flex-shrink-0" />
                    {!collapsed && <span className="flex-1 min-w-0 truncate">{item.label}</span>}
                    {!collapsed && <ChevronRight className={cn('w-3 h-3 transition-transform', isParentActive && 'rotate-90')} />}
                  </NavLink>
                  {isParentActive && !collapsed && (
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
                  title={collapsed ? item.label : undefined}
                  className={({ isActive }) => cn('nav-item', collapsed && 'justify-center px-0', isActive && 'active')}
                >
                  <item.icon className="w-4 h-4 flex-shrink-0" />
                  {!collapsed && <span className="min-w-0 truncate">{item.label}</span>}
                </NavLink>
              )}
            </div>
          )
        })}

        {/* Attendance sub-nav if on attendance page but children not showing */}
        {location.pathname === '/attendance' && !navItems.find(i => i.children?.some(c => c.path === location.pathname)) && null}
      </nav>

      {/* Bottom section */}
      <div className={cn('space-y-1 border-t border-sidebar-border py-4', collapsed ? 'px-2' : 'px-3')}>
        <NavLink
          to="/attendance/policies"
          title={collapsed ? 'Attendance Policy' : undefined}
          className={({ isActive }) => cn('nav-item', collapsed && 'justify-center px-0', isActive && 'active')}
        >
          <Settings className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span className="min-w-0 truncate">Attendance Policy</span>}
        </NavLink>

        {!collapsed && <div className="px-3 py-3 rounded-lg bg-sidebar-accent/50 mt-2">
          <p className="text-xs font-medium text-sidebar-foreground truncate">{user?.email}</p>
          <p className="text-xs text-muted-foreground">Administrator</p>
        </div>}

        <button
          onClick={() => signOut()}
          title={collapsed ? 'Sign Out' : undefined}
          className={cn('nav-item w-full text-red-400 hover:text-red-300 hover:bg-red-500/10', collapsed && 'justify-center px-0')}
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span className="min-w-0 truncate">Sign Out</span>}
        </button>
      </div>
    </aside>
  )
}
