import { getEmailTranslation, formatEmailText, type EmailLanguage, emailTranslations } from './translations'
import { type BookingEmailData } from './utils'

export interface EmailTemplateData {
  bookingData: BookingEmailData
  language: EmailLanguage
  additionalData?: Record<string, any>
}

export class EmailTemplateRenderer {
  private language: EmailLanguage
  private translations: typeof emailTranslations.el

  constructor(language: EmailLanguage = 'el') {
    this.language = language
    this.translations = emailTranslations[language]
  }

  private t(key: keyof typeof this.translations): string {
    return getEmailTranslation(key, this.language)
  }

  private format(text: string, variables: Record<string, string | number>): string {
    return formatEmailText(text, variables)
  }

  private formatDate(dateString: string): string {
    const date = new Date(dateString)
    const format = this.t('date_format' as any)
    
    if (format === 'DD/MM/YYYY') {
      return date.toLocaleDateString('el-GR')
    } else {
      return date.toLocaleDateString('en-US')
    }
  }

  private formatTime(timeString: string): string {
    const [hours, minutes] = timeString.split(':')
    return `${hours}:${minutes}`
  }

  private formatCurrency(amount: number): string {
    return `${this.t('currency_symbol' as any)}${amount.toFixed(2)}`
  }

  private getPaymentMethodText(method: string): string {
    switch (method) {
      case 'paypal':
        return this.t('payment_paypal' as any)
      case 'bank_transfer':
        return this.t('payment_bank_transfer' as any)
      case 'cash':
        return this.t('payment_cash' as any)
      case 'reservation':
        return this.t('payment_reservation' as any)
      default:
        return method
    }
  }

  private getStatusText(status: string): string {
    switch (status.toLowerCase()) {
      case 'confirmed':
        return this.t('status_confirmed' as any)
      case 'pending':
        return this.t('status_pending' as any)
      case 'cancelled':
        return this.t('status_cancelled' as any)
      case 'completed':
        return this.t('status_completed' as any)
      case 'paid':
        return this.t('status_paid' as any)
      case 'failed':
        return this.t('status_failed' as any)
      default:
        return status
    }
  }

