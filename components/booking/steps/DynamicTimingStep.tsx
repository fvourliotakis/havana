'use client'

import { useState, useEffect } from 'react'
import { BookingFormData, BookingDate } from '@/types/booking'
import Button from '@/components/ui/Button'
import { useGetBulkAvailabilityQuery } from '../../../lib/api/bookingsApi'
import { useGetFoodCartByIdQuery } from '../../../lib/api/foodCartsApi'
import { AlertTriangle, Clock, Calendar, Check, ChevronLeft, ChevronRight, X, Plus, Home, Truck } from 'lucide-react'
import TimingSkeleton from '@/components/ui/skeletons/TimingSkeleton'
import { useI18n } from '@/lib/i18n/context'

interface DynamicTimingStepProps {
  formData: Partial<BookingFormData>
  updateFormData: (data: Partial<BookingFormData>) => void
  onNext: () => void
  onPrevious: () => void
  isEditMode?: boolean
  bookingId?: string
}

export default function DynamicTimingStep({ formData, updateFormData, onNext, onPrevious, isEditMode = false, bookingId }: DynamicTimingStepProps) {
  const { t, language } = useI18n()
  
  // Unified state - no tabs needed
  const [selectedDates, setSelectedDates] = useState<BookingDate[]>(formData.selectedDates || [])
  const [currentDateIndex, setCurrentDateIndex] = useState(0)
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  
  const [calendarView, setCalendarView] = useState(new Date())
  const [cachedBookedDates, setCachedBookedDates] = useState<{[date: string]: any[]}>({})
  const [checkingAvailability, setCheckingAvailability] = useState(false)

  // Initialize from existing data if available (only on mount and when coming from other steps)
  useEffect(() => {
    // Only sync if we have formData dates and local state is different
    if (formData.selectedDates && formData.selectedDates.length > 0) {
      const formDataJson = JSON.stringify(formData.selectedDates)
      const localJson = JSON.stringify(selectedDates)
      
      // Only update if actually different to prevent infinite loops
      if (formDataJson !== localJson) {
        setSelectedDates(formData.selectedDates)
        // If single date, populate time fields for editing
        if (formData.selectedDates.length === 1) {
          const firstDate = formData.selectedDates[0]
          setStartTime(firstDate.startTime || '10:00')
          setEndTime(firstDate.endTime || '18:00')
        }
      }
    }
  }, [formData.selectedDates]) // Only listen to formData.selectedDates

  // Fetch cart data for pricing
  const {
    data: cartData,
    isLoading: cartLoading,
    error: cartError
  } = useGetFoodCartByIdQuery(formData.selectedCartId!, {
    skip: !formData.selectedCartId
  })

  // Calculate date range for bulk availability fetching (current month + next month)
  const getDateRange = () => {
    const currentMonth = new Date(calendarView.getFullYear(), calendarView.getMonth(), 1)
    const nextMonth = new Date(calendarView.getFullYear(), calendarView.getMonth() + 2, 0) // Last day of next month
    
    return {
      startDate: currentMonth.toISOString().split('T')[0],
      endDate: nextMonth.toISOString().split('T')[0]
    }
  }

  // Fetch booked dates for the current date range
  const { startDate, endDate } = getDateRange()
  const {
    data: bulkAvailabilityData,
    isLoading: availabilityLoading,
    error: availabilityError
  } = useGetBulkAvailabilityQuery({
    cartId: formData.selectedCartId!,
    startDate,
    endDate,
    excludeBookingId: bookingId // Exclude current booking in edit mode
  }, {
    skip: !formData.selectedCartId,
    // Refetch when month changes (date range changes)
    refetchOnMountOrArgChange: true
  })

  // Update cached booked dates when bulk data is fetched
  useEffect(() => {
    if (bulkAvailabilityData?.bookedDates) {
      setCachedBookedDates(bulkAvailabilityData.bookedDates)
    }
  }, [bulkAvailabilityData])

  // Calculate cart cost - simple daily rate
  const calculateCartCost = () => {
    if (!cartData) return 150 // Use fallback even when loading
    
    return cartData.pricePerHour || 150
  }

  // Calculate total hours between start and end time
  const calculateTotalHours = (startTime: string, endTime: string) => {
    if (!startTime || !endTime) return 0
    
    if (startTime === '00:00' && endTime === '23:59') {
      return 24 // Full day
    }
    
    const [startHour, startMinute] = startTime.split(':').map(Number)
    const [endHour, endMinute] = endTime.split(':').map(Number)
    
    const startMinutes = startHour * 60 + startMinute
    const endMinutes = endHour * 60 + endMinute
    
    const totalMinutes = endMinutes - startMinutes
    return Math.max(0, Math.round(totalMinutes / 60 * 10) / 10) // Round to 1 decimal place
  }

  // Determine if single or multi-day booking
  const isSingleDay = selectedDates.length === 1
  const isMultiDay = selectedDates.length > 1

  // Re-check availability for selected dates when cached data becomes available
  useEffect(() => {
    if (Object.keys(cachedBookedDates).length > 0 && selectedDates.length > 0) {
      if (isSingleDay && selectedDates[0]?.startTime && selectedDates[0]?.endTime) {
        checkSingleAvailability(selectedDates[0])
      } else if (isMultiDay) {
        checkMultipleAvailability(selectedDates)
      }
    }
  }, [cachedBookedDates, isSingleDay, isMultiDay])

  // Update cart costs when cart data becomes available
  useEffect(() => {
    if (cartData && selectedDates.length > 0) {
      const correctCost = cartData.pricePerHour || 150
      
      // Check if any dates have incorrect cost (fallback was used)
      const needsUpdate = selectedDates.some(date => date.cartCost !== correctCost)
      
      if (needsUpdate) {
        const updatedDates = selectedDates.map(date => ({
          ...date,
          cartCost: correctCost,
          // Recalculate totalHours if missing
          totalHours: date.totalHours || calculateTotalHours(date.startTime, date.endTime)
        }))
        
        setSelectedDates(updatedDates)
        
        // Update form data with correct costs
        const newTotalCost = updatedDates.reduce((sum, date) => sum + date.cartCost, 0)
        updateFormData({
          selectedDates: updatedDates,
          cartServiceAmount: newTotalCost
        })
      }
    }
  }, [cartData, selectedDates.length])
  
  // Current selected date (for single day time configuration)
  const currentSelectedDate = selectedDates[0]
  
  // Auto-calculate daily bookings for multi-day
  useEffect(() => {
    if (isMultiDay) {
      const updatedDates = selectedDates.map(date => ({
        ...date,
        startTime: '00:00',
        endTime: '23:59',
        totalHours: 24, // Full day
        cartCost: calculateCartCost(),
        isAvailable: false // Will be checked by availability API
      }))
      setSelectedDates(updatedDates)
      
      // Update form data immediately for multi-day changes
      const newTotalCost = updatedDates.reduce((sum, date) => sum + date.cartCost, 0)
      updateFormData({
        selectedDates: updatedDates,
        cartServiceAmount: newTotalCost
      })
      
      checkMultipleAvailability(updatedDates)
    }
  }, [selectedDates.length, cartData])
  
  // Update single day when times change
  useEffect(() => {
    if (isSingleDay && currentSelectedDate && startTime && endTime) {
      const cost = calculateCartCost()
      
      // FIXED: Check availability immediately using cached data instead of setting to false
      const { isAvailable, conflictingBooking } = checkLocalAvailability(
        currentSelectedDate.date,
        startTime,
        endTime
      )
      
      const updatedDate = {
        ...currentSelectedDate,
        startTime,
        endTime,
        totalHours: calculateTotalHours(startTime, endTime),
        cartCost: cost,
        isAvailable,
        conflictingBooking
      }
      
      const newDates = [updatedDate]
      setSelectedDates(newDates)
      
      // Update form data immediately when time changes
      updateFormData({
        selectedDates: newDates,
        cartServiceAmount: cost
      })
    }
  }, [startTime, endTime, isSingleDay, cartData, cachedBookedDates])
  
  // Local availability checking functions using cached data
  const checkLocalAvailability = (dateStr: string, startTime: string, endTime: string) => {
    const bookedSlots = cachedBookedDates[dateStr] || []
    
    // If no booked slots for this date, it's available
    if (bookedSlots.length === 0) {
      return { isAvailable: true, conflictingBooking: null }
    }
    
    // FIXED: Correct time overlap logic
    // Two time ranges [A_start, A_end] and [B_start, B_end] overlap if: A_start < B_end AND B_start < A_end
    const conflictingBooking = bookedSlots.find((slot) => {
      return startTime < slot.endTime && slot.startTime < endTime
    })
    
    return {
      isAvailable: !conflictingBooking,
      conflictingBooking: conflictingBooking || null
    }
  }

  const checkSingleAvailability = (dateObj: BookingDate) => {
    if (!dateObj.date || !dateObj.startTime || !dateObj.endTime) return
    
    const { isAvailable, conflictingBooking } = checkLocalAvailability(
      dateObj.date, 
      dateObj.startTime, 
      dateObj.endTime
    )
    
    const updatedDates = selectedDates.map(d => 
      d.date === dateObj.date ? { ...d, isAvailable, conflictingBooking } : d
    )
    
    setSelectedDates(updatedDates)
    
    // Update form data immediately when availability changes
    const newTotalCost = updatedDates.reduce((sum, date) => sum + date.cartCost, 0)
    updateFormData({
      selectedDates: updatedDates,
      cartServiceAmount: newTotalCost
    })
  }

  const checkMultipleAvailability = (dates: BookingDate[]) => {
    const updatedDates = dates.map(dateObj => {
      const { isAvailable, conflictingBooking } = checkLocalAvailability(
        dateObj.date, 
        dateObj.startTime, 
        dateObj.endTime
      )
      
      return { ...dateObj, isAvailable, conflictingBooking }
    })
    
    setSelectedDates(updatedDates)
    
    // Update form data immediately when availability changes
    const newTotalCost = updatedDates.reduce((sum, date) => sum + date.cartCost, 0)
    updateFormData({
      selectedDates: updatedDates,
      cartServiceAmount: newTotalCost
    })
  }

  // Calculations
  const totalCost = selectedDates.reduce((sum, date) => sum + date.cartCost, 0)
  const totalDays = selectedDates.length

  // Add or remove a date from selection
  const toggleDate = (dateStr: string) => {
    const existingIndex = selectedDates.findIndex(d => d.date === dateStr)
    
    if (existingIndex >= 0) {
      // Remove date
      const newDates = selectedDates.filter((_, i) => i !== existingIndex)
      setSelectedDates(newDates)
      
      // Update form data immediately with new dates and total cost
      const newTotalCost = newDates.reduce((sum, date) => sum + date.cartCost, 0)
      updateFormData({
        selectedDates: newDates,
        cartServiceAmount: newTotalCost
      })
      
      // Clear time fields if removing the only date
      if (newDates.length === 0) {
        setStartTime('')
        setEndTime('')
      }
    } else {
      // Add date
      const isFirstDate = selectedDates.length === 0
      const startTimeValue = isFirstDate ? '' : '00:00' // Empty for first date - user must choose, full day for multi
      const endTimeValue = isFirstDate ? '' : '23:59'
      
      const newDate: BookingDate = {
        date: dateStr,
        startTime: startTimeValue,
        endTime: endTimeValue,
        totalHours: calculateTotalHours(startTimeValue, endTimeValue),
        cartCost: isFirstDate ? 0 : calculateCartCost(), // No cost until times selected for first date
        isAvailable: false // Will be properly checked when user selects times or if multi-day
      }
      
      const newDates = [...selectedDates, newDate]
      setSelectedDates(newDates)
      
      // Don't auto-set times for first date - let user choose manually
      if (isFirstDate) {
        // Keep local state empty for first date
        setStartTime('')
        setEndTime('')
      }
      
      // Update form data immediately with new dates and total cost
      const newTotalCost = newDates.reduce((sum, date) => sum + date.cartCost, 0)
      updateFormData({
        selectedDates: newDates,
        cartServiceAmount: newTotalCost
      })
    }
  }

  // Validation - now includes availability checking
  const isValid = selectedDates.length > 0 && selectedDates.every(date => {
    if (isSingleDay) {
      // Single day needs custom times AND availability
      return date.date && date.startTime && date.endTime && date.isAvailable
    } else {
      // Multi-day automatically has full day times AND availability
      return date.date && date.isAvailable
    }
  }) && (isSingleDay ? (startTime && endTime) : true) && !availabilityLoading

  // Calendar helper functions
  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  }

  const formatDateString = (year: number, month: number, day: number) => {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }

  const isDateDisabled = (dateStr: string) => {
    const today = new Date()
    const selectedDateObj = new Date(dateStr)
    today.setHours(0, 0, 0, 0)
    selectedDateObj.setHours(0, 0, 0, 0)
    return selectedDateObj < today
  }

  const getDateAvailabilityStatus = (dateStr: string) => {
    const dateObj = selectedDates.find(d => d.date === dateStr)
    if (!dateObj) return null
    
    // For single day bookings, show pending_times if no times selected yet
    if (isSingleDay && (!dateObj.startTime || !dateObj.endTime)) {
      return 'pending_times'
    }
    
    // Show checking if we're still loading bulk data and don't have cached info for this date
    if (availabilityLoading && !cachedBookedDates[dateStr]) {
      return 'checking'
    }
    
    // FIXED: Simplified status logic - trust the availability that was set
    if (dateObj.conflictingBooking) return 'conflict'
    if (dateObj.isAvailable === false) return 'unavailable'
    if (dateObj.isAvailable === true) return 'available'
    
    return 'unknown'
  }

  const handleNext = () => {
    if (isValid) {
      const firstDate = selectedDates[0]
      
      updateFormData({
        selectedDates,
        cartServiceAmount: totalCost,
        isCustomTiming: true,
        timeSlotType: isMultiDay ? 'multi-day-24h' : 'custom',
        // Legacy fields for backward compatibility
        bookingDate: firstDate.date,
        startTime: firstDate.startTime,
        endTime: firstDate.endTime,

      })
      
      onNext()
    }
  }

  // Generate time options (24-hour format)
  const timeOptions = []
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const timeString = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
      timeOptions.push(timeString)
    }
  }

  // Calendar rendering function
  const renderCalendar = () => {
    const year = calendarView.getFullYear()
    const month = calendarView.getMonth()
    const daysInMonth = getDaysInMonth(calendarView)
    const firstDay = new Date(year, month, 1).getDay()
    const days = []
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(
        <div key={`empty-${i}`} className="h-[3.5vh] lg:h-[1.8vw]"></div>
      )
    }
    
    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = formatDateString(year, month, day)
      const isDisabled = isDateDisabled(dateStr)
      const isToday = new Date().toDateString() === new Date(dateStr).toDateString()
      
      const isSelected = selectedDates.some(d => d.date === dateStr)
      const availabilityStatus = getDateAvailabilityStatus(dateStr)
      let dateStyle = ''
      
      if (isSelected) {
        if (availabilityStatus === 'checking') {
          dateStyle = 'bg-yellow-500 text-white animate-pulse shadow-lg ring-2 ring-yellow-300'
        } else if (availabilityStatus === 'available') {
          dateStyle = 'bg-teal-500 text-white shadow-lg ring-2 ring-teal-300'
        } else if (availabilityStatus === 'unavailable' || availabilityStatus === 'conflict') {
          dateStyle = 'bg-red-500 text-white shadow-lg ring-2 ring-red-300'
        } else if (availabilityStatus === 'pending_times') {
          dateStyle = 'bg-blue-500 text-white shadow-lg ring-2 ring-blue-300' // Blue for waiting for times
        } else {
          dateStyle = 'bg-gray-500 text-white shadow-lg ring-2 ring-gray-300'
        }
      }
      
      if (!isSelected && !dateStyle) {
        if (isToday) {
          dateStyle = 'bg-teal-500/20 text-teal-400 border border-teal-500/50'
        } else if (isDisabled) {
          dateStyle = 'text-gray-600 cursor-not-allowed'
        } else {
          dateStyle = 'text-white hover:bg-slate-700 hover:text-teal-400'
        }
      }
      
      days.push(
        <button
          key={day}
          onClick={() => {
            if (!isDisabled) {
              toggleDate(dateStr)
            }
          }}
          disabled={isDisabled}
          className={`
            h-[3.5vh] lg:h-[1.8vw] rounded-lg text-[1.2vh] lg:text-[0.6vw] font-medium transition-all duration-200 relative
            ${dateStyle}
          `}
        >
          {day}
          {isSelected && (
            <div className={`absolute -top-1 -right-1 w-[1.2vh] lg:w-[0.6vw] h-[1.2vh] lg:h-[0.6vw] rounded-full flex items-center justify-center ${
              availabilityStatus === 'checking' ? 'bg-yellow-400 animate-pulse' :
              availabilityStatus === 'available' ? 'bg-green-400' :
              availabilityStatus === 'unavailable' || availabilityStatus === 'conflict' ? 'bg-red-400' :
              availabilityStatus === 'pending_times' ? 'bg-blue-400' :
              'bg-gray-400'
            }`}>
              {availabilityStatus === 'checking' ? (
                <div className="w-[0.6vh] lg:w-[0.3vw] h-[0.6vh] lg:h-[0.3vw] bg-white rounded-full animate-pulse"></div>
              ) : availabilityStatus === 'available' ? (
                <Check className="w-[0.8vh] lg:w-[0.4vw] h-[0.8vh] lg:h-[0.4vw] text-white" />
              ) : availabilityStatus === 'unavailable' || availabilityStatus === 'conflict' ? (
                <X className="w-[0.8vh] lg:w-[0.4vw] h-[0.8vh] lg:h-[0.4vw] text-white" />
              ) : availabilityStatus === 'pending_times' ? (
                <Clock className="w-[0.8vh] lg:w-[0.4vw] h-[0.8vh] lg:h-[0.4vw] text-white" />
              ) : (
                <div className="w-[0.6vh] lg:w-[0.3vw] h-[0.6vh] lg:h-[0.3vw] bg-white rounded-full"></div>
              )}
            </div>
          )}
        </button>
      )
    }
    
    return (
      <div className="bg-slate-800/60 backdrop-blur-sm rounded-lg border border-slate-600/50 p-[1.5vh] lg:p-[0.8vw]">
        {/* Calendar Header */}
        <div className="flex items-center justify-between mb-[1.5vh] lg:mb-[0.8vw]">
          <button
            onClick={() => setCalendarView(new Date(calendarView.getFullYear(), calendarView.getMonth() - 1, 1))}
            className="p-[0.8vh] lg:p-[0.4vw] hover:bg-slate-700 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-[2vh] h-[2vh] lg:w-[1vw] lg:h-[1vw] text-gray-400" />
          </button>
          
          <h3 className="text-white font-semibold text-[1.6vh] lg:text-[0.8vw]">
            {calendarView.toLocaleDateString(language === 'el' ? 'el-GR' : 'en-US', { 
              month: 'long', 
              year: 'numeric' 
            })}
          </h3>
          
          <button
            onClick={() => setCalendarView(new Date(calendarView.getFullYear(), calendarView.getMonth() + 1, 1))}
            className="p-[0.8vh] lg:p-[0.4vw] hover:bg-slate-700 rounded-lg transition-colors"
          >
            <ChevronRight className="w-[2vh] h-[2vh] lg:w-[1vw] lg:h-[1vw] text-gray-400" />
          </button>
        </div>
        
        {/* Day labels */}
        <div className="grid grid-cols-7 gap-[0.5vh] lg:gap-[0.25vw] mb-[1vh] lg:mb-[0.5vw]">
          {[t('day_sun'), t('day_mon'), t('day_tue'), t('day_wed'), t('day_thu'), t('day_fri'), t('day_sat')].map((day) => (
            <div key={day} className="text-center text-gray-400 text-[1vh] lg:text-[0.5vw] py-[0.5vh] lg:py-[0.25vw]">
              {day}
            </div>
          ))}
        </div>
        
        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-[0.5vh] lg:gap-[0.25vw]">
          {days}
        </div>

        {/* Availability Legend */}
        <div className="mt-[1.5vh] lg:mt-[0.8vw] pt-[1.5vh] lg:pt-[0.8vw] border-t border-slate-600/50">
          <h4 className="text-[1.2vh] lg:text-[0.6vw] text-gray-400 mb-[0.8vh] lg:mb-[0.4vw]">{t('availability_status')}:</h4>
          <div className="grid grid-cols-2 gap-[0.8vh] lg:gap-[0.4vw] text-[1vh] lg:text-[0.5vw]">
            <div className="flex items-center space-x-[0.5vh] lg:space-x-[0.25vw]">
              <div className="w-[1vh] lg:w-[0.5vw] h-[1vh] lg:h-[0.5vw] rounded-full bg-blue-400"></div>
              <span className="text-gray-300">{t('select_times')}</span>
            </div>
            <div className="flex items-center space-x-[0.5vh] lg:space-x-[0.25vw]">
              <div className="w-[1vh] lg:w-[0.5vw] h-[1vh] lg:h-[0.5vw] rounded-full bg-yellow-400"></div>
              <span className="text-gray-300">{t('checking_availability')}</span>
            </div>
            <div className="flex items-center space-x-[0.5vh] lg:space-x-[0.25vw]">
              <div className="w-[1vh] lg:w-[0.5vw] h-[1vh] lg:h-[0.5vw] rounded-full bg-green-400"></div>
              <span className="text-gray-300">{t('slot_available')}</span>
            </div>
            <div className="flex items-center space-x-[0.5vh] lg:space-x-[0.25vw]">
              <div className="w-[1vh] lg:w-[0.5vw] h-[1vh] lg:h-[0.5vw] rounded-full bg-red-400"></div>
              <span className="text-gray-300">{t('slot_unavailable')}</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (cartLoading) {
    return <TimingSkeleton />
  }

  if (cartError || !cartData) {
    return (
      <div className="text-center py-[8vh] lg:py-[4vw]">
        <AlertTriangle className="w-[8vh] h-[8vh] lg:w-[4vw] lg:h-[4vw] text-red-400 mx-auto mb-[2vh] lg:mb-[1vw]" />
                  <h3 className="text-[2.8vh] lg:text-[1.4vw] font-semibold text-white mb-[1vh] lg:mb-[0.5vw]">{t('error_loading_cart')}</h3>
        <p className="text-gray-400 text-[1.8vh] lg:text-[0.9vw]">{t('please_try_again_later')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-[3vh] lg:space-y-[1.5vw]">
      {/* Edit Mode Banner */}
      {/* {isEditMode && (
        <div className="bg-yellow-600/20 border border-yellow-600/40 rounded-lg p-[2vh] lg:p-[1vw] text-center">
          <p className="text-yellow-400 font-semibold text-[1.8vh] lg:text-[0.9vw]">
            ✏️ EDIT MODE - Modifying existing booking dates
          </p>
        </div>
      )} */}

      {/* Header */}
      <div className="text-center">
        <h2 className="text-[3.5vh] lg:text-[1.4vw] font-bold text-white mb-[1vh] lg:mb-[0.3vw]">
          {t('choose_date_time')}
        </h2>
        <p className="text-gray-400 text-[1.8vh] lg:text-[0.9vw]">{t('step_3_of_5')}</p>
        <p className="text-gray-300 text-[1.6vh] lg:text-[0.8vw] mt-[1vh] lg:mt-[0.5vw]">
          {selectedDates.length === 0 
            ? t('select_dates_for_booking')
            : selectedDates.length === 1
            ? t('single_day_booking_set_time_slots')
            : t('multi_day_booking_auto_24h_availability').replace('{count}', selectedDates.length.toString())
          }
        </p>
      </div>

      {/* Availability Status */}
      {selectedDates.length > 0 && (
        <div className="bg-slate-800/40 border border-slate-600/50 rounded-lg p-[1.5vh] lg:p-[0.8vw] mx-auto max-w-[120vh] lg:max-w-[60vw] text-center">
          {checkingAvailability ? (
            <div className="text-yellow-400 animate-pulse text-[1.3vh] lg:text-[0.65vw] font-medium">
              {t('verifying_availability')}
            </div>
          ) : (
            <div className="space-y-[0.5vh] lg:space-y-[0.25vw]">
              {isSingleDay ? (
                selectedDates[0]?.isAvailable === false ? (
                  <div className="text-red-400 text-[1.3vh] lg:text-[0.65vw] font-medium">
                    {t('time_slot_unavailable')}
                    {selectedDates[0]?.conflictingBooking && (
                      <div className="text-red-300 text-[1.1vh] lg:text-[0.55vw] mt-1 font-normal">
                        {t('time_conflict_message')}
                      </div>
                    )}
                  </div>
                ) : selectedDates[0]?.isAvailable === true ? (
                  <div className="text-green-400 text-[1.3vh] lg:text-[0.65vw] font-medium">
                    {t('time_slot_available')}
                  </div>
                ) : (
                  <div className="text-blue-400 text-[1.3vh] lg:text-[0.65vw] font-medium">
                    {t('configure_time_range')}
                  </div>
                )
              ) : (
                <div className="text-[1.2vh] lg:text-[0.6vw]">
                  {selectedDates.filter(d => d.isAvailable === true).length > 0 && (
                    <div className="text-green-400 mb-1 font-medium">
                      {t('dates_available_count').replace('{available}', selectedDates.filter(d => d.isAvailable === true).length.toString()).replace('{total}', selectedDates.length.toString())}
                    </div>
                  )}
                  {selectedDates.filter(d => d.isAvailable === false).length > 0 && (
                    <div className="text-red-400 font-medium">
                      {t('dates_unavailable_count').replace('{count}', selectedDates.filter(d => d.isAvailable === false).length.toString())}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Booking Type Info */}
      <div className="bg-gradient-to-r from-blue-900/20 to-teal-900/20 border border-blue-500/30 rounded-lg p-[1.5vh] lg:p-[0.8vw] mx-auto max-w-[120vh] lg:max-w-[60vw]">
        <div className="text-center space-y-[0.8vh] lg:space-y-[0.4vw]">
                  <h4 className="text-white font-semibold text-[1.4vh] lg:text-[0.7vw]">{t('booking_options')}</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-[1vh] lg:gap-[0.5vw] text-[1.1vh] lg:text-[0.55vw]">
          <div className="bg-slate-700/40 rounded-lg p-[1vh] lg:p-[0.5vw]">
            <div className="text-blue-400 font-medium mb-1">{t('single_day_booking')}</div>
            <div className="text-gray-300">{t('customize_specific_time_periods')}</div>
          </div>
          <div className="bg-slate-700/40 rounded-lg p-[1vh] lg:p-[0.5vw]">
            <div className="text-teal-400 font-medium mb-1">{t('multi_day_booking')}</div>
            <div className="text-gray-300">{t('full_24hour_access_extended_events')}</div>
          </div>
        </div>
        </div>
      </div>

      {/* Booking Summary */}
      {/* {selectedDates.length > 0 && (
        <div className="bg-slate-800/60 backdrop-blur-sm rounded-lg border border-slate-600/50 p-[2vh] lg:p-[1vw]">
          <div className="flex items-center justify-between mb-[1.5vh] lg:mb-[0.8vw]">
            <h3 className="text-white font-semibold text-[1.6vh] lg:text-[0.8vw]">
              {isSingleDay ? 'Selected Date & Time' : `Selected Dates (${selectedDates.length})`}
            </h3>
            <div className="text-teal-400 font-semibold text-[1.5vh] lg:text-[0.75vw]">
              Total: €{totalCost.toFixed(2)}
            </div>
          </div>
          
          {isSingleDay ? (
            <div className="bg-slate-700/50 rounded-lg p-[1.5vh] lg:p-[0.8vw]">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-[1vh] lg:gap-[0.5vw] text-center">
                <div>
                  <div className="text-teal-400 font-semibold text-[1.4vh] lg:text-[0.7vw]">
                    {new Date(selectedDates[0].date).toLocaleDateString()}
                  </div>
                  <div className="text-gray-400 text-[1vh] lg:text-[0.5vw]">{t('date')}</div>
                </div>
                <div>
                  <div className="text-teal-400 font-semibold text-[1.4vh] lg:text-[0.7vw]">
                    {selectedDates[0].startTime && selectedDates[0].endTime 
                      ? `${selectedDates[0].startTime} - ${selectedDates[0].endTime}`
                      : 'Set times below'
                    }
                  </div>
                  <div className="text-gray-400 text-[1vh] lg:text-[0.5vw]">{t('time')}</div>
                </div>
                <div>
                  <div className="text-teal-400 font-semibold text-[1.4vh] lg:text-[0.7vw]">
                    1 day
                  </div>
                  <div className="text-gray-400 text-[1vh] lg:text-[0.5vw]">{t('duration')}</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-[1vh] lg:space-y-[0.5vw]">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-[1vh] lg:gap-[0.5vw] text-center">
                <div className="bg-slate-700/50 rounded-lg p-[1vh] lg:p-[0.5vw]">
                  <div className="text-teal-400 font-semibold text-[1.4vh] lg:text-[0.7vw]">{selectedDates.length}</div>
                  <div className="text-gray-400 text-[1vh] lg:text-[0.5vw]">{t('days')}</div>
                </div>
                <div className="bg-slate-700/50 rounded-lg p-[1vh] lg:p-[0.5vw]">
                  <div className="text-teal-400 font-semibold text-[1.4vh] lg:text-[0.7vw]">24h</div>
                  <div className="text-gray-400 text-[1vh] lg:text-[0.5vw]">{t('per_day')}</div>
                </div>
                <div className="bg-slate-700/50 rounded-lg p-[1vh] lg:p-[0.5vw]">
                  <div className="text-teal-400 font-semibold text-[1.4vh] lg:text-[0.7vw]">€{totalCost.toFixed(2)}</div>
                  <div className="text-gray-400 text-[1vh] lg:text-[0.5vw]">{t('total_cost')}</div>
                </div>
                <div className="bg-slate-700/50 rounded-lg p-[1vh] lg:p-[0.5vw]">
                  <div className="text-teal-400 font-semibold text-[1.4vh] lg:text-[0.7vw]">00:00-23:59</div>
                  <div className="text-gray-400 text-[1vh] lg:text-[0.5vw]">{t('available')}</div>
                </div>
              </div>
              

            </div>
          )}
        </div>
      )} */}

      {/* Main Content - Calendar and Time Selection */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-[2vh] lg:gap-[1.5vw]">
        {/* Left Side - Calendar */}
        <div>
          <div className="flex items-center space-x-[1vh] lg:space-x-[0.5vw] mb-[1.5vh] lg:mb-[0.8vw]">
            <Calendar className="w-[2vh] h-[2vh] lg:w-[1vw] lg:h-[1vw] text-teal-400" />
            <h3 className="text-white font-semibold text-[1.8vh] lg:text-[0.9vw]">
              {selectedDates.length === 0 ? 'Select Dates' : `Selected: ${selectedDates.length} date${selectedDates.length !== 1 ? 's' : ''}`}
            </h3>
          </div>
          {renderCalendar()}
          <div className="mt-[1vh] lg:mt-[0.5vw] text-center">
            <p className="text-gray-400 text-[1vh] lg:text-[0.5vw]">
              {t('click_dates_instruction')}
            </p>
          </div>
        </div>

        {/* Right Side - Time Selection (Single Day Only) */}
        <div>
          {isSingleDay && currentSelectedDate ? (
            <div className="bg-slate-800/60 backdrop-blur-sm rounded-lg border border-slate-600/50 p-[2vh] lg:p-[1vw]">
              <div className="flex items-center space-x-[1vh] lg:space-x-[0.5vw] mb-[2vh] lg:mb-[1vw]">
                <Clock className="w-[2vh] h-[2vh] lg:w-[1vw] lg:h-[1vw] text-teal-400" />
                <h3 className="text-white font-semibold text-[1.6vh] lg:text-[0.8vw]">
                  {t('set_time_for')} {new Date(currentSelectedDate.date).toLocaleDateString()}
                </h3>
              </div>

              <div className="space-y-[2vh] lg:space-y-[1vw]">
                <div>
                  <label className="text-gray-300 text-[1.2vh] lg:text-[0.6vw] mb-[0.5vh] lg:mb-[0.25vw] block">{t('start_time')}</label>
                  <select
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full bg-slate-700 text-white rounded-lg border border-slate-600 px-[1vh] lg:px-[0.5vw] py-[0.8vh] lg:py-[0.4vw] text-[1.2vh] lg:text-[0.6vw]"
                  >
                    <option value="">{t('select_start_time')}</option>
                    {timeOptions.map((time) => (
                      <option key={time} value={time}>{time}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-gray-300 text-[1.2vh] lg:text-[0.6vw] mb-[0.5vh] lg:mb-[0.25vw] block">{t('end_time')}</label>
                  <select
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full bg-slate-700 text-white rounded-lg border border-slate-600 px-[1vh] lg:px-[0.5vw] py-[0.8vh] lg:py-[0.4vw] text-[1.2vh] lg:text-[0.6vw]"
                  >
                    <option value="">{t('select_end_time')}</option>
                    {timeOptions.map((time) => (
                      <option key={time} value={time}>{time}</option>
                    ))}
                  </select>
              </div>

                {startTime && endTime && (
                  <div className="bg-slate-700/50 rounded-lg p-[1.5vh] lg:p-[0.8vw]">
                    <div className="flex justify-between items-center">
                                <span className="text-gray-300 text-[1vh] lg:text-[0.5vw]">{t('duration')}:</span>
          <span className="text-teal-400 font-medium text-[1.2vh] lg:text-[0.6vw]">{t('one_day')}</span>
                    </div>
                    <div className="flex justify-between items-center mt-[0.5vh] lg:mt-[0.25vw]">
                      <span className="text-gray-300 text-[1vh] lg:text-[0.5vw]">{t('cost')}:</span>
                      <span className="text-teal-400 font-medium text-[1.2vh] lg:text-[0.6vw]">€{currentSelectedDate.cartCost.toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : isMultiDay ? (
            <div className="bg-gradient-to-br from-slate-800/80 to-slate-700/60 backdrop-blur-sm rounded-lg border border-slate-500/50 p-[2vh] lg:p-[1vw]">
              <div className="flex items-center justify-center space-x-[1vh] lg:space-x-[0.5vw] mb-[2vh] lg:mb-[1vw]">
                <Clock className="w-[2.5vh] h-[2.5vh] lg:w-[1.25vw] lg:h-[1.25vw] text-teal-400" />
                <h3 className="text-white font-semibold text-[1.6vh] lg:text-[0.8vw]">
                  {t('extended_access_period')}
                </h3>
                </div>
              
              <div className="text-center space-y-[1.5vh] lg:space-y-[0.75vw]">
                <div className="bg-teal-500/10 border border-teal-500/30 rounded-lg p-[1.5vh] lg:p-[0.75vw]">
                  <div className="inline-flex items-center justify-center w-[4vh] h-[4vh] lg:w-[2vw] lg:h-[2vw] bg-teal-500/20 rounded-full mb-[1vh] lg:mb-[0.5vw]">
                    <Check className="w-[2.5vh] h-[2.5vh] lg:w-[1.25vw] lg:h-[1.25vw] text-teal-400" />
                  </div>
                  <h4 className="text-teal-400 font-semibold text-[1.3vh] lg:text-[0.65vw] mb-[0.5vh] lg:mb-[0.25vw]">
                    {t('full_day_service_configuration')}
                  </h4>
                  <p className="text-gray-300 text-[1.1vh] lg:text-[0.55vw]">
                    {t('complete_24hour_access_auto_configured')}
                  </p>
                </div>
                
                <div className="bg-slate-700/40 rounded-lg p-[1.5vh] lg:p-[0.75vw]">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-[1vh] lg:gap-[0.5vw] text-[1.1vh] lg:text-[0.55vw]">
                    <div className="text-center">
                                  <div className="text-teal-400 font-medium">{t('service_period')}</div>
            <div className="text-gray-300">00:00 - 23:59</div>
          </div>
          <div className="text-center">
            <div className="text-teal-400 font-medium">{t('access_type')}</div>
            <div className="text-gray-300">{t('continuous')}</div>
          </div>
          <div className="text-center">
            <div className="text-teal-400 font-medium">{t('daily_rate')}</div>
            <div className="text-gray-300">{t('optimized')}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-800/60 backdrop-blur-sm rounded-lg border border-slate-600/50 p-[4vh] lg:p-[2vw] text-center">
              <Calendar className="w-[6vh] h-[6vh] lg:w-[3vw] lg:h-[3vw] text-gray-400 mx-auto mb-[1.5vh] lg:mb-[0.8vw]" />
              <h3 className="text-white font-semibold text-[1.6vh] lg:text-[0.8vw] mb-[0.8vh] lg:mb-[0.4vw]">
                {t('select_dates_first')}
              </h3>
              <p className="text-gray-400 text-[1.2vh] lg:text-[0.6vw]">
                {t('choose_dates_from_calendar')}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Continue Button */}
      <div className="flex justify-between pt-[2vh] lg:pt-[1vw]">
        <Button
          onClick={onPrevious}
          variant="outline"
          size="sm"
          className="px-[2vh] lg:px-[2vw] py-[0vh] lg:py-[0.6vw] text-[1.6vh] lg:text-[0.9vw] font-semibold"
        >
          {t('previous')}
        </Button>

        <div className="text-center">
        <Button
          onClick={handleNext}
            disabled={!isValid}
          size="sm"
          className="px-[2vh] lg:px-[2vw] py-[1.2vh] lg:py-[0.6vw] text-[1.4vh] lg:text-[0.9vw] font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
        >
            {selectedDates.length === 0 
              ? t('continue')
              : isSingleDay 
              ? `${t('continue')} (1 ${t('day')})`
              : `${t('continue')} (${selectedDates.length} ${t('days')}, 24h ${t('each')})`
            }
        </Button>
          {!isValid && (
            <p className="text-red-400 text-[1vh] lg:text-[0.5vw] mt-[0.5vh] lg:mt-[0.25vw]">
              {selectedDates.length === 0
                ? t('please_select_at_least_one_date')
                : isSingleDay 
                ? t('please_set_start_end_times')
                : t('multi_day_booking_ready_24h')
              }
            </p>
          )}
        </div>
      </div>
    </div>
  )
}