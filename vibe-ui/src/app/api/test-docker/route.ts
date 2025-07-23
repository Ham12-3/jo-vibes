import { NextResponse } from 'next/server'
import { dockerSandboxService } from '@/lib/docker-sandbox'

export async function GET() {
  try {
    const isAvailable = await dockerSandboxService.isDockerAvailable()
    
    return NextResponse.json({
      dockerAvailable: isAvailable,
      platform: process.platform,
      nodeEnv: process.env.NODE_ENV,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json({
      dockerAvailable: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      platform: process.platform,
      timestamp: new Date().toISOString()
    })
  }
} 