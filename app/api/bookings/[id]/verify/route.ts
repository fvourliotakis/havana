import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyBookingToken } from '@/lib/bookingTokens'

// GET /api/bookings/[id]/verify?token=xxx - Verify token and return booking details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params // Next.js 15: await params
    const token = request.nextUrl.searchParams.get('token')
    
    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      )
    }

    // Verify token
    const tokenData = verifyBookingToken(token)
    
    if (!tokenData) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      )
    }

    // Verify booking ID matches token
    if (tokenData.bookingId !== id) {
      return NextResponse.json(
        { error: 'Token does not match booking' },
        { status: 401 }
      )
    }

    // Fetch booking details with related data
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        cart: {
          select: {
            id: true,
            name: true,
            location: true,
            image: true
          }
        },
        bookingItems: {
          include: {
            foodItem: {
              select: {
                id: true,
                name: true,
                price: true,
                category: true
              }
            }
          }
        },
        bookingServices: {
          include: {
            service: {
              select: {
                id: true,
                name: true,
                pricePerHour: true,
                category: true
              }
            }
          }
        }
      }
    })

    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      )
    }

    // Verify email matches token
    if (booking.customerEmail !== tokenData.customerEmail) {
      return NextResponse.json(
        { error: 'Token does not match booking customer' },
        { status: 401 }
      )
    }

    // Get booking dates
    const bookingDates = await (prisma as any).bookingDate.findMany({
      where: { bookingId: id },
      orderBy: { date: 'asc' }
    })

    // Get bank details if applicable
    let bankDetails = null
    if (booking.paymentMethod === 'bank_transfer' && (booking as any).selectedBankId) {
      try {
        bankDetails = await (prisma as any).bankConfig.findUnique({
          where: { id: (booking as any).selectedBankId },
          select: {
            id: true,
            bankName: true,
            accountHolder: true,
            iban: true,
            swiftCode: true,
            instructions: true
          }
        })
      } catch (error) {
        console.error('Error fetching bank details:', error)
      }
    }

    // Transform booking data
    const transformedBooking = {
      id: booking.id,
      customerFirstName: booking.customerFirstName,
      customerLastName: booking.customerLastName,
      customerEmail: booking.customerEmail,
      customerPhone: booking.customerPhone,
      customerAddress: booking.customerAddress,
      customerCity: booking.customerCity,
      customerState: booking.customerState,
      customerZip: booking.customerZip,
      customerCountry: booking.customerCountry,
      eventType: booking.eventType,
      guestCount: booking.guestCount,
      specialNotes: booking.specialNotes,
      totalAmount: booking.totalAmount,
      cartServiceAmount: booking.cartServiceAmount,
      servicesAmount: booking.servicesAmount,
      foodAmount: booking.foodAmount,
      shippingAmount: booking.shippingAmount,
      paymentMethod: booking.paymentMethod,
      paymentStatus: booking.paymentStatus,
      status: booking.status,
      cart: booking.cart,
      selectedItems: booking.bookingItems,
      selectedServices: booking.bookingServices,
      bookingDates: bookingDates || [],
      createdAt: booking.createdAt?.toISOString(),
      updatedAt: booking.updatedAt?.toISOString()
    }

    return NextResponse.json({
      success: true,
      booking: transformedBooking,
      bankDetails
    })
  } catch (error) {
    console.error('Error verifying booking:', error)
    return NextResponse.json(
      { error: 'Failed to verify booking' },
      { status: 500 }
    )
  }
}

