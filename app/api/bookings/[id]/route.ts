import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendBookingStatusUpdateEmail, getCustomerLanguage, type BookingEmailData } from '@/lib/email'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

// Helper function to detect changes between old and new booking data
function detectBookingChanges(
  oldBooking: any,
  newData: any,
  newDates?: any[],
  newItems?: any[],
  newServices?: any[]
) {
  const changes: any = {}
  const t = (key: string) => key // Simple translation helper

  // Detect cart change
  if (newData.selectedCartId && oldBooking.cart && newData.selectedCartId !== oldBooking.cart.id) {
    changes.cart = {
      old: oldBooking.cart.name || 'Unknown Cart',
      new: 'New Cart' // We don't have the new cart name here, will need to fetch if needed
    }
  }

  // Detect dates change (only if newDates was actually provided in the request)
  if (newDates !== null && newDates && Array.isArray(newDates) && oldBooking.bookingDates) {
    const oldDatesJson = JSON.stringify(
      oldBooking.bookingDates.map((d: any) => ({
        date: d.date instanceof Date ? d.date.toISOString().split('T')[0] : d.date.split('T')[0],
        startTime: d.startTime,
        endTime: d.endTime
      }))
    )
    const newDatesJson = JSON.stringify(
      newDates.map((d: any) => ({
        date: d.date,
        startTime: d.startTime,
        endTime: d.endTime
      }))
    )
    
    if (oldDatesJson !== newDatesJson) {
      changes.dates = {
        old: oldBooking.bookingDates.map((d: any) => ({
          date: d.date,
          startTime: d.startTime,
          endTime: d.endTime
        })),
        new: newDates.map((d: any) => ({
          date: d.date,
          startTime: d.startTime,
          endTime: d.endTime
        }))
      }
    }
  }

  // Detect customer info changes
  const customerInfoChanges: Array<{ field: string; label: string; old: string; new: string }> = []
  
  if (newData.customerEmail && newData.customerEmail !== oldBooking.customerEmail) {
    customerInfoChanges.push({
      field: 'email',
      label: t('field_email'),
      old: oldBooking.customerEmail || '',
      new: newData.customerEmail
    })
  }
  
  if (newData.customerPhone && newData.customerPhone !== oldBooking.customerPhone) {
    customerInfoChanges.push({
      field: 'phone',
      label: t('field_phone'),
      old: oldBooking.customerPhone || '',
      new: newData.customerPhone
    })
  }
  
  if (newData.customerAddress && newData.customerAddress !== oldBooking.customerAddress) {
    customerInfoChanges.push({
      field: 'address',
      label: t('field_address'),
      old: oldBooking.customerAddress || '',
      new: newData.customerAddress
    })
  }
  
  if (newData.customerCity && newData.customerCity !== oldBooking.customerCity) {
    customerInfoChanges.push({
      field: 'city',
      label: t('field_city'),
      old: oldBooking.customerCity || '',
      new: newData.customerCity
    })
  }
  
  if (newData.eventType && newData.eventType !== oldBooking.eventType) {
    customerInfoChanges.push({
      field: 'eventType',
      label: t('field_event_type'),
      old: oldBooking.eventType || '',
      new: newData.eventType
    })
  }
  
  if (newData.guestCount !== undefined && newData.guestCount !== oldBooking.guestCount) {
    customerInfoChanges.push({
      field: 'guestCount',
      label: t('field_guests'),
      old: String(oldBooking.guestCount || 0),
      new: String(newData.guestCount)
    })
  }

  if (customerInfoChanges.length > 0) {
    changes.customerInfo = customerInfoChanges
  }

  // Detect items changes (only if newItems was actually provided in the request)
  if (newItems !== null && newItems && Array.isArray(newItems) && oldBooking.bookingItems) {
    const oldItemsMap = new Map(
      oldBooking.bookingItems.map((item: any) => [item.foodItemId, item])
    )
    const newItemsMap = new Map(newItems.map((item: any) => [item.id, item]))

    const added: any[] = []
    const removed: any[] = []
    const changed: any[] = []

    // Find added and changed items
    newItems.forEach((newItem: any) => {
      const oldItem: any = oldItemsMap.get(newItem.id)
      if (!oldItem) {
        added.push({
          name: newItem.name || 'Unknown Item',
          quantity: newItem.quantity || 0,
          price: newItem.price || 0
        })
      } else if ((oldItem.quantity || 0) !== (newItem.quantity || 0)) {
        changed.push({
          name: (oldItem.foodItem && oldItem.foodItem.name) || 'Unknown Item',
          oldQuantity: oldItem.quantity || 0,
          newQuantity: newItem.quantity || 0,
          price: newItem.price || 0
        })
      }
    })

    // Find removed items
    oldBooking.bookingItems.forEach((oldItem: any) => {
      if (!newItemsMap.has(oldItem.foodItemId)) {
        removed.push({
          name: (oldItem.foodItem && oldItem.foodItem.name) || 'Unknown Item',
          quantity: oldItem.quantity || 0,
          price: oldItem.price || 0
        })
      }
    })

    if (added.length > 0 || removed.length > 0 || changed.length > 0) {
      changes.items = { added, removed, changed }
    }
  }

  // Detect services changes (only if newServices was actually provided in the request)
  if (newServices !== null && newServices && Array.isArray(newServices) && oldBooking.bookingServices) {
    const oldServicesMap = new Map(
      oldBooking.bookingServices.map((service: any) => [service.serviceId, service])
    )
    const newServicesMap = new Map(newServices.map((service: any) => [service.id, service]))

    const added: any[] = []
    const removed: any[] = []
    const changed: any[] = []

    // Find added and changed services
    newServices.forEach((newService: any) => {
      const oldService: any = oldServicesMap.get(newService.id)
      if (!oldService) {
        added.push({
          name: newService.name || 'Unknown Service',
          hours: newService.hours || 0,
          pricePerHour: newService.pricePerHour || 0
        })
      } else if ((oldService.hours || 0) !== (newService.hours || 0)) {
        changed.push({
          name: (oldService.service && oldService.service.name) || 'Unknown Service',
          oldHours: oldService.hours || 0,
          newHours: newService.hours || 0,
          pricePerHour: newService.pricePerHour || 0
        })
      }
    })

    // Find removed services
    oldBooking.bookingServices.forEach((oldService: any) => {
      if (!newServicesMap.has(oldService.serviceId)) {
        removed.push({
          name: (oldService.service && oldService.service.name) || 'Unknown Service',
          hours: oldService.hours || 0,
          pricePerHour: oldService.pricePerHour || 0
        })
      }
    })

    if (added.length > 0 || removed.length > 0 || changed.length > 0) {
      changes.services = { added, removed, changed }
    }
  }

  // Detect total amount change
  if (newData.totalAmount !== undefined && newData.totalAmount !== oldBooking.totalAmount) {
    changes.totalAmount = {
      old: oldBooking.totalAmount || 0,
      new: newData.totalAmount
    }
  }

  // Detect payment method change
  if (newData.paymentMethod && newData.paymentMethod !== oldBooking.paymentMethod) {
    changes.paymentMethod = {
      old: oldBooking.paymentMethod || 'unknown',
      new: newData.paymentMethod
    }
  }

  return changes
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
      // Full booking edit (admin only) - includes dates, items, services, customer info
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
        deliveryMethod,
        shippingAddress,
        shippingCity,
        shippingState,
        shippingZip
      } = body

      // Fetch existing booking with all related data for change detection
      const oldBooking = await prisma.booking.findUnique({
        where: { id },
        include: {
          cart: { select: { id: true, name: true, pricePerHour: true } },
          bookingDates: true,
          bookingItems: {
            include: {
              foodItem: { select: { id: true, name: true, price: true } }
            }
          },
          bookingServices: {
            include: {
              service: { select: { id: true, name: true, pricePerHour: true } }
            }
          }
        }
      })

      if (!oldBooking) {
        return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
      }

      // Check payment method restriction: if already PAID, cannot change payment method
      if (oldBooking.paymentStatus === 'PAID' && paymentMethod && paymentMethod !== oldBooking.paymentMethod) {
        return NextResponse.json(
          { error: 'Cannot change payment method after payment is completed' },
          { status: 400 }
        )
      }

      // Use transaction to update everything atomically with increased timeout
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
            ...(shippingAddress !== undefined && { shippingAddress }),
            ...(shippingCity !== undefined && { shippingCity }),
            ...(shippingState !== undefined && { shippingState }),
            ...(shippingZip !== undefined && { shippingZip }),
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
      }, {
        timeout: 15000 // Increase timeout to 15 seconds for complex booking updates
      })

      // Detect changes and send email notification
      try {
        // Only pass dates/items/services if they were actually sent in the request
        // This prevents false detection of "removed" items when user only updates other fields
        const changes = detectBookingChanges(
          oldBooking,
          body,
          selectedDates !== undefined ? selectedDates : null,
          selectedItems !== undefined ? selectedItems : null,
          selectedServices !== undefined ? selectedServices : null
        )
        
        // Only send email if there are actual changes
        if (Object.keys(changes).length > 0) {
          const { emailService } = await import('@/lib/email/service')
          
          // Check if payment method changed and booking is not paid
          const paymentMethodChanged = !!changes.paymentMethod && updatedBooking.paymentStatus !== 'PAID'
          let bookingToken: string | undefined
          let bankDetails: any = undefined

          if (paymentMethodChanged) {
            // Generate token for action buttons
            const { generateBookingToken } = await import('@/lib/bookingTokens')
            bookingToken = generateBookingToken(
              updatedBooking.id,
              updatedBooking.customerEmail || oldBooking.customerEmail || ''
            )

            // Fetch bank details if new payment method is bank_transfer
            if (updatedBooking.paymentMethod === 'bank_transfer' && updatedBooking.selectedBankId) {
              const bankConfig = await prisma.bankConfig.findUnique({
                where: { id: updatedBooking.selectedBankId }
              })
              if (bankConfig) {
                bankDetails = {
                  bankName: bankConfig.bankName,
                  accountHolder: bankConfig.accountHolder,
                  iban: bankConfig.iban,
                  swiftCode: bankConfig.swiftCode || ''
                }
              }
            }
          }

          await emailService.sendBookingUpdatedEmail(
            updatedBooking.customerEmail || oldBooking.customerEmail || '',
            {
              customerFirstName: updatedBooking.customerFirstName || oldBooking.customerFirstName || '',
              customerLastName: updatedBooking.customerLastName || oldBooking.customerLastName || '',
              bookingId: updatedBooking.id,
              changes,
              paymentMethodChanged,
              newPaymentMethod: paymentMethodChanged ? updatedBooking.paymentMethod || undefined : undefined,
              bookingToken,
              selectedBankId: updatedBooking.selectedBankId || undefined,
              bankDetails
            },
            'el' // TODO: Get language from booking or default
          )
        }
      } catch (emailError) {
        console.error('Failed to send booking updated email:', emailError)
        // Don't fail the request if email fails
      }

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