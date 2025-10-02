import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendBookingStatusUpdateEmail, getCustomerLanguage, type BookingEmailData } from '@/lib/email'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

// GET /api/bookings/[id] - Get specific booking
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    const booking = await prisma.booking.findUnique({
      where: {
        id: id
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        cart: {
          select: {
            id: true,
            name: true,
            location: true,
            pricePerHour: true
          }
        },
        bookingItems: {
          include: {
            foodItem: {
              select: {
                id: true,
                name: true,
                description: true,
                price: true,
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

    return NextResponse.json(booking)
  } catch (error) {
    console.error('Error fetching booking:', error)
    return NextResponse.json(
      { error: 'Failed to fetch booking' },
      { status: 500 }
    )
  }
}

// PUT /api/bookings/[id] - Update booking status
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const body = await request.json()
    const { status, paymentStatus, specialNotes } = body

    // TODO: Add authentication and authorization checks

    const updatedBooking = await prisma.booking.update({
      where: {
        id: id
      },
      data: {
        ...(status && { status }),
        ...(paymentStatus && { paymentStatus }),
        ...(specialNotes !== undefined && { specialNotes })
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        cart: {
          select: {
            id: true,
            name: true,
            location: true
          }
        },
        bookingItems: {
          include: {
            foodItem: {
              select: {
                id: true,
                name: true,
                category: true
              }
            }
          }
        }
      }
    })

    // TODO: Send notification email on status change

    // Send status update email to customer
    try {
      if (status && updatedBooking.customerEmail) {
        // Prepare email data
        const emailData: BookingEmailData = {
          id: updatedBooking.id,
          customerFirstName: updatedBooking.customerFirstName,
          customerLastName: updatedBooking.customerLastName,
          customerEmail: updatedBooking.customerEmail,
          customerPhone: updatedBooking.customerPhone,
          customerAddress: updatedBooking.customerAddress,
          customerCity: updatedBooking.customerCity,
          customerState: updatedBooking.customerState,
          customerZip: updatedBooking.customerZip,
          customerCountry: updatedBooking.customerCountry,
          eventType: updatedBooking.eventType || 'Unknown Event',
          guestCount: updatedBooking.guestCount || 0,
          specialNotes: updatedBooking.specialNotes || '',
          totalAmount: updatedBooking.totalAmount || 0,
          paymentMethod: updatedBooking.paymentMethod || 'unknown',
          status: updatedBooking.status || 'PENDING',
          paymentStatus: updatedBooking.paymentStatus || 'PENDING',
          createdAt: updatedBooking.createdAt.toISOString(),
          cartName: updatedBooking.cart?.name || 'Unknown Cart',
          cartLocation: updatedBooking.cart?.location || 'Unknown Location',
          selectedDates: [], // Will be populated if needed
          selectedItems: updatedBooking.bookingItems?.map(item => ({
            name: item.foodItem?.name || 'Unknown Item',
            quantity: item.quantity,
            price: item.price
          })),
          selectedServices: [],
          shippingAmount: 0,
          couponCode: undefined,
          discountAmount: 0
        }

        // Determine customer language preference
        const customerLanguage = getCustomerLanguage(updatedBooking.customerCountry)

        // Send status update email
        const emailResult = await sendBookingStatusUpdateEmail(
          emailData,
          status,
          customerLanguage
        )

        if (emailResult.success) {
          console.log(`✅ Status update email sent to ${updatedBooking.customerEmail}`)
        } else {
          console.error(`❌ Failed to send status update email: ${emailResult.error}`)
        }
      }
    } catch (emailError) {
      console.error('❌ Status update email sending failed:', emailError)
      // Don't fail the status update if email fails
    }

    return NextResponse.json(updatedBooking)
  } catch (error) {
    console.error('Error updating booking:', error)
    return NextResponse.json(
      { error: 'Failed to update booking' },
      { status: 500 }
    )
  }
}

// DELETE /api/bookings/[id] - Cancel booking
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    // TODO: Add authentication and authorization checks
    // TODO: Check cancellation policy

    const updatedBooking = await prisma.booking.update({
      where: {
        id: id
      },
      data: {
        status: 'CANCELLED'
      }
    })

    // TODO: Process refund if applicable
    // TODO: Send cancellation email

    return NextResponse.json({ 
      message: 'Booking cancelled successfully',
      booking: updatedBooking
    })
  } catch (error) {
    console.error('Error cancelling booking:', error)
    return NextResponse.json(
      { error: 'Failed to cancel booking' },
      { status: 500 }
    )
  }
}