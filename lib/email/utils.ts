import { emailService } from './service'
import { verifyEmailConnection } from './config'

export interface BookingEmailData {
  id: string
  customerFirstName: string
  customerLastName: string
  customerEmail: string
  customerPhone: string
  customerAddress: string
  customerCity: string
  customerState: string
  customerZip: string
  customerCountry: string
  eventType: string
  guestCount: number
  specialNotes?: string
  totalAmount: number
  paymentMethod: string
  status: string
  paymentStatus: string
  createdAt: string
  cartName: string
  cartLocation: string
  selectedDates: Array<{
    date: string
    startTime: string
    endTime: string
    totalHours: number
    cartCost: number
  }>
  selectedItems?: Array<{
    name: string
    quantity: number
    price: number
  }>
  selectedServices?: Array<{
    name: string
    quantity: number
    pricePerHour: number
    hours: number
  }>
  shippingAmount?: number
  couponCode?: string
  discountAmount?: number
}

export const sendBookingConfirmationEmails = async (
  bookingData: BookingEmailData,
  adminEmail: string,
  language: 'el' | 'en' = 'el'
): Promise<{
  customerEmail: { success: boolean; error?: string }
  adminEmail: { success: boolean; error?: string }
}> => {
  try {
    // Verify email connection first
    const isConnected = await verifyEmailConnection()
    if (!isConnected) {
      throw new Error('Email service is not properly configured')
    }

    // Send customer confirmation email
    const customerResult = await emailService.sendBookingConfirmation(
      bookingData.customerEmail,
      bookingData,
      language
    )

    // Send admin notification email
    const adminResult = await emailService.sendAdminNotification(
      adminEmail,
      bookingData,
      language
    )

    return {
      customerEmail: {
        success: customerResult.success,
        error: customerResult.error
      },
      adminEmail: {
        success: adminResult.success,
        error: adminResult.error
      }
    }
  } catch (error) {
    console.error('Failed to send booking confirmation emails:', error)
    return {
      customerEmail: {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      adminEmail: {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
}

export const sendBookingStatusUpdateEmail = async (
  bookingData: BookingEmailData,
  status: string,
  language: 'el' | 'en' = 'el'
): Promise<{ success: boolean; error?: string }> => {
  try {
    const isConnected = await verifyEmailConnection()
    if (!isConnected) {
      throw new Error('Email service is not properly configured')
    }

    const result = await emailService.sendBookingStatusUpdate(
      bookingData.customerEmail,
      bookingData,
      status,
      language
    )

    return {
      success: result.success,
      error: result.error
    }
  } catch (error) {
    console.error('Failed to send booking status update email:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

export const sendPaymentConfirmationEmail = async (
  bookingData: BookingEmailData,
  language: 'el' | 'en' = 'el'
): Promise<{ success: boolean; error?: string }> => {
  try {
    const isConnected = await verifyEmailConnection()
    if (!isConnected) {
      throw new Error('Email service is not properly configured')
    }

    // For now, we'll use the booking status update with "PAID" status
    // In Phase 2, we'll create a dedicated payment confirmation template
    const result = await emailService.sendBookingStatusUpdate(
      bookingData.customerEmail,
      bookingData,
      'PAID',
      language
    )

    return {
      success: result.success,
      error: result.error
    }
  } catch (error) {
    console.error('Failed to send payment confirmation email:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

// Helper function to determine customer language preference
export const getCustomerLanguage = (customerCountry: string): 'el' | 'en' => {
  // Default to Greek for Greece, English for others
  // This can be enhanced based on customer preferences
  return customerCountry.toLowerCase() === 'greece' ? 'el' : 'en'
}
