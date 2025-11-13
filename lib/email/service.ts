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

}

// Singleton instance
export const emailService = new EmailService()
