import { NextRequest, NextResponse } from 'next/server'
import { runCompleteEmailTest, testEmailConfiguration, testEmailSending } from '@/lib/email/test'

// POST /api/test/email - Test email functionality
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, testEmail } = body

    // Check if user is admin (you can add proper auth check here)
    const isAdmin = true // For now, allow all tests

    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 401 }
      )
    }

    switch (action) {
      case 'configuration':
        const configResult = await testEmailConfiguration()
        return NextResponse.json(configResult)

      case 'sending':
        if (!testEmail) {
          return NextResponse.json(
            { error: 'Test email address is required' },
            { status: 400 }
          )
        }
        const sendingResult = await testEmailSending(testEmail)
        return NextResponse.json(sendingResult)

      case 'complete':
        const completeResult = await runCompleteEmailTest(testEmail)
        return NextResponse.json(completeResult)

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: configuration, sending, or complete' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Email test API error:', error)
    return NextResponse.json(
      { 
        error: 'Email test failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// GET /api/test/email - Get email configuration status
export async function GET() {
  try {
    const configResult = await testEmailConfiguration()
    return NextResponse.json(configResult)
  } catch (error) {
    console.error('Email configuration check error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to check email configuration',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
