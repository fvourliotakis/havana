import nodemailer from 'nodemailer'
import { createTransporter, getEmailConfig } from './config'
import { EmailTemplateRenderer } from './templates'
import { type BookingEmailData } from './utils'

export interface EmailOptions {
  to: string | string[]
  subject: string
  html: string
  text?: string
  attachments?: Array<{
    filename: string
    content: Buffer | string
    contentType?: string
  }>
}

export interface EmailResult {
  success: boolean
  messageId?: string
  error?: string
}

export class EmailService {
  private transporter: nodemailer.Transporter | null = null
  private config: ReturnType<typeof getEmailConfig>

  constructor() {
    this.config = getEmailConfig()
    // Don't create transporter in constructor to avoid errors
  }

  private getTransporter(): nodemailer.Transporter {
    if (!this.transporter) {
      this.transporter = createTransporter()
    }
    return this.transporter
  }

  async sendEmail(options: EmailOptions): Promise<EmailResult> {
    try {
      const mailOptions = {
        from: `"${this.config.from.name}" <${this.config.from.email}>`,
        to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
        attachments: options.attachments
      }

      const result = await this.getTransporter().sendMail(mailOptions)
      
      return {
        success: true,
        messageId: result.messageId
      }
    } catch (error) {
      console.error('Email sending failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  async sendBookingConfirmation(
    customerEmail: string,
    bookingData: BookingEmailData,
    language: 'el' | 'en' = 'el'
  ): Promise<EmailResult> {
    const subject = language === 'el' 
      ? 'Επιβεβαίωση Κράτησης - Havana Food Cart'
      : 'Booking Confirmation - Havana Food Cart'

    const templateRenderer = new EmailTemplateRenderer(language)
    const html = templateRenderer.renderBookingConfirmationTemplate({ bookingData, language })
    const text = templateRenderer.renderBookingConfirmationText({ bookingData, language })

    return this.sendEmail({
      to: customerEmail,
      subject,
      html,
      text
    })
  }

  async sendAdminNotification(
    adminEmail: string,
    bookingData: BookingEmailData,
    language: 'el' | 'en' = 'el'
  ): Promise<EmailResult> {
    const subject = language === 'el'
      ? 'Νέα Κράτηση - Havana Food Cart'
      : 'New Booking - Havana Food Cart'

    const templateRenderer = new EmailTemplateRenderer(language)
    const html = templateRenderer.renderAdminNotificationTemplate({ bookingData, language })
    const text = templateRenderer.renderAdminNotificationText({ bookingData, language })

    return this.sendEmail({
      to: adminEmail,
      subject,
      html,
      text
    })
  }

  async sendBookingStatusUpdate(
    customerEmail: string,
    bookingData: BookingEmailData,
    status: string,
    language: 'el' | 'en' = 'el'
  ): Promise<EmailResult> {
    const subject = language === 'el'
      ? 'Ενημέρωση Κράτησης - Havana Food Cart'
      : 'Booking Update - Havana Food Cart'

    const templateRenderer = new EmailTemplateRenderer(language)
    const html = templateRenderer.renderBookingStatusTemplate({ bookingData, language }, status)
    const text = templateRenderer.renderBookingStatusText({ bookingData, language }, status)

    return this.sendEmail({
      to: customerEmail,
      subject,
      html,
      text
    })
  }

  async sendAdminCreatedBookingEmail(
    customerEmail: string,
    bookingData: BookingEmailData,
    confirmUrl: string,
    cancelUrl: string,
    payUrl?: string,
    bankDetails?: any,
    language: 'el' | 'en' = 'el'
  ): Promise<EmailResult> {
    const subject = language === 'el'
      ? 'Νέα Κράτηση - Havana Food Cart'
      : 'New Booking - Havana Food Cart'

    const templateRenderer = new EmailTemplateRenderer(language)
    const html = templateRenderer.renderAdminBookingNotificationTemplate(
      { bookingData, language },
      { confirmUrl, cancelUrl, payUrl },
      bankDetails
    )

    return this.sendEmail({
      to: customerEmail,
      subject,
      html
    })
  }

  /**
   * Send booking dates updated notification email to customer
   */
  async sendBookingDatesUpdatedEmail(
    customerEmail: string,
    data: {
      customerFirstName: string
      customerLastName: string
      bookingId: string
      cartName: string
      oldDates: Array<{ date: Date | string; startTime: string; endTime: string }>
      newDates: Array<{ date: string; startTime: string; endTime: string }>
      totalAmount: number
    },
    language: 'el' | 'en' = 'el'
  ): Promise<EmailResult> {
    const subject = language === 'el'
      ? 'Οι Ημερομηνίες Κράτησης Ενημερώθηκαν - Havana Food Cart'
      : 'Booking Dates Updated - Havana Food Cart'

    const templateRenderer = new EmailTemplateRenderer(language)
    const html = templateRenderer.renderBookingDatesUpdatedTemplate(data)

    return this.sendEmail({
      to: customerEmail,
      subject,
      html
    })
  }

  /**
   * Send booking updated notification email to customer with detailed changes
   */
  async sendBookingUpdatedEmail(
    customerEmail: string,
    data: {
      customerFirstName: string
      customerLastName: string
      bookingId: string
      changes: {
        cart?: { old: string; new: string }
        dates?: {
          old: Array<{ date: Date | string; startTime: string; endTime: string }>
          new: Array<{ date: Date | string; startTime: string; endTime: string }>
        }
        customerInfo?: Array<{ field: string; label: string; old: string; new: string }>
        items?: {
          added: Array<{ name: string; quantity: number; price: number }>
          removed: Array<{ name: string; quantity: number; price: number }>
          changed: Array<{ name: string; oldQuantity: number; newQuantity: number; price: number }>
        }
        services?: {
          added: Array<{ name: string; hours: number; pricePerHour: number }>
          removed: Array<{ name: string; hours: number; pricePerHour: number }>
          changed: Array<{ name: string; oldHours: number; newHours: number; pricePerHour: number }>
        }
        totalAmount?: { old: number; new: number }
      }
    },
    language: 'el' | 'en' = 'el'
  ): Promise<EmailResult> {
    const subject = language === 'el'
      ? 'Η Κράτησή Σας Ενημερώθηκε - Havana Food Cart'
      : 'Your Booking Has Been Updated - Havana Food Cart'

    const templateRenderer = new EmailTemplateRenderer(language)
    const html = templateRenderer.renderBookingUpdatedTemplate(data)

    return this.sendEmail({
      to: customerEmail,
      subject,
      html
    })
  }

}

// Singleton instance
export const emailService = new EmailService()
