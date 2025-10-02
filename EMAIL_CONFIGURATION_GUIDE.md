# 📧 Email Configuration Guide - Havana Food Cart

## 🎯 **Overview**
This guide explains how to configure email functionality for the Havana Food Cart booking system. The system sends automated emails for booking confirmations, admin notifications, and status updates.

## 🔧 **Email Service Architecture**

### **Components:**
- **Email Service**: Core email sending functionality using Nodemailer
- **Template Renderer**: HTML/text email templates with translations
- **Translation System**: Greek/English email content
- **Integration Points**: Booking creation, status updates, payment confirmations

### **Email Types:**
1. **Booking Confirmation** - Sent to customer after successful booking
2. **Admin Notification** - Sent to admin when new booking is created
3. **Status Update** - Sent to customer when booking status changes
4. **Payment Confirmation** - Sent to customer when payment is verified

## ⚙️ **Environment Configuration**

### **Required Environment Variables:**
```env
# SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password_here
SMTP_FROM_NAME=Havana Food Cart Booking
SMTP_FROM_EMAIL=your_email@gmail.com

# Admin Email
ADMIN_EMAIL=admin@yourdomain.com
```

### **Gmail Setup (Recommended):**
1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate App Password**:
   - Go to Google Account Settings
   - Security → 2-Step Verification → App passwords
   - Generate password for "Mail"
   - Use this password as `SMTP_PASS`

### **Alternative SMTP Providers:**
- **Outlook/Hotmail**: `smtp-mail.outlook.com:587`
- **Yahoo**: `smtp.mail.yahoo.com:587`
- **Custom SMTP**: Use your hosting provider's SMTP settings

## 🧪 **Testing Email Functionality**

### **Test API Endpoints:**
```bash
# Check configuration
GET /api/test/email

# Test configuration only
POST /api/test/email
{
  "action": "configuration"
}

# Test email sending
POST /api/test/email
{
  "action": "sending",
  "testEmail": "test@example.com"
}

# Complete test
POST /api/test/email
{
  "action": "complete",
  "testEmail": "test@example.com"
}
```

### **Manual Testing:**
1. **Create a test booking** through the frontend
2. **Check email delivery** to both customer and admin
3. **Update booking status** in admin panel
4. **Verify payment slip** to trigger payment confirmation

## 📧 **Email Templates**

### **Template Features:**
- **Responsive Design**: Mobile-friendly HTML templates
- **Bilingual Support**: Greek (default) and English
- **Professional Styling**: Matches website design
- **Complete Information**: All booking details included
- **Fallback Text**: Plain text versions for all emails

### **Template Customization:**
- **Styling**: Modify CSS in `lib/email/templates.ts`
- **Content**: Update translations in `lib/email/translations.ts`
- **Layout**: Adjust HTML structure in template renderer

## 🔄 **Email Flow Integration**

### **Booking Creation Flow:**
1. Customer completes booking form
2. Booking saved to database
3. **Customer confirmation email** sent
4. **Admin notification email** sent
5. Success response returned

### **Status Update Flow:**
1. Admin updates booking status
2. Database updated
3. **Status update email** sent to customer
4. Success response returned

### **Payment Verification Flow:**
1. Admin verifies payment slip
2. Booking status updated to "PAID"
3. **Payment confirmation email** sent to customer
4. Success response returned

## 🛠️ **Troubleshooting**

### **Common Issues:**

#### **1. SMTP Connection Failed**
```
Error: Email connection verification failed
```
**Solutions:**
- Verify SMTP credentials
- Check firewall settings
- Ensure 2FA is enabled for Gmail
- Use app password instead of regular password

#### **2. Authentication Failed**
```
Error: Invalid login credentials
```
**Solutions:**
- Double-check email and password
- Use app password for Gmail
- Verify account permissions

#### **3. Emails Not Delivered**
```
Error: Email sending failed
```
**Solutions:**
- Check spam folder
- Verify recipient email address
- Check SMTP provider limits
- Test with different email provider

#### **4. Template Rendering Issues**
```
Error: Template rendering failed
```
**Solutions:**
- Check booking data structure
- Verify translation keys exist
- Check for missing required fields

### **Debug Mode:**
Enable detailed logging by setting:
```env
NODE_ENV=development
```

## 📊 **Monitoring & Logging**

### **Email Logs:**
- **Success**: `✅ Customer confirmation email sent to user@example.com`
- **Failure**: `❌ Failed to send customer email: SMTP connection failed`
- **Configuration**: `⚠️ ADMIN_EMAIL not configured - skipping email notifications`

### **Performance Monitoring:**
- Email sending is **non-blocking** - booking creation continues even if emails fail
- **Error handling** prevents system crashes
- **Retry logic** can be implemented for failed sends

## 🔒 **Security Considerations**

### **Email Security:**
- **SMTP over TLS**: Encrypted email transmission
- **App Passwords**: Use dedicated app passwords, not main passwords
- **Environment Variables**: Never commit credentials to code
- **Rate Limiting**: Respect SMTP provider limits

### **Data Privacy:**
- **Customer Data**: Only necessary information included in emails
- **Admin Access**: Email testing requires admin privileges
- **Logging**: Sensitive data not logged in plain text

## 🚀 **Production Deployment**

### **Plesk Configuration:**
1. **Add environment variables** in Plesk
2. **Test email functionality** after deployment
3. **Monitor email delivery** rates
4. **Set up email monitoring** alerts

### **Performance Optimization:**
- **Async Email Sending**: Emails sent in background
- **Error Handling**: Graceful failure handling
- **Connection Pooling**: Reuse SMTP connections
- **Template Caching**: Cache rendered templates

## 📈 **Future Enhancements**

### **Planned Features:**
- **Email Templates Editor**: Admin interface for template customization
- **Email Analytics**: Track open rates and delivery status
- **Bulk Email**: Send newsletters and promotions
- **Email Scheduling**: Schedule reminder emails
- **Advanced Templates**: Dynamic content based on customer preferences

### **Integration Opportunities:**
- **Email Marketing**: Integrate with Mailchimp, SendGrid
- **SMS Notifications**: Add SMS as backup communication
- **Push Notifications**: Browser/mobile push notifications
- **WhatsApp Integration**: Alternative communication channel

---

## 📞 **Support**

If you encounter issues with email configuration:

1. **Check the logs** for specific error messages
2. **Test configuration** using the test API endpoints
3. **Verify environment variables** are correctly set
4. **Test with different SMTP providers** if needed
5. **Contact support** with detailed error information

**Email System Status**: ✅ Fully Implemented and Ready for Production
