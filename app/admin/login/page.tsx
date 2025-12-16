'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAppDispatch } from '../../../lib/hooks'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { useAdminLoginMutation } from '../../../lib/api/authApi'
import { setCredentials as setAuthCredentials } from '../../../lib/slices/authSlice'

import { isAuthenticated } from '@/lib/auth'

export default function AdminLogin() {
  const [credentials, setCredentials] = useState({ email: 'admin@havana.com', password: 'admin123' })
  const [error, setError] = useState('')
  const router = useRouter()
  const dispatch = useAppDispatch()
  
  // RTK Query mutation
  const [adminLogin, { isLoading: loading }] = useAdminLoginMutation()

  // Check if already authenticated
  useEffect(() => {
    if (isAuthenticated()) {
      router.push('/admin')
    }
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    try {
      const result = await adminLogin(credentials as any).unwrap()
      
      // Store credentials in Redux store
      dispatch(setAuthCredentials({ token: result.token }))
      
      // Navigate to admin dashboard
      router.push('/admin')
    } catch (error: any) {
      console.error('Login error:', error)
      setError(error.data?.message || 'Login failed. Please try again.')
    }
  }

  return (
    <div className="min-h-screen bg-black relative overflow-hidden flex items-center justify-center">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-black to-slate-900 opacity-50"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(20,184,166,0.1),transparent_70%)]"></div>
      
      <div className="relative z-10 w-full max-w-md px-6">
        {/* Logo and Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <img 
              src="/logo.png" 
              alt="Havana Logo" 
              className="h-20 w-20 object-contain"
            />
          </div>
          <h1 className="text-3xl lg:text-4xl font-bold text-white mb-2 tracking-wider">
            ADMIN LOGIN
          </h1>
          <p className="text-gray-400 text-lg">
            Access Management Panel
          </p>
        </div>

        {/* Login Form */}
        <div className="bg-slate-700/80 backdrop-blur-sm rounded-2xl shadow-2xl border border-slate-600/50 p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4">
                <p className="text-red-400 text-sm text-center">{error}</p>
              </div>
            )}

            <Input
              type="email"
              label="Email"
              value={credentials.email}
              onChange={(e) => setCredentials(prev => ({ ...prev, email: e.target.value }))}
              placeholder="admin@havana.com"
              required
            />

            <Input
              type="password"
              label="Password"
              value={credentials.password}
              onChange={(e) => setCredentials(prev => ({ ...prev, password: e.target.value }))}
              placeholder="Enter your password"
              required
            />

            <Button
              type="submit"
              loading={loading}
              disabled={loading}
              className="w-full py-4 text-lg font-bold"
              size="lg"
            >
              {loading ? 'Signing In...' : 'Sign In'}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-600">
            <div className="text-center">
              <div className="bg-teal-500/20 border border-teal-500/50 rounded-lg p-4 mb-4">
                <p className="text-teal-400 text-sm font-medium">Admin Access</p>
                <p className="text-gray-300 text-xs mt-1">
                  Email: admin@havana.com<br />
                  Password: admin123
                </p>
              </div>
              <p className="text-gray-400 text-sm">
                Secure admin access only
              </p>
              <div className="flex items-center justify-center mt-2 space-x-2">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span className="text-green-400 text-xs">System Online</span>
              </div>
            </div>
          </div>
        </div>

        {/* Back to Site Link */}
        <div className="text-center mt-8">
          <a 
            href="/"
            className="text-teal-400 hover:text-teal-300 text-sm font-medium transition-colors"
          >
            ← Back to Main Site
          </a>
        </div>

        {/* Debug info in development */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-4 text-center">
            <button
              onClick={() => {
                const token = localStorage.getItem('admin_token')

              }}
              className="text-xs text-gray-500 hover:text-gray-400"
            >
              Debug: Check Auth Status
            </button>
          </div>
        )}
      </div>
    </div>
  )
}