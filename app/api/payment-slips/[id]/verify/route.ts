import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendPaymentConfirmationEmail, getCustomerLanguage, type BookingEmailData } from '@/lib/email'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

// PUT /api/payment-slips/[id]/verify - Verify or reject payment slip
export async function PUT(request: NextRequest, context: RouteParams) {
  try {
    const params = await context.params
    const { id } = params
    const body = await request.json()
    const { action, adminNotes, verifiedBy } = body

    if (!action || !['verify', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Action must be either "verify" or "reject"' },
        { status: 400 }
      )
    }

    // Find the payment slip
    const paymentSlip = await (prisma as any).paymentSlip.findUnique({
      where: { id },
      include: {
        booking: true
      }
    })

    if (!paymentSlip) {
      return NextResponse.json(
        { error: 'Payment slip not found' },
        { status: 404 }
      )
    }

    const isVerified = action === 'verify'
    const newStatus = isVerified ? 'VERIFIED' : 'REJECTED'

    // Update payment slip
    const updatedSlip = await (prisma as any).paymentSlip.update({
      where: { id },
      data: {
        status: newStatus,
        verifiedAt: new Date(),
        verifiedBy: verifiedBy || 'admin',
        adminNotes: adminNotes || null
      }
    })

    // Update booking status based on verification
    const updatedBooking = await prisma.booking.update({
      where: { id: paymentSlip.bookingId },
      data: {
        paymentStatus: isVerified ? 'PAID' : 'FAILED',
        status: isVerified ? 'CONFIRMED' : 'PENDING'
      },
      include: {
        cart: {
          select: {
            name: true,
            location: true
          }
        }
      }
    })

    // Send payment confirmation email if verified
    try {
      if (isVerified && updatedBooking.customerEmail) {
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
          selectedItems: [],
          selectedServices: [],
          shippingAmount: 0,
          couponCode: undefined,
          discountAmount: 0
        }

        // Determine customer language preference
        const customerLanguage = getCustomerLanguage(updatedBooking.customerCountry)

        // Send payment confirmation email
        const emailResult = await sendPaymentConfirmationEmail(
          emailData,
          customerLanguage
        )

        if (emailResult.success) {
          console.log(`✅ Payment confirmation email sent to ${updatedBooking.customerEmail}`)
        } else {
          console.error(`❌ Failed to send payment confirmation email: ${emailResult.error}`)
        }
      }
    } catch (emailError) {
      console.error('❌ Payment confirmation email sending failed:', emailError)
      // Don't fail the verification if email fails
    }

    return NextResponse.json({
      success: true,
      paymentSlip: updatedSlip,
      message: isVerified 
        ? 'Payment slip verified and booking confirmed'
        : 'Payment slip rejected'
    })
  } catch (error) {
    console.error('Error verifying payment slip:', error)
    return NextResponse.json(
      { error: 'Failed to verify payment slip' },
      { status: 500 }
    )
  }
}