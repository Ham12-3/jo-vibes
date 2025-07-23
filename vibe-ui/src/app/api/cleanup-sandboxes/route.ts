import { NextResponse } from 'next/server'
import { CustomSandboxService } from '@/lib/custom-sandbox'

export async function POST() {
  try {
    const sandboxService = new CustomSandboxService()
    
    // Clean up all problematic containers
    await sandboxService.cleanup()
    
    return NextResponse.json({ 
      success: true, 
      message: 'Cleanup completed successfully' 
    })
  } catch (error) {
    console.error('Cleanup failed:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
} 