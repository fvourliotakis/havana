'use client'

import { useState, useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { clsx } from 'clsx'
import { isAuthenticated, logout } from '@/lib/auth'
import { logOut, initializeAuth } from '../../lib/slices/authSlice'
import type { RootState } from '../../lib/store'
import { AdminI18nProvider, useAdminI18n } from '../../lib/i18n/admin-context'
import AdminLanguageSwitcher from '../../components/ui/AdminLanguageSwitcher'
import { 
  BarChart3, 
  Calendar, 
  Truck, 
  ChefHat, 
  Users, 
  LogOut, 
  Menu, 
  X,
  Home,
  CreditCard,
  Building2,
  Tag,
  TrendingUp
} from 'lucide-react'

interface AdminLayoutProps {
  children: React.ReactNode
}

function AdminLayoutInner({ children }: AdminLayoutProps) {
  const { t } = useAdminI18n()
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const dispatch = useDispatch()
  
  // Get auth state from Redux
  const { isAuthenticated: authenticated, token } = useSelector((state: RootState) => state.auth)

  useEffect(() => {
    // Initialize auth from localStorage
    dispatch(initializeAuth())
    
    // Skip auth check for login page
    if (pathname === '/admin/login') {
      setLoading(false)
      return
    }

    // Check authentication
    console.log('Checking authentication...')
    const isAuth = isAuthenticated()
    console.log('Authentication result:', isAuth)
    
    if (!isAuth) {
      console.log('Not authenticated, redirecting to login')
      router.push('/admin/login')
      return
    }
    
    console.log('User is authenticated, staying on admin page')
    setLoading(false)
  }, [pathname, router])

  console.log('AdminLayout render - pathname:', pathname, 'loading:', loading, 'authenticated:', authenticated)

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-teal-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading admin panel...</p>
        </div>
      </div>
    )
  }

  // For login page, just render children
  if (pathname === '/admin/login') {
    console.log('Rendering login page')
    return <>{children}</>
  }

  // For other pages, check authentication
  if (!authenticated) {
    console.log('Not authenticated, showing access denied')
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h2 className="text-2xl font-bold text-white mb-2">Access Denied</h2>
          <p className="text-gray-400 mb-4">Please log in to access the admin panel</p>
          <Link 
            href="/admin/login"
            className="inline-flex items-center px-6 py-3 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors"
          >
            Go to Login
          </Link>
        </div>
      </div>
    )
  }

  console.log('Rendering authenticated admin layout')

  // Icon mapper
  const iconMap = {
    BarChart3,
    Calendar,
    Truck,
    ChefHat,
    Users,
    CreditCard,
    Building2,
    Tag,
    TrendingUp
  } as const

  const navigation = [
    { name: t('dashboard'), href: '/admin', icon: 'BarChart3', description: t('dashboard_description') },
    { name: t('bookings'), href: '/admin/bookings', icon: 'Calendar', description: t('bookings_description') },
    { name: 'Reports & Analytics', href: '/admin/reports', icon: 'TrendingUp', description: 'Business insights and performance' },
    { name: t('food_carts'), href: '/admin/food-carts', icon: 'Truck', description: t('food_carts_description') },
    { name: t('food_items'), href: '/admin/food-items', icon: 'ChefHat', description: t('food_items_description') },
    { name: t('services'), href: '/admin/services', icon: 'Users', description: t('services_description') },
    { name: t('coupons'), href: '/admin/coupons', icon: 'Tag', description: t('coupons_description') },
    { name: t('bank_settings'), href: '/admin/bank-settings', icon: 'Building2', description: t('configure_bank_transfer_details') },
    { name: t('payments'), href: '/admin/payments', icon: 'CreditCard', description: t('payments_description') },
  ]

  return (
    <div className="h-screen bg-black relative overflow-hidden flex">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-black to-slate-900 opacity-50"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(20,184,166,0.05),transparent_70%)]"></div>
      
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        >
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" />
        </div>
      )}

      {/* Sidebar */}
      <div className={clsx(
        'fixed inset-y-0 left-0 z-50 w-72 bg-slate-800/90 backdrop-blur-sm border-r border-slate-700 shadow-2xl transform transition-transform duration-300 ease-in-out lg:relative lg:transform-none',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      )}>
          <div className="flex flex-col h-full">
            {/* Logo */}
            <div className="flex items-center justify-between h-20 px-6 border-b border-slate-700">
              <div className="flex items-center space-x-3">
                <img 
                  src="/logo.png" 
                  alt="Havana Logo" 
                  className="h-12 w-12 object-contain"
                />
                <div>
                  <h1 className="text-xl font-bold text-white">
                    Havana Admin
                  </h1>
                  <p className="text-xs text-teal-400">Management Panel</p>
                </div>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden p-2 rounded-lg text-gray-400 hover:text-white hover:bg-slate-700 transition-colors"
              >
                <span className="sr-only">Close sidebar</span>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-4 py-6 space-y-2">
              {navigation.map((item) => {
                const isActive = pathname === item.href || 
                  (item.href !== '/admin' && pathname.startsWith(item.href))
                
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={clsx(
                      'flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-300 group',
                      isActive
                        ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30 shadow-lg shadow-teal-500/10'
                        : 'text-gray-300 hover:bg-slate-700/50 hover:text-white border border-transparent hover:border-slate-600'
                    )}
                  >
                    <span className="mr-3">
                      {(() => {
                        const IconComponent = iconMap[item.icon as keyof typeof iconMap]
                        return <IconComponent className="w-5 h-5" />
                      })()}
                    </span>
                    <div className="flex-1">
                      <div className="font-medium">{item.name}</div>
                      <div className="text-xs opacity-70">{item.description}</div>
                    </div>
                    {isActive && (
                      <div className="w-2 h-2 bg-teal-400 rounded-full"></div>
                    )}
                  </Link>
                )
              })}
            </nav>

            {/* User menu */}
            <div className="p-4 border-t border-slate-700">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg">
                  <span className="text-white text-lg font-bold">A</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    Admin User
                  </p>
                  <p className="text-xs text-gray-400 truncate">
                    admin@havana.com
                  </p>
                  <div className="flex items-center mt-1">
                    <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                    <span className="text-xs text-green-400">Online</span>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Link
                  href="/"
                  className="flex items-center w-full px-3 py-2 text-sm text-gray-300 hover:bg-slate-700 hover:text-white rounded-lg transition-colors"
                >
                  <Home className="mr-2 w-4 h-4" />
                  Back to Site
                </Link>
                <button
                  onClick={() => {
                    console.log('Logout clicked')
                    dispatch(logOut())
                    logout() // Also clear localStorage
                  }}
                  className="flex items-center w-full px-3 py-2 text-sm text-gray-300 hover:bg-red-500/20 hover:text-red-400 rounded-lg transition-colors"
                >
                  <LogOut className="mr-2 w-4 h-4" />
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col relative z-10">
          {/* Top bar */}
          <div className="sticky top-0 z-10 bg-slate-800/80 backdrop-blur-sm border-b border-slate-700 shadow-lg">
            <div className="flex items-center justify-between h-16 px-6">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="lg:hidden p-2 rounded-lg text-gray-400 hover:text-white hover:bg-slate-700 transition-colors"
                >
                  <span className="sr-only">Open sidebar</span>
                  <Menu className="w-6 h-6" />
                </button>
                
                {/* Breadcrumb */}
                <div className="flex items-center space-x-2 text-sm">
                  <span className="text-gray-400">Admin</span>
                  <span className="text-gray-600">/</span>
                  <span className="text-teal-400 font-medium">
                    {navigation.find(item => 
                      pathname === item.href || 
                      (item.href !== '/admin' && pathname.startsWith(item.href))
                    )?.name || 'Dashboard'}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                {/* Language Switcher */}
                <AdminLanguageSwitcher />
                
                {/* Current date/time */}
                <div className="hidden md:block text-sm text-gray-400">
                  {new Date().toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </div>
                
                {/* Status indicator */}
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span className="text-xs text-green-400">Authenticated</span>
                </div>
              </div>
            </div>
          </div>

        {/* Page content */}
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <AdminI18nProvider>
      <AdminLayoutInner>{children}</AdminLayoutInner>
    </AdminI18nProvider>
  )
}