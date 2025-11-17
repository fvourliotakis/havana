'use client'

import { useState } from 'react'
import { BookingFormData, FoodCart } from '@/types/booking'
import Button from '@/components/ui/Button'
import { clsx } from 'clsx'
import { useGetFoodCartsQuery } from '../../../lib/api/foodCartsApi'
import { Truck, Settings, MapPin, Check, Users } from 'lucide-react'
import CartSelectionSkeleton from '@/components/ui/skeletons/CartSelectionSkeleton'
import { Swiper, SwiperSlide } from 'swiper/react'
import { FreeMode, Mousewheel } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/free-mode'
import { useI18n } from '@/lib/i18n/context'

interface CartSelectionStepProps {
  formData: Partial<BookingFormData>
  updateFormData: (data: Partial<BookingFormData>) => void
  onNext: () => void
}

// Havana van images as fallbacks
const HAVANA_VAN_IMAGES = [
  'https://havana.gr/wp-content/uploads/2025/06/Desktop.d7abe289.vw_t2_lissabon.webp',
  'https://havana.gr/wp-content/uploads/2025/06/vintage-van-on-transparent-background-free-png.webp'
]

export default function CartSelectionStep({ formData, updateFormData, onNext }: CartSelectionStepProps) {
  const [selectedCartId, setSelectedCartId] = useState(formData.selectedCartId || '')
  const { t } = useI18n()

  // RTK Query hook
  const {
    data: foodCarts = [],
    isLoading: loading,
    error
  } = useGetFoodCartsQuery({})

  const handleCartSelect = (cartId: string) => {
    setSelectedCartId(cartId)
    
    // Find the selected cart
    const selectedCart = foodCarts.find(cart => cart.id === cartId)
    if (selectedCart) {
      updateFormData({
        selectedCartId: cartId,
        cartServiceAmount: selectedCart.pricePerHour
      })
    }
  }

  const handleNext = () => {
    if (selectedCartId) {
      onNext()
    }
  }

  const renderAvailabilityBadge = (cart: FoodCart) => {
    if (cart.pickupAvailable && cart.shippingAvailable) {
      return (
        <div className="flex items-center space-x-[0.5vh] lg:space-x-[0.25vw] text-[1.2vh] lg:text-[0.6vw] text-green-400">
          <MapPin className="w-[1.5vh] h-[1.5vh] lg:w-[0.75vw] lg:h-[0.75vw]" />
          <span>{t('cart_both_available')}</span>
        </div>
      )
    } else if (cart.pickupAvailable) {
      return (
        <div className="flex items-center space-x-[0.5vh] lg:space-x-[0.25vw] text-[1.2vh] lg:text-[0.6vw] text-blue-400">
          <MapPin className="w-[1.5vh] h-[1.5vh] lg:w-[0.75vw] lg:h-[0.75vw]" />
          <span>{t('cart_pickup_available')}</span>
        </div>
      )
    } else if (cart.shippingAvailable) {
      return (
        <div className="flex items-center space-x-[0.5vh] lg:space-x-[0.25vw] text-[1.2vh] lg:text-[0.6vw] text-purple-400">
          <Truck className="w-[1.5vh] h-[1.5vh] lg:w-[0.75vw] lg:h-[0.75vw]" />
          <span>{t('cart_delivery_available')}</span>
        </div>
      )
    }
    return null
  }

  if (loading) {
    return <CartSelectionSkeleton />
  }

  if (error) {
    return (
      <div className="text-center py-[8vh] lg:py-[6vw]">
        <div className="text-[8vh] lg:text-[4vw] mb-[2vh] lg:mb-[1vw]">⚠️</div>
        <h3 className="text-[2.8vh] lg:text-[1.4vw] font-semibold text-white mb-[1vh] lg:mb-[0.5vw]">{t('unable_to_load_carts')}</h3>
        <p className="text-red-400 mb-[2vh] lg:mb-[1vw] text-[2vh] lg:text-[1vw]">{t('failed_to_load_food_carts')}</p>
        <Button 
          onClick={() => window.location.reload()}
          variant="outline"
          className="text-[2vh] lg:text-[1vw] px-[3vh] lg:px-[1.5vw] py-[1.5vh] lg:py-[0.8vw]"
        >
          {t('try_again')}
        </Button>
      </div>
    )
  }

  if (foodCarts.length === 0) {
    return (
      <div className="text-center py-[8vh] lg:py-[6vw]">
        <div className="text-[8vh] lg:text-[4vw] mb-[2vh] lg:mb-[1vw]">🚛</div>
        <h3 className="text-[2.8vh] lg:text-[1.4vw] font-semibold text-white mb-[1vh] lg:mb-[0.5vw]">{t('no_carts_available')}</h3>
        <p className="text-gray-400 mb-[2vh] lg:mb-[1vw] text-[2vh] lg:text-[1vw] px-[2vh] lg:px-[1vw]">
          {t('no_carts_message')}
        </p>
        <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-[2vh] lg:p-[1vw] max-w-[60vh] lg:max-w-[30vw] mx-auto">
          <div className="flex items-center justify-center text-yellow-400 text-[1.8vh] lg:text-[0.9vw]">
            <Settings className="w-[2.5vh] h-[2.5vh] lg:w-[1.2vw] lg:h-[1.2vw] mr-[1vh] lg:mr-[0.5vw]" />
            {t('admin_setup_required')}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-[4vh] lg:space-y-[1.2vw]">
      {/* Header */}
      <div className="text-center space-y-[1vh] lg:space-y-[0.3vw]">
        <div className="inline-flex items-center justify-center w-[6vh] h-[6vh] lg:w-[2vw] lg:h-[2vw] bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl mb-[2vh] lg:mb-[0.6vw]">
          <Truck className="w-[3vh] h-[3vh] lg:w-[1vw] lg:h-[1vw] text-white" />
        </div>
        <h2 className="text-[3.5vh] lg:text-[1.4vw] font-bold text-white">
          {t('cart_selection_title')}
        </h2>
        <div className="flex items-center justify-center space-x-[2vh] lg:space-x-[0.6vw] text-[1.8vh] lg:text-[0.6vw] flex-wrap gap-[1vh] lg:gap-[0.3vw]">
          <span className="bg-slate-700/50 px-[1.5vh] lg:px-[0.5vw] py-[0.5vh] lg:py-[0.2vw] rounded-full text-gray-300">
            {t('cart_selection_subtitle')}
          </span>
          <span className="text-teal-400 font-medium">
            {t('cart_selection_description')}
          </span>
        </div>
        <p className="text-gray-400 max-w-[80vh] lg:max-w-[30vw] mx-auto leading-relaxed text-[2vh] lg:text-[0.7vw] px-[2vh] lg:px-[0.8vw]">
          {t('cart_selection_description_long')}
        </p>
      </div>

      {/* Cart Selection - Conditional Layout */}
      {foodCarts.length < 3 ? (
        /* Centered Grid for few carts */
        <div className="flex justify-center items-center gap-[3vh] lg:gap-[1.5vw] flex-wrap max-w-[160vh] lg:max-w-[80vw] mx-auto px-[2vh] lg:px-[1vw]">
          {foodCarts.map((cart) => (
            <div key={cart.id} className="flex-shrink-0">
              <div
                className={clsx(
                  'relative cursor-pointer transition-all duration-300 rounded-lg overflow-hidden group',
                  'bg-slate-800 border shadow-sm hover:shadow-md',
                  'w-[32vh] lg:w-[16vw]', // Larger size for fewer carts
                  selectedCartId === cart.id 
                    ? 'border-green-500 ring-2 ring-green-500/20' 
                    : 'border-slate-600 hover:border-slate-500'
                )}
                onClick={() => handleCartSelect(cart.id)}
              >
                {/* Selection Badge */}
                {selectedCartId === cart.id && (
                  <div className="absolute top-[1vh] lg:top-[0.5vw] right-[1vh] lg:right-[0.5vw] z-10">
                    <div className="w-[2.5vh] h-[2.5vh] lg:w-[1.2vw] lg:h-[1.2vw] rounded-full bg-green-500 flex items-center justify-center">
                      <Check className="w-[1.5vh] h-[1.5vh] lg:w-[0.8vw] lg:h-[0.8vw] text-white" />
                    </div>
                  </div>
                )}

                {/* Cart Image */}
                <div className="h-[20vh] lg:h-[10vw] bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center">
                  <img
                    src={cart.image || HAVANA_VAN_IMAGES[0]}
                    alt={cart.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.src = HAVANA_VAN_IMAGES[1]
                    }}
                  />
                </div>

                {/* Cart Content */}
                <div className="p-[2vh] lg:p-[1vw] space-y-[1vh] lg:space-y-[0.5vw]">
                  {/* Cart Name */}
                  <h3 className="text-[2.2vh] lg:text-[1.1vw] font-bold text-white">{cart.name}</h3>
                  
                  {/* Cart Description */}
                  <p className="text-gray-400 text-[1.6vh] lg:text-[0.8vw] leading-relaxed line-clamp-2">
                    {cart.description || t('cart_selection_description')}
                  </p>

                  {/* Capacity */}
                  <div className="flex items-center space-x-[1vh] lg:space-x-[0.5vw] text-[1.4vh] lg:text-[0.7vw] text-gray-300">
                    <Users className="w-[1.8vh] h-[1.8vh] lg:w-[0.9vw] lg:h-[0.9vw]" />
                    <span>{t('cart_serves_up_to').replace('{count}', cart.capacity.toString())}</span>
                  </div>

                  {/* Availability */}
                  {renderAvailabilityBadge(cart)}

                  {/* Pricing */}
                  <div className="bg-slate-700/50 rounded-lg p-[1.5vh] lg:p-[0.75vw]">
                    <div className="flex justify-between items-center">
                      <span className='text-white'>{t('daily_rate')}:</span>
                      <span className="font-bold text-white">€{cart.pricePerHour.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Select Button */}
                  <Button
                    size="lg"
                    onClick={() => handleCartSelect(cart.id)}
                    disabled={selectedCartId === cart.id}
                    className={clsx(
                      'w-full font-semibold transition-all duration-200',
                      selectedCartId === cart.id
                        ? 'bg-green-600 hover:bg-green-700 text-white'
                        : 'bg-teal-600 hover:bg-teal-700 text-white'
                    )}
                  >
                    {selectedCartId === cart.id ? (
                      <div className="flex items-center space-x-[1vh] lg:space-x-[0.5vw]">
                        <Check className="w-[2vh] h-[2vh] lg:w-[1vw] lg:h-[1vw]" />
                        <span>{t('selected')}</span>
                      </div>
                    ) : (
                      t('select_cart')
                    )}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Swiper for many carts */
        <div className="px-[2vh] lg:px-[1vw]">
          <Swiper
            modules={[FreeMode, Mousewheel]}
            spaceBetween={20}
            slidesPerView="auto"
            freeMode={true}
            mousewheel={true}
            grabCursor={true}
            className="!overflow-visible"
          >
            {foodCarts.map((cart) => (
              <SwiperSlide key={cart.id} className="!w-auto">
                <div
                  className={clsx(
                    'relative cursor-pointer transition-all duration-300 rounded-lg overflow-hidden group',
                    'bg-slate-800 border shadow-sm hover:shadow-md',
                    'w-[25vh] lg:w-[12vw]', // Normal size for slider
                    selectedCartId === cart.id 
                      ? 'border-green-500 ring-2 ring-green-500/20' 
                      : 'border-slate-600 hover:border-slate-500'
                  )}
                  onClick={() => handleCartSelect(cart.id)}
                >
                  {/* Same content as above but with smaller dimensions */}
                  {selectedCartId === cart.id && (
                    <div className="absolute top-[1vh] lg:top-[0.5vw] right-[1vh] lg:right-[0.5vw] z-10">
                      <div className="w-[2.5vh] h-[2.5vh] lg:w-[1.2vw] lg:h-[1.2vw] rounded-full bg-green-500 flex items-center justify-center">
                        <Check className="w-[1.5vh] h-[1.5vh] lg:w-[0.8vw] lg:h-[0.8vw] text-white" />
                      </div>
                    </div>
                  )}

                  <div className="h-[16vh] lg:h-[8vw] bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center">
                    <img
                      src={cart.image || HAVANA_VAN_IMAGES[0]}
                      alt={cart.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.src = HAVANA_VAN_IMAGES[1]
                      }}
                    />
                  </div>

                  <div className="p-[1.5vh] lg:p-[0.75vw] space-y-[0.8vh] lg:space-y-[0.4vw]">
                    <h3 className="text-[1.8vh] lg:text-[0.9vw] font-bold text-white">{cart.name}</h3>
                    
                    <div className="flex items-center space-x-[0.8vh] lg:space-x-[0.4vw] text-[1.2vh] lg:text-[0.6vw] text-gray-300">
                      <Users className="w-[1.5vh] h-[1.5vh] lg:w-[0.75vw] lg:h-[0.75vw]" />
                      <span>{t('cart_serves_up_to').replace('{count}', cart.capacity.toString())}</span>
                    </div>

                    {renderAvailabilityBadge(cart)}

                    <div className="bg-slate-700/50 rounded-lg p-[1vh] lg:p-[0.5vw]">
                      <div className="flex justify-between items-center text-[1.2vh] lg:text-[0.6vw]">
                        <span>{t('cart_base_price_short')}</span>
                        <span className="font-bold text-white">€{cart.pricePerHour.toFixed(2)}</span>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      onClick={() => handleCartSelect(cart.id)}
                      disabled={selectedCartId === cart.id}
                      className={clsx(
                        'w-full font-semibold transition-all duration-200',
                        selectedCartId === cart.id
                          ? 'bg-green-600 hover:bg-green-700 text-white'
                          : 'bg-teal-600 hover:bg-teal-700 text-white'
                      )}
                    >
                      {selectedCartId === cart.id ? (
                        <div className="flex items-center space-x-[0.5vh] lg:space-x-[0.25vw]">
                          <Check className="w-[1.5vh] h-[1.5vh] lg:w-[0.75vw] lg:h-[0.75vw]" />
                          <span>{t('selected')}</span>
                        </div>
                      ) : (
                        t('select_cart')
                      )}
                    </Button>
                  </div>
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      )}

      {/* Next Button */}
      <div className="flex justify-center pt-[2vh] lg:pt-[1vw]">
        <Button
          size="md"
          onClick={handleNext}
          disabled={!selectedCartId}
          className="px-[5vh] lg:px-[3vw] bg-teal-600 hover:bg-teal-700 disabled:bg-gray-600 disabled:cursor-not-allowed"
        >
          {selectedCartId ? (
          <div className="flex items-center">
            <Check className="w-[1.8vh] h-[1.8vh] lg:w-[0.9vw] lg:h-[0.9vw] mr-[0.5vh] lg:mr-[0.25vw]" />
            {t('continue_to_menu')}
          </div>
        ) : (
          t('select_a_cart_to_continue')
        )}
        </Button>
      </div>
    </div>
  )
}