  renderBookingConfirmationTemplate(data: EmailTemplateData): string {
    const { bookingData } = data
    const t = this.t.bind(this)
    const format = this.format.bind(this)

    return `
<!DOCTYPE html>
<html lang="${this.language}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${t('booking_confirmation_title')}</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f4f4f4;
            margin: 0;
            padding: 0;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
            background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
            color: white;
            padding: 30px 20px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: bold;
        }
        .header p {
            margin: 10px 0 0 0;
            opacity: 0.9;
            font-size: 16px;
        }
        .content {
            padding: 30px 20px;
        }
        .greeting {
            font-size: 18px;
            margin-bottom: 20px;
            color: #1e293b;
        }
        .section {
            margin-bottom: 25px;
            padding: 20px;
            background-color: #f8fafc;
            border-radius: 6px;
            border-left: 4px solid #0ea5e9;
        }
        .section h2 {
            margin: 0 0 15px 0;
            color: #1e293b;
            font-size: 20px;
            font-weight: 600;
        }
        .detail-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
            padding: 8px 0;
            border-bottom: 1px solid #e2e8f0;
        }
        .detail-row:last-child {
            border-bottom: none;
        }
        .detail-label {
            font-weight: 600;
            color: #475569;
        }
        .detail-value {
            color: #1e293b;
            text-align: right;
        }
        .booking-dates {
            background-color: #ecfdf5;
            border-left-color: #10b981;
        }
        .payment-info {
            background-color: #fef3c7;
            border-left-color: #f59e0b;
        }
        .contact-info {
            background-color: #ede9fe;
            border-left-color: #8b5cf6;
        }
        .next-steps {
            background-color: #dbeafe;
            border-left-color: #3b82f6;
        }
        .footer {
            background-color: #1e293b;
            color: white;
            padding: 20px;
            text-align: center;
            font-size: 14px;
        }
        .footer p {
            margin: 5px 0;
        }
        .highlight {
            background-color: #0ea5e9;
            color: white;
            padding: 2px 6px;
            border-radius: 4px;
            font-weight: 600;
        }
        .amount {
            font-size: 18px;
            font-weight: bold;
            color: #059669;
        }
        @media (max-width: 600px) {
            .container {
                margin: 0;
                border-radius: 0;
            }
            .content {
                padding: 20px 15px;
            }
            .detail-row {
                flex-direction: column;
            }
            .detail-value {
                text-align: left;
                margin-top: 5px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>${t('booking_confirmation_title')}</h1>
            <p>Havana Van Booking System</p>
        </div>
        
        <div class="content">
            <div class="greeting">
                ${format(t('booking_confirmation_greeting'), {
                  firstName: bookingData.customerFirstName,
                  lastName: bookingData.customerLastName
                })}
            </div>
            
            <p style="font-size: 16px; margin-bottom: 25px;">
                ${t('booking_confirmation_message')}
            </p>

            <!-- Booking Details Section -->
            <div class="section">
                <h2>${t('booking_confirmation_details')}</h2>
                <div class="detail-row">
                    <span class="detail-label">${t('booking_confirmation_number')}:</span>
                    <span class="detail-value highlight">#${bookingData.id}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">${t('booking_confirmation_date')}:</span>
                    <span class="detail-value">${this.formatDate(bookingData.createdAt)}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">${t('booking_confirmation_cart')}:</span>
                    <span class="detail-value">${bookingData.cartName}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">${t('booking_confirmation_location')}:</span>
                    <span class="detail-value">${bookingData.cartLocation}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">${t('booking_confirmation_event_type')}:</span>
                    <span class="detail-value">${bookingData.eventType}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">${t('booking_confirmation_guests')}:</span>
                    <span class="detail-value">${bookingData.guestCount}</span>
                </div>
            </div>

            <!-- Booking Dates Section -->
            <div class="section booking-dates">
                <h2>${t('booking_dates')}</h2>
                ${bookingData.selectedDates.map(date => `
                    <div class="detail-row">
                        <span class="detail-label">${this.formatDate(date.date)}:</span>
                        <span class="detail-value">${this.formatTime(date.startTime)} - ${this.formatTime(date.endTime)} (${date.totalHours}h)</span>
                    </div>
                `).join('')}
            </div>

            <!-- Payment Information -->
            <div class="section payment-info">
                <h2>${t('booking_confirmation_payment_method')}</h2>
                <div class="detail-row">
                    <span class="detail-label">${t('booking_confirmation_total_amount')}:</span>
                    <span class="detail-value amount">${this.formatCurrency(bookingData.totalAmount)}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">${t('booking_confirmation_payment_method')}:</span>
                    <span class="detail-value">${this.getPaymentMethodText(bookingData.paymentMethod)}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">${t('booking_confirmation_payment_status')}:</span>
                    <span class="detail-value">${this.getStatusText(bookingData.paymentStatus)}</span>
                </div>
                ${bookingData.couponCode ? `
                    <div class="detail-row">
                        <span class="detail-label">${t('coupon_code')}:</span>
                        <span class="detail-value">${bookingData.couponCode}</span>
                    </div>
                ` : ''}
                ${bookingData.discountAmount ? `
                    <div class="detail-row">
                        <span class="detail-label">${t('discount_applied')}:</span>
                        <span class="detail-value">-${this.formatCurrency(bookingData.discountAmount)}</span>
                    </div>
                ` : ''}
            </div>

            <!-- Contact Information -->
            <div class="section contact-info">
                <h2>${t('booking_confirmation_contact_info')}</h2>
                <div class="detail-row">
                    <span class="detail-label">${t('booking_confirmation_email')}:</span>
                    <span class="detail-value">${bookingData.customerEmail}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">${t('booking_confirmation_phone')}:</span>
                    <span class="detail-value">${bookingData.customerPhone}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">${t('booking_confirmation_address')}:</span>
                    <span class="detail-value">${bookingData.customerAddress}, ${bookingData.customerCity}, ${bookingData.customerZip}</span>
                </div>
            </div>

            <!-- Next Steps -->
            <div class="section next-steps">
                <h2>${t('booking_confirmation_next_steps')}</h2>
                ${this.getNextStepsMessage(bookingData.paymentMethod, bookingData.paymentStatus)}
            </div>

            ${bookingData.specialNotes ? `
                <div class="section">
                    <h2>${t('booking_confirmation_special_notes')}</h2>
                    <p style="margin: 0; font-style: italic;">${bookingData.specialNotes}</p>
                </div>
            ` : ''}
        </div>

        <div class="footer">
            <p><strong>${t('booking_confirmation_footer')}</strong></p>
            <p>${t('booking_confirmation_contact_support')}</p>
            <p style="font-size: 12px; opacity: 0.8; margin-top: 15px;">
                ${t('email_footer')}
            </p>
        </div>
    </div>
</body>
</html>
    `
  }

