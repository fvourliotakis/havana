import { emailService, verifyEmailConnection } from '@/lib/email'
import { type BookingEmailData } from '@/lib/email/utils'

// Test email configuration
export const testEmailConfiguration = async (): Promise<{
  success: boolean
  message: string
  details?: any
}> => {
  try {
    console.log('🔧 Testing email configuration...')
    
    const isConnected = await verifyEmailConnection()
    
    if (isConnected) {
      return {
        success: true,
        message: '✅ Email configuration is working correctly',
        details: {
          smtpHost: process.env.SMTP_HOST || 'smtp.gmail.com',
          smtpPort: process.env.SMTP_PORT || '587',
          smtpUser: process.env.SMTP_USER ? '***configured***' : '❌ Not configured',
          smtpFromName: process.env.SMTP_FROM_NAME || 'Havana Food Cart Booking',
          adminEmail: process.env.ADMIN_EMAIL ? '***configured***' : '❌ Not configured'
        }
      }
    } else {
      return {
        success: false,
        message: '❌ Email configuration failed - check SMTP settings',
        details: {
          smtpHost: process.env.SMTP_HOST || 'smtp.gmail.com',
          smtpPort: process.env.SMTP_PORT || '587',
          smtpUser: process.env.SMTP_USER ? '***configured***' : '❌ Not configured',
          smtpPass: process.env.SMTP_PASS ? '***configured***' : '❌ Not configured'
        }
      }
    }
  } catch (error) {
    return {
      success: false,
      message: `❌ Email test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      details: { error }
    }
  }
}

// Test email sending with sample data
export const testEmailSending = async (testEmail: string): Promise<{
  success: boolean
  message: string
  details?: any
}> => {
  try {
    console.log(`📧 Testing email sending to ${testEmail}...`)
    
    // Create sample booking data
    const sampleBookingData: BookingEmailData = {
      id: 'TEST-001',
      customerFirstName: 'John',
      customerLastName: 'Doe',
      customerEmail: testEmail,
      customerPhone: '+30 123 456 7890',
      customerAddress: '123 Test Street',
      customerCity: 'Athens',
      customerState: 'Attica',
      customerZip: '12345',
      customerCountry: 'Greece',
      eventType: 'Birthday Party',
      guestCount: 25,
      specialNotes: 'This is a test email for Havana Food Cart booking system.',
      totalAmount: 450.00,
      paymentMethod: 'paypal',
      status: 'CONFIRMED',
      paymentStatus: 'PAID',
      createdAt: new Date().toISOString(),
      cartName: 'Havana Classic Cart',
      cartLocation: 'Athens Center',
      selectedDates: [
        {
          date: '2024-12-25',
          startTime: '18:00',
          endTime: '22:00',
          totalHours: 4,
          cartCost: 200.00
        }
      ],
      selectedItems: [
        {
          name: 'Greek Salad',
          quantity: 10,
          price: 8.50
        },
        {
          name: 'Chicken Souvlaki',
          quantity: 15,
          price: 12.00
        }
      ],
      selectedServices: [
        {
          name: 'Setup Service',
          quantity: 1,
          pricePerHour: 25.00,
          hours: 2
        }
      ],
      shippingAmount: 15.00,
      couponCode: 'WELCOME10',
      discountAmount: 45.00
    }

    // Test customer confirmation email
    const customerResult = await emailService.sendBookingConfirmation(
      testEmail,
      sampleBookingData,
      'el'
    )

    // Test admin notification email
    const adminEmail = process.env.ADMIN_EMAIL || testEmail
    const adminResult = await emailService.sendAdminNotification(
      adminEmail,
      sampleBookingData,
      'el'
    )

    // Test status update email
    const statusResult = await emailService.sendBookingStatusUpdate(
      testEmail,
      sampleBookingData,
      'CONFIRMED',
      'el'
    )

    const results = {
      customerEmail: customerResult,
      adminEmail: adminResult,
      statusUpdate: statusResult
    }

    const allSuccessful = Object.values(results).every(result => result.success)

    return {
      success: allSuccessful,
      message: allSuccessful 
        ? '✅ All test emails sent successfully!' 
        : '⚠️ Some test emails failed - check details',
      details: results
    }
  } catch (error) {
    return {
      success: false,
      message: `❌ Email sending test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      details: { error }
    }
  }
}

// Complete email system test
export const runCompleteEmailTest = async (testEmail?: string): Promise<{
  configuration: any
  sending: any
  summary: {
    overall: boolean
    message: string
  }
}> => {
  console.log('🚀 Starting complete email system test...')
  
  const configTest = await testEmailConfiguration()
  const sendingTest = testEmail ? await testEmailSending(testEmail) : null
  
  const overallSuccess = configTest.success && (!sendingTest || sendingTest.success)
  
  return {
    configuration: configTest,
    sending: sendingTest,
    summary: {
      overall: overallSuccess,
      message: overallSuccess 
        ? '🎉 Email system is fully functional!' 
        : '⚠️ Email system has issues - check configuration'
    }
  }
}
