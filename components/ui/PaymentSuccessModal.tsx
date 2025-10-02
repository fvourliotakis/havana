'use client'

import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { CheckCircle, X, Calendar, CreditCard, Users, FileText, ExternalLink } from 'lucide-react'
import Button from './Button'
import { useI18n } from '../../lib/i18n/context'

interface PaymentSuccessModalProps {
  isOpen: boolean
  onClose: () => void
  bookingData: {
    id: string
    totalAmount: number
    paymentMethod: 'bank_transfer' | 'reservation' | 'paypal'
    customerEmail: string
    customerName?: string
    eventDate?: string
    guestCount?: number
    cartName?: string
  }
  onNavigateToWebsite: () => void
}

export default function PaymentSuccessModal({
  isOpen,
  onClose,
  bookingData,
  onNavigateToWebsite
}: PaymentSuccessModalProps) {
  const { t } = useI18n()

  // Handle close with navigation
  const handleClose = () => {
    onClose()
    onNavigateToWebsite()
  }

  // Auto-close after 30 seconds
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        handleClose()
      }, 30000)
      return () => clearTimeout(timer)
    }
  }, [isOpen])

  if (!isOpen) return null

  // FIXED: Render modal using portal to ensure it appears at the root level
  if (typeof document === 'undefined') return null

  const getPaymentMethodIcon = () => {
    switch (bookingData.paymentMethod) {
      case 'bank_transfer':
        return <CreditCard className="w-8 h-8 text-blue-400" />
      case 'reservation':
        return <Calendar className="w-8 h-8 text-purple-400" />
      case 'paypal':
        return <CreditCard className="w-8 h-8 text-yellow-400" />
      default:
        return <CreditCard className="w-8 h-8 text-gray-400" />
    }
  }

  const getPaymentMethodText = () => {
    switch (bookingData.paymentMethod) {
      case 'bank_transfer':
        return t('payment_method_bank_transfer')
      case 'reservation':
        return t('payment_method_reservation')
      case 'paypal':
        return t('payment_method_paypal')
      default:
        return t('payment_method_unknown')
    }
  }

  const getSuccessTitle = () => {
    switch (bookingData.paymentMethod) {
      case 'bank_transfer':
        return t('bank_transfer_success_title')
      case 'reservation':
        return t('reservation_success_title')
      case 'paypal':
        return t('paypal_success_title')
      default:
        return t('payment_success_title')
    }
  }

  const getSuccessMessage = () => {
    switch (bookingData.paymentMethod) {
      case 'bank_transfer':
        return t('bank_transfer_success_message')
      case 'reservation':
        return t('reservation_success_message')
      case 'paypal':
        return t('paypal_success_message')
      default:
        return t('payment_success_message')
    }
  }

  const modalContent = (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
      <div className="relative bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl border border-slate-600/50 shadow-2xl max-w-lg w-full mx-4 overflow-hidden transform scale-100">
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors z-10"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Header with animation */}
        <div className="text-center py-8 px-6 bg-gradient-to-r from-green-600/20 to-teal-600/20 border-b border-slate-600/30">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-500/20 rounded-full mb-4 animate-pulse">
            <CheckCircle className="w-10 h-10 text-green-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">
            {getSuccessTitle()}
          </h2>
          <p className="text-gray-300 text-sm">
            {getSuccessMessage()}
          </p>
        </div>

        {/* Booking details */}
        <div className="p-6 space-y-4">
          {/* Booking ID */}
          <div className="bg-slate-700/50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-sm">{t('booking_id')}:</span>
              <span className="text-white font-mono text-sm">{bookingData.id}</span>
            </div>
          </div>

          {/* Payment details */}
          <div className="bg-slate-700/50 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-sm">{t('payment_method')}:</span>
              <div className="flex items-center space-x-2">
                {getPaymentMethodIcon()}
                <span className="text-white text-sm">{getPaymentMethodText()}</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-sm">{t('total_amount')}:</span>
              <span className="text-white font-bold text-lg">€{bookingData.totalAmount.toFixed(2)}</span>
            </div>
          </div>

          {/* Event details */}
          {(bookingData.eventDate || bookingData.guestCount || bookingData.cartName) && (
            <div className="bg-slate-700/50 rounded-lg p-4 space-y-3">
              {bookingData.cartName && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-sm">{t('selected_cart')}:</span>
                  <span className="text-white text-sm">{bookingData.cartName}</span>
                </div>
              )}
              
              {bookingData.eventDate && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-sm">{t('event_date')}:</span>
                  <span className="text-white text-sm">{bookingData.eventDate}</span>
                </div>
              )}
              
              {bookingData.guestCount && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-sm">{t('guests')}:</span>
                  <span className="text-white text-sm">{bookingData.guestCount}</span>
                </div>
              )}
            </div>
          )}

          {/* Email confirmation */}
          <div className="bg-blue-600/20 border border-blue-500/30 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <FileText className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-blue-200 text-sm font-medium">
                  {t('confirmation_email_sent')}
                </p>
                <p className="text-blue-300 text-xs mt-1">
                  {bookingData.customerEmail}
                </p>
                <p className="text-blue-300 text-xs mt-1">
                  Please check your spam folder if you don't receive the email.
                </p>
              </div>
            </div>
          </div>

          {/* Next steps for bank transfer */}
          {bookingData.paymentMethod === 'bank_transfer' && (
            <div className="bg-yellow-600/20 border border-yellow-500/30 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <CreditCard className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-yellow-200 text-sm font-medium">
                    {t('bank_transfer_next_steps')}
                  </p>
                  <p className="text-yellow-300 text-xs mt-1">
                    {t('admin_will_verify_payment')}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="p-6 pt-0 flex flex-col sm:flex-row gap-3">
          <Button
            onClick={onNavigateToWebsite}
            className="flex-1 bg-gradient-to-r from-teal-600 to-blue-600 hover:from-teal-500 hover:to-blue-500 text-white flex items-center justify-center space-x-2"
          >
            <ExternalLink className="w-4 h-4" />
            <span>{t('visit_website')}</span>
          </Button>
          
          <Button
            onClick={handleClose}
            variant="outline"
            className="flex-1 border-gray-600 text-gray-300 hover:bg-slate-700"
          >
            {t('close')}
          </Button>
        </div>

        {/* Auto-close timer */}
        <div className="px-6 pb-4">
          <p className="text-xs text-gray-500 text-center">
            {t('auto_redirect_message')}
          </p>
        </div>
      </div>
    </div>
  )

  // FIXED: Use createPortal to render at document.body level
  return createPortal(modalContent, document.body)
}