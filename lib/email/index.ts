// Email service exports
export { emailService, EmailService } from './service'
export { getEmailConfig, createTransporter, verifyEmailConnection } from './config'
export { 
  sendBookingConfirmationEmails,
  sendBookingStatusUpdateEmail,
  sendPaymentConfirmationEmail,
  getCustomerLanguage,
  type BookingEmailData
} from './utils'

// Template and translation exports
export { EmailTemplateRenderer } from './templates'
export { emailTranslations, getEmailTranslation, formatEmailText } from './translations'

// Test utilities
export { 
  testEmailConfiguration, 
  testEmailSending, 
  runCompleteEmailTest 
} from './test'

// Re-export types
export type { EmailOptions, EmailResult } from './service'
export type { EmailConfig } from './config'
export type { EmailLanguage, EmailTranslationKey } from './translations'
