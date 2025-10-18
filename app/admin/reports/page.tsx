'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { useGetBookingsQuery, useGetDashboardStatsQuery } from '@/lib/api/bookingsApi'
import { useGetFoodCartsQuery } from '@/lib/api/foodCartsApi'
import { useAdminI18n } from '@/lib/i18n/admin-context'
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Calendar,
  DollarSign,
  Users,
  Truck,
  Filter,
  ChevronDown,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle
} from 'lucide-react'
import { clsx } from 'clsx'

export default function ReportsPage() {
  const { t } = useAdminI18n()
  const [dateRange, setDateRange] = useState<'week' | 'month' | 'quarter' | 'year'>('month')
  const [selectedCart, setSelectedCart] = useState<string>('all')
  const [showFilters, setShowFilters] = useState(false)

  // Fetch data
  const { data: stats, isLoading: statsLoading } = useGetDashboardStatsQuery()
  const { data: allBookingsData, isLoading: bookingsLoading } = useGetBookingsQuery({ limit: 1000 })
  const { data: carts = [], isLoading: cartsLoading } = useGetFoodCartsQuery({})

  const loading = statsLoading || bookingsLoading || cartsLoading

  // Extract bookings array
  const allBookings = Array.isArray(allBookingsData) ? allBookingsData : allBookingsData?.bookings || []

  // Calculate date range
  const getDateRangeFilter = () => {
    const now = new Date()
    const ranges = {
      week: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      month: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      quarter: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000),
      year: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
    }
    return ranges[dateRange]
  }

  // Filter bookings based on date range and cart
  const filteredBookings = useMemo(() => {
    if (!allBookings || allBookings.length === 0) return []
    
    const startDate = getDateRangeFilter()
    return allBookings.filter((booking: any) => {
      const bookingDate = new Date(booking.createdAt)
      const matchesDate = bookingDate >= startDate
      const matchesCart = selectedCart === 'all' || booking.cartId === selectedCart
      return matchesDate && matchesCart
    })
  }, [allBookings, dateRange, selectedCart])

  // Calculate analytics
  const analytics = useMemo(() => {
    const totalRevenue = filteredBookings.reduce((sum: number, b: any) => sum + b.totalAmount, 0)
    const averageBookingValue = filteredBookings.length > 0 ? totalRevenue / filteredBookings.length : 0
    
    const statusCounts = {
      PENDING: filteredBookings.filter((b: any) => b.status === 'PENDING').length,
      CONFIRMED: filteredBookings.filter((b: any) => b.status === 'CONFIRMED').length,
      CANCELLED: filteredBookings.filter((b: any) => b.status === 'CANCELLED').length,
      COMPLETED: filteredBookings.filter((b: any) => b.status === 'COMPLETED').length
    }

    const paymentStatusCounts = {
      PAID: filteredBookings.filter((b: any) => b.paymentStatus === 'PAID').length,
      PENDING: filteredBookings.filter((b: any) => b.paymentStatus === 'PENDING').length,
      FAILED: filteredBookings.filter((b: any) => b.paymentStatus === 'FAILED').length
    }

    // Cart performance
    const cartRevenue: { [key: string]: { name: string; revenue: number; bookings: number } } = {}
    filteredBookings.forEach((booking: any) => {
      if (!cartRevenue[booking.cartId]) {
        const cart = carts.find(c => c.id === booking.cartId)
        cartRevenue[booking.cartId] = {
          name: cart?.name || 'Unknown',
          revenue: 0,
          bookings: 0
        }
      }
      cartRevenue[booking.cartId].revenue += booking.totalAmount
      cartRevenue[booking.cartId].bookings++
    })

    const topCarts = Object.entries(cartRevenue)
      .sort((a, b) => b[1].revenue - a[1].revenue)
      .slice(0, 5)

    // Monthly trend
    const monthlyData: { [key: string]: { revenue: number; bookings: number } } = {}
    filteredBookings.forEach((booking: any) => {
      const month = new Date(booking.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
      if (!monthlyData[month]) {
        monthlyData[month] = { revenue: 0, bookings: 0 }
      }
      monthlyData[month].revenue += booking.totalAmount
      monthlyData[month].bookings++
    })

    // Customer insights
    const uniqueCustomers = new Set(filteredBookings.map((b: any) => b.customerEmail)).size
    const repeatCustomers = filteredBookings.reduce((acc: any, booking: any) => {
      const customerBookings = filteredBookings.filter((b: any) => b.customerEmail === booking.customerEmail)
      if (customerBookings.length > 1 && !acc.has(booking.customerEmail)) {
        acc.add(booking.customerEmail)
      }
      return acc
    }, new Set()).size

    return {
      totalRevenue,
      averageBookingValue,
      totalBookings: filteredBookings.length,
      statusCounts,
      paymentStatusCounts,
      topCarts,
      monthlyData,
      uniqueCustomers,
      repeatCustomers,
      repeatRate: uniqueCustomers > 0 ? (repeatCustomers / uniqueCustomers) * 100 : 0
    }
  }, [filteredBookings, carts])


  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-teal-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-white text-lg">{t('loading_reports')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center">
            <BarChart3 className="w-8 h-8 mr-3 text-teal-400" />
            {t('reports_analytics')}
          </h1>
          <p className="text-gray-400">
            {t('comprehensive_business_insights')}
          </p>
        </div>
        <div className="mt-4 lg:mt-0">
          <Button
            onClick={() => setShowFilters(!showFilters)}
            variant="outline"
            size="sm"
            className="flex items-center"
          >
            <Filter className="w-4 h-4 mr-2" />
            {t('filters')}
            <ChevronDown className={clsx('w-4 h-4 ml-2 transition-transform', showFilters && 'rotate-180')} />
          </Button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <Card className="bg-slate-700/50 backdrop-blur-sm border-slate-600">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-300 mb-2 block">{t('date_range')}</label>
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value as any)}
                  className="w-full bg-slate-600 text-white rounded-lg border border-slate-500 px-4 py-2"
                >
                  <option value="week">{t('last_7_days')}</option>
                  <option value="month">{t('last_30_days')}</option>
                  <option value="quarter">{t('last_90_days')}</option>
                  <option value="year">{t('last_year')}</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-300 mb-2 block">{t('food_cart')}</label>
                <select
                  value={selectedCart}
                  onChange={(e) => setSelectedCart(e.target.value)}
                  className="w-full bg-slate-600 text-white rounded-lg border border-slate-500 px-4 py-2"
                >
                  <option value="all">{t('all_carts')}</option>
                  {carts.map(cart => (
                    <option key={cart.id} value={cart.id}>{cart.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-slate-700/50 backdrop-blur-sm border-slate-600">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm font-medium mb-1">{t('total_revenue')}</p>
                <p className="text-2xl font-bold text-white">€{analytics.totalRevenue.toFixed(2)}</p>
                <div className="flex items-center mt-2">
                  <TrendingUp className="w-4 h-4 text-green-400 mr-1" />
                  <span className="text-sm text-green-400 font-medium">+12.5%</span>
                </div>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-700/50 backdrop-blur-sm border-slate-600">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm font-medium mb-1">{t('total_bookings')}</p>
                <p className="text-2xl font-bold text-white">{analytics.totalBookings}</p>
                <div className="flex items-center mt-2">
                  <TrendingUp className="w-4 h-4 text-teal-400 mr-1" />
                  <span className="text-sm text-teal-400 font-medium">+8.3%</span>
                </div>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl flex items-center justify-center">
                <Calendar className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-700/50 backdrop-blur-sm border-slate-600">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm font-medium mb-1">{t('avg_booking_value')}</p>
                <p className="text-2xl font-bold text-white">€{analytics.averageBookingValue.toFixed(2)}</p>
                <div className="flex items-center mt-2">
                  <TrendingUp className="w-4 h-4 text-blue-400 mr-1" />
                  <span className="text-sm text-blue-400 font-medium">+5.2%</span>
                </div>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-700/50 backdrop-blur-sm border-slate-600">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm font-medium mb-1">{t('unique_customers')}</p>
                <p className="text-2xl font-bold text-white">{analytics.uniqueCustomers}</p>
                <div className="flex items-center mt-2">
                  <span className="text-sm text-purple-400 font-medium">{analytics.repeatRate.toFixed(1)}% {t('repeat')}</span>
                </div>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-slate-700/50 backdrop-blur-sm border-slate-600">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <Calendar className="w-5 h-5 mr-2 text-teal-400" />
              {t('booking_status_distribution')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(analytics.statusCounts).map(([status, count]) => {
                const total = analytics.totalBookings
                const percentage = total > 0 ? (count / total) * 100 : 0
                const colors = {
                  PENDING: 'bg-yellow-500',
                  CONFIRMED: 'bg-green-500',
                  CANCELLED: 'bg-red-500',
                  COMPLETED: 'bg-blue-500'
                }
                const icons = {
                  PENDING: <Clock className="w-4 h-4" />,
                  CONFIRMED: <CheckCircle className="w-4 h-4" />,
                  CANCELLED: <XCircle className="w-4 h-4" />,
                  COMPLETED: <CheckCircle className="w-4 h-4" />
                }
                return (
                  <div key={status}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center">
                        <div className={clsx('p-2 rounded-lg mr-3', colors[status as keyof typeof colors] + '/20')}>
                          {icons[status as keyof typeof icons]}
                        </div>
                        <span className="text-white font-medium">{t(status.toLowerCase() as any)}</span>
                      </div>
                      <span className="text-gray-400 text-sm">{count} ({percentage.toFixed(1)}%)</span>
                    </div>
                    <div className="w-full bg-slate-600 rounded-full h-2">
                      <div
                        className={clsx('h-2 rounded-full', colors[status as keyof typeof colors])}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-700/50 backdrop-blur-sm border-slate-600">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <DollarSign className="w-5 h-5 mr-2 text-teal-400" />
              {t('payment_status_distribution')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(analytics.paymentStatusCounts).map(([status, count]) => {
                const total = analytics.totalBookings
                const percentage = total > 0 ? (count / total) * 100 : 0
                const colors = {
                  PAID: 'bg-green-500',
                  PENDING: 'bg-yellow-500',
                  FAILED: 'bg-red-500'
                }
                return (
                  <div key={status}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white font-medium">{t(status.toLowerCase() as any)}</span>
                      <span className="text-gray-400 text-sm">{count} ({percentage.toFixed(1)}%)</span>
                    </div>
                    <div className="w-full bg-slate-600 rounded-full h-2">
                      <div
                        className={clsx('h-2 rounded-full', colors[status as keyof typeof colors])}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Performing Carts */}
      <Card className="bg-slate-700/50 backdrop-blur-sm border-slate-600">
        <CardHeader>
            <CardTitle className="text-white flex items-center">
              <Truck className="w-5 h-5 mr-2 text-teal-400" />
              {t('top_performing_carts')}
            </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analytics.topCarts.map(([cartId, data], index) => {
              const maxRevenue = analytics.topCarts[0][1].revenue
              const percentage = (data.revenue / maxRevenue) * 100
              return (
                <div key={cartId} className="flex items-center space-x-4">
                  <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-teal-500 to-teal-600 rounded-lg font-bold text-white">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white font-medium">{data.name}</span>
                      <div className="text-right">
                        <div className="text-white font-bold">€{data.revenue.toFixed(2)}</div>
                        <div className="text-gray-400 text-sm">{data.bookings} {t('bookings')}</div>
                      </div>
                    </div>
                    <div className="w-full bg-slate-600 rounded-full h-2">
                      <div
                        className="h-2 rounded-full bg-gradient-to-r from-teal-500 to-teal-600"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Recent Bookings */}
      <Card className="bg-slate-700/50 backdrop-blur-sm border-slate-600">
        <CardHeader>
          <CardTitle className="text-white">{t('recent_bookings')} ({dateRange})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-600">
                  <th className="text-left text-gray-400 font-medium py-3 px-4">{t('date')}</th>
                  <th className="text-left text-gray-400 font-medium py-3 px-4">{t('customer')}</th>
                  <th className="text-left text-gray-400 font-medium py-3 px-4">{t('cart')}</th>
                  <th className="text-left text-gray-400 font-medium py-3 px-4">{t('amount')}</th>
                  <th className="text-left text-gray-400 font-medium py-3 px-4">{t('status')}</th>
                  <th className="text-left text-gray-400 font-medium py-3 px-4">{t('payment')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredBookings.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center">
                      <div className="flex flex-col items-center">
                        <AlertCircle className="w-12 h-12 text-gray-500 mb-3" />
                        <p className="text-gray-400 text-lg font-medium mb-1">{t('no_bookings_match_filters')}</p>
                        <p className="text-gray-500 text-sm">{t('adjust_filters')}</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredBookings.slice(0, 10).map((booking: any) => (
                    <tr key={booking.id} className="border-b border-slate-600/50 hover:bg-slate-600/30">
                      <td className="py-3 px-4 text-white text-sm">
                        {new Date(booking.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-white text-sm">
                        {booking.customerFirstName} {booking.customerLastName}
                      </td>
                      <td className="py-3 px-4 text-white text-sm">
                        {carts.find(c => c.id === booking.cartId)?.name || 'Unknown'}
                      </td>
                      <td className="py-3 px-4 text-white text-sm font-bold">
                        €{booking.totalAmount.toFixed(2)}
                      </td>
                      <td className="py-3 px-4">
                        <span className={clsx(
                          'px-2 py-1 rounded-full text-xs font-medium',
                          booking.status === 'CONFIRMED' && 'bg-green-500/20 text-green-400',
                          booking.status === 'PENDING' && 'bg-yellow-500/20 text-yellow-400',
                          booking.status === 'CANCELLED' && 'bg-red-500/20 text-red-400',
                          booking.status === 'COMPLETED' && 'bg-blue-500/20 text-blue-400'
                        )}>
                          {booking.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={clsx(
                          'px-2 py-1 rounded-full text-xs font-medium',
                          booking.paymentStatus === 'PAID' && 'bg-green-500/20 text-green-400',
                          booking.paymentStatus === 'PENDING' && 'bg-yellow-500/20 text-yellow-400',
                          booking.paymentStatus === 'FAILED' && 'bg-red-500/20 text-red-400'
                        )}>
                          {booking.paymentStatus}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

