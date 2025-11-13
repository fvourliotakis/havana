'use client'

import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js'
import { CheckCircle, XCircle, Building2, CreditCard, Calendar, Users, MapPin, Loader2 } from 'lucide-react'
import Button from '@/components/ui/Button'

export default function BookingConfirmPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const bookingId = params.id as string
  const token = searchParams.get('token')
  const action = searchParams.get('action') // 'confirm' | 'cancel' | 'pay'
  
  const [booking, setBooking] = useState<any>(null)
  const [bankDetails, setBankDetails] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [processing, setProcessing] = useState(false)
  const [success, setSuccess] = useState(false)
  const [message, setMessage] = useState('')

  // Form state for actions
  const [cancellationReason, setCancellationReason] = useState('')
  const [paymentSlipUrl, setPaymentSlipUrl] = useState('')

  // PayPal configuration
  const PAYPAL_CLIENT_ID = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || 'AaAvl-glJBrSlcZRjsc14h8MTLK03fxDnhTQlE1_gW-TrMyFbmsHB3d3JBQP3j411BVIju9nK8zcn3hA'
  const paypalOptions = {
    clientId: PAYPAL_CLIENT_ID,
    currency: 'EUR',
    intent: 'capture'
  }

  const fetchBookingDetails = () => {
    if (!token || !bookingId) {
      setError('Invalid confirmation link')
      setLoading(false)
      return
    }

    setLoading(true)
    // Verify token and fetch booking
    fetch(`/api/bookings/${bookingId}/verify?token=${token}`)
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          setError(data.error)
        } else {
          setBooking(data.booking)
          setBankDetails(data.bankDetails)
        }
        setLoading(false)
      })
      .catch(err => {
        console.error('Error verifying booking:', err)
        setError('Failed to load booking details')
        setLoading(false)
      })
  }

  useEffect(() => {
    fetchBookingDetails()
  }, [bookingId, token])

  const handleAction = async (actionType: string, actionData: any = {}) => {
    setProcessing(true)
    setError('')

    try {
      const response = await fetch(`/api/bookings/${bookingId}/action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: actionType,
          token,
          data: actionData
        })
      })

      const result = await response.json()

      if (!response.ok) {
        // Check if this is an "already processed" error (not really an error from user perspective)
        if (result.alreadyProcessed || result.requiresSupport) {
          setError(result.error || 'Failed to process action')
        } else {
          throw new Error(result.error || 'Failed to process action')
        }
        return
      }

      setSuccess(true)
      setMessage(result.message)
      
      // Reload booking data to reflect the new status
      fetchBookingDetails()
    } catch (err: any) {
      setError(err.message || 'Failed to process action')
    } finally {
      setProcessing(false)
    }
  }

  const validateUrl = (url: string) => {
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  }

  // Create PayPal order
  const createPayPalOrder = async () => {
    try {
      const response = await fetch('/api/paypal/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: booking.totalAmount.toFixed(2),
          currency: 'EUR',
          description: `Booking #${booking.id}`
        })
      })

      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create PayPal order')
      }

      return data.orderID
    } catch (error) {
      console.error('Create order error:', error)
      throw error
    }
  }

  // Capture PayPal payment
  const onPayPalApprove = async (data: any) => {
    setProcessing(true)
    try {
      const captureResponse = await fetch('/api/paypal/capture-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderID: data.orderID
        })
      })

      const captureData = await captureResponse.json()
      
      if (!captureResponse.ok) {
        throw new Error(captureData.error || 'Failed to capture payment')
      }

      if (captureData.success) {
        setSuccess(true)
        setMessage('Payment completed successfully! Your booking is confirmed.')
      } else {
        throw new Error('Payment failed')
      }
    } catch (error: any) {
      setError(error.message || 'Payment failed')
    } finally {
      setProcessing(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-16 h-16 text-teal-400 animate-spin mx-auto mb-4" />
          <p className="text-white text-lg">Loading booking details...</p>
        </div>
      </div>
    )
  }

  if (error && !booking) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-800 rounded-lg p-8 text-center border border-red-500">
          <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Error</h1>
          <p className="text-gray-300 mb-6">{error}</p>
          <Button
            onClick={() => window.location.href = 'https://havana.gr/'}
            className="bg-teal-600 hover:bg-teal-700"
          >
            Go to Homepage
          </Button>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-800 rounded-lg p-8 text-center border border-green-500">
          <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Success!</h1>
          <p className="text-gray-300 mb-6">{message}</p>
          <p className="text-gray-400 text-sm mb-6">
            You will receive a confirmation email shortly.
          </p>
          <Button
            onClick={() => window.location.href = 'https://havana.gr/'}
            className="bg-teal-600 hover:bg-teal-700"
          >
            Go to Homepage
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-600 to-cyan-600 rounded-lg p-6 mb-6 text-white">
          <h1 className="text-3xl font-bold mb-2">Booking Confirmation</h1>
          <p className="text-teal-100">Booking #{booking.id}</p>
        </div>

        {/* Booking Summary */}
        <div className="bg-slate-800 rounded-lg p-6 mb-6 border border-slate-700">
          <h2 className="text-xl font-bold text-white mb-4">Booking Details</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <Calendar className="w-5 h-5 text-teal-400 mt-1" />
                <div>
                  <p className="text-gray-400 text-sm">Cart & Location</p>
                  <p className="text-white font-medium">{booking.cart?.name}</p>
                  <p className="text-gray-300 text-sm">{booking.cart?.location}</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <Users className="w-5 h-5 text-teal-400 mt-1" />
                <div>
                  <p className="text-gray-400 text-sm">Event Details</p>
                  <p className="text-white font-medium">{booking.guestCount} guests • {booking.eventType}</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <MapPin className="w-5 h-5 text-teal-400 mt-1" />
                <div>
                  <p className="text-gray-400 text-sm">Customer</p>
                  <p className="text-white font-medium">
                    {booking.customerFirstName} {booking.customerLastName}
                  </p>
                  <p className="text-gray-300 text-sm">{booking.customerEmail}</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-gray-400 text-sm mb-2">Booking Dates</p>
                {booking.bookingDates && booking.bookingDates.length > 0 ? (
                  <div className="space-y-1">
                    {booking.bookingDates.map((date: any, index: number) => (
                      <div key={index} className="text-white text-sm bg-slate-700 px-3 py-2 rounded">
                        {new Date(date.date).toLocaleDateString()} • {date.startTime} - {date.endTime}
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="bg-teal-600/20 border border-teal-600/50 rounded px-4 py-3">
                <p className="text-gray-400 text-sm">Total Amount</p>
                <p className="text-2xl font-bold text-teal-400">€{booking.totalAmount.toFixed(2)}</p>
                <p className="text-teal-300 text-sm">Payment: {booking.paymentMethod}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Section */}
        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
          {action === 'confirm' && (
            <div>
              <h2 className="text-2xl font-bold text-white mb-4">Confirm Your Booking</h2>
              <p className="text-gray-300 mb-6">
                Please confirm that you accept this booking. Once confirmed, you will receive a confirmation email.
              </p>
              {error && (
                <div className="bg-red-500/20 border border-red-500 rounded p-4 mb-4">
                  <p className="text-red-300">{error}</p>
                </div>
              )}
              <div className="flex gap-4">
                <Button
                  onClick={() => handleAction('confirm')}
                  disabled={processing}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white py-4 text-lg"
                >
                  {processing ? 'Confirming...' : 'Confirm Booking'}
                </Button>
                <Button
                  onClick={() => window.location.href = `${window.location.pathname}?token=${token}&action=cancel`}
                  variant="outline"
                  className="px-6"
                >
                  Cancel Instead
                </Button>
              </div>
            </div>
          )}

          {action === 'cancel' && (
            <div>
              <h2 className="text-2xl font-bold text-white mb-4">Cancel Booking</h2>
              <p className="text-gray-300 mb-4">
                Are you sure you want to cancel this booking? This action cannot be undone.
              </p>
              <textarea
                placeholder="Reason for cancellation (optional)"
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                className="w-full p-3 bg-slate-700 border border-slate-600 rounded text-white placeholder-gray-400 mb-4"
                rows={3}
              />
              {error && (
                <div className="bg-red-500/20 border border-red-500 rounded p-4 mb-4">
                  <p className="text-red-300">{error}</p>
                </div>
              )}
              <div className="flex gap-4">
                <Button
                  onClick={() => handleAction('cancel', { reason: cancellationReason })}
                  disabled={processing}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white py-4 text-lg"
                >
                  {processing ? 'Cancelling...' : 'Cancel Booking'}
                </Button>
                <Button
                  onClick={() => window.location.href = `${window.location.pathname}?token=${token}&action=confirm`}
                  variant="outline"
                  className="px-6"
                >
                  Keep Booking
                </Button>
              </div>
            </div>
          )}

          {action === 'pay' && booking.paymentMethod === 'bank_transfer' && (
            <div>
              <h2 className="text-2xl font-bold text-white mb-4">Submit Payment Proof</h2>
              
              {bankDetails && (
                <div className="bg-green-600/10 border border-green-600/30 rounded-lg p-6 mb-6">
                  <h3 className="text-lg font-semibold text-green-400 mb-4 flex items-center gap-2">
                    <Building2 className="w-5 h-5" />
                    Bank Transfer Details
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between border-b border-green-600/20 pb-2">
                      <span className="text-gray-400">Bank Name:</span>
                      <span className="text-white font-medium">{bankDetails.bankName}</span>
                    </div>
                    <div className="flex justify-between border-b border-green-600/20 pb-2">
                      <span className="text-gray-400">Account Holder:</span>
                      <span className="text-white font-medium">{bankDetails.accountHolder}</span>
                    </div>
                    <div className="flex justify-between border-b border-green-600/20 pb-2">
                      <span className="text-gray-400">IBAN:</span>
                      <span className="text-white font-mono font-medium">{bankDetails.iban}</span>
                    </div>
                    {bankDetails.swiftCode && (
                      <div className="flex justify-between border-b border-green-600/20 pb-2">
                        <span className="text-gray-400">SWIFT Code:</span>
                        <span className="text-white font-medium">{bankDetails.swiftCode}</span>
                      </div>
                    )}
                    {bankDetails.instructions && (
                      <div className="mt-3 p-3 bg-slate-700 rounded">
                        <p className="text-gray-300 text-sm">{bankDetails.instructions}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="mb-4">
                <label className="block text-white font-medium mb-2">
                  Payment Receipt URL <span className="text-red-400">*</span>
                </label>
                <input
                  type="url"
                  value={paymentSlipUrl}
                  onChange={(e) => setPaymentSlipUrl(e.target.value)}
                  placeholder="https://example.com/receipt.jpg"
                  className="w-full p-3 bg-slate-700 border border-slate-600 rounded text-white placeholder-gray-400"
                />
                <p className="text-gray-400 text-sm mt-2">
                  Upload your payment receipt to a file hosting service (Google Drive, Dropbox, etc.) and paste the link here.
                </p>
                {paymentSlipUrl && validateUrl(paymentSlipUrl) && (
                  <p className="text-green-400 text-sm mt-1">✓ Valid URL</p>
                )}
                {paymentSlipUrl && !validateUrl(paymentSlipUrl) && (
                  <p className="text-yellow-400 text-sm mt-1">⚠ Please enter a valid URL</p>
                )}
              </div>

              {error && (
                <div className="bg-red-500/20 border border-red-500 rounded p-4 mb-4">
                  <p className="text-red-300">{error}</p>
                </div>
              )}

              <div className="flex gap-4">
                <Button
                  onClick={() => handleAction('submit-payment', { paymentSlipUrl })}
                  disabled={processing || !paymentSlipUrl || !validateUrl(paymentSlipUrl)}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white py-4 text-lg"
                >
                  {processing ? 'Submitting...' : 'Submit Payment Proof'}
                </Button>
                <Button
                  onClick={() => window.location.href = `${window.location.pathname}?token=${token}&action=cancel`}
                  variant="outline"
                  className="px-6"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {action === 'pay' && booking.paymentMethod === 'paypal' && (
            <div>
              <h2 className="text-2xl font-bold text-white mb-4">Pay with PayPal</h2>
              <p className="text-gray-300 mb-6">
                Complete your booking payment securely with PayPal.
              </p>

              {error && (
                <div className="bg-red-500/20 border border-red-500 rounded p-4 mb-4">
                  <p className="text-red-300">{error}</p>
                </div>
              )}

              <div className="bg-blue-600/10 border border-blue-600/30 rounded-lg p-6 mb-6">
                <div className="flex items-center justify-center gap-3 mb-4">
                  <CreditCard className="w-6 h-6 text-blue-400" />
                  <h3 className="text-lg font-semibold text-blue-400">Secure Payment</h3>
                </div>
                <p className="text-center text-gray-300 mb-4">
                  Amount to pay: <span className="text-2xl font-bold text-white">€{booking.totalAmount.toFixed(2)}</span>
                </p>
                
                {processing ? (
                  <div className="bg-gray-600 rounded-lg py-4 flex items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin text-white" />
                    <span className="text-white font-bold">Processing payment...</span>
                  </div>
                ) : (
                  <PayPalScriptProvider options={paypalOptions}>
                    <PayPalButtons
                      style={{
                        layout: 'vertical',
                        color: 'blue',
                        shape: 'rect',
                        label: 'paypal',
                        height: 50
                      }}
                      createOrder={createPayPalOrder}
                      onApprove={onPayPalApprove}
                      onError={(error) => setError('PayPal payment failed')}
                      disabled={processing}
                    />
                  </PayPalScriptProvider>
                )}
              </div>

              <div className="text-center">
                <Button
                  onClick={() => window.location.href = `${window.location.pathname}?token=${token}&action=cancel`}
                  variant="outline"
                  className="px-6"
                >
                  Cancel Booking
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-gray-400 text-sm">
          <p>© 2024 Havana Van Booking. All rights reserved.</p>
          <p className="mt-2">Need help? Contact us at support@havana.gr</p>
        </div>
      </div>
    </div>
  )
}

