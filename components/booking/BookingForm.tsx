'use client'

import { useState } from 'react'
import { BookingFormData, BookingStep, BOOKING_STEPS } from '@/types/booking'
import StepIndicator from '@/components/ui/StepIndicator'
import OrderSummary from './OrderSummary'
import CartSelectionStep from './steps/CartSelectionStep'
import ExtrasStep from './steps/ExtrasStep'
import DynamicTimingStep from './steps/DynamicTimingStep'
import CustomerInfoStep from './steps/CustomerInfoStep'
import PaymentStep from './steps/PaymentStep'
import DeliveryStep from './steps/DeliveryStep'
import Skeleton from '@/components/ui/Skeleton'
import { I18nProvider, useI18n } from '@/lib/i18n/context'
import LanguageSwitcher from '@/components/ui/LanguageSwitcher'

function BookingFormContent() {
  const [currentStep, setCurrentStep] = useState<BookingStep>('cart-selection')
  const [completedSteps, setCompletedSteps] = useState<string[]>([])
  const { t, language } = useI18n()
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
    customerCountry: t('country_greece'),
    // Legacy fields for backward compatibility
    bookingDate: '',
    startTime: '',
    endTime: '',
    totalHours: 0
  })

  const updateFormData = (data: Partial<BookingFormData>) => {
    setFormData(prev => ({ ...prev, ...data }))
  }

  const goToNextStep = () => {
    const currentIndex = BOOKING_STEPS.findIndex(step => step.id === currentStep)
    if (currentIndex < BOOKING_STEPS.length - 1) {
      // Mark current step as completed
      if (!completedSteps.includes(currentStep)) {
        setCompletedSteps(prev => [...prev, currentStep])
      }
      
      // Move to next step
      const nextStep = BOOKING_STEPS[currentIndex + 1].id as BookingStep
      setCurrentStep(nextStep)
    }
  }

  const goToPreviousStep = () => {
    const currentIndex = BOOKING_STEPS.findIndex(step => step.id === currentStep)
    if (currentIndex > 0) {
      const previousStep = BOOKING_STEPS[currentIndex - 1].id as BookingStep
      setCurrentStep(previousStep)
    }
  }

  const goToStep = (stepId: BookingStep) => {
    setCurrentStep(stepId)
  }

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'cart-selection':
        return (
          <CartSelectionStep
            formData={formData}
            updateFormData={updateFormData}
            onNext={goToNextStep}
          />
        )
      case 'extras':
        return (
          <ExtrasStep
            formData={formData}
            updateFormData={updateFormData}
            onNext={goToNextStep}
            onPrevious={goToPreviousStep}
          />
        )
      case 'timing':
        return (
          <DynamicTimingStep
            formData={formData}
            updateFormData={updateFormData}
            onNext={goToNextStep}
            onPrevious={goToPreviousStep}
          />
        )
      case 'delivery':
        return (
          <DeliveryStep
            formData={formData}
            updateFormData={updateFormData}
            onNext={goToNextStep}
            onPrevious={goToPreviousStep}
          />
        )
      case 'customer-info':
        return (
          <CustomerInfoStep
            formData={formData}
            updateFormData={updateFormData}
            onNext={goToNextStep}
            onPrevious={goToPreviousStep}
          />
        )
      case 'payment':
        return (
          <PaymentStep
            formData={formData}
            updateFormData={updateFormData}
            onPrevious={goToPreviousStep}
            onComplete={() => {
              // Handle booking completion
              console.log('Booking completed:', formData)
            }}
          />
        )
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-black to-slate-900 opacity-50"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(20,184,166,0.1),transparent_70%)]"></div>
      
      <div className="relative z-10">
        {/* Language Switcher - Top Right */}
        <div className="absolute top-[2vh] right-[2vh] lg:top-[1.5vw] lg:right-[1.5vw] z-20">
          <LanguageSwitcher />
        </div>

        {/* Back Button */}
        <div className="absolute top-[2vh] left-[2vh] lg:top-[1.5vw] lg:left-[1.5vw] z-20">
        <a
          href="https://havana.gr"
          className="flex items-center space-x-[1vh] lg:space-x-[0.5vw] p-[1vh] lg:p-[0.5vw]  hover:bg-slate-700/80 transition-all duration-300 text-[1.8vh] lg:text-[0.9vw] border-2 border-white hover:border-slate-500/50 rounded-full"
        >
          <svg className="w-[2vh] h-[2vh] lg:w-[1.5vw] lg:h-[1.5vw] text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          {/* <span className="text-white font-medium">Back to Havana.gr</span> */}
        </a>
      </div>

      {/* Header with Logo */}
      <div className="text-center pt-[4vh] lg:pt-[1vw] pb-[2vh] lg:pb-[0.5vw]">
        <div className="flex justify-center mb-[3vh] lg:mb-[0.8vw]">
          <img 
            src="/logo.png" 
            alt="Havana Logo" 
            className="h-[8vh] w-[8vh] lg:h-[7vw] lg:w-[7vw] object-contain"
          />
        </div>
        <h1 className="text-[6vh] lg:text-[2.2vw] font-bold text-white mb-[1vh] lg:mb-[0.3vw] tracking-wider">
          {t('booking_title')}
        </h1>
        {/* <p className="text-red-500 text-[2vh] lg:text-[0.7vw] font-medium tracking-wide">
          {new Date().toLocaleDateString(language === 'el' ? 'el-GR' : 'en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric'
          }).toUpperCase()}
        </p> */}
      </div>

      {/* Main Content */}
      <div className="px-[2vh] lg:px-[1vw] pb-[4vh] lg:pb-[1vw]">
        <div className="max-w-[160vh] lg:max-w-[45vw] mx-auto relative">
          {/* Order Summary - Top Right (Desktop) */}
          <OrderSummary 
            formData={formData} 
            className="hidden lg:block absolute top-0 right-[-25vw] w-[22vw] z-10"
          />

          {/* Order Summary - Mobile */}
          <OrderSummary 
            formData={formData} 
            className="lg:hidden mb-[2vh]"
          />

          {/* Step Indicator */}
          <StepIndicator
            steps={[...BOOKING_STEPS]}
            currentStep={currentStep}
            completedSteps={completedSteps}
          />

          {/* Form Content */}
          <div className="backdrop-blur-sm shadow-2xl border border-slate-600/50 rounded-xl" style={{backgroundColor: '#22303d'}}>
            <div className="p-[3vh] lg:p-[1vw]">
              {renderCurrentStep()}
            </div>
          </div>
        </div>
      </div>
    </div>
    </div>
  )
}

export default function BookingForm() {
  return (
    <I18nProvider>
      <BookingFormContent />
    </I18nProvider>
  )
}