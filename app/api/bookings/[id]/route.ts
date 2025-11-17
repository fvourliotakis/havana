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

    // Fetch booking dates
    let bookingDates: any[] = []
    try {
      bookingDates = await (prisma as any).bookingDate.findMany({
        where: { bookingId: id },
        orderBy: { date: 'asc' }
      })
    } catch (error) {
      console.log('BookingDate table not found or error fetching dates:', error)
    }

    return NextResponse.json({
      ...booking,
      bookingDates
    })
  } catch (error) {
    console.error('Error fetching booking:', error)
    return NextResponse.json(
      { error: 'Failed to fetch booking' },
      { status: 500 }
    )
  }
}

// PUT /api/bookings/[id] - Update booking (status or full edit)
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const body = await request.json()
    const { searchParams } = new URL(request.url)
    const fullEdit = searchParams.get('fullEdit') === 'true'

    // TODO: Add authentication and authorization checks

    if (fullEdit) {
      // Full booking edit (admin only) - includes dates, items, services
      const {
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
        status,
        paymentStatus,
        paymentMethod,
        selectedBankId,
        selectedCartId,
        selectedDates,
        selectedItems,
        selectedServices,
        totalAmount,
        cartServiceAmount,
        foodAmount,
        servicesAmount,
        shippingAmount,
        deliveryMethod
      } = body

      // Use transaction to update everything atomically
      const updatedBooking = await prisma.$transaction(async (tx) => {
        // Update booking basic info
        const booking = await tx.booking.update({
          where: { id },
          data: {
            ...(customerFirstName && { customerFirstName }),
            ...(customerLastName && { customerLastName }),
            ...(customerEmail && { customerEmail }),
            ...(customerPhone && { customerPhone }),
            ...(customerAddress && { customerAddress }),
            ...(customerCity && { customerCity }),
            ...(customerState !== undefined && { customerState }),
            ...(customerZip && { customerZip }),
            ...(customerCountry && { customerCountry }),
            ...(eventType !== undefined && { eventType }),
            ...(guestCount !== undefined && { guestCount }),
            ...(specialNotes !== undefined && { specialNotes }),
            ...(status && { status }),
            ...(paymentStatus && { paymentStatus }),
            ...(paymentMethod && { paymentMethod }),
            ...(selectedBankId !== undefined && { selectedBankId }),
            ...(selectedCartId && { cartId: selectedCartId }),
            ...(totalAmount !== undefined && { totalAmount }),
            ...(cartServiceAmount !== undefined && { cartServiceAmount }),
            ...(foodAmount !== undefined && { foodAmount }),
            ...(servicesAmount !== undefined && { servicesAmount }),
            ...(shippingAmount !== undefined && { shippingAmount }),
            ...(deliveryMethod && { deliveryMethod }),
            updatedAt: new Date()
          }
        })

        // Update booking dates if provided
        if (selectedDates && Array.isArray(selectedDates)) {
          // Delete old dates
          await (tx as any).bookingDate.deleteMany({
            where: { bookingId: id }
          })
          
          // Create new dates
          if (selectedDates.length > 0) {
            await (tx as any).bookingDate.createMany({
              data: selectedDates.map((date: any) => ({
                bookingId: id,
                date: new Date(date.date),
                startTime: date.startTime,
                endTime: date.endTime,
                totalHours: date.totalHours,
                cartCost: date.cartCost,
                isAvailable: true
              }))
            })
          }
        }

        // Update booking items if provided
        if (selectedItems && Array.isArray(selectedItems)) {
          // Delete old items
          await (tx as any).bookingItem.deleteMany({
            where: { bookingId: id }
          })
          
          // Create new items
          if (selectedItems.length > 0) {
            await (tx as any).bookingItem.createMany({
              data: selectedItems.map((item: any) => ({
                bookingId: id,
                foodItemId: item.id,
                quantity: item.quantity,
                price: item.price
              }))
            })
          }
        }

        // Update booking services if provided
        if (selectedServices && Array.isArray(selectedServices)) {
          // Delete old services
          await (tx as any).bookingService.deleteMany({
            where: { bookingId: id }
          })
          
          // Create new services
          if (selectedServices.length > 0) {
            await (tx as any).bookingService.createMany({
              data: selectedServices.map((service: any) => ({
                bookingId: id,
                serviceId: service.id,
                quantity: service.quantity,
                pricePerHour: service.pricePerHour,
                hours: service.hours
              }))
            })
          }
        }

        return booking
      })

      return NextResponse.json({
        success: true,
        booking: updatedBooking,
        message: 'Booking updated successfully'
      })
    } else {
      // Simple status/notes update
      const { status, paymentStatus, specialNotes } = body

      const updatedBooking = await prisma.booking.update({
        where: { id },
        data: {
          ...(status && { status }),
          ...(paymentStatus && { paymentStatus }),
          ...(specialNotes !== undefined && { specialNotes }),
          updatedAt: new Date()
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

      return NextResponse.json({
        success: true,
        booking: updatedBooking,
        message: 'Booking updated successfully'
      })
    }
  } catch (error) {
    console.error('Error updating booking:', error)
    return NextResponse.json(
      { error: 'Failed to update booking' },
      { status: 500 }
    )
  }
}

// DELETE /api/bookings/[id] - Permanently delete booking (admin only)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const permanentDelete = searchParams.get('permanent') === 'true'

    // TODO: Add authentication and authorization checks

    if (permanentDelete) {
      // Admin permanent deletion: delete from database
      // Delete related records first (cascade)
      await prisma.$transaction(async (tx) => {
        // Delete booking dates
        await (tx as any).bookingDate.deleteMany({
          where: { bookingId: id }
        })

        // Delete booking items
        await (tx as any).bookingItem.deleteMany({
          where: { bookingId: id }
        })

        // Delete booking services
        await (tx as any).bookingService.deleteMany({
          where: { bookingId: id }
        })

        // Delete payment slips
        await (tx as any).paymentSlip.deleteMany({
          where: { bookingId: id }
        })

        // Finally, delete the booking
        await tx.booking.delete({
          where: { id }
        })
      })

      return NextResponse.json({ 
        message: 'Booking permanently deleted',
        deleted: true
      })
    } else {
      // Soft delete: mark as cancelled
      const updatedBooking = await prisma.booking.update({
        where: { id },
        data: {
          status: 'CANCELLED'
        }
      })

      return NextResponse.json({ 
        message: 'Booking cancelled successfully',
        booking: updatedBooking
      })
    }
  } catch (error) {
    console.error('Error deleting booking:', error)
    return NextResponse.json(
      { error: 'Failed to delete booking' },
      { status: 500 }
    )
  }
}