import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendBookingConfirmationEmails, getCustomerLanguage, type BookingEmailData } from '@/lib/email'

// GET /api/bookings - Get bookings (with filters)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const cartId = searchParams.get('cartId')
    const date = searchParams.get('date')
    const status = searchParams.get('status')

    const where: any = {}

    if (cartId) {
      where.cartId = cartId
    }

    if (date) {
      const parsedDate = new Date(date)
      if (!isNaN(parsedDate.getTime())) {
        where.bookingDate = parsedDate
      }
    }

    if (status) {
      where.status = status
    }

    // Add search functionality
    const search = searchParams.get('search')
    if (search) {
      where.OR = [
        {
          customerFirstName: {
            contains: search,
            mode: 'insensitive'
          }
        },
        {
          customerLastName: {
            contains: search,
            mode: 'insensitive'
          }
        },
        {
          customerEmail: {
            contains: search,
            mode: 'insensitive'
          }
        },
        {
          cart: {
            name: {
              contains: search,
              mode: 'insensitive'
            }
          }
        }
      ]
    }

    // Get pagination params
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')

    // Get total count for pagination (before applying pagination)
    const totalCount = await prisma.booking.count({ where })

    const bookings = await prisma.booking.findMany({
      where,
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
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip: (page - 1) * limit,
      take: limit
    })



    // Get payment slips for all bookings (if table exists)
    let paymentSlipMap: Record<string, any> = {}
    try {
      const bookingIds = bookings.map((b: any) => b.id)
      const paymentSlips = await (prisma as any).paymentSlip.findMany({
        where: {
          bookingId: {
            in: bookingIds
          }
        }
      })

      // Create a map of payment slips by booking ID
      paymentSlipMap = paymentSlips.reduce((acc: any, slip: any) => {
        acc[slip.bookingId] = slip
        return acc
      }, {} as Record<string, any>)
    } catch (error) {
      // PaymentSlip table doesn't exist yet, skip
      console.log('PaymentSlip table not found, skipping payment slip data')
    }

    // Get booking dates for all bookings (if table exists)
    let bookingDatesMap: Record<string, any[]> = {}
    try {
      const bookingIds = bookings.map((b: any) => b.id)
      const bookingDates = await (prisma as any).bookingDate.findMany({
        where: {
          bookingId: {
            in: bookingIds
          }
        },
        orderBy: {
          date: 'asc'
        }
      })

      // Create a map of booking dates by booking ID
      bookingDatesMap = bookingDates.reduce((acc: any, bookingDate: any) => {
        if (!acc[bookingDate.bookingId]) {
          acc[bookingDate.bookingId] = []
        }
        acc[bookingDate.bookingId].push(bookingDate)
        return acc
      }, {} as Record<string, any[]>)
    } catch (error) {
      // BookingDate table doesn't exist yet, skip
      console.log('BookingDate table not found, skipping booking dates data')
    }

    // Transform bookings to match expected format
    const transformedBookings = bookings.map((booking: any) => ({
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
      eventDate: booking.bookingDate?.toISOString().split('T')[0] || '',
      startTime: booking.startTime,
      endTime: booking.endTime,
      guestCount: booking.guestCount,
      totalHours: booking.totalHours,
      totalAmount: booking.totalAmount,
      status: booking.status,
      cartId: booking.cartId,
      cartName: booking.cart?.name || '',
      selectedItems: booking.bookingItems || [],
      selectedServices: booking.bookingServices || [],
      paymentMethod: booking.paymentMethod,
      deliveryMethod: booking.deliveryMethod,
      paymentSlip: paymentSlipMap[booking.id] || null,
      bookingDates: bookingDatesMap[booking.id] || [], // NEW: Multiple dates per booking
      createdAt: booking.createdAt?.toISOString() || '',
      updatedAt: booking.updatedAt?.toISOString() || ''
    }))

    return NextResponse.json({
      bookings: transformedBookings,
      total: totalCount,
      totalPages: Math.ceil(totalCount / limit),
      currentPage: page,
      limit: limit
    })
  } catch (error) {
    console.error('Error fetching bookings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch bookings' },
      { status: 500 }
    )
  }
}

