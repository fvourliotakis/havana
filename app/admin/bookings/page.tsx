'use client'

import { useState, useEffect, useMemo } from 'react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import { clsx } from 'clsx'
import { useGetBookingsQuery, useUpdateBookingStatusMutation, useCancelBookingMutation, useDeleteBookingMutation } from '../../../lib/api/bookingsApi'
import { useAdminI18n } from '../../../lib/i18n/admin-context'
import type { Booking } from '../../../types/booking'
import { Calendar, FileText, AlertTriangle, CheckCircle, Building2, X, Eye, Check, User, Mail, Phone, MapPin, Clock, CreditCard, Truck, Users, Globe, ExternalLink, Edit2, Trash2 } from 'lucide-react'
import AdminBookingModal from '../../../components/admin/AdminBookingModal'

export default function BookingsPage() {
  const { t } = useAdminI18n()
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [expandedBookingId, setExpandedBookingId] = useState<string | null>(null)
  const [verificationNotes, setVerificationNotes] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [bookingToEdit, setBookingToEdit] = useState<any>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [bookingToDelete, setBookingToDelete] = useState<string | null>(null)
  const itemsPerPage = 10

  // Debounce search term to avoid too many API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
    }, 500)

    return () => clearTimeout(timer)
  }, [searchTerm])

  // RTK Query hooks with proper pagination and debounced search
  const {
    data: bookingsData,
    isLoading: loading,
    error,
    refetch
  } = useGetBookingsQuery({
    search: debouncedSearchTerm || undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    page: currentPage,
    limit: itemsPerPage
  })

  const [updateBookingStatusMutation] = useUpdateBookingStatusMutation()
  const [cancelBookingMutation] = useCancelBookingMutation()
  const [deleteBookingMutation] = useDeleteBookingMutation()

  const bookings = bookingsData?.bookings || []
  const totalPages = bookingsData?.totalPages || 1
  const totalBookings = bookingsData?.total || 0

  // Handle status update
  const handleStatusUpdate = async (bookingId: string, newStatus: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED') => {
    try {
      await updateBookingStatusMutation({ id: bookingId, status: newStatus }).unwrap()
      // RTK Query will automatically refetch and update the UI
    } catch (error) {
      console.error('Failed to update booking status:', error)
    }
  }

  // Handle booking cancellation
  const handleCancelBooking = async (bookingId: string) => {
    try {
      await cancelBookingMutation(bookingId).unwrap()
      // RTK Query will automatically refetch and update the UI
    } catch (error) {
      console.error('Failed to cancel booking:', error)
    }
  }

  // Handle edit booking
  const handleEditBooking = (booking: any) => {
    setBookingToEdit(booking)
    setEditModalOpen(true)
  }

  // Handle delete booking (with confirmation)
  const handleDeleteBooking = (bookingId: string) => {
    setBookingToDelete(bookingId)
    setDeleteConfirmOpen(true)
  }

  // Confirm delete
  const confirmDelete = async () => {
    if (!bookingToDelete) return
    
    try {
      await deleteBookingMutation(bookingToDelete).unwrap()
      setDeleteConfirmOpen(false)
      setBookingToDelete(null)
      refetch()
    } catch (error) {
      console.error('Failed to delete booking:', error)
      alert('Failed to delete booking. Please try again.')
    }
  }

  // Reset to page 1 when debounced search changes
  useEffect(() => {
    setCurrentPage(1)
  }, [debouncedSearchTerm, statusFilter])

  // Handle search input change
  const handleSearchChange = (value: string) => {
    setSearchTerm(value)
  }

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value)
  }

  // Handle payment slip verification
  const handlePaymentSlipVerification = async (slipId: string, action: 'verify' | 'reject') => {
    setVerifying(true)
    try {
      const response = await fetch(`/api/payment-slips/${slipId}/verify`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          adminNotes: verificationNotes || undefined,
          verifiedBy: 'admin'
        })
      })

      const data = await response.json()
      
      if (data.success) {
        alert(data.message)
        setVerificationNotes('')
        refetch() // Refresh the bookings list
      } else {
        throw new Error(data.error)
      }
    } catch (error) {
      console.error('Error verifying payment slip:', error)
      alert(`Failed to ${action} payment slip: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setVerifying(false)
    }
  }

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const statusOptions = [
    { value: 'all', label: t('all_statuses') },
    { value: 'pending', label: t('pending') },
    { value: 'confirmed', label: t('confirmed') },
    { value: 'completed', label: t('completed') },
    { value: 'cancelled', label: t('cancelled') }
  ]

  // Translate status function
  const getTranslatedStatus = (status: string) => {
    const statusKey = status.toLowerCase() as 'pending' | 'confirmed' | 'completed' | 'cancelled'
    return t(statusKey)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
      case 'confirmed': return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
      case 'completed': return 'bg-green-500/20 text-green-400 border-green-500/30'
      case 'cancelled': return 'bg-red-500/20 text-red-400 border-red-500/30'
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    }
  }



  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-teal-500 border-t-transparent"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">
            {t('bookings_management')}
          </h1>
          <p className="text-gray-400">
            {t('manage_customer_bookings')}
          </p>
        </div>

      </div>

      {/* Filters */}
      <Card className="bg-slate-700/50 backdrop-blur-sm border-slate-600">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Input
                placeholder={t('search_bookings')}
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
              />
              {searchTerm !== debouncedSearchTerm && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-teal-500 border-t-transparent"></div>
                </div>
              )}
            </div>
            <Select
              options={statusOptions}
              value={statusFilter}
              onChange={(e) => handleStatusFilterChange(e.target.value)}
            />

          </div>
        </CardContent>
      </Card>

      {/* Bookings List */}
      <Card className="bg-slate-700/50 backdrop-blur-sm border-slate-600">
        <CardHeader>
          <CardTitle className="text-white">
            {t('all_bookings_count').replace('{count}', totalBookings.toString())}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {bookings.length === 0 ? (
            <div className="text-center py-12">
              <div className="mb-4">
            <Calendar className="w-24 h-24 text-gray-400 mx-auto" />
          </div>
              <h3 className="text-xl font-semibold text-white mb-2">{t('no_bookings_found')}</h3>
              <p className="text-gray-400">{t('try_adjusting_search')}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {bookings.map((booking) => (
                <div
                  key={booking.id}
                  className="bg-slate-600/50 border border-slate-500/50 rounded-xl p-6 hover:border-slate-400/50 transition-all duration-300"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-4 mb-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-teal-600 rounded-lg flex items-center justify-center">
                          <span className="text-white font-bold">
                            {`${(booking as any).customerFirstName || ''}${(booking as any).customerLastName ? ' ' + (booking as any).customerLastName : ''}`.trim().charAt(0)}
                          </span>
                        </div>
                        <div>
                          <h3 className="font-semibold text-white text-lg">
                            {`${(booking as any).customerFirstName || ''} ${(booking as any).customerLastName || ''}`.trim()}
                          </h3>
                          <p className="text-gray-400 text-sm">
                            {booking.customerEmail} • {booking.customerPhone}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={clsx(
                            'px-3 py-1 rounded-full text-xs font-medium border',
                            getStatusColor(booking.status.toLowerCase())
                          )}>
                            {getTranslatedStatus(booking.status)}
                          </span>
                          
                          {/* Payment Method Badge */}
                          {(booking as any).paymentMethod === 'bank_transfer' && (
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30 flex items-center space-x-1">
                              <Building2 className="w-3 h-3" />
                              <span>{t('bank_transfer')}</span>
                            </span>
                          )}
                          {(booking as any).paymentMethod === 'paypal' && (
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30">
                              {t('paypal')}
                            </span>
                          )}
                          {(booking as any).paymentMethod === 'reservation' && (
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-orange-500/20 text-orange-400 border border-orange-500/30">
                              {t('reservation')}
                            </span>
                          )}
                          
                          {/* Payment Slip Status Badge */}
                          {(booking as any).paymentMethod === 'bank_transfer' && (booking as any).paymentSlip && (
                            <span className={clsx(
                              'px-2 py-1 rounded-full text-xs font-medium border flex items-center space-x-1',
                              (booking as any).paymentSlip.status === 'VERIFIED' 
                                ? 'bg-green-500/20 text-green-400 border-green-500/30'
                                : (booking as any).paymentSlip.status === 'REJECTED'
                                ? 'bg-red-500/20 text-red-400 border-red-500/30'
                                : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                            )}>
                              {(booking as any).paymentSlip.status === 'VERIFIED' ? (
                                <CheckCircle className="w-3 h-3" />
                              ) : (booking as any).paymentSlip.status === 'REJECTED' ? (
                                <AlertTriangle className="w-3 h-3" />
                              ) : (
                                <FileText className="w-3 h-3" />
                              )}
                              <span>
                                {(booking as any).paymentSlip.status === 'VERIFIED' ? t('verified') :
                                 (booking as any).paymentSlip.status === 'REJECTED' ? t('rejected') : t('pending')}
                              </span>
                            </span>
                          )}
                          
                          {/* Bank Transfer but No Slip */}
                          {(booking as any).paymentMethod === 'bank_transfer' && !(booking as any).paymentSlip && (
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-500/20 text-gray-400 border border-gray-500/30 flex items-center space-x-1">
                              <AlertTriangle className="w-3 h-3" />
                              <span>{t('no_slip')}</span>
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-gray-400">{t('event_details')}</p>
                          <p className="text-white font-medium">{booking.cartName}</p>
                          <p className="text-gray-300">{booking.eventType} • {booking.guestCount} {t('guests')}</p>
                        </div>
                        <div>
                          <p className="text-gray-400">{t('date_time')}</p>
                          <p className="text-white font-medium">{booking.eventDate}</p>
                          <p className="text-gray-300">{booking.startTime} - {booking.endTime}</p>
                        </div>
                        <div>
                          <p className="text-gray-400">{t('total_amount')}</p>
                          <p className="text-white font-bold text-lg">€{booking.totalAmount}</p>
                          <p className="text-gray-300">{t('booked_on').replace('{date}', new Date(booking.createdAt).toLocaleDateString())}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-4 lg:mt-0 lg:ml-6 flex flex-wrap gap-2">
                      {booking.status === 'PENDING' && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handleStatusUpdate(booking.id, 'CONFIRMED')}
                            className="bg-blue-500 hover:bg-blue-600"
                          >
                            {t('confirm')}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleStatusUpdate(booking.id, 'CANCELLED')}
                            className="border-red-500 text-red-400 hover:bg-red-500/20"
                          >
                            {t('cancel')}
                          </Button>
                        </>
                      )}
                      {booking.status === 'CONFIRMED' && (
                        <Button
                          size="sm"
                          onClick={() => handleStatusUpdate(booking.id, 'COMPLETED')}
                          className="bg-green-500 hover:bg-green-600"
                        >
                          {t('complete')}
                        </Button>
                      )}
                      
                      {/* Edit Button */}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEditBooking(booking)}
                        className="text-blue-400 hover:text-blue-300 hover:bg-blue-400/10"
                      >
                        <Edit2 className="w-4 h-4 mr-1" />
                        Edit
                      </Button>

                      {/* Delete Button */}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteBooking(booking.id)}
                        className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Delete
                      </Button>
                      
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setExpandedBookingId(expandedBookingId === booking.id ? null : booking.id)}
                        className="text-teal-400 hover:text-teal-300 hover:bg-teal-400/10"
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        {expandedBookingId === booking.id ? 'Hide Details' : 'View Details'}
                      </Button>
                    </div>
                  </div>

                  {/* Expandable Detail Section */}
                  {expandedBookingId === booking.id && (
                  <div className="border-t border-slate-600 bg-slate-700/30 p-6 space-y-6">
                    {/* Booking Summary Header */}
                    <div className="bg-gradient-to-r from-teal-600/20 to-blue-600/20 rounded-lg p-6 border border-teal-500/30">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <h4 className="text-lg font-bold text-white mb-2">Booking #{booking.id.slice(-8).toUpperCase()}</h4>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-300">Created:</span>
                              <span className="text-white">{new Date(booking.createdAt).toLocaleDateString()} {new Date(booking.createdAt).toLocaleTimeString()}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-300">Updated:</span>
                              <span className="text-white">{new Date(booking.updatedAt).toLocaleDateString()} {new Date(booking.updatedAt).toLocaleTimeString()}</span>
                            </div>
                          </div>
                        </div>
                        <div>
                          <h4 className="text-lg font-semibold text-white mb-2">Status</h4>
                          <span className={`px-3 py-2 rounded-lg text-sm font-medium ${getStatusColor(booking.status.toLowerCase())}`}>
                            {getTranslatedStatus(booking.status)}
                          </span>
                          <div className="mt-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-300">Payment Status:</span>
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                (booking as any).paymentStatus === 'PAID' ? 'bg-green-500/20 text-green-400' :
                                (booking as any).paymentStatus === 'PENDING' ? 'bg-yellow-500/20 text-yellow-400' :
                                (booking as any).paymentStatus === 'FAILED' ? 'bg-red-500/20 text-red-400' : 'bg-gray-500/20 text-gray-400'
                              }`}>
                                {(booking as any).paymentStatus || 'Unknown'}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div>
                          <h4 className="text-lg font-semibold text-white mb-2">Total</h4>
                          <div className="text-2xl font-bold text-teal-400">€{booking.totalAmount.toFixed(2)}</div>
                          <div className="text-sm text-gray-300">
                            {(booking as any).deliveryMethod === 'pickup' ? 'Pickup' : 'Delivery'} • {booking.guestCount} guests
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Booking Dates */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="bg-slate-700/50 rounded-lg p-6">
                        <h3 className="font-semibold text-white mb-4 flex items-center">
                          <Calendar className="w-5 h-5 mr-2 text-teal-400" />
                          Booking Dates & Times
                        </h3>
                        <div className="space-y-3">
                          {/* Show BookingDate records if available, otherwise fall back to legacy fields */}
                          {(booking as any).bookingDates && (booking as any).bookingDates.length > 0 ? (
                            (booking as any).bookingDates.map((bookingDate: any, index: number) => (
                              <div key={index} className="bg-slate-600/50 rounded p-3">
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-400">Date {index + 1}:</span>
                                  <span className="text-white font-medium">
                                    {new Date(bookingDate.date).toLocaleDateString()}
                                  </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-400">Time:</span>
                                  <span className="text-white">{bookingDate.startTime} - {bookingDate.endTime}</span>
                                </div>

                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-400">{t('cost')}:</span>
                                  <span className="text-white">€{bookingDate.cartCost?.toFixed(2)}</span>
                                </div>
                              </div>
                            ))
                          ) : (
                            // Legacy single date display
                            <div className="bg-slate-600/50 rounded p-3">
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-400">{t('date')}:</span>
                                <span className="text-white font-medium">
                                  {new Date(booking.eventDate).toLocaleDateString()}
                                </span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-400">Time:</span>
                                <span className="text-white">{booking.startTime} - {booking.endTime}</span>
                              </div>

                            </div>
                          )}
                        </div>
                      </div>

                      <div className="bg-slate-700/50 rounded-lg p-6">
                        <h3 className="font-semibold text-white mb-4 flex items-center">
                          <User className="w-5 h-5 mr-2 text-teal-400" />
                          {t('customer_information')}
                        </h3>
                        <div className="space-y-3 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-400">{t('full_name')}:</span>
                            <span className="text-white font-medium">
                              {(booking as any).customerFirstName} {(booking as any).customerLastName}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">{t('email')}:</span>
                            <span className="text-white font-medium">{booking.customerEmail}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">{t('phone')}:</span>
                            <span className="text-white font-medium">{booking.customerPhone}</span>
                          </div>
                          <div className="border-t border-slate-600 pt-3 mt-3">
                            <h4 className="text-white font-medium mb-2">Billing Address</h4>
                            <div className="space-y-2 text-xs">
                              <div className="flex justify-between">
                                <span className="text-gray-400">Street:</span>
                                <span className="text-white">{(booking as any).customerAddress}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-400">City:</span>
                                <span className="text-white">{(booking as any).customerCity}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-400">State/Province:</span>
                                <span className="text-white">{(booking as any).customerState || 'N/A'}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-400">Postal Code:</span>
                                <span className="text-white">{(booking as any).customerZip || 'N/A'}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-400">{t('country')}:</span>
                                <span className="text-white">{(booking as any).customerCountry}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Financial Breakdown */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="bg-slate-700/50 rounded-lg p-6">
                        <h3 className="font-semibold text-white mb-4 flex items-center">
                          <CreditCard className="w-5 h-5 mr-2 text-teal-400" />
                          Payment & Financial Details
                        </h3>
                        <div className="space-y-3 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-400">{t('payment_method')}:</span>
                            <span className="text-white font-medium">
                              {(booking as any).paymentMethod === 'paypal' ? 'PayPal' :
                               (booking as any).paymentMethod === 'bank_transfer' ? 'Bank Transfer' :
                               (booking as any).paymentMethod === 'reservation' ? 'Reservation' : 'Unknown'}
                            </span>
                          </div>
                          {(booking as any).transactionId && (
                            <div className="flex justify-between">
                              <span className="text-gray-400">{t('transaction_id')}:</span>
                              <span className="text-white font-mono text-xs">{(booking as any).transactionId}</span>
                            </div>
                          )}
                          <div className="border-t border-slate-600 pt-3 mt-3">
                            <h4 className="text-white font-medium mb-2">Cost Breakdown</h4>
                            <div className="space-y-2">
                              <div className="flex justify-between">
                                <span className="text-gray-400">Cart Rental:</span>
                                <span className="text-white">€{((booking as any).cartServiceAmount || 0).toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-400">{t('admin_food_items')}:</span>
                                <span className="text-white">€{((booking as any).foodAmount || 0).toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-400">Services:</span>
                                <span className="text-white">€{((booking as any).servicesAmount || 0).toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-400">Shipping/Delivery:</span>
                                <span className="text-white">€{((booking as any).shippingAmount || 0).toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between border-t border-slate-600 pt-2 font-bold">
                                <span className="text-gray-300">Total Amount:</span>
                                <span className="text-white text-lg">€{booking.totalAmount.toFixed(2)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="bg-slate-700/50 rounded-lg p-6">
                        <h3 className="font-semibold text-white mb-4 flex items-center">
                          <MapPin className="w-5 h-5 mr-2 text-teal-400" />
                          {t('delivery_information')}
                        </h3>
                        <div className="space-y-3 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-400">{t('delivery_method')}:</span>
                            <span className="text-white font-medium">
                              {(booking as any).deliveryMethod === 'pickup' ? 'Pickup' : 'Shipping/Delivery'}
                            </span>
                          </div>
                          {(booking as any).deliveryMethod === 'shipping' && (
                            <div className="border-t border-slate-600 pt-3 mt-3">
                              <h4 className="text-white font-medium mb-2">Shipping Address</h4>
                              <div className="space-y-2 text-xs">
                                <div className="flex justify-between">
                                  <span className="text-gray-400">Street:</span>
                                  <span className="text-white">{(booking as any).shippingAddress || 'Same as billing'}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-400">City:</span>
                                  <span className="text-white">{(booking as any).shippingCity || (booking as any).customerCity}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-400">{t('state')}:</span>
                                  <span className="text-white">{(booking as any).shippingState || (booking as any).customerState || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-400">Postal Code:</span>
                                  <span className="text-white">{(booking as any).shippingZip || (booking as any).customerZip || 'N/A'}</span>
                                </div>
                              </div>
                            </div>
                          )}
                          {(booking as any).deliveryMethod === 'pickup' && (
                            <div className="bg-blue-600/20 border border-blue-500/30 rounded p-3 mt-3">
                              <p className="text-blue-300 text-xs">
                                <MapPin className="w-3 h-3 inline mr-1" />
                                {t('customer_pickup_location')}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="bg-slate-700/50 rounded-lg p-6">
                        <h3 className="font-semibold text-white mb-4 flex items-center">
                          <Calendar className="w-5 h-5 mr-2 text-teal-400" />
                          {t('event_details')}
                        </h3>
                        <div className="space-y-3 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-400">{t('selected_cart')}:</span>
                            <span className="text-white font-medium">{booking.cartName}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">{t('event_type')}:</span>
                            <span className="text-white font-medium">{booking.eventType}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">{t('guest_count')}:</span>
                            <span className="text-white font-medium">{booking.guestCount} {t('guests')}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">{t('timing_type')}:</span>
                            <span className="text-white font-medium">
                              {(booking as any).isCustomTiming ? t('custom_times') : t('preset_slots')}
                            </span>
                          </div>
                          {(booking as any).timeSlotType && (
                            <div className="flex justify-between">
                              <span className="text-gray-400">{t('slot_type')}:</span>
                              <span className="text-white font-medium">{(booking as any).timeSlotType}</span>
                            </div>
                          )}
                          {(booking as any).specialNotes && (
                            <div>
                              <span className="text-gray-400">{t('special_notes')}:</span>
                              <p className="text-gray-300 bg-slate-600/50 p-2 rounded mt-1 text-xs">
                                {(booking as any).specialNotes}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Ordered Items & Services */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="bg-slate-700/50 rounded-lg p-6">
                        <h3 className="font-semibold text-white mb-4 flex items-center">
                          <CheckCircle className="w-5 h-5 mr-2 text-teal-400" />
                          {t('food_items_ordered')}
                        </h3>
                        {(booking as any).selectedItems && (booking as any).selectedItems.length > 0 ? (
                          <div className="space-y-3">
                            {(booking as any).selectedItems.map((item: any, index: number) => (
                              <div key={index} className="bg-slate-600/50 rounded p-3">
                                <div className="flex justify-between items-start">
                                  <div className="flex-1">
                                    <h4 className="text-white font-medium text-sm">{item.foodItem?.name || `Item #${item.foodItemId}`}</h4>
                                    <p className="text-gray-400 text-xs">{item.foodItem?.category || t('unknown_category')}</p>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-white text-sm">{t('quantity')}: {item.quantity}</div>
                                    <div className="text-teal-400 text-sm font-medium">€{(item.price * item.quantity).toFixed(2)}</div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-6">
                            <div className="text-gray-400 text-sm">{t('no_food_items_ordered')}</div>
                          </div>
                        )}
                      </div>

                      <div className="bg-slate-700/50 rounded-lg p-6">
                        <h3 className="font-semibold text-white mb-4 flex items-center">
                          <User className="w-5 h-5 mr-2 text-teal-400" />
                          {t('admin_additional_services')}
                        </h3>
                        {(booking as any).selectedServices && (booking as any).selectedServices.length > 0 ? (
                          <div className="space-y-3">
                            {(booking as any).selectedServices.map((service: any, index: number) => (
                              <div key={index} className="bg-slate-600/50 rounded p-3">
                                <div className="flex justify-between items-start">
                                  <div className="flex-1">
                                    <h4 className="text-white font-medium text-sm">{service.service?.name || `Service #${service.serviceId}`}</h4>
                                    <p className="text-gray-400 text-xs">{service.service?.category || t('unknown_category')}</p>
                                  </div>
                                  <div className="text-right">
                                                        <div className="text-white text-sm">{t('quantity')}: {service.quantity}</div>
                    <div className="text-white text-sm">{t('hours')}: {service.hours}</div>
                                    <div className="text-teal-400 text-sm font-medium">€{service.totalAmount.toFixed(2)}</div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-6">
                            <div className="text-gray-400 text-sm">{t('no_additional_services_ordered')}</div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Technical & System Information */}
                    <div className="bg-slate-700/50 rounded-lg p-6">
                      <h3 className="font-semibold text-white mb-4 flex items-center">
                        <Clock className="w-5 h-5 mr-2 text-teal-400" />
                        {t('technical_information')}
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                        <div>
                          <h4 className="text-white font-medium mb-2">{t('system_details')}</h4>
                          <div className="space-y-1">
                            <div className="flex justify-between">
                              <span className="text-gray-400">{t('booking_id')}:</span>
                              <span className="text-white font-mono text-xs">{booking.id}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">{t('cart_id')}:</span>
                              <span className="text-white font-mono text-xs">{booking.cartId}</span>
                            </div>
                            {(booking as any).userId && (
                              <div className="flex justify-between">
                                <span className="text-gray-400">{t('user_id')}:</span>
                                <span className="text-white font-mono text-xs">{(booking as any).userId}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div>
                          <h4 className="text-white font-medium mb-2">{t('booking_settings')}</h4>
                          <div className="space-y-1">
                            <div className="flex justify-between">
                              <span className="text-gray-400">{t('custom_timing')}:</span>
                              <span className="text-white">{(booking as any).isCustomTiming ? t('yes') : t('no')}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">{t('multi_day')}:</span>
                              <span className="text-white">
                                {(booking as any).bookingDates && (booking as any).bookingDates.length > 1 ? t('yes') : t('no')}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">{t('total_dates')}:</span>
                              <span className="text-white">
                                {(booking as any).bookingDates ? (booking as any).bookingDates.length : 1}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div>
                          <h4 className="text-white font-medium mb-2">{t('timestamps')}</h4>
                          <div className="space-y-1">
                            <div className="flex justify-between">
                              <span className="text-gray-400">{t('created')}:</span>
                              <span className="text-white text-xs">{new Date(booking.createdAt).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">{t('last_updated')}:</span>
                              <span className="text-white text-xs">{new Date(booking.updatedAt).toLocaleString()}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Bank Transfer Payment Slip Section */}
                    {(booking as any).paymentMethod === 'bank_transfer' && (
                      <div className="bg-slate-700/50 rounded-lg p-6">
                        <h3 className="font-semibold text-white mb-4 flex items-center">
                          <FileText className="w-5 h-5 mr-2 text-teal-400" />
                          {t('bank_transfer_payment_slip')}
                        </h3>
                        
                        {(booking as any).paymentSlip ? (
                          <div className="space-y-4">
                            {/* Payment Slip Details */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-gray-400">{t('file_name')}:</span>
                                  <span className="text-white">{(booking as any).paymentSlip.fileName}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-400">{t('file_size')}:</span>
                                  <span className="text-white">{formatFileSize((booking as any).paymentSlip.fileSize)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-400">{t('uploaded')}:</span>
                                  <span className="text-white">
                                    {new Date((booking as any).paymentSlip.uploadedAt).toLocaleString()}
                                  </span>
                                </div>
                              </div>
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-gray-400">{t('status')}:</span>
                                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                                    (booking as any).paymentSlip.status === 'VERIFIED' 
                                      ? 'bg-green-500/20 text-green-400'
                                      : (booking as any).paymentSlip.status === 'REJECTED'
                                      ? 'bg-red-500/20 text-red-400'
                                      : 'bg-yellow-500/20 text-yellow-400'
                                  }`}>
                                    {(booking as any).paymentSlip.status}
                                  </span>
                                </div>
                                {(booking as any).paymentSlip.verifiedAt && (
                                  <div className="flex justify-between">
                                    <span className="text-gray-400">{t('verified_at')}:</span>
                                    <span className="text-white">
                                      {new Date((booking as any).paymentSlip.verifiedAt).toLocaleString()}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Payment Slip URL */}
                            <div className="mt-4">
                              <h4 className="text-white font-medium mb-2">{t('payment_receipt_link')}</h4>
                              <div className="bg-slate-600/30 rounded-lg p-4">
                                {(booking as any).paymentSlip.mimeType === 'application/url' ? (
                                  <div className="text-center p-4">
                                    <Globe className="w-12 h-12 text-blue-400 mx-auto mb-3" />
                                    <p className="text-gray-300 mb-3">{t('customer_provided_payment_receipt_link')}</p>
                                    <div className="space-y-2">
                                      <Button
                                        variant="outline" 
                                        size="sm"
                                        onClick={() => window.open((booking as any).paymentSlip.filePath, '_blank')}
                                        className="mr-2"
                                      >
                                        <ExternalLink className="w-4 h-4 mr-2" />
                                        {t('view_receipt')}
                                      </Button>
                                      <p className="text-xs text-gray-400 break-all max-w-md mx-auto">
                                        {(booking as any).paymentSlip.filePath}
                                      </p>
                                    </div>
                                  </div>
                                ) : (booking as any).paymentSlip.mimeType.startsWith('image/') ? (
                                  <img
                                    src={(booking as any).paymentSlip.filePath}
                                    alt={t('payment_slip')}
                                    className="max-w-full max-h-64 rounded-lg border border-slate-500 mx-auto"
                                  />
                                ) : (booking as any).paymentSlip.mimeType === 'application/pdf' ? (
                                  <div className="text-center p-6">
                                    <FileText className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                                    <p className="text-gray-300 mb-2">{t('pdf_document')}</p>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => window.open((booking as any).paymentSlip.filePath, '_blank')}
                                    >
                                      <Eye className="w-4 h-4 mr-2" />
                                      {t('open_pdf')}
                                    </Button>
                                  </div>
                                ) : (
                                  <div className="text-center p-6">
                                    <AlertTriangle className="w-12 h-12 text-yellow-400 mx-auto mb-2" />
                                    <p className="text-gray-300">{t('unsupported_file_type')}</p>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Verification Actions (only if pending) */}
                            {(booking as any).paymentSlip.status === 'PENDING' && (
                              <div className="mt-4 bg-slate-600/30 rounded-lg p-4">
                                <h4 className="text-white font-medium mb-3">{t('verify_payment_slip')}</h4>
                                <div className="space-y-3">
                                  <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                      {t('admin_notes_optional')}
                                    </label>
                                    <textarea
                                      value={verificationNotes}
                                      onChange={(e) => setVerificationNotes(e.target.value)}
                                      placeholder={t('add_payment_verification_notes')}
                                      rows={2}
                                      className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-teal-500"
                                    />
                                  </div>
                                  <div className="flex space-x-3">
                                    <Button
                                      onClick={() => handlePaymentSlipVerification((booking as any).paymentSlip.id, 'verify')}
                                      disabled={verifying}
                                      size="sm"
                                      className="bg-green-600 hover:bg-green-700"
                                    >
                                      {verifying ? (
                                        <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent mr-2"></div>
                                      ) : (
                                        <Check className="w-3 h-3 mr-2" />
                                      )}
                                      {t('verify_approve')}
                                    </Button>
                                    <Button
                                      variant="outline"
                                      onClick={() => handlePaymentSlipVerification((booking as any).paymentSlip.id, 'reject')}
                                      disabled={verifying}
                                      size="sm"
                                      className="border-red-500 text-red-400 hover:bg-red-500/20"
                                    >
                                      {verifying ? (
                                        <div className="animate-spin rounded-full h-3 w-3 border-2 border-red-400 border-t-transparent mr-2"></div>
                                      ) : (
                                        <X className="w-3 h-3 mr-2" />
                                      )}
                                      {t('reject')}
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Admin Notes Display */}
                            {(booking as any).paymentSlip.adminNotes && (
                              <div className="mt-4">
                                <h4 className="text-white font-medium mb-2">{t('admin_notes')}</h4>
                                <p className="text-gray-300 bg-slate-600/50 p-3 rounded text-sm">
                                  {(booking as any).paymentSlip.adminNotes}
                                </p>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-center py-6">
                            <AlertTriangle className="w-12 h-12 text-yellow-400 mx-auto mb-3" />
                            <h4 className="text-white font-medium mb-2">{t('no_payment_slip_uploaded')}</h4>
                            <p className="text-gray-400 text-sm">
                              {t('customer_bank_transfer_no_slip')}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Booking Actions */}
                    <div className="bg-slate-700/50 rounded-lg p-4">
                      <h3 className="font-semibold text-white mb-3">{t('quick_actions')}</h3>
                      <div className="flex flex-wrap gap-3">
                        {booking.status === 'PENDING' && (
                          <>
                            <Button
                              onClick={() => {
                                handleStatusUpdate(booking.id, 'CONFIRMED')
                                setExpandedBookingId(null)
                              }}
                              size="sm"
                              className="bg-blue-600 hover:bg-blue-700"
                            >
                              <CheckCircle className="w-4 h-4 mr-2" />
                              {t('confirm_booking')}
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => {
                                handleStatusUpdate(booking.id, 'CANCELLED')
                                setExpandedBookingId(null)
                              }}
                              size="sm"
                              className="border-red-500 text-red-400 hover:bg-red-500/20"
                            >
                              <X className="w-4 h-4 mr-2" />
                              {t('cancel_booking')}
                            </Button>
                          </>
                        )}
                        {booking.status === 'CONFIRMED' && (
                          <Button
                            onClick={() => {
                              handleStatusUpdate(booking.id, 'COMPLETED')
                              setExpandedBookingId(null)
                            }}
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            {t('mark_as_completed')}
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => alert(`Contact: ${booking.customerEmail} | ${booking.customerPhone}`)}
                        >
                          <Mail className="w-4 h-4 mr-2" />
                          {t('contact_customer')}
                        </Button>
                      </div>
                    </div>
                  </div>
                  )}
                </div>
              ))}
            </div>
          )}
          
          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <div className="text-sm text-gray-400">
                {t('showing_results')
                  .replace('{start}', ((currentPage - 1) * itemsPerPage + 1).toString())
                  .replace('{end}', Math.min(currentPage * itemsPerPage, totalBookings).toString())
                  .replace('{total}', totalBookings.toString())}
              </div>
              
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  {t('previous')}
                </Button>
                
                <span className="text-sm text-gray-300">
                  {t('page_of')
                    .replace('{current}', currentPage.toString())
                    .replace('{total}', totalPages.toString())}
                </span>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  {t('next')}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Booking Modal */}
      <AdminBookingModal
        isOpen={editModalOpen}
        onClose={() => {
          setEditModalOpen(false)
          setBookingToEdit(null)
        }}
        onSuccess={() => {
          setEditModalOpen(false)
          setBookingToEdit(null)
          refetch()
        }}
        bookingToEdit={bookingToEdit}
      />

      {/* Delete Confirmation Dialog */}
      {deleteConfirmOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/70">
          <div className="bg-slate-800 rounded-lg shadow-2xl border border-red-500/30 max-w-md w-full p-6 animate-fadeIn">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white flex items-center">
                <AlertTriangle className="w-6 h-6 mr-2 text-red-400" />
                Delete Booking
              </h3>
              <button
                onClick={() => {
                  setDeleteConfirmOpen(false)
                  setBookingToDelete(null)
                }}
                className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            
            <p className="text-gray-300 mb-6">
              Are you sure you want to permanently delete this booking? This action cannot be undone.
            </p>
            
            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => {
                  setDeleteConfirmOpen(false)
                  setBookingToDelete(null)
                }}
                size="md"
              >
                Cancel
              </Button>
              <Button
                onClick={confirmDelete}
                className="bg-red-600 hover:bg-red-700 text-white"
                size="md"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Permanently
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}