# 🚀 Complete Step-by-Step Plesk Deployment Guide

## 📋 **PHASE 1: PREPARATION (Before Plesk)**

### Step 1: Generate Environment Secrets
1. Open Command Prompt/Terminal in your `havana` folder
2. Run this command to generate secure secrets:
   ```bash
   node setup-env.js
   ```
3. Copy the generated secrets (save them for Step 3)

### Step 2: Get Your Credentials Ready
Collect these before starting:
- **PayPal Credentials**: Client ID & Secret from PayPal Developer Dashboard
- **Domain Name**: Your website domain (e.g., yourbookingsystem.com)
- **Admin Email & Password**: For your admin panel access

### Step 3: Create .env File
1. In your `havana` folder, create a new file called `.env`
2. Copy this content and replace the placeholder values:

```env
# Database Configuration (already configured in your schema.prisma)
DATABASE_URL="mysql://u648271573_havana:Simple@0320@srv1647.hstgr.io:3306/u648271573_booking"

# Environment
NODE_ENV=production

# PayPal Configuration (REPLACE WITH YOUR ACTUAL CREDENTIALS)
PAYPAL_CLIENT_ID=your_actual_paypal_client_id_here
PAYPAL_CLIENT_SECRET=your_actual_paypal_secret_here
NEXT_PUBLIC_PAYPAL_CLIENT_ID=your_actual_paypal_client_id_here

# Authentication Secrets (USE THE GENERATED ONES FROM STEP 1)
NEXTAUTH_SECRET=paste_generated_secret_here
NEXTAUTH_URL=https://yourdomain.com

# Admin Configuration (CHANGE THESE)
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=your_secure_admin_password

# File Upload Configuration
UPLOAD_DIR=/uploads
MAX_FILE_SIZE=10485760

# Security (USE THE GENERATED ONE FROM STEP 1)
JWT_SECRET=paste_generated_jwt_secret_here

# Email Configuration (SMTP Settings)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password_here
SMTP_FROM_NAME=Havana Food Cart Booking
SMTP_FROM_EMAIL=your_email@gmail.com
```

### Step 4: Create ZIP File
1. Select your entire `havana` folder
2. Right-click → "Send to" → "Compressed (zipped) folder"
3. Name it `havana.zip`

---

## 📁 **PHASE 2: UPLOAD TO PLESK**

### Step 5: Access Plesk
1. Open your web browser
2. Go to your Plesk URL (usually: `https://yourserver.com:8443`)
3. Login with your Plesk credentials

### Step 6: Navigate to File Manager
1. Click on your domain name in Plesk dashboard
2. Click **"File Manager"** in the left sidebar
3. You'll see folders like `httpdocs`, `logs`, etc.

### Step 7: Upload Your Project
1. Double-click the **`httpdocs`** folder to open it
2. Click **"Upload"** button at the top
3. Select your `havana.zip` file
4. Wait for upload to complete
5. Right-click the uploaded `havana.zip`
6. Select **"Extract Archive"**
7. Delete the `havana.zip` file after extraction

---

## ⚙️ **PHASE 3: CONFIGURE NODE.JS IN PLESK**

### Step 8: Enable Node.js
1. Go back to your domain dashboard in Plesk
2. Look for **"Node.js"** in the left sidebar and click it
3. Click **"Enable Node.js"** button

### Step 9: Configure Node.js Settings
Fill in these exact values:

- **Node.js version**: Select `18.x` or higher
- **Document root**: `/httpdocs/havana`
- **Application root**: `/httpdocs/havana`
- **Application startup file**: `server.js`
- **Application mode**: `production`

### Step 10: Add Environment Variables
1. Scroll down to **"Environment Variables"** section
2. Click **"Add Variable"** for each of these:

**Add these variables one by one:**
```
NODE_ENV = production
DATABASE_URL = mysql://u648271573_havana:Simple@0320@srv1647.hstgr.io:3306/u648271573_booking
PAYPAL_CLIENT_ID = your_actual_paypal_client_id
PAYPAL_CLIENT_SECRET = your_actual_paypal_secret
NEXT_PUBLIC_PAYPAL_CLIENT_ID = your_actual_paypal_client_id
NEXTAUTH_SECRET = your_generated_nextauth_secret
NEXTAUTH_URL = https://yourdomain.com
ADMIN_EMAIL = admin@yourdomain.com
ADMIN_PASSWORD = your_secure_admin_password
UPLOAD_DIR = /uploads
MAX_FILE_SIZE = 10485760
JWT_SECRET = your_generated_jwt_secret
```

