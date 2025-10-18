'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import Button from '../ui/Button'
import { BookingFormData, BookingStep } from '@/types/booking'
import { I18nProvider } from '@/lib/i18n/context'
import CartSelectionStep from '../booking/steps/CartSelectionStep'
import DynamicTimingStep from '../booking/steps/DynamicTimingStep'
import CustomerInfoStep from '../booking/steps/CustomerInfoStep'
import { useCreateBookingMutation } from '@/lib/api/bookingsApi'

interface AdminBookingModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

type AdminBookingStep = 'cart' | 'timing' | 'customer' | 'confirm'

function AdminBookingModalContent({ isOpen, onClose, onSuccess }: AdminBookingModalProps) {
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
    customerCountry: 'Greece'
  })

  const [createBooking, { isLoading }] = useCreateBookingMutation()

  const updateFormData = (data: Partial<BookingFormData>) => {
    setFormData(prev => ({ ...prev, ...data }))
  }

  const goToNextStep = () => {
    if (currentStep === 'cart') setCurrentStep('timing')
    else if (currentStep === 'timing') setCurrentStep('customer')
    else if (currentStep === 'customer') setCurrentStep('confirm')
  }

  const goToPreviousStep = () => {
    if (currentStep === 'timing') setCurrentStep('cart')
    else if (currentStep === 'customer') setCurrentStep('timing')
    else if (currentStep === 'confirm') setCurrentStep('customer')
  }

  const handleConfirmBooking = async () => {
    try {
      // Calculate totals
      const cartServiceAmount = formData.selectedDates?.reduce((sum, date) => sum + date.cartCost, 0) || 0
      const foodAmount = formData.selectedItems?.reduce((sum, item) => sum + (item.price * item.quantity), 0) || 0
      const servicesAmount = formData.selectedServices?.reduce((sum, service) => sum + ((service.pricePerHour || 0) * (service.hours || 0) * service.quantity), 0) || 0
      const totalAmount = cartServiceAmount + foodAmount + servicesAmount + (formData.shippingAmount || 0)

      const bookingPayload = {
        ...formData,
        selectedCartId: formData.selectedCartId || '',
        cartServiceAmount,
        foodAmount,
        servicesAmount,
        totalAmount,
        paymentMethod: 'reservation', // Admin bookings default to reservation
        paymentStatus: 'PENDING',
        // Legacy fields for backward compatibility
        bookingDate: formData.selectedDates?.[0]?.date || '',
        startTime: formData.selectedDates?.[0]?.startTime || '',
        endTime: formData.selectedDates?.[0]?.endTime || '',
        totalHours: formData.selectedDates?.[0]?.totalHours || 0
      } as BookingFormData

      await createBooking(bookingPayload).unwrap()
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
        customerCountry: 'Greece'
      })
      setCurrentStep('cart')
    } catch (error) {
      console.error('Failed to create booking:', error)
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
            <h2 className="text-[2.5vh] lg:text-[1.2vw] font-bold text-white">Create Booking (Admin)</h2>
            <p className="text-gray-400 text-[1.4vh] lg:text-[0.7vw] mt-[0.5vh] lg:mt-[0.25vw]">
              {currentStep === 'cart' && 'Step 1: Select Cart'}
              {currentStep === 'timing' && 'Step 2: Choose Dates & Times'}
              {currentStep === 'customer' && 'Step 3: Customer Information'}
              {currentStep === 'confirm' && 'Step 4: Confirm Booking'}
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
          <div className="animate-fadeIn">
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
                    {isLoading ? 'Creating...' : 'Create Booking'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}

export function AdminBookingModal(props: AdminBookingModalProps) {
  return (
    <I18nProvider>
      <AdminBookingModalContent {...props} />
    </I18nProvider>
  )
}

export default AdminBookingModal
