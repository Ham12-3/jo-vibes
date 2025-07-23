import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

function log(message: string, data?: unknown) {
  const timestamp = new Date().toISOString()
  console.log(`[Sandbox Debug API ${timestamp}] ${message}`)
  if (data) {
    console.log('📊 Data:', JSON.stringify(data, null, 2))
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sandboxId } = await params
    log('🔍 Debug sandbox...', { sandboxId })

    // Try to find sandbox by database ID first
    let sandbox = await db.sandbox.findUnique({
      where: { id: sandboxId },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            framework: true,
            status: true
          }
        }
      }
    })

    // If not found by database ID, try to find by workspace ID
    if (!sandbox) {
      log('🔍 Sandbox not found by database ID, trying workspace ID...')
      sandbox = await db.sandbox.findFirst({
        where: { e2bId: sandboxId },
        include: {
          project: {
            select: {
              id: true,
              name: true,
              framework: true,
              status: true
            }
          }
        }
      })
    }

    if (!sandbox) {
      log('❌ Sandbox not found')
      return NextResponse.json({ error: 'Sandbox not found' }, { status: 404 })
    }

    log('✅ Sandbox found in database', {
      id: sandbox.id,
      workspaceId: sandbox.e2bId,
      status: sandbox.status,
      url: sandbox.url,
      port: sandbox.port
    })

    // Check if workspace is actually running
    let isActuallyRunning = false
    if (sandbox.url) {
      try {
        const response = await fetch(sandbox.url, {
          method: 'GET',
          signal: AbortSignal.timeout(5000)
        })
        isActuallyRunning = response.ok
      } catch (error) {
        log('⚠️ Could not verify workspace is running', { error })
      }
    }

    // Build debug information
    const debugInfo = {
      sandbox: {
        id: sandbox.id,
        containerId: sandbox.e2bId,
        status: sandbox.status,
        url: sandbox.url,
        port: sandbox.port,
        createdAt: sandbox.createdAt,
        updatedAt: sandbox.updatedAt,
        isActuallyRunning
      },
      environment: {
        hasDocker: true, // Assuming Docker is available
        nodeEnv: process.env.NODE_ENV,
        timestamp: new Date().toISOString()
      },
      recommendations: [] as string[]
    }

    // Add recommendations based on current state
    if (!sandbox.url) {
      debugInfo.recommendations.push('Sandbox URL is missing - check Docker container creation')
    }

    if (!process.env.DATABASE_URL) {
      debugInfo.recommendations.push('DATABASE_URL is missing - set it in your environment variables')
    }

    log('📤 Returning debug information', debugInfo)
    return NextResponse.json(debugInfo)

  } catch (error) {
    log('❌ Failed to debug sandbox', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })
    return NextResponse.json(
      { 
        error: 'Failed to debug sandbox',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
} 