import nodemailer from 'nodemailer'

export interface EmailConfig {
  host: string
  port: number
  secure: boolean
  auth: {
    user: string
    pass: string
  }
  from: {
    name: string
    email: string
  }
}

export const getEmailConfig = (): EmailConfig => {
  return {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || ''
    },
    from: {
      name: process.env.SMTP_FROM_NAME || 'Havana Food Cart Booking',
      email: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || ''
    }
  }
}

export const createTransporter = () => {
  const config = getEmailConfig()
  
  if (!config.auth.user || !config.auth.pass) {
    throw new Error('SMTP credentials not configured. Please set SMTP_USER and SMTP_PASS environment variables.')
  }

  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.auth,
    tls: {
      rejectUnauthorized: false
    }
  })
}

export const verifyEmailConnection = async (): Promise<boolean> => {
  try {
    const transporter = createTransporter()
    await transporter.verify()
    return true
  } catch (error) {
    console.error('Email connection verification failed:', error)
    return false
  }
}
