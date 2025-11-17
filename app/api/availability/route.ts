import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/availability - Check cart availability for specific date(s)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const cartId = searchParams.get('cartId')
    const date = searchParams.get('date')
    const dates = searchParams.get('dates') // Support multiple dates as JSON array
    const startTime = searchParams.get('startTime')
    const endTime = searchParams.get('endTime')
    const excludeBookingId = searchParams.get('excludeBookingId') // For edit mode: exclude current booking

    if (!cartId || (!date && !dates)) {
      return NextResponse.json(
        { error: 'cartId and date(s) are required' },
        { status: 400 }
      )
    }

    // Handle multiple dates if provided
    if (dates) {
      try {
        const dateArray = JSON.parse(dates)
        if (!Array.isArray(dateArray)) {
          return NextResponse.json(
            { error: 'dates must be a JSON array' },
            { status: 400 }
          )
        }

        const results = []
        for (const dateObj of dateArray) {
          const { date: checkDate, startTime: checkStartTime, endTime: checkEndTime } = dateObj
          if (!checkDate || !checkStartTime || !checkEndTime) {
            continue
          }

          const parsedDate = new Date(checkDate)
          if (isNaN(parsedDate.getTime())) {
            continue
          }

          // Check for conflicts in the new BookingDate model
          const existingBookingDates = await (prisma as any).bookingDate.findMany({
            where: {
              date: parsedDate,
              booking: {
                cartId: cartId,
                status: {
                  in: ['PENDING', 'CONFIRMED']
                }
              }
            },
            select: {
              id: true,
              startTime: true,
              endTime: true,
              date: true,
              booking: {
                select: {
                  id: true,
                  customerFirstName: true,
                  customerLastName: true
                }
              }
            }
          })

          // FIXED: Correct time overlap logic
          // Two time ranges [A_start, A_end] and [B_start, B_end] overlap if: A_start < B_end AND B_start < A_end
          const conflictingBooking = existingBookingDates.find((bookingDate: any) => {
            return checkStartTime < bookingDate.endTime && bookingDate.startTime < checkEndTime
          })

          results.push({
            date: checkDate,
            startTime: checkStartTime,
            endTime: checkEndTime,
            isAvailable: !conflictingBooking,
            conflictingBooking: conflictingBooking || null,
            bookedSlots: existingBookingDates
          })
        }

        return NextResponse.json({
          cartId,
          type: 'multiple',
          results
        })
      } catch (error) {
        return NextResponse.json(
          { error: 'Invalid dates format' },
          { status: 400 }
        )
      }
    }

    // Validate and parse the date
    if (!date) {
      return NextResponse.json(
        { error: 'Date is required' },
        { status: 400 }
      )
    }
    
    const parsedDate = new Date(date)
    if (isNaN(parsedDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date provided' },
        { status: 400 }
      )
    }

    // Get existing booking dates for the cart on the specified date
    const existingBookingDates = await (prisma as any).bookingDate.findMany({
      where: {
        date: parsedDate,
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
        startTime: true,
        endTime: true,
        date: true,
        booking: {
          select: {
            id: true,
            customerFirstName: true,
            customerLastName: true
          }
        }
      }
    })

    // If specific time range is provided, check for conflicts with that time
    if (startTime && endTime) {
      // FIXED: Correct time overlap logic
      // Two time ranges [A_start, A_end] and [B_start, B_end] overlap if: A_start < B_end AND B_start < A_end
      const conflictingBooking = existingBookingDates.find((bookingDate: any) => {
        return startTime < bookingDate.endTime && bookingDate.startTime < endTime
      })

      return NextResponse.json({
        cartId,
        date,
        startTime,
        endTime,
        isAvailable: !conflictingBooking,
        conflictingBooking: conflictingBooking || null,
        bookedSlots: existingBookingDates
      })
    }

    // Default behavior - return all booking dates for the date
    return NextResponse.json({
      cartId,
      date,
      bookedSlots: existingBookingDates,
      availableSlots: [] // No predefined slots, using custom time selection
    })
  } catch (error) {
    console.error('Error checking availability:', error)
    return NextResponse.json(
      { error: 'Failed to check availability' },
      { status: 500 }
    )
  }
}