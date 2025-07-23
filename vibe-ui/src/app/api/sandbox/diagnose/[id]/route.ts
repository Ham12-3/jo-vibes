import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

function log(message: string, data?: unknown) {
  const timestamp = new Date().toISOString()
  console.log(`[Diagnose API ${timestamp}] ${message}`)
  if (data) {
    console.log('📊 Data:', JSON.stringify(data, null, 2))
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    log('🔍 Diagnosing workspace...', { id })

    // Find the sandbox record
    const sandbox = await db.sandbox.findFirst({
      where: { id },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            framework: true
          }
        }
      }
    })

    if (!sandbox) {
      return NextResponse.json(
        { error: 'Workspace not found' },
        { status: 404 }
      )
    }

    log('📦 Found workspace:', {
      id: sandbox.id,
      workspaceId: sandbox.e2bId,
      status: sandbox.status,
      url: sandbox.url,
      createdAt: sandbox.createdAt,
      updatedAt: sandbox.updatedAt
    })

    // Initialize diagnosis object
    const diagnosis = {
      workspace: {
        id: sandbox.id,
        workspaceId: sandbox.e2bId,
        status: sandbox.status,
        url: sandbox.url,
        port: sandbox.port,
        createdAt: sandbox.createdAt,
        updatedAt: sandbox.updatedAt,
        project: {
          id: sandbox.project.id,
          name: sandbox.project.name,
          framework: sandbox.project.framework
        },
        accessible: false,
        statusCode: null as number | null,
        statusText: null as string | null,
        error: null as string | null
      },
      recommendations: [] as string[]
    }

    // Check if Gitpod workspace still exists by trying to access it
    if (sandbox.url) {
      try {
        log('🌐 Testing Gitpod workspace URL...', { url: sandbox.url })
        
        const workspaceResponse = await fetch(sandbox.url, {
          method: 'GET',
          signal: AbortSignal.timeout(5000)
        })

        log('📡 Gitpod workspace response received', {
          status: workspaceResponse.status,
          ok: workspaceResponse.ok,
          statusText: workspaceResponse.statusText
        })

        if (workspaceResponse.ok) {
          diagnosis.workspace.accessible = true
          diagnosis.workspace.statusCode = workspaceResponse.status
          diagnosis.workspace.statusText = workspaceResponse.statusText
        } else {
          log('❌ Gitpod workspace not accessible', {
            status: workspaceResponse.status,
            statusText: workspaceResponse.statusText
          })
          diagnosis.workspace.accessible = false
          diagnosis.workspace.statusCode = workspaceResponse.status
          diagnosis.workspace.statusText = workspaceResponse.statusText
        }
      } catch (error) {
        log('❌ Error testing Gitpod workspace URL', { error })
        diagnosis.workspace.accessible = false
        diagnosis.workspace.error = error instanceof Error ? error.message : 'Unknown error'
      }
    }

    // Add recommendations based on diagnosis
    if (sandbox.status === 'ERROR') {
      diagnosis.recommendations.push('Workspace is in ERROR state - try force restarting it')
    }

    if (sandbox.status === 'CREATING' && diagnosis.workspace.accessible) {
      diagnosis.recommendations.push('Workspace is running but database shows CREATING - update database status')
    }

    if (sandbox.status === 'RUNNING' && !diagnosis.workspace.accessible) {
      diagnosis.recommendations.push('Workspace is marked as RUNNING but not accessible - check if it crashed')
    }

    if (!diagnosis.workspace.accessible) {
      diagnosis.recommendations.push('Workspace is not accessible - check if it has stopped or crashed')
    }

    // Check environment variables
    if (!process.env.GITPOD_TOKEN) {
      diagnosis.recommendations.push('GITPOD_TOKEN is missing - set it in your environment variables')
    }

    log('✅ Diagnosis complete', diagnosis)

    return NextResponse.json(diagnosis)

  } catch (error) {
    log('❌ Diagnosis failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })
    
    return NextResponse.json(
      { error: 'Failed to diagnose workspace' },
      { status: 500 }
    )
  }
} 