// POST /api/bookings - Create a new booking (or multiple bookings for multiple dates)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      userId,
      selectedCartId,
      selectedDates, // NEW: Array of BookingDate objects
      bookingDate, // Legacy: single date for backward compatibility
      startTime, // Legacy
      endTime, // Legacy
      totalHours, // Legacy
      totalAmount,
      cartServiceAmount,
      servicesAmount,
      foodAmount,
      isCustomTiming,
      timeSlotType,
      customerFirstName,
      customerLastName,
      customerEmail,
      customerPhone,
      customerAddress,
      customerCity,
      customerState,
      customerZip,
      customerCountry,
      eventType,
      guestCount,
      specialNotes,
      selectedItems,
      selectedServices,
      paymentMethod,
      paymentStatus,
      transactionId,
      paymentSlipUrl,
      deliveryMethod,
      shippingAddress,
      shippingCity,
      shippingState,
      shippingZip,
      shippingAmount,
      // Coupon information
      couponCode,
      discountAmount = 0,
      originalAmount
    } = body
    
    const cartId = selectedCartId // Map to expected field name

    // Support both multiple dates and single date (backward compatibility)
    const datesToBook = selectedDates && selectedDates.length > 0 
      ? selectedDates 
      : [{
          date: bookingDate,
          startTime,
          endTime,
          totalHours,
          cartCost: cartServiceAmount || 0
        }]

    // Validate required fields
    if (!cartId) {
      return NextResponse.json(
        { error: 'Cart ID is required' },
        { status: 400 }
      )
    }

    if (!customerFirstName || !customerLastName || !customerEmail || !customerPhone || !customerAddress || !customerCity || !customerState || !customerZip || !customerCountry) {
      return NextResponse.json(
        { error: 'All customer information fields are required' },
        { status: 400 }
      )
    }

    if (!datesToBook || datesToBook.length === 0) {
      return NextResponse.json(
        { error: 'At least one booking date is required' },
        { status: 400 }
      )
    }

    // Validate payment slip URL for bank transfers
    if (paymentMethod === 'bank_transfer' && !paymentSlipUrl) {
      return NextResponse.json(
        { error: 'Payment slip URL is required for bank transfers' },
        { status: 400 }
      )
    }

    // Validate all dates
    for (const dateData of datesToBook) {
      if (!dateData.date || !dateData.startTime || !dateData.endTime) {
        return NextResponse.json(
          { error: 'All booking dates must have date, start time, and end time' },
          { status: 400 }
        )
      }

      const parsedDate = new Date(dateData.date)
      if (isNaN(parsedDate.getTime())) {
        return NextResponse.json(
          { error: `Invalid booking date provided: ${dateData.date}` },
          { status: 400 }
        )
      }
    }

    // Validate that the cart exists and get cart data
    const cartData = await prisma.foodCart.findUnique({
      where: { id: cartId }
    })

    if (!cartData) {
      return NextResponse.json(
        { error: 'Selected cart not found' },
        { status: 404 }
      )
    }

    // OPTIMIZATION 6: Optimized database transaction with timeout
    const booking = await prisma.$transaction(async (tx: any) => {
      // OPTIMIZATION 1: Batch validate all dates and check availability in ONE query
      const dateValidationErrors: string[] = []
      const parsedDates: { originalData: any, parsedDate: Date, dateStr: string }[] = []
      
      // Validate all dates first
      for (const dateData of datesToBook) {
        if (!dateData.date || !dateData.startTime || !dateData.endTime) {
          dateValidationErrors.push('All booking dates must have date, start time, and end time')
          continue
        }

        const parsedDate = new Date(dateData.date)
        if (isNaN(parsedDate.getTime())) {
          dateValidationErrors.push(`Invalid booking date provided: ${dateData.date}`)
          continue
        }

        parsedDates.push({
          originalData: dateData,
          parsedDate,
          dateStr: dateData.date
        })
      }

      if (dateValidationErrors.length > 0) {
        throw new Error(dateValidationErrors.join('; '))
      }

      // OPTIMIZATION 2: Get ALL existing bookings for ALL requested dates in ONE query
      const allRequestedDates = parsedDates.map(d => d.parsedDate)
      const existingBookingDates = await tx.bookingDate.findMany({
        where: {
          date: { in: allRequestedDates },
          booking: {
            cartId: cartId,
            status: { in: ['PENDING', 'CONFIRMED'] }
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
              customerLastName: true
            }
          }
        }
      })

      // OPTIMIZATION 3: Check conflicts for all dates at once
      const conflicts: string[] = []
      for (const { originalData: dateData, parsedDate } of parsedDates) {
        const existingForThisDate = existingBookingDates.filter(
          (existing: any) => existing.date.getTime() === parsedDate.getTime()
        )

        const conflictingBooking = existingForThisDate.find((bookingDate: any) => {
          return dateData.startTime < bookingDate.endTime && bookingDate.startTime < dateData.endTime
        })

        if (conflictingBooking) {
          conflicts.push(`Time slot conflicts with existing booking for ${dateData.date}. Existing: ${conflictingBooking.startTime}-${conflictingBooking.endTime}, Requested: ${dateData.startTime}-${dateData.endTime}`)
        }
      }

      if (conflicts.length > 0) {
        throw new Error(conflicts.join('; '))
      }

      // Create the main booking record
      const newBooking = await tx.booking.create({
        data: {
          userId,
          cart: {
            connect: { id: cartId }
          },
          totalAmount,
          status: paymentMethod === 'reservation' ? 'PENDING' : 'PENDING',
          paymentStatus: paymentStatus || 'PENDING',
          paymentMethod,
          transactionId,
          cartServiceAmount,
          servicesAmount,
          foodAmount,
          isCustomTiming,
          timeSlotType,
          customerFirstName,
          customerLastName,
          customerEmail,
          customerPhone,
          customerAddress,
          customerCity,
          customerState,
          customerZip,
          customerCountry,
          eventType,
          guestCount,
          specialNotes,
          deliveryMethod,
          shippingAddress,
          shippingCity,
          shippingState,
          shippingZip,
          shippingAmount,
          // Coupon information
          couponCode,
          discountAmount: discountAmount || 0, // Ensure it's never null
          originalAmount,
          // For backward compatibility, set legacy fields from the first selected date
          bookingDate: datesToBook[0] ? new Date(datesToBook[0].date) : null,
          startTime: datesToBook[0] ? datesToBook[0].startTime : null,
          endTime: datesToBook[0] ? datesToBook[0].endTime : null,
          totalHours: datesToBook[0] ? datesToBook[0].totalHours : null,
        }
      })

      // OPTIMIZATION 4: Batch create all BookingDate records at once
      const bookingDateRecords = datesToBook.map((dateData: any) => ({
        bookingId: newBooking.id,
        date: new Date(dateData.date),
        startTime: dateData.startTime,
        endTime: dateData.endTime,
        totalHours: dateData.totalHours,
        cartCost: dateData.cartCost,
        isAvailable: dateData.isAvailable || true
      }))
      
      await tx.bookingDate.createMany({
        data: bookingDateRecords
      })

      // Get the created booking dates for return data
      const createdBookingDates = await tx.bookingDate.findMany({
        where: { bookingId: newBooking.id }
      })

      // CRITICAL: Re-validate and apply coupon if provided (REVERTED TO WORKING VERSION)
      if (couponCode && discountAmount > 0) {
        // Find the coupon
        const coupon = await tx.coupon.findUnique({
          where: { code: couponCode.toUpperCase() }
        })
        
        if (!coupon) {
          throw new Error('Invalid coupon code')
        }
        
        // Check if coupon is still active
        if (coupon.status !== 'ACTIVE') {
          throw new Error('This coupon is no longer active')
        }
        
        // Check expiry dates
        const now = new Date()
        if (now < new Date(coupon.validFrom) || now > new Date(coupon.validUntil)) {
          throw new Error('This coupon has expired')
        }
        
        // CRITICAL: Check usage limit in real-time to prevent multiple usage
        if (coupon.usageLimit) {
          const currentUsageCount = await tx.couponUsage.count({
            where: { couponId: coupon.id }
          })
          
          if (currentUsageCount >= coupon.usageLimit) {
            throw new Error('This coupon has reached its usage limit')
          }
        }
        
        // Check minimum order amount
        const orderSubtotal = (selectedDates && selectedDates.length > 0 
          ? selectedDates.reduce((sum: number, date: any) => sum + date.cartCost, 0)
          : (cartServiceAmount || 0)) + 
          (selectedItems?.reduce((sum: any, item: any) => sum + (item.quantity * item.price), 0) || 0) +
          (selectedServices?.reduce((sum: any, service: any) => sum + (service.quantity * service.price), 0) || 0) +
          (shippingAmount || 0)
          
        if (coupon.minOrderAmount && orderSubtotal < coupon.minOrderAmount) {
          throw new Error(`Minimum order amount of €${coupon.minOrderAmount.toFixed(2)} required`)
        }
        
        // Recalculate discount to ensure it's correct
        let recalculatedDiscount = 0
        if (coupon.type === 'PERCENTAGE') {
          recalculatedDiscount = (orderSubtotal * coupon.value) / 100
          if (coupon.maxDiscount && recalculatedDiscount > coupon.maxDiscount) {
            recalculatedDiscount = coupon.maxDiscount
          }
        } else if (coupon.type === 'FIXED_AMOUNT') {
          recalculatedDiscount = Math.min(coupon.value, orderSubtotal)
        }
        
        recalculatedDiscount = Math.min(recalculatedDiscount, orderSubtotal)
        
        // Verify the discount amount matches what user calculated
        if (Math.abs(recalculatedDiscount - discountAmount) > 0.01) {
          throw new Error('Coupon discount amount mismatch - please refresh and try again')
        }
        
        // Create coupon usage record - this MUST succeed for booking to complete
        await tx.couponUsage.create({
          data: {
            couponId: coupon.id,
            bookingId: newBooking.id,
            customerEmail: customerEmail,
            discountAmount: recalculatedDiscount
          }
        })
        
        // Update coupon usage count
        await tx.coupon.update({
          where: { id: coupon.id },
          data: {
            usageCount: { increment: 1 }
          }
        })
      }

      // Create booking items (these are for the entire booking, not per date)
      if (selectedItems && selectedItems.length > 0) {
        await tx.bookingItem.createMany({
          data: selectedItems.map((item: any) => ({
            bookingId: newBooking.id,
            foodItemId: item.itemId,
            quantity: item.quantity,
            price: item.price
          }))
        })
      }

      // Create booking services (these are for the entire booking, not per date)
      if (selectedServices && selectedServices.length > 0) {
        await tx.bookingService.createMany({
          data: selectedServices.map((service: any) => ({
            bookingId: newBooking.id,
            serviceId: service.serviceId,
            quantity: service.quantity,
            hours: service.hours,
            pricePerHour: service.pricePerHour
          }))
        })
      }

      // Create payment slip record if URL is provided (for bank transfers)
      if (paymentSlipUrl && paymentMethod === 'bank_transfer') {
        await (tx as any).paymentSlip.create({
          data: {
            bookingId: newBooking.id,
            fileName: 'Payment Receipt Link',
            filePath: paymentSlipUrl,
            fileSize: 0,
            mimeType: 'application/url',
            status: 'PENDING'
          }
        })
      }

      return newBooking
    }, {
      // OPTIMIZATION 7: Transaction timeout settings for better performance
      maxWait: 10000, // 10 seconds max wait for transaction
      timeout: 30000  // 30 seconds timeout
    })

    // TODO: Send confirmation email
    // TODO: Process payment if not cash

    // Send confirmation emails
    try {
      const adminEmail = process.env.ADMIN_EMAIL
      if (adminEmail) {
        // Prepare email data
        const emailData: BookingEmailData = {
          id: booking.id,
          customerFirstName: customerFirstName,
          customerLastName: customerLastName,
          customerEmail: customerEmail,
          customerPhone: customerPhone,
          customerAddress: customerAddress,
          customerCity: customerCity,
          customerState: customerState,
          customerZip: customerZip,
          customerCountry: customerCountry,
          eventType: eventType,
          guestCount: guestCount,
          specialNotes: specialNotes,
          totalAmount: totalAmount,
          paymentMethod: paymentMethod,
          status: booking.status,
          paymentStatus: booking.paymentStatus,
          createdAt: booking.createdAt.toISOString(),
          cartName: cartData.name,
          cartLocation: cartData.location,
          selectedDates: datesToBook.map((date: any) => ({
            date: date.date,
            startTime: date.startTime,
            endTime: date.endTime,
            totalHours: date.totalHours,
            cartCost: date.cartCost
          })),
          selectedItems: selectedItems?.map((item: any) => ({
            name: item.name || 'Unknown Item',
            quantity: item.quantity,
            price: item.price
          })),
          selectedServices: selectedServices?.map((service: any) => ({
            name: service.name || 'Unknown Service',
            quantity: service.quantity,
            pricePerHour: service.pricePerHour,
            hours: service.hours
          })),
          shippingAmount: shippingAmount,
          couponCode: couponCode,
          discountAmount: discountAmount
        }

        // Determine customer language preference
        const customerLanguage = getCustomerLanguage(customerCountry)

        // Send emails
        const emailResults = await sendBookingConfirmationEmails(
          emailData,
          adminEmail,
          customerLanguage
        )

        // Log email results
        if (emailResults.customerEmail.success) {
          console.log(`✅ Customer confirmation email sent to ${customerEmail}`)
        } else {
          console.error(`❌ Failed to send customer email: ${emailResults.customerEmail.error}`)
        }

        if (emailResults.adminEmail.success) {
          console.log(`✅ Admin notification email sent to ${adminEmail}`)
        } else {
          console.error(`❌ Failed to send admin email: ${emailResults.adminEmail.error}`)
        }
      } else {
        console.warn('⚠️ ADMIN_EMAIL not configured - skipping email notifications')
      }
    } catch (emailError) {
      console.error('❌ Email sending failed:', emailError)
      // Don't fail the booking creation if emails fail
    }

    return NextResponse.json({
      success: true,
      booking,
      message: `Successfully created booking for ${datesToBook.length} date${datesToBook.length !== 1 ? 's' : ''}`
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating booking:', error)
    
    if (error instanceof Error && (error.message === 'Time slot is already booked' || error.message.includes('Time slot is already booked for'))) {
      return NextResponse.json(
        { error: error.message },
        { status: 409 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to create booking' },
      { status: 500 }
    )
  }
}