3. Click **"Save"** after adding all variables

---

## 🔧 **PHASE 4: INSTALL & BUILD**

### Step 11: Open Terminal
1. In Plesk, go to **"File Manager"**
2. Navigate to `httpdocs/havana`
3. Click **"Open in Terminal"** button (or use SSH)

### Step 12: Install Dependencies
Run these commands **one by one**:

```bash
# Navigate to project directory
cd /var/www/vhosts/yourdomain.com/httpdocs/havana

# Install Node.js dependencies
npm install

# Generate Prisma client
npx prisma generate

# Build the Next.js application
npm run build
```

**Wait for each command to complete before running the next one.**

### Step 13: Database Setup
```bash
# Run database migrations
npx prisma migrate deploy

# Create uploads directory
mkdir -p public/uploads/payment-slips

# Set permissions
chmod 755 public/uploads
chmod 755 public/uploads/payment-slips
```

---

## 🌐 **PHASE 5: DOMAIN & SSL CONFIGURATION**

### Step 14: Domain Setup
1. In Plesk, go to **"Hosting Settings"** for your domain
2. Make sure **"Document root"** points to `/httpdocs/havana`
3. Enable **"PHP support"** if not already enabled

### Step 15: SSL Certificate
1. Go to **"SSL/TLS Certificates"** in Plesk
2. Click **"Install"** next to Let's Encrypt
3. Select your domain and click **"Get it free"**
4. Wait for SSL installation to complete

### Step 16: Force HTTPS
1. Go to **"Hosting Settings"**
2. Check **"Permanent SEO-safe 301 redirect from HTTP to HTTPS"**
3. Click **"Apply"**

---

## 🚀 **PHASE 6: START APPLICATION**

### Step 17: Start Node.js App
1. Go back to **"Node.js"** section in Plesk
2. Click **"NPM Install"** button (wait for completion)
3. Click **"Restart App"** button
4. Status should show **"Running"**

### Step 18: Test Your Application
1. Open your browser
2. Go to `https://yourdomain.com`
3. You should see your booking system!

---

## ✅ **PHASE 7: VERIFICATION & TESTING**

### Step 19: Test All Features
- **Frontend**: Visit your website and test booking flow
- **Admin Panel**: Go to `https://yourdomain.com/admin/login`
- **Database**: Make a test booking to verify database connection
- **PayPal**: Test payment processing
- **File Uploads**: Test payment slip upload functionality

### Step 20: Monitor Logs
1. In Plesk **"Node.js"** section, click **"Logs"**
2. Check for any errors
3. Application should show "Ready on http://localhost:3000"

---

## 🔧 **TROUBLESHOOTING COMMON ISSUES**

### If App Won't Start:
1. Check **Node.js Logs** in Plesk
2. Verify all environment variables are set correctly
3. Run `npm run build` again in terminal
4. Restart the app

### If Database Connection Fails:
1. Verify DATABASE_URL in environment variables
2. Check if your IP is whitelisted in database hosting
3. Test connection: `npx prisma db pull`

### If PayPal Doesn't Work:
1. Verify PayPal credentials in environment variables
2. Check PayPal sandbox vs live environment settings
3. Ensure NEXT_PUBLIC_PAYPAL_CLIENT_ID is set

### If File Uploads Fail:
1. Check directory permissions: `chmod 755 public/uploads`
2. Verify UPLOAD_DIR environment variable
3. Check file size limits

---

## 🎉 **SUCCESS CHECKLIST**

Your deployment is successful when:
- ✅ Website loads at your domain
- ✅ Admin panel accessible at `/admin/login`
- ✅ Can make test bookings
- ✅ PayPal payments work
- ✅ File uploads work
- ✅ No errors in Node.js logs

---

## 📞 **NEED HELP?**

If you encounter issues:
1. Check Plesk Node.js logs first
2. Verify all environment variables
3. Ensure database connection works
4. Test each feature individually

**Your booking system should now be live at your domain! 🎉**



