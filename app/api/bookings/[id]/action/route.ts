import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyBookingToken } from '@/lib/bookingTokens'
import { emailService, getCustomerLanguage } from '@/lib/email'
import { type BookingEmailData } from '@/lib/email/utils'

// POST /api/bookings/[id]/action - Handle booking actions (confirm, cancel, submit-payment)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params // Next.js 15: await params
    const body = await request.json()
    const { action, token, data } = body
    
    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      )
    }

    if (!action) {
      return NextResponse.json(
        { error: 'Action is required' },
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

    // Fetch booking
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        cart: true
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

    const adminEmail = process.env.ADMIN_EMAIL
    const customerLanguage = getCustomerLanguage(booking.customerCountry)

    // Prepare email data
    const emailData: BookingEmailData = {
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
      paymentMethod: booking.paymentMethod,
      status: booking.status,
      paymentStatus: booking.paymentStatus,
      createdAt: booking.createdAt.toISOString(),
      cartName: booking.cart?.name || '',
      cartLocation: booking.cart?.location || '',
      selectedDates: bookingDates.map((date: any) => ({
        date: date.date.toISOString().split('T')[0],
        startTime: date.startTime,
        endTime: date.endTime,
        totalHours: date.totalHours,
        cartCost: date.cartCost
      })),
      shippingAmount: booking.shippingAmount,
      couponCode: booking.couponCode,
      discountAmount: booking.discountAmount
    }

    // Handle different actions
    switch (action) {
      case 'confirm': {
        // Check if booking can be confirmed (must be PENDING)
        if (booking.status === 'CONFIRMED') {
          return NextResponse.json({
            error: 'This booking has already been confirmed. Please contact support if you need to make changes.',
            alreadyProcessed: true
          }, { status: 400 })
        }

        if (booking.status === 'CANCELLED') {
          return NextResponse.json({
            error: 'This booking has been cancelled and cannot be confirmed. Please contact support.',
            alreadyProcessed: true
          }, { status: 400 })
        }

        if (booking.status === 'COMPLETED') {
          return NextResponse.json({
            error: 'This booking has already been completed.',
            alreadyProcessed: true
          }, { status: 400 })
        }

        // Update booking status to CONFIRMED
        await prisma.booking.update({
          where: { id },
          data: {
            status: 'CONFIRMED',
            updatedAt: new Date()
          }
        })

        // Send confirmation emails
        try {
          await emailService.sendBookingStatusUpdate(
            booking.customerEmail,
            { ...emailData, status: 'CONFIRMED' },
            'CONFIRMED',
            customerLanguage
          )

          if (adminEmail) {
            await emailService.sendAdminNotification(
              adminEmail,
              { ...emailData, status: 'CONFIRMED' },
              'el'
            )
          }
        } catch (emailError) {
          console.error('Failed to send confirmation emails:', emailError)
        }

        return NextResponse.json({
          success: true,
          message: 'Booking confirmed successfully'
        })
      }

      case 'cancel': {
        // Check if booking can be cancelled
        if (booking.status === 'CANCELLED') {
          return NextResponse.json({
            error: 'This booking has already been cancelled.',
            alreadyProcessed: true
          }, { status: 400 })
        }

        if (booking.status === 'COMPLETED') {
          return NextResponse.json({
            error: 'This booking has been completed and cannot be cancelled. Please contact support.',
            alreadyProcessed: true
          }, { status: 400 })
        }

        if (booking.status === 'CONFIRMED') {
          return NextResponse.json({
            error: 'This booking has already been confirmed. Please contact support to cancel: support@havana.gr',
            requiresSupport: true
          }, { status: 400 })
        }

        const cancellationReason = data?.reason || 'Customer cancelled via email link'

        // Update booking status to CANCELLED
        await prisma.booking.update({
          where: { id },
          data: {
            status: 'CANCELLED',
            specialNotes: booking.specialNotes 
              ? `${booking.specialNotes}\n\nCancellation: ${cancellationReason}`
              : `Cancellation: ${cancellationReason}`,
            updatedAt: new Date()
          }
        })

        // Send cancellation emails
        try {
          await emailService.sendBookingStatusUpdate(
            booking.customerEmail,
            { ...emailData, status: 'CANCELLED' },
            'CANCELLED',
            customerLanguage
          )

          if (adminEmail) {
            await emailService.sendAdminNotification(
              adminEmail,
              { ...emailData, status: 'CANCELLED' },
              'el'
            )
          }
        } catch (emailError) {
          console.error('Failed to send cancellation emails:', emailError)
        }

        return NextResponse.json({
          success: true,
          message: 'Booking cancelled successfully'
        })
      }

      case 'submit-payment': {
        const paymentSlipUrl = data?.paymentSlipUrl

        if (!paymentSlipUrl) {
          return NextResponse.json(
            { error: 'Payment slip URL is required' },
            { status: 400 }
          )
        }

        // Create or update payment slip record
        try {
          await (prisma as any).paymentSlip.upsert({
            where: {
              bookingId: booking.id
            },
            create: {
              bookingId: booking.id,
              fileName: 'Payment Receipt Link',
              filePath: paymentSlipUrl,
              fileSize: 0,
              mimeType: 'application/url',
              status: 'PENDING'
            },
            update: {
              filePath: paymentSlipUrl,
              fileName: 'Payment Receipt Link',
              uploadedAt: new Date(),
              status: 'PENDING'
            }
          })

          // Update booking payment status to PENDING (awaiting admin verification)
          await prisma.booking.update({
            where: { id },
            data: {
              paymentStatus: 'PENDING',
              updatedAt: new Date()
            }
          })

          // Send notification to admin
          if (adminEmail) {
            await emailService.sendAdminNotification(
              adminEmail,
              {
                ...emailData,
                paymentStatus: 'PENDING',
                specialNotes: `${emailData.specialNotes || ''}\n\nPayment slip submitted: ${paymentSlipUrl}`.trim()
              },
              'el'
            )
          }

          // Send confirmation to customer
          await emailService.sendBookingStatusUpdate(
            booking.customerEmail,
            {
              ...emailData,
              paymentStatus: 'PENDING'
            },
            'PENDING',
            customerLanguage
          )
        } catch (error) {
          console.error('Error creating payment slip:', error)
          return NextResponse.json(
            { error: 'Failed to submit payment proof' },
            { status: 500 }
          )
        }

        return NextResponse.json({
          success: true,
          message: 'Payment proof submitted successfully'
        })
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Error processing booking action:', error)
    return NextResponse.json(
      { error: 'Failed to process action' },
      { status: 500 }
    )
  }
}