  private getNextStepsMessage(paymentMethod: string, paymentStatus: string): string {
    const t = this.t.bind(this)
    
    if (paymentMethod === 'paypal' && paymentStatus === 'PAID') {
      return `<p>${t('booking_confirmation_paypal_note')}</p>`
    } else if (paymentMethod === 'bank_transfer') {
      return `<p>${t('booking_confirmation_bank_note')}</p>`
    } else if (paymentMethod === 'reservation') {
      return `<p>${t('booking_confirmation_reservation_note')}</p>`
    } else {
      return `<p>${t('booking_confirmation_reservation_note')}</p>`
    }
  }

  renderBookingConfirmationText(data: EmailTemplateData): string {
    const { bookingData } = data
    const t = this.t.bind(this)
    const format = this.format.bind(this)

    return `
${format(t('booking_confirmation_greeting'), {
  firstName: bookingData.customerFirstName,
  lastName: bookingData.customerLastName
})}

${t('booking_confirmation_message')}

${t('booking_confirmation_details')}:
- ${t('booking_confirmation_number')}: #${bookingData.id}
- ${t('booking_confirmation_date')}: ${this.formatDate(bookingData.createdAt)}
- ${t('booking_confirmation_cart')}: ${bookingData.cartName}
- ${t('booking_confirmation_location')}: ${bookingData.cartLocation}
- ${t('booking_confirmation_event_type')}: ${bookingData.eventType}
- ${t('booking_confirmation_guests')}: ${bookingData.guestCount}

${t('booking_dates')}:
${bookingData.selectedDates.map(date => 
  `- ${this.formatDate(date.date)}: ${this.formatTime(date.startTime)} - ${this.formatTime(date.endTime)} (${date.totalHours}h)`
).join('\n')}

${t('booking_confirmation_payment_method')}:
- ${t('booking_confirmation_total_amount')}: ${this.formatCurrency(bookingData.totalAmount)}
- ${t('booking_confirmation_payment_method')}: ${this.getPaymentMethodText(bookingData.paymentMethod)}
- ${t('booking_confirmation_payment_status')}: ${this.getStatusText(bookingData.paymentStatus)}

${t('booking_confirmation_contact_info')}:
- ${t('booking_confirmation_email')}: ${bookingData.customerEmail}
- ${t('booking_confirmation_phone')}: ${bookingData.customerPhone}
- ${t('booking_confirmation_address')}: ${bookingData.customerAddress}, ${bookingData.customerCity}, ${bookingData.customerZip}

${t('booking_confirmation_next_steps')}:
${this.getNextStepsMessage(bookingData.paymentMethod, bookingData.paymentStatus)}

${t('booking_confirmation_footer')}

${t('booking_confirmation_contact_support')}

---
${t('email_footer')}
    `.trim()
  }

