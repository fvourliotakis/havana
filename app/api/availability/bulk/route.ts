import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/availability/bulk - Get all booked dates for a cart within a date range
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const cartId = searchParams.get('cartId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const excludeBookingId = searchParams.get('excludeBookingId') // For edit mode: exclude current booking

    if (!cartId || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'cartId, startDate and endDate are required' },
        { status: 400 }
      )
    }

    // Parse dates
    const parsedStartDate = new Date(startDate)
    const parsedEndDate = new Date(endDate)
    
    if (isNaN(parsedStartDate.getTime()) || isNaN(parsedEndDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format provided' },
        { status: 400 }
      )
    }

    // Get all booking dates for the cart within the date range
    const bookedDates = await (prisma as any).bookingDate.findMany({
      where: {
        date: {
          gte: parsedStartDate,
          lte: parsedEndDate
        },
        booking: {
          cartId: cartId,
          status: {
            in: ['PENDING', 'CONFIRMED']
          },
          // Exclude current booking in edit mode
          ...(excludeBookingId && { id: { not: excludeBookingId } })
        }
      },
      select: {
        id: true,
        date: true,
        startTime: true,
        endTime: true,
        booking: {
          select: {
            id: true,
            customerFirstName: true,
            customerLastName: true,
            status: true
          }
        }
      },
      orderBy: [
        { date: 'asc' },
        { startTime: 'asc' }
      ]
    })

    // Group booked dates by date for easier lookup
    const groupedBookedDates: { [date: string]: any[] } = {}
    
    bookedDates.forEach((bookingDate: any) => {
      const dateKey = bookingDate.date.toISOString().split('T')[0]
      if (!groupedBookedDates[dateKey]) {
        groupedBookedDates[dateKey] = []
      }
      groupedBookedDates[dateKey].push({
        id: bookingDate.id,
        startTime: bookingDate.startTime,
        endTime: bookingDate.endTime,
        bookingId: bookingDate.booking.id,
        customerName: `${bookingDate.booking.customerFirstName} ${bookingDate.booking.customerLastName}`,
        status: bookingDate.booking.status
      })
    })

    return NextResponse.json({
      cartId,
      startDate,
      endDate,
      bookedDates: groupedBookedDates,
      totalBookings: bookedDates.length
    })
  } catch (error) {
    console.error('Error fetching bulk availability:', error)
    return NextResponse.json(
      { error: 'Failed to fetch availability data' },
      { status: 500 }
    )
  }
}
