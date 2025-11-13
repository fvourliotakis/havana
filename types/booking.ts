export interface FoodCart {
  id: string
  name: string
  description: string
  image?: string
  location?: string
  cuisine?: string
  pricePerHour: number // Now represents daily rate (keeping field name for compatibility)
  capacity: number
  isActive: boolean
  features?: string[]
  shippingPrice: number // Shipping/delivery price
  pickupAvailable: boolean // Whether pickup is available
  shippingAvailable: boolean // Whether shipping/delivery is available
  createdAt?: string
  updatedAt?: string
  foodItems?: FoodItem[]
  services?: Service[]
}

export interface FoodItem {
  id: string
  name: string
  description: string
  price: number
  image?: string
  category: string
  isAvailable: boolean
  cartId: string
}

export interface Service {
  id: string
  name: string
  description: string
  pricePerHour: number // Now represents daily rate (keeping field name for compatibility)
  category: ServiceCategory
  isActive: boolean
  cartId?: string
  cartName?: string
}

export interface Booking {
  id: string
  customerFirstName: string
  customerLastName: string
  customerEmail: string
  customerPhone: string
  customerAddress: string
  customerCity: string
  customerState: string
  customerZip: string
  customerCountry: string
  cartId: string
  cartName?: string
  eventDate: string
  startTime: string
  endTime: string
  totalHours: number
  totalAmount: number
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED'
  
  // Coupon information
  couponCode?: string
  appliedCoupon?: any // Full coupon object for validation
  discountAmount?: number
  originalAmount?: number
  eventType: string
  guestCount: number
  specialNotes?: string
  createdAt: string
  updatedAt: string
  selectedItems?: {
    itemId: string
    quantity: number
    price: number
  }[]
  selectedServices?: {
    serviceId: string
    quantity: number
    hours: number
    pricePerHour: number
  }[]
}

export interface BookingService {
  id: string
  bookingId: string
  serviceId: string
  quantity: number
  hours: number
  totalAmount: number
}

export interface BookingDate {
  date: string
  startTime: string
  endTime: string
  totalHours: number // Hours for this specific date
  cartCost: number // Daily rate cost for this date
  isAvailable: boolean
  conflictingBooking?: any
}

export interface BookingFormData {
  // Step 1: Cart Selection
  selectedCartId: string
  
  // Step 2: Food Selection
  selectedItems: {
    itemId: string
    quantity: number
    price: number
  }[]
  
  // Step 2.5: Services Selection (NEW)
  selectedServices: {
    serviceId: string
    quantity: number
    price: number
    hours?: number
    pricePerHour?: number
  }[]
  
  // Step 3: Timing (ENHANCED - Now Dynamic)
  selectedDates: BookingDate[]
  bookingDate: string
  startTime: string
  endTime: string
  totalHours: number
  isCustomTiming: boolean
  timeSlotType?: string
  
  // Step 4: Delivery Options
  deliveryMethod: 'pickup' | 'shipping'
  shippingAddress?: string
  shippingCity?: string
  shippingState?: string
  shippingZip?: string
  shippingAmount: number
  
  // Step 5: Customer Information
  customerFirstName: string
  customerLastName: string
  customerEmail: string
  customerPhone: string
  customerAddress: string
  customerCity: string
  customerState: string
  customerZip: string
  customerCountry: string
  eventType: string
  guestCount: number
  specialNotes?: string
  
  // Step 6: Payment (ENHANCED)
  totalAmount: number
  cartServiceAmount: number
  servicesAmount: number
  foodAmount: number
  paymentMethod: string
  paymentSlipUrl?: string // Payment slip URL for bank transfers
  selectedBankId?: string // Selected bank for bank transfer (admin-created bookings)
  
  // Coupon information
  couponCode?: string
  appliedCoupon?: any // Full coupon object for validation
  discountAmount?: number
  originalAmount?: number
}

export interface TimeSlot {
  startTime: string
  endTime: string
  isAvailable: boolean
  price: number
}

export type ServiceCategory = 'STAFF' | 'KITCHEN' | 'SUPPORT' | 'MANAGEMENT' | 'SPECIAL'

export const BOOKING_STEPS = [
  {
    id: 'cart-selection',
    title: 'Select Cart',
    description: 'Choose your food cart'
  },
  {
    id: 'extras',
    title: 'Add Extras',
    description: 'Food & services (optional)'
  },
  {
    id: 'timing',
    title: 'Choose Time',
    description: 'Select date and time'
  },
  {
    id: 'delivery',
    title: 'Pickup or Shipping',
    description: 'Choose delivery method'
  },
  {
    id: 'customer-info',
    title: 'Your Details',
    description: 'Personal information'
  },
  {
    id: 'payment',
    title: 'Payment',
    description: 'Complete booking'
  }
] as const

export type BookingStep = typeof BOOKING_STEPS[number]['id']