  renderAdminNotificationTemplate(data: EmailTemplateData): string {
    const { bookingData } = data
    const t = this.t.bind(this)

    return `
<!DOCTYPE html>
<html lang="${this.language}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${t('admin_notification_title')}</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f4f4f4;
            margin: 0;
            padding: 0;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
            background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
            color: white;
            padding: 30px 20px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: bold;
        }
        .content {
            padding: 30px 20px;
        }
        .section {
            margin-bottom: 25px;
            padding: 20px;
            background-color: #f8fafc;
            border-radius: 6px;
            border-left: 4px solid #dc2626;
        }
        .section h2 {
            margin: 0 0 15px 0;
            color: #1e293b;
            font-size: 20px;
            font-weight: 600;
        }
        .detail-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
            padding: 8px 0;
            border-bottom: 1px solid #e2e8f0;
        }
        .detail-row:last-child {
            border-bottom: none;
        }
        .detail-label {
            font-weight: 600;
            color: #475569;
        }
        .detail-value {
            color: #1e293b;
            text-align: right;
        }
        .cta-button {
            display: inline-block;
            background-color: #dc2626;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;
            margin-top: 15px;
        }
        .cta-button.green {
            background-color: #10b981;
        }
        .cta-button.blue {
            background-color: #3b82f6;
        }
        .cta-button-outline {
            display: inline-block;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;
            margin-top: 15px;
            border: 2px solid;
            background-color: transparent;
        }
        .cta-button-outline.red {
            border-color: #dc2626;
            color: #dc2626;
        }
        .action-buttons {
            text-align: center;
            padding: 20px;
        }
        .bank-details-card {
            background-color: #ecfdf5;
            border: 2px solid #10b981;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
        }
        .footer {
            background-color: #1e293b;
            color: white;
            padding: 20px;
            text-align: center;
            font-size: 14px;
        }
        .highlight {
            background-color: #dc2626;
            color: white;
            padding: 2px 6px;
            border-radius: 4px;
            font-weight: 600;
        }
        .amount {
            font-size: 18px;
            font-weight: bold;
            color: #059669;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>${t('admin_notification_title')}</h1>
            <p>Havana Van Admin Notification</p>
        </div>
        
        <div class="content">
            <p style="font-size: 16px; margin-bottom: 25px;">
                ${t('admin_notification_message')}
            </p>

            <!-- Customer Information -->
            <div class="section">
                <h2>${t('admin_notification_customer_info')}</h2>
                <div class="detail-row">
                    <span class="detail-label">${t('booking_confirmation_number')}:</span>
                    <span class="detail-value highlight">#${bookingData.id}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">${t('booking_confirmation_email')}:</span>
                    <span class="detail-value">${bookingData.customerEmail}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">${t('booking_confirmation_phone')}:</span>
                    <span class="detail-value">${bookingData.customerPhone}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">${t('booking_confirmation_cart')}:</span>
                    <span class="detail-value">${bookingData.cartName}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">${t('booking_confirmation_total_amount')}:</span>
                    <span class="detail-value amount">${this.formatCurrency(bookingData.totalAmount)}</span>
                </div>
            </div>

            <!-- Booking Summary -->
            <div class="section">
                <h2>${t('admin_notification_booking_summary')}</h2>
                <div class="detail-row">
                    <span class="detail-label">${t('booking_confirmation_event_type')}:</span>
                    <span class="detail-value">${bookingData.eventType}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">${t('booking_confirmation_guests')}:</span>
                    <span class="detail-value">${bookingData.guestCount}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">${t('booking_confirmation_payment_method')}:</span>
                    <span class="detail-value">${this.getPaymentMethodText(bookingData.paymentMethod)}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">${t('booking_confirmation_payment_status')}:</span>
                    <span class="detail-value">${this.getStatusText(bookingData.paymentStatus)}</span>
                </div>
            </div>

            <div style="text-align: center;">
                <a href="${process.env.NEXTAUTH_URL}/admin/bookings" class="cta-button">
                    ${t('admin_notification_view_booking')}
                </a>
            </div>
        </div>

        <div class="footer">
            <p><strong>${t('admin_notification_admin_panel')}</strong></p>
            <p style="font-size: 12px; opacity: 0.8; margin-top: 15px;">
                ${t('email_footer')}
            </p>
        </div>
    </div>
</body>
</html>
    `
  }

  renderAdminNotificationText(data: EmailTemplateData): string {
    const { bookingData } = data
    const t = this.t.bind(this)

    return `
${t('admin_notification_title')}

${t('admin_notification_message')}

${t('admin_notification_customer_info')}:
- ${t('booking_confirmation_number')}: #${bookingData.id}
- ${t('booking_confirmation_email')}: ${bookingData.customerEmail}
- ${t('booking_confirmation_phone')}: ${bookingData.customerPhone}
- ${t('booking_confirmation_cart')}: ${bookingData.cartName}
- ${t('booking_confirmation_total_amount')}: ${this.formatCurrency(bookingData.totalAmount)}

${t('admin_notification_booking_summary')}:
- ${t('booking_confirmation_event_type')}: ${bookingData.eventType}
- ${t('booking_confirmation_guests')}: ${bookingData.guestCount}
- ${t('booking_confirmation_payment_method')}: ${this.getPaymentMethodText(bookingData.paymentMethod)}
- ${t('booking_confirmation_payment_status')}: ${this.getStatusText(bookingData.paymentStatus)}

${t('admin_notification_view_booking')}: ${process.env.NEXTAUTH_URL}/admin/bookings

---
${t('email_footer')}
    `.trim()
  }

