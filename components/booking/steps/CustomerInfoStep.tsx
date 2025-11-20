'use client'

import { useState, useMemo, useEffect } from 'react'
import { BookingFormData } from '@/types/booking'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import { clsx } from 'clsx'
import { User, Mail, Phone, Calendar, Users, MessageSquare, Check, UserCheck, FileText, Truck, Home, MapPin, Globe } from 'lucide-react'
import CustomerInfoSkeleton from '@/components/ui/skeletons/CustomerInfoSkeleton'
import { useI18n } from '@/lib/i18n/context'

interface CustomerInfoStepProps {
  formData: Partial<BookingFormData>
  updateFormData: (data: Partial<BookingFormData>) => void
  onNext: () => void
  onPrevious: () => void
}

export default function CustomerInfoStep({ formData, updateFormData, onNext, onPrevious }: CustomerInfoStepProps) {
  const { t } = useI18n()
  const [customerInfo, setCustomerInfo] = useState({
    customerFirstName: formData.customerFirstName || '',
    customerLastName: formData.customerLastName || '',
    customerEmail: formData.customerEmail || '',
    customerPhone: formData.customerPhone || '',
    customerAddress: formData.customerAddress || '',
    customerCity: formData.customerCity || '',
    customerState: formData.customerState || '',
    customerZip: formData.customerZip || '',
    customerCountry: formData.customerCountry || 'Greece',
    eventType: formData.eventType || '',
    guestCount: formData.guestCount?.toString() || '1',
    specialNotes: formData.specialNotes || ''
  })
  
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Sync local state with formData changes (for edit mode)
  useEffect(() => {
    // Only update if formData has values (to prevent overwriting user input)
    if (formData.customerEmail || formData.customerFirstName) {
      setCustomerInfo({
        customerFirstName: formData.customerFirstName || '',
        customerLastName: formData.customerLastName || '',
        customerEmail: formData.customerEmail || '',
        customerPhone: formData.customerPhone || '',
        customerAddress: formData.customerAddress || '',
        customerCity: formData.customerCity || '',
        customerState: formData.customerState || '',
        customerZip: formData.customerZip || '',
        customerCountry: formData.customerCountry || 'Greece',
        eventType: formData.eventType || '',
        guestCount: formData.guestCount?.toString() || '1',
        specialNotes: formData.specialNotes || ''
      })
    }
  }, [formData]) // Listen to formData object changes

  const eventTypeOptions = [
    { value: 'birthday', label: t('event_birthday'), description: t('event_birthday_desc'), icon: Calendar },
    { value: 'wedding', label: t('event_wedding'), description: t('event_wedding_desc'), icon: Users },
    { value: 'corporate', label: t('event_corporate'), description: t('event_corporate_desc'), icon: FileText },
    { value: 'graduation', label: t('event_graduation'), description: t('event_graduation_desc'), icon: UserCheck },
    { value: 'anniversary', label: t('event_anniversary'), description: t('event_anniversary_desc'), icon: Calendar },
    { value: 'family-gathering', label: t('event_family_gathering'), description: t('event_family_gathering_desc'), icon: Users },
    { value: 'community-event', label: t('event_community_event'), description: t('event_community_event_desc'), icon: Users },
    { value: 'other', label: t('event_other'), description: t('event_other_desc'), icon: Calendar }
  ]

  const handleInputChange = (field: string, value: string) => {
    setCustomerInfo(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    
    if (!customerInfo.customerFirstName.trim()) {
      newErrors.customerFirstName = t('error_first_name_required')
    }
    
    if (!customerInfo.customerLastName.trim()) {
      newErrors.customerLastName = t('error_last_name_required')
    }
    
    if (!customerInfo.customerEmail.trim()) {
      newErrors.customerEmail = t('error_email_required')
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerInfo.customerEmail)) {
      newErrors.customerEmail = t('validation_email')
    }
    
    if (!customerInfo.customerPhone.trim()) {
      newErrors.customerPhone = t('error_phone_required')
    } else {
      const phoneRegex = /^[\+]?[(]?[\d\s\-\(\)\.]{10,}$/
      if (!phoneRegex.test(customerInfo.customerPhone)) {
        newErrors.customerPhone = t('validation_phone')
      }
    }
    
    if (!customerInfo.customerAddress.trim()) {
      newErrors.customerAddress = t('error_address_required')
    }
    
    if (!customerInfo.customerCity.trim()) {
      newErrors.customerCity = t('error_city_required')
    }
    
    if (!customerInfo.customerState.trim()) {
      newErrors.customerState = t('error_state_required')
    }
    
    if (!customerInfo.customerZip.trim()) {
      newErrors.customerZip = t('error_zip_required')
    } else {
      const zipRegex = /^[\d\w\s\-]{3,}$/
      if (!zipRegex.test(customerInfo.customerZip)) {
        newErrors.customerZip = t('validation_zip')
      }
    }
    
    if (!customerInfo.customerCountry.trim()) {
      newErrors.customerCountry = t('error_country_required')
    }
    
    if (!customerInfo.eventType) {
      newErrors.eventType = t('error_event_type_required')
    }
    
    const guestCount = parseInt(customerInfo.guestCount)
    if (!customerInfo.guestCount || isNaN(guestCount) || guestCount < 1) {
      newErrors.guestCount = t('error_guest_count_min')
    }

    // Validate delivery fields if shipping is selected
    if (formData.deliveryMethod === 'shipping') {
      if (!formData.shippingAddress?.trim()) {
        newErrors.shippingAddress = t('error_shipping_address_required')
      }
      
      if (!formData.shippingCity?.trim()) {
        newErrors.shippingCity = t('error_shipping_city_required')
      }
      
      if (!formData.shippingState?.trim()) {
        newErrors.shippingState = t('error_shipping_state_required')
      }
      
      if (!formData.shippingZip?.trim()) {
        newErrors.shippingZip = t('error_shipping_zip_required')
      }
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    if (validateForm()) {
      const guestCount = parseInt(customerInfo.guestCount) || 1
      
      updateFormData({
        customerFirstName: customerInfo.customerFirstName,
        customerLastName: customerInfo.customerLastName,
        customerEmail: customerInfo.customerEmail,
        customerPhone: customerInfo.customerPhone,
        customerAddress: customerInfo.customerAddress,
        customerCity: customerInfo.customerCity,
        customerState: customerInfo.customerState,
        customerZip: customerInfo.customerZip,
        customerCountry: customerInfo.customerCountry,
        eventType: customerInfo.eventType,
        guestCount: guestCount,
        specialNotes: customerInfo.specialNotes || undefined
      })
      
      onNext()
    }
  }

  // Check if all required fields are completed
  const isContactInfoComplete = customerInfo.customerFirstName.trim() !== '' && 
                                customerInfo.customerLastName.trim() !== '' &&
                                customerInfo.customerEmail.trim() !== '' && 
                                /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerInfo.customerEmail) &&
                                customerInfo.customerPhone.trim() !== '' &&
                                customerInfo.customerAddress.trim() !== '' &&
                                customerInfo.customerCity.trim() !== '' &&
                                customerInfo.customerState.trim() !== '' &&
                                customerInfo.customerZip.trim() !== '' &&
                                customerInfo.customerCountry.trim() !== '' &&
                                // Include delivery fields if shipping is selected
                                (formData.deliveryMethod !== 'shipping' || (
                                  formData.shippingAddress?.trim() &&
                                  formData.shippingCity?.trim() &&
                                  formData.shippingState?.trim() &&
                                  formData.shippingZip?.trim()
                                ))
  
  const isEventDetailsComplete = customerInfo.eventType && 
                                customerInfo.guestCount && 
                                customerInfo.guestCount.trim() !== '' &&
                                !isNaN(parseInt(customerInfo.guestCount)) &&
                                parseInt(customerInfo.guestCount) > 0

  const isAllDataComplete = isContactInfoComplete && isEventDetailsComplete

  return (
    <div className="space-y-[3vh] lg:space-y-[1vw]">
      <div className="text-center">
        <h2 className="text-[3.5vh] lg:text-[1.4vw] font-bold text-white mb-[1vh] lg:mb-[0.3vw]">
          {t('step_customer_info_title')}
        </h2>
        <p className="text-gray-400 text-[2vh] lg:text-[0.7vw]">
          {t('step_5_of_6')}
        </p>
      </div>

      {/* Single Combined Form */}
      <div className="bg-slate-800/60 backdrop-blur-sm rounded-lg p-[2vh] lg:p-[1vw] mx-[2vh] lg:mx-[1vw]">
        <div className="space-y-[3vh] lg:space-y-[1.5vw]">
          
          {/* Contact Information Section */}
          <div>
            <h3 className="text-[2.2vh] lg:text-[0.9vw] font-medium text-white mb-[2vh] lg:mb-[1vw] flex items-center space-x-[1vh] lg:space-x-[0.5vw]">
              <User className="w-[2vh] h-[2vh] lg:w-[1vw] lg:h-[1vw] text-teal-400" />
              <span>{t('contact_information')}</span>
            </h3>
            
            <div className="space-y-[2vh] lg:space-y-[1vw]">
              {/* First & Last Name - Side by side */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-[2vh] lg:gap-[1vw]">
                <div className="space-y-[1vh] lg:space-y-[0.5vw]">
                  <label className="flex items-center space-x-[1vh] lg:space-x-[0.5vw] text-[1.4vh] lg:text-[0.7vw] font-medium text-gray-300">
                    <User className="w-[1.8vh] h-[1.8vh] lg:w-[0.9vw] lg:h-[0.9vw] text-teal-400" />
                    <span>{t('first_name_required_asterisk')}</span>
                  </label>
                  <Input
                    type="text"
                    value={customerInfo.customerFirstName}
                    onChange={(e) => {
                      const nameValue = e.target.value.replace(/[^a-zA-ZΑ-Ωα-ωάέήίόύώ\s\-']/g, '')
                      handleInputChange('customerFirstName', nameValue)
                    }}
                    error={errors.customerFirstName}
                    required
                    placeholder={t('placeholder_first_name')}
                    autoComplete="given-name"
                    pattern="[a-zA-ZΑ-Ωα-ωάέήίόύώ\s\-']{1,50}"
                    title={t('validation_first_name')}
                    className="text-[1.6vh] lg:text-[0.8vw]"
                  />
                </div>
                <div className="space-y-[1vh] lg:space-y-[0.5vw]">
                  <label className="flex items-center space-x-[1vh] lg:space-x-[0.5vw] text-[1.4vh] lg:text-[0.7vw] font-medium text-gray-300">
                    <User className="w-[1.8vh] h-[1.8vh] lg:w-[0.9vw] lg:h-[0.9vw] text-teal-400" />
                    <span>{t('last_name_required_asterisk')}</span>
                  </label>
                  <Input
                    type="text"
                    value={customerInfo.customerLastName}
                    onChange={(e) => {
                      const nameValue = e.target.value.replace(/[^a-zA-ZΑ-Ωα-ωάέήίόύώ\s\-']/g, '')
                      handleInputChange('customerLastName', nameValue)
                    }}
                    error={errors.customerLastName}
                    required
                    placeholder={t('placeholder_last_name')}
                    autoComplete="family-name"
                    pattern="[a-zA-ZΑ-Ωα-ωάέήίόύώ\s\-']{1,50}"
                    title={t('validation_last_name')}
                    className="text-[1.6vh] lg:text-[0.8vw]"
                  />
          </div>
        </div>

              {/* Email - Full width */}
              <div className="space-y-[1vh] lg:space-y-[0.5vw]">
                <label className="flex items-center space-x-[1vh] lg:space-x-[0.5vw] text-[1.4vh] lg:text-[0.7vw] font-medium text-gray-300">
                  <Mail className="w-[1.8vh] h-[1.8vh] lg:w-[0.9vw] lg:h-[0.9vw] text-teal-400" />
                  <span>{t('email_required_asterisk')}</span>
                </label>
                <Input
                  type="email"
                  value={customerInfo.customerEmail}
                  onChange={(e) => handleInputChange('customerEmail', e.target.value)}
                  error={errors.customerEmail}
                  required
                  placeholder={t('placeholder_email')}
                  autoComplete="email"
                  pattern="[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$"
                  title={t('validation_email')}
                  className="text-[1.6vh] lg:text-[0.8vw]"
                />
              </div>

              {/* Phone - Full width */}
              <div className="space-y-[1vh] lg:space-y-[0.5vw]">
                <label className="flex items-center space-x-[1vh] lg:space-x-[0.5vw] text-[1.4vh] lg:text-[0.7vw] font-medium text-gray-300">
                  <Phone className="w-[1.8vh] h-[1.8vh] lg:w-[0.9vw] lg:h-[0.9vw] text-teal-400" />
                  <span>{t('phone_required_asterisk')}</span>
                </label>
                <Input
                  type="tel"
                  value={customerInfo.customerPhone}
                  onChange={(e) => {
                    const phoneValue = e.target.value.replace(/[^0-9\s\-\(\)\+]/g, '')
                    handleInputChange('customerPhone', phoneValue)
                  }}
                  error={errors.customerPhone}
                  required
                  placeholder={t('placeholder_phone')}
                  autoComplete="tel"
                  pattern="[+]?[\d\s\-\(\)]{10,}"
                  title={t('validation_phone')}
                  className="text-[1.6vh] lg:text-[0.8vw]"
                />
              </div>

              {/* Address Header */}
              <div className="pt-[1vh] lg:pt-[0.5vw]">
                <h4 className="text-[1.6vh] lg:text-[0.8vw] font-semibold text-white mb-[1vh] lg:mb-[0.5vw]">{t('address_label')}</h4>
              </div>

              {/* Address - Full width */}
              <div className="space-y-[1vh] lg:space-y-[0.5vw]">
                <Input
                  type="text"
                  value={customerInfo.customerAddress}
                  onChange={(e) => handleInputChange('customerAddress', e.target.value)}
                  error={errors.customerAddress}
                  required
                  placeholder={t('placeholder_address')}
                  autoComplete="street-address"
                  className="text-[1.6vh] lg:text-[0.8vw]"
                />
              </div>

              {/* City, State, Zip - Three columns */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-[2vh] lg:gap-[1vw]">
                <div className="space-y-[1vh] lg:space-y-[0.5vw]">
                  <label className="text-[1.4vh] lg:text-[0.7vw] font-medium text-gray-300">{t('city_label')}</label>
                  <Input
                    type="text"
                    value={customerInfo.customerCity}
                    onChange={(e) => handleInputChange('customerCity', e.target.value)}
                    error={errors.customerCity}
                    required
                    placeholder={t('placeholder_city')}
                    autoComplete="address-level2"
                    className="text-[1.6vh] lg:text-[0.8vw]"
                  />
                </div>
                <div className="space-y-[1vh] lg:space-y-[0.5vw]">
                  <label className="text-[1.4vh] lg:text-[0.7vw] font-medium text-gray-300">{t('state_province_label')}</label>
                  <Input
                    type="text"
                    value={customerInfo.customerState}
                    onChange={(e) => handleInputChange('customerState', e.target.value)}
                    error={errors.customerState}
                    required
                    placeholder={t('placeholder_state')}
                    autoComplete="address-level1"
                    className="text-[1.6vh] lg:text-[0.8vw]"
                  />
                </div>
                <div className="space-y-[1vh] lg:space-y-[0.5vw]">
                  <label className="text-[1.4vh] lg:text-[0.7vw] font-medium text-gray-300">{t('zip_postal_label')}</label>
                  <Input
                    type="text"
                    value={customerInfo.customerZip}
                    onChange={(e) => {
                      const zipValue = e.target.value.replace(/[^a-zA-Z0-9\s\-]/g, '')
                      handleInputChange('customerZip', zipValue)
                    }}
                    error={errors.customerZip}
                    required
                    placeholder={t('placeholder_zip')}
                    autoComplete="postal-code"
                    pattern="[a-zA-Z0-9\s\-]{3,10}"
                    title={t('validation_zip')}
                    className="text-[1.6vh] lg:text-[0.8vw]"
                  />
                          </div>
                        </div>

              {/* Country - Full width */}
              <div className="space-y-[1vh] lg:space-y-[0.5vw]">
                <label className="flex items-center space-x-[1vh] lg:space-x-[0.5vw] text-[1.4vh] lg:text-[0.7vw] font-medium text-gray-300">
                  <Globe className="w-[1.8vh] h-[1.8vh] lg:w-[0.9vw] lg:h-[0.9vw] text-teal-400" />
                  <span>{t('country')}</span>
                </label>
                <Select
                  value={customerInfo.customerCountry}
                  onChange={(e) => handleInputChange('customerCountry', e.target.value)}
                  required
                  className="text-[1.6vh] lg:text-[0.8vw]"
                    options={[
                      { value: 'Greece', label: 'Greece / Ελλάδα' },
                      { value: 'United States', label: 'United States' },
                      { value: 'Canada', label: 'Canada' },
                      { value: 'United Kingdom', label: 'United Kingdom' },
                      { value: 'Germany', label: 'Germany' },
                      { value: 'France', label: 'France' },
                      { value: 'Italy', label: 'Italy' },
                      { value: 'Spain', label: 'Spain' },
                      { value: 'Netherlands', label: 'Netherlands' },
                      { value: 'Belgium', label: 'Belgium' },
                      { value: 'Switzerland', label: 'Switzerland' },
                      { value: 'Austria', label: 'Austria' },
                      { value: 'Portugal', label: 'Portugal' },
                      { value: 'Ireland', label: 'Ireland' },
                      { value: 'Denmark', label: 'Denmark' },
                      { value: 'Sweden', label: 'Sweden' },
                      { value: 'Norway', label: 'Norway' },
                      { value: 'Finland', label: 'Finland' },
                      { value: 'Poland', label: 'Poland' },
                      { value: 'Czech Republic', label: 'Czech Republic' },
                      { value: 'Hungary', label: 'Hungary' },
                      { value: 'Croatia', label: 'Croatia' },
                      { value: 'Slovenia', label: 'Slovenia' },
                      { value: 'Bulgaria', label: 'Bulgaria' },
                      { value: 'Romania', label: 'Romania' },
                      { value: 'Cyprus', label: 'Cyprus' },
                      { value: 'Malta', label: 'Malta' },
                      { value: 'Australia', label: 'Australia' },
                      { value: 'New Zealand', label: 'New Zealand' },
                      { value: 'Japan', label: 'Japan' },
                      { value: 'South Korea', label: 'South Korea' },
                      { value: 'Other', label: 'Other' }
                    ]}
                />
                      </div>

              {/* Delivery Address - Only show when shipping is selected */}
              {formData.deliveryMethod === 'shipping' && (
                <>
                  {/* Delivery Address Header */}
                  <div className="pt-[2vh] lg:pt-[1vw] border-t border-slate-600">
                    <h4 className="text-[1.6vh] lg:text-[0.8vw] font-semibold text-white mb-[1vh] lg:mb-[0.5vw] flex items-center space-x-[1vh] lg:space-x-[0.5vw]">
                      <Truck className="w-[1.8vh] h-[1.8vh] lg:w-[0.9vw] lg:h-[0.9vw] text-teal-400" />
                      <span>{t('delivery_address')}</span>
                    </h4>
                    <p className="text-[1.2vh] lg:text-[0.6vw] text-gray-400 mb-[1vh] lg:mb-[0.5vw]">
                      {t('delivery_where_to_setup')}
                    </p>
                        </div>

                  {/* Delivery Address - Full width */}
                  <div className="space-y-[1vh] lg:space-y-[0.5vw]">
          <Input
                      type="text"
                      value={formData.shippingAddress || ''}
                      onChange={(e) => updateFormData({ shippingAddress: e.target.value })}
                      error={errors.shippingAddress}
            required
                      placeholder={t('placeholder_shipping_address')}
                      autoComplete="shipping street-address"
                      className="text-[1.6vh] lg:text-[0.8vw]"
                    />
                  </div>

                  {/* Delivery City, State, Zip - Three columns */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-[2vh] lg:gap-[1vw]">
                    <div className="space-y-[1vh] lg:space-y-[0.5vw]">
                      <label className="text-[1.4vh] lg:text-[0.7vw] font-medium text-gray-300">{t('delivery_city_label')}</label>
                      <Input
                        type="text"
                        value={formData.shippingCity || ''}
                        onChange={(e) => updateFormData({ shippingCity: e.target.value })}
                        error={errors.shippingCity}
                        required
                        placeholder="Los Angeles"
                        autoComplete="shipping address-level2"
                        className="text-[1.6vh] lg:text-[0.8vw]"
                      />
                        </div>
                    <div className="space-y-[1vh] lg:space-y-[0.5vw]">
                      <label className="text-[1.4vh] lg:text-[0.7vw] font-medium text-gray-300">{t('delivery_state_label')}</label>
                      <Input
                        type="text"
                        value={formData.shippingState || ''}
                        onChange={(e) => updateFormData({ shippingState: e.target.value })}
                        error={errors.shippingState}
                        required
                        placeholder="CA"
                        autoComplete="shipping address-level1"
                        className="text-[1.6vh] lg:text-[0.8vw]"
                      />
                      </div>
                    <div className="space-y-[1vh] lg:space-y-[0.5vw]">
                      <label className="text-[1.4vh] lg:text-[0.7vw] font-medium text-gray-300">{t('delivery_zip_label')}</label>
                      <Input
                        type="text"
                        value={formData.shippingZip || ''}
                        onChange={(e) => updateFormData({ shippingZip: e.target.value })}
                        error={errors.shippingZip}
                        required
                        placeholder="90210"
                        autoComplete="shipping postal-code"
                        className="text-[1.6vh] lg:text-[0.8vw]"
                      />
                    </div>
                  </div>
                </>
              )}
        </div>
      </div>

          {/* Event Details Section */}
          <div className="pt-[2vh] lg:pt-[1vw] border-t border-slate-600">
            <h3 className="text-[2.2vh] lg:text-[0.9vw] font-medium text-white mb-[2vh] lg:mb-[1vw] flex items-center space-x-[1vh] lg:space-x-[0.5vw]">
              <Calendar className="w-[2vh] h-[2vh] lg:w-[1vw] lg:h-[1vw] text-teal-400" />
              <span>{t('event_details')}</span>
            </h3>
            
            <div className="grid md:grid-cols-2 gap-[2vh] lg:gap-[1vw]">
              {/* Event Type Selection */}
              <div className="space-y-[1vh] lg:space-y-[0.5vw]">
                <label className="block text-[1.4vh] lg:text-[0.7vw] font-medium text-gray-300">
                  {t('event_type')}
                </label>
                <div className="grid grid-cols-2 gap-[1vh] lg:gap-[0.5vw]">
                  {eventTypeOptions.slice(0, 4).map((option) => (
                    <button
                      key={option.value}
                      onClick={() => handleInputChange('eventType', option.value)}
                      className={clsx(
                        'p-[1vh] lg:p-[0.5vw] rounded-lg border text-left transition-all duration-300',
                        customerInfo.eventType === option.value
                          ? 'border-green-500 bg-green-500/20 text-white'
                          : 'border-slate-600 bg-slate-700 text-gray-300 hover:border-slate-500'
                      )}
                    >
                      <div className="flex items-center space-x-[0.5vh] lg:space-x-[0.3vw]">
                        {(() => {
                          const IconComponent = option.icon
                          return <IconComponent className="w-[1.5vh] h-[1.5vh] lg:w-[0.8vw] lg:h-[0.8vw] text-teal-400" />
                        })()}
                        <span className="text-[1.2vh] lg:text-[0.6vw] font-medium">{option.label}</span>
                      </div>
                    </button>
                  ))}
                </div>
                {eventTypeOptions.length > 4 && (
                  <div className="grid grid-cols-2 gap-[1vh] lg:gap-[0.5vw]">
                    {eventTypeOptions.slice(4).map((option) => (
                      <button
                        key={option.value}
                        onClick={() => handleInputChange('eventType', option.value)}
                        className={clsx(
                          'p-[1vh] lg:p-[0.5vw] rounded-lg border text-left transition-all duration-300',
                          customerInfo.eventType === option.value
                            ? 'border-green-500 bg-green-500/20 text-white'
                            : 'border-slate-600 bg-slate-700 text-gray-300 hover:border-slate-500'
                        )}
                      >
                        <div className="flex items-center space-x-[0.5vh] lg:space-x-[0.3vw]">
                          {(() => {
                            const IconComponent = option.icon
                            return <IconComponent className="w-[1.5vh] h-[1.5vh] lg:w-[0.8vw] lg:h-[0.8vw] text-teal-400" />
                          })()}
                          <span className="text-[1.2vh] lg:text-[0.6vw] font-medium">{option.label}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {errors.eventType && (
                  <p className="text-red-400 text-[1.2vh] lg:text-[0.6vw]">{errors.eventType}</p>
                )}
              </div>

              {/* Guest Count and Notes */}
              <div className="space-y-[2vh] lg:space-y-[1vw]">
          <Input
            label={t('guest_count')}
            type="number"
            value={customerInfo.guestCount}
                  onChange={(e) => {
                    const numValue = e.target.value.replace(/[^0-9]/g, '')
                    if (numValue === '' || parseInt(numValue) < 1) {
                      handleInputChange('guestCount', '1')
                    } else {
                      handleInputChange('guestCount', numValue)
                    }
                  }}
            error={errors.guestCount}
            required
            min="1"
                  max="1000"
                  placeholder={t('placeholder_guest_count')}
            helperText={t('guest_count_helper')}
                  className="text-[1.6vh] lg:text-[0.8vw]"
          />
          
                <div>
                  <label className="block text-[1.4vh] lg:text-[0.7vw] font-medium text-gray-300 mb-[1vh] lg:mb-[0.5vw]">
              {t('special_notes')}
            </label>
            <textarea
                    className="w-full px-[2vh] lg:px-[1vw] py-[1.5vh] lg:py-[0.8vw] bg-slate-600 border border-slate-500 rounded-lg text-white text-[1.6vh] lg:text-[0.8vw] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all duration-300"
                    rows={3}
              value={customerInfo.specialNotes}
              onChange={(e) => handleInputChange('specialNotes', e.target.value)}
                    placeholder={t('special_notes_placeholder')}
            />
                    <p className="mt-[0.5vh] lg:mt-[0.3vw] text-[1.2vh] lg:text-[0.6vw] text-gray-400">
                    {t('special_notes_helper')}
            </p>
          </div>
        </div>
            </div>
          </div>

        </div>
      </div>

      {/* Navigation */}
      <div className="text-center space-y-[1.5vh] lg:space-y-[0.8vw] pt-[2vh] lg:pt-[0vw] max-w-[160vh] lg:max-w-[80vw] mx-auto px-[2vh] lg:px-[0.8vw]">
        {/* Progress Indicator */}
        <div className="bg-slate-800/40 backdrop-blur-sm rounded-lg p-[1.5vh] lg:p-[0.8vw] mb-[2vh] lg:mb-[1vw]">
          <div className="flex items-center justify-center space-x-[2vh] lg:space-x-[1vw]">
            <div className={clsx(
              'flex items-center space-x-[0.8vh] lg:space-x-[0.4vw]',
              isContactInfoComplete ? 'text-green-400' : 'text-gray-400'
            )}>
              <div className={clsx(
                'w-[2vh] h-[2vh] lg:w-[1vw] lg:h-[1vw] rounded-full flex items-center justify-center',
                isContactInfoComplete ? 'bg-green-500' : 'bg-slate-600'
              )}>
                {isContactInfoComplete ? (
                  <Check className="w-[1.2vh] h-[1.2vh] lg:w-[0.6vw] lg:h-[0.6vw] text-white" />
                ) : (
                  <User className="w-[1.2vh] h-[1.2vh] lg:w-[0.6vw] lg:h-[0.6vw] text-gray-300" />
                )}
              </div>
              <span className="text-[1.4vh] lg:text-[0.7vw] font-medium">{t('contact_info_label')}</span>
            </div>
            
            <div className={clsx(
              'flex items-center space-x-[0.8vh] lg:space-x-[0.4vw]',
              isEventDetailsComplete ? 'text-green-400' : 'text-gray-400'
            )}>
              <div className={clsx(
                'w-[2vh] h-[2vh] lg:w-[1vw] lg:h-[1vw] rounded-full flex items-center justify-center',
                isEventDetailsComplete ? 'bg-green-500' : 'bg-slate-600'
              )}>
                {isEventDetailsComplete ? (
                  <Check className="w-[1.2vh] h-[1.2vh] lg:w-[0.6vw] lg:h-[0.6vw] text-white" />
                ) : (
                  <Calendar className="w-[1.2vh] h-[1.2vh] lg:w-[0.6vw] lg:h-[0.6vw] text-gray-300" />
                )}
              </div>
              <span className="text-[1.4vh] lg:text-[0.7vw] font-medium">{t('event_details_label')}</span>
            </div>
          </div>
          
          {!isAllDataComplete && (
            <p className="text-gray-400 text-[1.3vh] lg:text-[0.65vw] mt-[1vh] lg:mt-[0.5vw]">
              {t('please_complete_all_information')}
            </p>
          )}
        </div>

        <div className="flex justify-between gap-[1vh] lg:gap-[0.5vw]">
        <Button
          variant="outline"
          onClick={onPrevious}
            size="sm"
            className="px-[3vh] lg:px-[2vw] py-[0.8vh] lg:py-[0.6vw] text-[1.4vh] lg:text-[0.9vw] font-semibold"
        >
          {t('previous')}
        </Button>
          
          {isAllDataComplete ? (
        <Button
          onClick={handleNext}
              size="sm"
              className="px-[2vh] lg:px-[2vw] py-[0.8vh] lg:py-[0.6vw] text-[1.4vh] lg:text-[0.9vw] font-semibold"
            >
              <div className="flex items-center">
                <Check className="w-[1.8vh] h-[1.8vh] lg:w-[0.9vw] lg:h-[0.9vw] mr-[0.8vh] lg:mr-[0.4vw]" />
                {t('continue_to_payment')}
              </div>
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="px-[2vh] lg:px-[2vw] py-[0.8vh] lg:py-[0.6vw] text-[1.4vh] lg:text-[0.9vw] font-semibold border-gray-500 text-gray-400 cursor-not-allowed opacity-60"
              disabled
            >
              <div className="flex items-center">
                <MessageSquare className="w-[1.8vh] h-[1.8vh] lg:w-[0.9vw] lg:h-[0.9vw]" />
                Complete Information
              </div>
        </Button>
          )}
        </div>
      </div>
    </div>
  )
}