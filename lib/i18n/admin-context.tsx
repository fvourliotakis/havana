'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { dashboardTranslations } from './admin/dashboard'
import { bookingsTranslations } from './admin/bookings'
import { bankSettingsTranslations } from './admin/bank-settings'
import { foodCartsTranslations } from './admin/food-carts'
import { foodItemsTranslations } from './admin/food-items'
import { servicesTranslations } from './admin/services'
import { paymentsTranslations } from './admin/payments'
import { couponsTranslations } from './admin/coupons'
import { reportsTranslations } from './admin/reports'

type Language = 'el' | 'en' // Greek (Ελληνικά) | English
type DashboardTranslationKey = keyof typeof dashboardTranslations.el
type BookingsTranslationKey = keyof typeof bookingsTranslations.el
type FoodCartsTranslationKey = keyof typeof foodCartsTranslations.el
type FoodItemsTranslationKey = keyof typeof foodItemsTranslations.el
type ServicesTranslationKey = keyof typeof servicesTranslations.el
type PaymentsTranslationKey = keyof typeof paymentsTranslations.el
type BankSettingsTranslationKey = keyof typeof bankSettingsTranslations.el
type CouponsTranslationKey = keyof typeof couponsTranslations.el
type ReportsTranslationKey = keyof typeof reportsTranslations.el
type AdminTranslationKey = DashboardTranslationKey | BookingsTranslationKey | BankSettingsTranslationKey | FoodCartsTranslationKey | FoodItemsTranslationKey | ServicesTranslationKey | PaymentsTranslationKey | CouponsTranslationKey | ReportsTranslationKey

interface AdminI18nContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: AdminTranslationKey) => string
  isRTL: boolean
}

const AdminI18nContext = createContext<AdminI18nContextType | undefined>(undefined)

export function AdminI18nProvider({ children }: { children: React.ReactNode }) {
  // Default to Greek as requested
  const [language, setLanguageState] = useState<Language>('el')

  useEffect(() => {
    // Check if language is stored in localStorage
    const savedLanguage = localStorage.getItem('admin_language') as Language
    if (savedLanguage && (savedLanguage === 'el' || savedLanguage === 'en')) {
      setLanguageState(savedLanguage)
    } else {
      // Default to Greek if no saved preference
      setLanguageState('el')
      localStorage.setItem('admin_language', 'el')
    }
  }, [])

  const setLanguage = (lang: Language) => {
    setLanguageState(lang)
    localStorage.setItem('admin_language', lang)
  }

  const t = (key: AdminTranslationKey): string => {
    // Try dashboard translations first
    if (key in dashboardTranslations[language]) {
      return dashboardTranslations[language][key as DashboardTranslationKey] || dashboardTranslations.en[key as DashboardTranslationKey] || key
    }
    // Try bookings translations
    if (key in bookingsTranslations[language]) {
      return bookingsTranslations[language][key as BookingsTranslationKey] || bookingsTranslations.en[key as BookingsTranslationKey] || key
    }
    // Try bank settings translations
    if (key in bankSettingsTranslations[language]) {
      return bankSettingsTranslations[language][key as BankSettingsTranslationKey] || bankSettingsTranslations.en[key as BankSettingsTranslationKey] || key
    }
    // Try food carts translations
    if (key in foodCartsTranslations[language]) {
      return foodCartsTranslations[language][key as FoodCartsTranslationKey] || foodCartsTranslations.en[key as FoodCartsTranslationKey] || key
    }
    // Try food items translations
    if (key in foodItemsTranslations[language]) {
      return foodItemsTranslations[language][key as FoodItemsTranslationKey] || foodItemsTranslations.en[key as FoodItemsTranslationKey] || key
    }
    // Try services translations
    if (key in servicesTranslations[language]) {
      return servicesTranslations[language][key as ServicesTranslationKey] || servicesTranslations.en[key as ServicesTranslationKey] || key
    }
    // Try coupons translations
    if (key in couponsTranslations[language]) {
      return couponsTranslations[language][key as CouponsTranslationKey] || couponsTranslations.en[key as CouponsTranslationKey] || key
    }
    // Try payments translations
    if (key in paymentsTranslations[language]) {
      return paymentsTranslations[language][key as PaymentsTranslationKey] || paymentsTranslations.en[key as PaymentsTranslationKey] || key
    }
    // Try reports translations
    if (key in reportsTranslations[language]) {
      return reportsTranslations[language][key as ReportsTranslationKey] || reportsTranslations.en[key as ReportsTranslationKey] || key
    }
    // Fallback
    return key
  }

  const isRTL = false // Greek and English are both LTR

  return (
    <AdminI18nContext.Provider value={{ language, setLanguage, t, isRTL }}>
      {children}
    </AdminI18nContext.Provider>
  )
}

export function useAdminI18n() {
  const context = useContext(AdminI18nContext)
  if (context === undefined) {
    throw new Error('useAdminI18n must be used within an AdminI18nProvider')
  }
  return context
}