  renderBookingStatusTemplate(data: EmailTemplateData, status: string): string {
    const { bookingData } = data
    const t = this.t.bind(this)
    const format = this.format.bind(this)

    return `
<!DOCTYPE html>
<html lang="${this.language}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${t('status_update_title')}</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f4f4f4;
            margin: 0;
            padding: 0;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
            background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
            color: white;
            padding: 30px 20px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: bold;
        }
        .content {
            padding: 30px 20px;
        }
        .greeting {
            font-size: 18px;
            margin-bottom: 20px;
            color: #1e293b;
        }
        .section {
            margin-bottom: 25px;
            padding: 20px;
            background-color: #f8fafc;
            border-radius: 6px;
            border-left: 4px solid #0ea5e9;
        }
        .section h2 {
            margin: 0 0 15px 0;
            color: #1e293b;
            font-size: 20px;
            font-weight: 600;
        }
        .detail-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
            padding: 8px 0;
            border-bottom: 1px solid #e2e8f0;
        }
        .detail-row:last-child {
            border-bottom: none;
        }
        .detail-label {
            font-weight: 600;
            color: #475569;
        }
        .detail-value {
            color: #1e293b;
            text-align: right;
        }
        .footer {
            background-color: #1e293b;
            color: white;
            padding: 20px;
            text-align: center;
            font-size: 14px;
        }
        .highlight {
            background-color: #0ea5e9;
            color: white;
            padding: 2px 6px;
            border-radius: 4px;
            font-weight: 600;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>${t('status_update_title')}</h1>
            <p>Havana Van Booking System</p>
        </div>
        
        <div class="content">
            <div class="greeting">
                ${format(t('status_update_greeting'), {
                  firstName: bookingData.customerFirstName,
                  lastName: bookingData.customerLastName
                })}
            </div>
            
            <p style="font-size: 16px; margin-bottom: 25px;">
                ${t('status_update_message')}
            </p>

            <div class="section">
                <h2>${t('status_update_new_status')}</h2>
                <div class="detail-row">
                    <span class="detail-label">${t('status_update_booking_number')}:</span>
                    <span class="detail-value highlight">#${bookingData.id}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">${t('status_update_new_status')}:</span>
                    <span class="detail-value">${this.getStatusText(status)}</span>
                </div>
            </div>
        </div>

        <div class="footer">
            <p><strong>${t('booking_confirmation_footer')}</strong></p>
            <p>${t('booking_confirmation_contact_support')}</p>
            <p style="font-size: 12px; opacity: 0.8; margin-top: 15px;">
                ${t('email_footer')}
            </p>
        </div>
    </div>
</body>
</html>
    `
  }

  renderBookingStatusText(data: EmailTemplateData, status: string): string {
    const { bookingData } = data
    const t = this.t.bind(this)
    const format = this.format.bind(this)

    return `
${format(t('status_update_greeting'), {
  firstName: bookingData.customerFirstName,
  lastName: bookingData.customerLastName
})}

${t('status_update_message')}

${t('status_update_new_status')}:
- ${t('status_update_booking_number')}: #${bookingData.id}
- ${t('status_update_new_status')}: ${this.getStatusText(status)}

${t('booking_confirmation_footer')}

${ t('booking_confirmation_contact_support')}

---
${t('email_footer')}
    `.trim()
  }

