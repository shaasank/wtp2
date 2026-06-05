import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'

const SIDEBAR_COLLAPSED_KEY = 'wtp-sidebar-collapsed'
const LG_BREAKPOINT = 1024

type SidebarContextValue = {
  collapsed: boolean
  mobileOpen: boolean
  isMobile: boolean
  toggleCollapsed: () => void
  setMobileOpen: (open: boolean) => void
  toggleMobile: () => void
}

const SidebarContext = createContext<SidebarContextValue | null>(null)

function readCollapsedPreference() {
  try {
    return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true'
  } catch {
    return false
  }
}

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(readCollapsedPreference)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < LG_BREAKPOINT,
  )

  useEffect(() => {
    const mediaQuery = window.matchMedia(`(max-width: ${LG_BREAKPOINT - 1}px)`)

    const handleChange = (event: MediaQueryListEvent | MediaQueryList) => {
      const mobile = event.matches
      setIsMobile(mobile)
      if (mobile) {
        setMobileOpen(false)
      }
    }

    handleChange(mediaQuery)
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  const toggleCollapsed = useCallback(() => {
    setCollapsed((previous) => {
      const next = !previous
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next))
      } catch {
        // Ignore storage errors in private browsing.
      }
      return next
    })
  }, [])

  const toggleMobile = useCallback(() => {
    setMobileOpen((previous) => !previous)
  }, [])

  return (
    <SidebarContext.Provider
      value={{
        collapsed,
        mobileOpen,
        isMobile,
        toggleCollapsed,
        setMobileOpen,
        toggleMobile,
      }}
    >
      {children}
    </SidebarContext.Provider>
  )
}

export function useSidebar() {
  const context = useContext(SidebarContext)
  if (!context) {
    throw new Error('useSidebar must be used within SidebarProvider')
  }
  return context
}
