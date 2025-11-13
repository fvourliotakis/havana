import jwt from 'jsonwebtoken'

export interface BookingTokenPayload {
  bookingId: string
  customerEmail: string
  iat?: number
  exp?: number
}

// Use a secure secret from environment or fallback
const JWT_SECRET = process.env.JWT_SECRET || 'havana-booking-secret-change-in-production'

// Token expiry: 14 days
const TOKEN_EXPIRY = '14d'

/**
 * Generate a secure JWT token for booking email actions
 * @param bookingId - The booking ID
 * @param customerEmail - Customer's email for verification
 * @returns JWT token string
 */
export function generateBookingToken(bookingId: string, customerEmail: string): string {
  const payload: BookingTokenPayload = {
    bookingId,
    customerEmail
  }

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: TOKEN_EXPIRY
  })
}

/**
 * Verify and decode a booking token
 * @param token - JWT token string
 * @returns Decoded payload or null if invalid
 */
export function verifyBookingToken(token: string): BookingTokenPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as BookingTokenPayload
    return decoded
  } catch (error) {
    console.error('Token verification failed:', error)
    return null
  }
}

/**
 * Check if a token is expired without throwing
 * @param token - JWT token string
 * @returns true if expired, false otherwise
 */
export function isTokenExpired(token: string): boolean {
  try {
    jwt.verify(token, JWT_SECRET)
    return false
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      return true
    }
    return false
  }
}