  /**
   * Render admin-created booking notification template with action buttons
   * This template includes payment-method-specific action buttons
   */
  renderAdminBookingNotificationTemplate(
    data: EmailTemplateData,
    actionUrls: { confirmUrl?: string; cancelUrl: string; payUrl?: string },
    bankDetails?: any
  ): string {
    const { bookingData } = data
    const t = this.t.bind(this)
    const format = this.format.bind(this)

    return `
<!DOCTYPE html>
<html lang="${this.language}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${t('action_required')}</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f4f4f4;
            margin: 0;
            padding: 0;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
            background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
            color: white;
            padding: 30px 20px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: bold;
        }
        .header p {
            margin: 10px 0 0 0;
            opacity: 0.9;
            font-size: 16px;
        }
        .content {
            padding: 30px 20px;
        }
        .greeting {
            font-size: 18px;
            margin-bottom: 20px;
            color: #1e293b;
        }
        .section {
            margin-bottom: 25px;
            padding: 20px;
            background-color: #f8fafc;
            border-radius: 6px;
            border-left: 4px solid #0ea5e9;
        }
        .section h2 {
            margin: 0 0 15px 0;
            color: #1e293b;
            font-size: 20px;
            font-weight: 600;
        }
        .detail-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
            padding: 8px 0;
            border-bottom: 1px solid #e2e8f0;
        }
        .detail-row:last-child {
            border-bottom: none;
        }
        .detail-label {
            font-weight: 600;
            color: #475569;
        }
        .detail-value {
            color: #1e293b;
            text-align: right;
        }
        .action-buttons {
            text-align: center;
            padding: 30px 20px;
            background-color: #fef3c7;
            border-left-color: #f59e0b;
        }
        .cta-button {
            display: inline-block;
            padding: 15px 30px;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            margin: 10px 5px;
            font-size: 16px;
        }
        .cta-button.green {
            background-color: #10b981;
            color: white;
        }
        .cta-button.blue {
            background-color: #3b82f6;
            color: white;
        }
        .cta-button-outline {
            display: inline-block;
            padding: 15px 30px;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            margin: 10px 5px;
            font-size: 16px;
            border: 2px solid;
            background-color: transparent;
        }
        .cta-button-outline.red {
            border-color: #dc2626;
            color: #dc2626;
        }
        .bank-details-card {
            background-color: #ecfdf5;
            border: 2px solid #10b981;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
        }
        .booking-dates {
            background-color: #ecfdf5;
            border-left-color: #10b981;
        }
        .payment-info {
            background-color: #fef3c7;
            border-left-color: #f59e0b;
        }
        .highlight {
            background-color: #0ea5e9;
            color: white;
            padding: 2px 6px;
            border-radius: 4px;
            font-weight: 600;
        }
        .amount {
            font-size: 18px;
            font-weight: bold;
            color: #059669;
        }
        .footer {
            background-color: #1e293b;
            color: white;
            padding: 20px;
            text-align: center;
            font-size: 14px;
        }
        .footer p {
            margin: 5px 0;
        }
        @media (max-width: 600px) {
            .container {
                margin: 0;
                border-radius: 0;
            }
            .content {
                padding: 20px 15px;
            }
            .detail-row {
                flex-direction: column;
            }
            .detail-value {
                text-align: left;
                margin-top: 5px;
            }
            .cta-button, .cta-button-outline {
                display: block;
                margin: 10px 0;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>${t('action_required')}</h1>
            <p>Havana Van Booking System</p>
        </div>
        
        <div class="content">
            <div class="greeting">
                ${format(t('booking_confirmation_greeting'), {
                  firstName: bookingData.customerFirstName,
                  lastName: bookingData.customerLastName
                })}
            </div>
            
            <p style="font-size: 16px; margin-bottom: 25px;">
                ${t('admin_created_booking_message')}
            </p>

            <!-- Booking Details Section -->
            <div class="section">
                <h2>${t('booking_confirmation_details')}</h2>
                <div class="detail-row">
                    <span class="detail-label">${t('booking_confirmation_number')}:</span>
                    <span class="detail-value highlight">#${bookingData.id}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">${t('booking_confirmation_cart')}:</span>
                    <span class="detail-value">${bookingData.cartName}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">${t('booking_confirmation_location')}:</span>
                    <span class="detail-value">${bookingData.cartLocation}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">${t('booking_confirmation_event_type')}:</span>
                    <span class="detail-value">${bookingData.eventType}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">${t('booking_confirmation_guests')}:</span>
                    <span class="detail-value">${bookingData.guestCount}</span>
                </div>
            </div>

            <!-- Booking Dates Section -->
            <div class="section booking-dates">
                <h2>${t('booking_dates')}</h2>
                ${bookingData.selectedDates.map(date => `
                    <div class="detail-row">
                        <span class="detail-label">${this.formatDate(date.date)}:</span>
                        <span class="detail-value">${this.formatTime(date.startTime)} - ${this.formatTime(date.endTime)} (${date.totalHours}h)</span>
                    </div>
                `).join('')}
            </div>

            <!-- Payment Information -->
            <div class="section payment-info">
                <h2>${t('booking_confirmation_payment_method')}</h2>
                <div class="detail-row">
                    <span class="detail-label">${t('booking_confirmation_total_amount')}:</span>
                    <span class="detail-value amount">${this.formatCurrency(bookingData.totalAmount)}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">${t('booking_confirmation_payment_method')}:</span>
                    <span class="detail-value">${this.getPaymentMethodText(bookingData.paymentMethod)}</span>
                </div>
            </div>

            <!-- Bank Details (if bank_transfer) -->
            ${bookingData.paymentMethod === 'bank_transfer' && bankDetails ? `
                <div class="bank-details-card">
                    <h3 style="margin: 0 0 15px 0; color: #059669; font-size: 18px;">${t('bank_transfer_instructions_title')}</h3>
                    <p style="margin-bottom: 15px; color: #475569;">${t('bank_transfer_instructions_message')}</p>
                    <div class="detail-row">
                        <span class="detail-label">${t('bank_name')}:</span>
                        <span class="detail-value">${bankDetails.bankName}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">${t('account_holder')}:</span>
                        <span class="detail-value">${bankDetails.accountHolder}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">${t('iban')}:</span>
                        <span class="detail-value" style="font-family: monospace;">${bankDetails.iban}</span>
                    </div>
                    ${bankDetails.swiftCode ? `
                        <div class="detail-row">
                            <span class="detail-label">${t('swift_code')}:</span>
                            <span class="detail-value">${bankDetails.swiftCode}</span>
                        </div>
                    ` : ''}
                    ${bankDetails.instructions ? `
                        <div style="margin-top: 15px; padding: 10px; background-color: #fff; border-radius: 4px;">
                            <p style="margin: 0; font-size: 14px; color: #475569;"><strong>${t('instructions')}:</strong> ${bankDetails.instructions}</p>
                        </div>
                    ` : ''}
                </div>
            ` : ''}

            <!-- Action Buttons Section -->
            <div class="action-buttons">
                ${bookingData.paymentMethod === 'reservation' ? `
                    <h2 style="margin: 0 0 20px 0; color: #1e293b;">${t('booking_confirmation_next_steps')}</h2>
                    <p style="margin-bottom: 20px;">${t('booking_confirmation_reservation_note')}</p>
                    <a href="${actionUrls.confirmUrl}" class="cta-button green">
                        ${t('confirm_booking_button')}
                    </a>
                    <br>
                    <a href="${actionUrls.cancelUrl}" class="cta-button-outline red">
                        ${t('cancel_booking_button')}
                    </a>
                ` : bookingData.paymentMethod === 'bank_transfer' ? `
                    <h2 style="margin: 0 0 20px 0; color: #1e293b;">${t('booking_confirmation_next_steps')}</h2>
                    <p style="margin-bottom: 20px;">${t('booking_confirmation_bank_note')}</p>
                    <a href="${actionUrls.payUrl}" class="cta-button green">
                        ${t('upload_payment_proof_button')}
                    </a>
                    <br>
                    <a href="${actionUrls.cancelUrl}" class="cta-button-outline red">
                        ${t('cancel_booking_button')}
                    </a>
                ` : `
                    <h2 style="margin: 0 0 20px 0; color: #1e293b;">${t('booking_confirmation_next_steps')}</h2>
                    <p style="margin-bottom: 20px;">${t('booking_confirmation_paypal_note')}</p>
                    <a href="${actionUrls.payUrl}" class="cta-button blue">
                        ${t('pay_with_paypal_button')}
                    </a>
                    <br>
                    <a href="${actionUrls.cancelUrl}" class="cta-button-outline red">
                        ${t('cancel_booking_button')}
                    </a>
                `}
            </div>
        </div>

        <div class="footer">
            <p><strong>${t('booking_confirmation_footer')}</strong></p>
            <p>${t('booking_confirmation_contact_support')}</p>
            <p style="font-size: 12px; opacity: 0.8; margin-top: 15px;">
                ${t('email_footer')}
            </p>
        </div>
    </div>
</body>
</html>
    `
  }
}
