'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, CreditCard, Building2, BookmarkCheck } from 'lucide-react'
import Button from '../ui/Button'
import { BookingFormData, BookingStep } from '@/types/booking'
import { I18nProvider } from '@/lib/i18n/context'
import CartSelectionStep from '../booking/steps/CartSelectionStep'
import DynamicTimingStep from '../booking/steps/DynamicTimingStep'
import CustomerInfoStep from '../booking/steps/CustomerInfoStep'
import { useCreateBookingMutation, useUpdateBookingMutation } from '@/lib/api/bookingsApi'
import { clsx } from 'clsx'

interface AdminBookingModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  bookingToEdit?: any // Booking data for edit mode (date-only editing)
}

type AdminBookingStep = 'cart' | 'timing' | 'customer' | 'payment' | 'confirm'

function AdminBookingModalContent({ isOpen, onClose, onSuccess, bookingToEdit }: AdminBookingModalProps) {
  const isEditMode = !!bookingToEdit
  const [currentStep, setCurrentStep] = useState<AdminBookingStep>('cart')
  const [formData, setFormData] = useState<Partial<BookingFormData>>({
    selectedItems: [],
    selectedServices: [],
    selectedDates: [],
    totalAmount: 0,
    deliveryMethod: 'pickup',
    shippingAmount: 0,
    customerFirstName: '',
    customerLastName: '',
    customerEmail: '',
    customerPhone: '',
    customerAddress: '',
    customerCity: '',
    customerState: '',
    customerZip: '',
    customerCountry: 'Greece',
    paymentMethod: 'reservation',
    selectedBankId: undefined
  })

  const [createBooking, { isLoading: isCreating }] = useCreateBookingMutation()
  const [updateBooking, { isLoading: isUpdating }] = useUpdateBookingMutation()
  const isLoading = isCreating || isUpdating
  const [originalPaymentStatus, setOriginalPaymentStatus] = useState<string>('')
  const [isFetchingData, setIsFetchingData] = useState(false)

  // Fetch complete booking data for editing (full edit mode)
  useEffect(() => {
    if (bookingToEdit && isOpen) {
      setIsFetchingData(true)
      // Fetch complete booking data
      fetch(`/api/bookings/${bookingToEdit.id}`)
        .then(res => res.json())
        .then((fullBooking) => {
          // Transform bookingDates
          const transformedDates = (fullBooking.bookingDates || []).map((bd: any) => ({
            date: bd.date instanceof Date ? bd.date.toISOString().split('T')[0] : bd.date.split('T')[0],
            startTime: bd.startTime,
            endTime: bd.endTime,
            totalHours: bd.totalHours,
            cartCost: bd.cartCost,
            isAvailable: true
          }))

          // Transform bookingItems
          const transformedItems = (fullBooking.bookingItems || []).map((bi: any) => ({
            id: bi.foodItemId,
            name: bi.foodItem?.name || 'Unknown Item',
            price: bi.price,
            quantity: bi.quantity,
            category: bi.foodItem?.category || '',
            description: bi.foodItem?.description || ''
          }))

          // Transform bookingServices
          const transformedServices = (fullBooking.bookingServices || []).map((bs: any) => ({
            id: bs.serviceId,
            name: bs.service?.name || 'Unknown Service',
            pricePerHour: bs.pricePerHour,
            hours: bs.hours,
            quantity: bs.quantity,
            category: bs.service?.category || ''
          }))

          // Pre-fill ALL form data
          setFormData({
            selectedCartId: fullBooking.cartId || fullBooking.cart?.id,
            selectedDates: transformedDates,
            selectedItems: transformedItems,
            selectedServices: transformedServices,
            customerFirstName: fullBooking.customerFirstName || '',
            customerLastName: fullBooking.customerLastName || '',
            customerEmail: fullBooking.customerEmail || '',
            customerPhone: fullBooking.customerPhone || '',
            customerAddress: fullBooking.customerAddress || '',
            customerCity: fullBooking.customerCity || '',
            customerState: fullBooking.customerState || '',
            customerZip: fullBooking.customerZip || '',
            customerCountry: fullBooking.customerCountry || 'Greece',
            eventType: fullBooking.eventType || '',
            guestCount: fullBooking.guestCount || 0,
            specialNotes: fullBooking.specialNotes || '',
            paymentMethod: fullBooking.paymentMethod || 'reservation',
            selectedBankId: fullBooking.selectedBankId || undefined,
            deliveryMethod: fullBooking.deliveryMethod || 'pickup',
            totalAmount: fullBooking.totalAmount || 0,
            cartServiceAmount: fullBooking.cartServiceAmount || 0,
            foodAmount: fullBooking.foodAmount || 0,
            servicesAmount: fullBooking.servicesAmount || 0,
            shippingAmount: fullBooking.shippingAmount || 0
          })
          
          // Store original payment status for restriction check
          setOriginalPaymentStatus(fullBooking.paymentStatus || '')
          
          // Start at cart step in edit mode to allow full editing
          setCurrentStep('cart')
          setIsFetchingData(false)
        })
        .catch(error => {
          console.error('Error fetching booking data:', error)
          alert('Failed to load booking data for editing')
          setIsFetchingData(false)
        })
    } else if (!isEditMode) {
      // Reset to cart step for create mode
      setCurrentStep('cart')
      setOriginalPaymentStatus('')
      setIsFetchingData(false)
    }
  }, [bookingToEdit, isOpen, isEditMode])

  const updateFormData = (data: Partial<BookingFormData>) => {
    setFormData(prev => ({ ...prev, ...data }))
  }

  const goToNextStep = () => {
    if (currentStep === 'cart') setCurrentStep('timing')
    else if (currentStep === 'timing') setCurrentStep('customer')
    else if (currentStep === 'customer') setCurrentStep('payment')
    else if (currentStep === 'payment') setCurrentStep('confirm')
  }

  const goToPreviousStep = () => {
    if (currentStep === 'timing') setCurrentStep('cart')
    else if (currentStep === 'customer') setCurrentStep('timing')
    else if (currentStep === 'payment') setCurrentStep('customer')
    else if (currentStep === 'confirm') setCurrentStep('payment')
  }

  const handleConfirmBooking = async () => {
    try {
      // Calculate totals
      const cartServiceAmount = formData.selectedDates?.reduce((sum, date) => sum + date.cartCost, 0) || 0
      const foodAmount = formData.selectedItems?.reduce((sum, item) => sum + (item.price * item.quantity), 0) || 0
      const servicesAmount = formData.selectedServices?.reduce((sum, service) => sum + ((service.pricePerHour || 0) * (service.hours || 0) * service.quantity), 0) || 0
      const totalAmount = cartServiceAmount + foodAmount + servicesAmount + (formData.shippingAmount || 0)

      if (isEditMode && bookingToEdit) {
        // Edit mode: Update existing booking
        const updatePayload = {
          ...formData,
          selectedCartId: formData.selectedCartId || '',
          cartServiceAmount,
          foodAmount,
          servicesAmount,
          totalAmount,
          paymentMethod: formData.paymentMethod || 'reservation',
          selectedBankId: formData.selectedBankId,
          // Legacy fields for backward compatibility
          bookingDate: formData.selectedDates?.[0]?.date || '',
          startTime: formData.selectedDates?.[0]?.startTime || '',
          endTime: formData.selectedDates?.[0]?.endTime || '',
          totalHours: formData.selectedDates?.[0]?.totalHours || 0
        }

        await updateBooking({ id: bookingToEdit.id, data: updatePayload }).unwrap()
        alert('Booking updated successfully! Customer has been notified via email.')
        onSuccess()
        onClose()
      } else {
        // Create mode: Create new booking
        const bookingPayload = {
          ...formData,
          selectedCartId: formData.selectedCartId || '',
          cartServiceAmount,
          foodAmount,
          servicesAmount,
          totalAmount,
          paymentMethod: formData.paymentMethod || 'reservation',
          selectedBankId: formData.selectedBankId,
          paymentStatus: 'PENDING',
          isAdminCreated: true, // Flag to trigger special email
          // Legacy fields for backward compatibility
          bookingDate: formData.selectedDates?.[0]?.date || '',
          startTime: formData.selectedDates?.[0]?.startTime || '',
          endTime: formData.selectedDates?.[0]?.endTime || '',
          totalHours: formData.selectedDates?.[0]?.totalHours || 0
        } as BookingFormData & { isAdminCreated: boolean }

        await createBooking(bookingPayload).unwrap()
        alert('Booking created successfully! Customer has been notified via email.')
        onSuccess()
        
        // Reset form
        setFormData({
          selectedItems: [],
          selectedServices: [],
          selectedDates: [],
          totalAmount: 0,
          deliveryMethod: 'pickup',
          shippingAmount: 0,
          customerFirstName: '',
          customerLastName: '',
          customerEmail: '',
          customerPhone: '',
          customerAddress: '',
          customerCity: '',
          customerState: '',
          customerZip: '',
          customerCountry: 'Greece',
          paymentMethod: 'reservation',
          selectedBankId: undefined
        })
        setCurrentStep('cart')
        onClose()
      }
    } catch (error: any) {
      console.error(`Failed to ${isEditMode ? 'update' : 'create'} booking:`, error)
      
      // Show detailed error to user
      const errorMessage = error?.data?.details || error?.data?.error || error?.message || 'Unknown error'
      alert(`Failed to ${isEditMode ? 'update' : 'create'} booking: ${errorMessage}`)
    }
  }

  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  if (!isOpen || !mounted) return null

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-[2vh] lg:p-[1vw]" style={{ zIndex: 9999 }}>
      <div className="relative w-full max-w-[120vh] lg:max-w-[60vw] h-[75vh] bg-slate-900 rounded-lg shadow-2xl border border-slate-700 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-[3vh] lg:px-[1.5vw] py-[2vh] lg:py-[1vw] bg-slate-800 border-b border-slate-700">
          <div>
            <h2 className="text-[2.5vh] lg:text-[1.2vw] font-bold text-white">
              {isEditMode ? 'Edit Booking' : 'Create Booking (Admin)'}
            </h2>
            <p className="text-gray-400 text-[1.4vh] lg:text-[0.7vw] mt-[0.5vh] lg:mt-[0.25vw]">
              {currentStep === 'cart' && `Step 1: Select Cart${isEditMode ? ' (Editing)' : ''}`}
              {currentStep === 'timing' && `Step 2: Choose Dates & Times${isEditMode ? ' (Editing)' : ''}`}
              {currentStep === 'customer' && `Step 3: Customer Information${isEditMode ? ' (Editing)' : ''}`}
              {currentStep === 'payment' && `Step 4: Payment Method${isEditMode ? ' (Editing)' : ''}`}
              {currentStep === 'confirm' && `Step 5: ${isEditMode ? 'Confirm Changes' : 'Confirm Booking'}`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-[1vh] lg:p-[0.5vw] hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="w-[2.5vh] h-[2.5vh] lg:w-[1.2vw] lg:h-[1.2vw] text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-[3vh] lg:px-[1.5vw] py-[2vh] lg:py-[1vw] custom-scrollbar">
          {isFetchingData ? (
            <div className="flex flex-col items-center justify-center h-full space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
              <p className="text-gray-600 font-medium">Loading booking data...</p>
            </div>
          ) : (
            <div className="animate-fadeIn">
              {/* Both Edit and Create Mode: Show all steps */}
              {currentStep === 'cart' && (
              <CartSelectionStep
                formData={formData}
                updateFormData={updateFormData}
                onNext={goToNextStep}
              />
            )}

            {currentStep === 'timing' && (
              <DynamicTimingStep
                formData={formData}
                updateFormData={updateFormData}
                onNext={goToNextStep}
                onPrevious={goToPreviousStep}
                isEditMode={isEditMode}
                bookingId={isEditMode ? bookingToEdit?.id : undefined}
              />
            )}

            {currentStep === 'customer' && (
              <CustomerInfoStep
                formData={formData}
                updateFormData={updateFormData}
                onNext={goToNextStep}
                onPrevious={goToPreviousStep}
              />
            )}

            {currentStep === 'payment' && (
              <AdminPaymentSelection
                formData={formData}
                updateFormData={updateFormData}
                onNext={goToNextStep}
                onPrevious={goToPreviousStep}
                isPaid={originalPaymentStatus === 'PAID'}
              />
            )}

            {currentStep === 'confirm' && (
              <div className="space-y-[2vh] lg:space-y-[1vw]">
                <div className="text-center">
                  <h3 className="text-[3vh] lg:text-[1.5vw] font-bold text-white mb-[1vh] lg:mb-[0.5vw]">
                    Confirm Booking
                  </h3>
                  <p className="text-gray-400 text-[1.6vh] lg:text-[0.8vw]">
                    Review the details before creating the booking
                  </p>
                </div>

                <div className="bg-slate-800 rounded-lg p-[2vh] lg:p-[1vw] border border-slate-700 space-y-[1.5vh] lg:space-y-[0.75vw]">
                  <div className="grid grid-cols-2 gap-[1vh] lg:gap-[0.5vw] text-[1.4vh] lg:text-[0.7vw]">
                    <div>
                      <span className="text-gray-400">Customer:</span>
                      <p className="text-white font-medium">{formData.customerFirstName} {formData.customerLastName}</p>
                    </div>
                    <div>
                      <span className="text-gray-400">Email:</span>
                      <p className="text-white font-medium">{formData.customerEmail}</p>
                    </div>
                    <div>
                      <span className="text-gray-400">Phone:</span>
                      <p className="text-white font-medium">{formData.customerPhone}</p>
                    </div>
                    <div>
                      <span className="text-gray-400">Event Type:</span>
                      <p className="text-white font-medium capitalize">{formData.eventType}</p>
                    </div>
                    <div>
                      <span className="text-gray-400">Dates Selected:</span>
                      <p className="text-white font-medium">{formData.selectedDates?.length || 0} day(s)</p>
                    </div>
                    <div>
                      <span className="text-gray-400">Total Cost:</span>
                      <p className="text-teal-400 font-bold text-[1.8vh] lg:text-[0.9vw]">
                        €{((formData.selectedDates?.reduce((sum, date) => sum + date.cartCost, 0) || 0) + 
                           (formData.selectedItems?.reduce((sum, item) => sum + (item.price * item.quantity), 0) || 0) +
                           (formData.selectedServices?.reduce((sum, service) => sum + ((service.pricePerHour || 0) * (service.hours || 0) * service.quantity), 0) || 0)).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between pt-[2vh] lg:pt-[1vw]">
                  <Button
                    variant="outline"
                    onClick={goToPreviousStep}
                    size="md"
                    className="px-[3vh] lg:px-[1.5vw]"
                  >
                    Previous
                  </Button>
                  <Button
                    onClick={handleConfirmBooking}
                    disabled={isLoading}
                    size="md"
                    className="px-[3vh] lg:px-[1.5vw] bg-teal-600 hover:bg-teal-700"
                  >
                    {isLoading ? (isEditMode ? 'Updating...' : 'Creating...') : (isEditMode ? 'Update Booking' : 'Create Booking')}
                  </Button>
                </div>
              </div>
            )}
            </div>
          )}
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}

// Admin Payment Selection Component
interface AdminPaymentSelectionProps {
  formData: Partial<BookingFormData>
  updateFormData: (data: Partial<BookingFormData>) => void
  onNext: () => void
  onPrevious: () => void
  isPaid?: boolean // If true, payment method cannot be changed
}

function AdminPaymentSelection({ formData, updateFormData, onNext, onPrevious, isPaid = false }: AdminPaymentSelectionProps) {
  const [bankConfigs, setBankConfigs] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const selectedPaymentMethod = formData.paymentMethod || 'reservation'
  const selectedBankId = formData.selectedBankId

  useEffect(() => {
    // Fetch bank configs when component mounts or when bank_transfer is selected
    if (selectedPaymentMethod === 'bank_transfer') {
      fetchBankConfigs()
    }
  }, [selectedPaymentMethod])

  const fetchBankConfigs = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/bank-config')
      const data = await response.json()
      if (data.success) {
        const activeBanks = data.bankConfigs?.filter((bank: any) => bank.isActive) || []
        setBankConfigs(activeBanks)
        // Auto-select first bank if only one available
        if (activeBanks.length === 1 && !selectedBankId) {
          updateFormData({ selectedBankId: activeBanks[0].id })
        }
      }
    } catch (error) {
      console.error('Error fetching bank configs:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePaymentMethodChange = (method: string) => {
    updateFormData({ paymentMethod: method, selectedBankId: undefined })
  }

  const handleNext = () => {
    // Validate: if bank_transfer selected, must have bank selected
    if (selectedPaymentMethod === 'bank_transfer' && !selectedBankId) {
      alert('Please select a bank for bank transfer')
      return
    }
    onNext()
  }

  return (
    <div className="space-y-[3vh] lg:space-y-[1.5vw]">
      <div className="text-center">
        <h3 className="text-[3vh] lg:text-[1.5vw] font-bold text-white mb-[1vh] lg:mb-[0.5vw]">
          Select Payment Method
        </h3>
        <p className="text-gray-400 text-[1.6vh] lg:text-[0.8vw]">
          Choose how the customer will pay for this booking
        </p>
        {isPaid && (
          <div className="mt-[2vh] lg:mt-[1vw] bg-yellow-500/20 border border-yellow-500 rounded-lg p-[2vh] lg:p-[1vw]">
            <p className="text-yellow-400 text-[1.4vh] lg:text-[0.7vw] font-semibold">
              Payment already completed. Payment method cannot be changed.
            </p>
            <p className="text-yellow-300 text-[1.2vh] lg:text-[0.6vw] mt-[0.5vh] lg:mt-[0.25vw]">
              You can still update bank selection for bank transfers.
            </p>
          </div>
        )}
      </div>

      {/* Payment Method Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-[2vh] lg:gap-[1vw] mb-[3vh] lg:mb-[1.5vw]">
        {/* Reservation Option */}
        <button
          onClick={() => !isPaid && handlePaymentMethodChange('reservation')}
          disabled={isPaid}
          className={clsx(
            'p-[2vh] lg:p-[1vw] rounded-lg border-2 transition-all duration-300 text-center',
            selectedPaymentMethod === 'reservation'
              ? 'border-orange-500 bg-orange-500/20 text-white'
              : 'border-slate-600 bg-slate-700 text-gray-300 hover:border-slate-500',
            isPaid && 'opacity-50 cursor-not-allowed'
          )}
        >
          <BookmarkCheck className="w-[3vh] h-[3vh] lg:w-[1.5vw] lg:h-[1.5vw] mx-auto mb-[1vh] lg:mb-[0.5vw] text-orange-400" />
          <h4 className="text-[1.6vh] lg:text-[0.8vw] font-semibold mb-[0.5vh] lg:mb-[0.25vw]">Reservation</h4>
          <p className="text-[1.2vh] lg:text-[0.6vw] text-gray-400">Customer confirms, pays later</p>
        </button>

        {/* Bank Transfer Option */}
        <button
          onClick={() => !isPaid && handlePaymentMethodChange('bank_transfer')}
          disabled={isPaid}
          className={clsx(
            'p-[2vh] lg:p-[1vw] rounded-lg border-2 transition-all duration-300 text-center',
            selectedPaymentMethod === 'bank_transfer'
              ? 'border-green-500 bg-green-500/20 text-white'
              : 'border-slate-600 bg-slate-700 text-gray-300 hover:border-slate-500',
            isPaid && 'opacity-50 cursor-not-allowed'
          )}
        >
          <Building2 className="w-[3vh] h-[3vh] lg:w-[1.5vw] lg:h-[1.5vw] mx-auto mb-[1vh] lg:mb-[0.5vw] text-green-400" />
          <h4 className="text-[1.6vh] lg:text-[0.8vw] font-semibold mb-[0.5vh] lg:mb-[0.25vw]">Bank Transfer</h4>
          <p className="text-[1.2vh] lg:text-[0.6vw] text-gray-400">Customer uploads payment proof</p>
        </button>

        {/* PayPal Option */}
        <button
          onClick={() => !isPaid && handlePaymentMethodChange('paypal')}
          disabled={isPaid}
          className={clsx(
            'p-[2vh] lg:p-[1vw] rounded-lg border-2 transition-all duration-300 text-center',
            selectedPaymentMethod === 'paypal'
              ? 'border-blue-500 bg-blue-500/20 text-white'
              : 'border-slate-600 bg-slate-700 text-gray-300 hover:border-slate-500',
            isPaid && 'opacity-50 cursor-not-allowed'
          )}
        >
          <CreditCard className="w-[3vh] h-[3vh] lg:w-[1.5vw] lg:h-[1.5vw] mx-auto mb-[1vh] lg:mb-[0.5vw] text-blue-400" />
          <h4 className="text-[1.6vh] lg:text-[0.8vw] font-semibold mb-[0.5vh] lg:mb-[0.25vw]">PayPal</h4>
          <p className="text-[1.2vh] lg:text-[0.6vw] text-gray-400">Customer pays via PayPal</p>
        </button>
      </div>

      {/* Bank Selection (only show if bank_transfer selected) */}
      {selectedPaymentMethod === 'bank_transfer' && (
        <div className="bg-slate-800 rounded-lg p-[2vh] lg:p-[1vw] border border-slate-700">
          <h4 className="text-[1.8vh] lg:text-[0.9vw] font-semibold text-white mb-[1.5vh] lg:mb-[0.75vw]">
            Select Bank Account
          </h4>
          {loading ? (
            <div className="text-gray-400 text-center py-[2vh] lg:py-[1vw]">Loading banks...</div>
          ) : bankConfigs.length > 0 ? (
            <div className="space-y-[1vh] lg:space-y-[0.5vw]">
              {bankConfigs.map((bank) => (
                <label
                  key={bank.id}
                  className={clsx(
                    'flex items-center p-[1.5vh] lg:p-[0.75vw] rounded-lg border-2 cursor-pointer transition-all duration-300',
                    selectedBankId === bank.id
                      ? 'border-green-500 bg-green-500/10'
                      : 'border-slate-600 bg-slate-700/50 hover:border-slate-500'
                  )}
                >
                  <input
                    type="radio"
                    name="selectedBank"
                    value={bank.id}
                    checked={selectedBankId === bank.id}
                    onChange={() => updateFormData({ selectedBankId: bank.id })}
                    className="mr-[1vh] lg:mr-[0.5vw] w-[2vh] h-[2vh] lg:w-[1vw] lg:h-[1vw]"
                  />
                  <div className="flex-1">
                    <div className="text-[1.4vh] lg:text-[0.7vw] font-medium text-white">
                      {bank.bankName}
                    </div>
                    <div className="text-[1.2vh] lg:text-[0.6vw] text-gray-400">
                      {bank.accountHolder} • {bank.iban.slice(-4)}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          ) : (
            <div className="text-red-400 text-center py-[2vh] lg:py-[1vw] text-[1.4vh] lg:text-[0.7vw]">
              No active bank accounts configured. Please add one in bank settings.
            </div>
          )}
        </div>
      )}

      {/* Information Box */}
      <div className="bg-blue-600/10 border border-blue-600/30 rounded-lg p-[2vh] lg:p-[1vw]">
        <h4 className="text-[1.6vh] lg:text-[0.8vw] font-semibold text-blue-400 mb-[1vh] lg:mb-[0.5vw]">
          📧 Customer will receive an email
        </h4>
        <p className="text-[1.3vh] lg:text-[0.65vw] text-gray-300">
          {selectedPaymentMethod === 'reservation' && 'The customer will receive an email with a confirmation button to accept or decline the booking.'}
          {selectedPaymentMethod === 'bank_transfer' && 'The customer will receive bank details via email and can upload payment proof.'}
          {selectedPaymentMethod === 'paypal' && 'The customer will receive an email with a PayPal payment button to complete the booking.'}
        </p>
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between pt-[2vh] lg:pt-[1vw]">
        <Button
          variant="outline"
          onClick={onPrevious}
          size="md"
          className="px-[3vh] lg:px-[1.5vw]"
        >
          Previous
        </Button>
        <Button
          onClick={handleNext}
          size="md"
          className="px-[3vh] lg:px-[1.5vw] bg-teal-600 hover:bg-teal-700"
        >
          Next
        </Button>
      </div>
    </div>
  )
}

export function AdminBookingModal(props: AdminBookingModalProps) {
  return (
    <I18nProvider>
      <AdminBookingModalContent {...props} />
    </I18nProvider>
  )
}

export default AdminBookingModal
