import { NextRequest, NextResponse } from 'next/server'
import { customSandboxService } from '@/lib/custom-sandbox'

export async function GET() {
  try {
    const activeSandboxes = await customSandboxService.listActiveSandboxes()
    return NextResponse.json({ 
      success: true, 
      sandboxes: activeSandboxes 
    })
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to list sandboxes' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { projectId, files, framework, port } = body

    if (!projectId || !files || !framework) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const sandbox = await customSandboxService.createSandbox({
      projectId,
      files,
      framework,
      port
    })

    return NextResponse.json({ 
      success: true, 
      sandbox 
    })
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to create sandbox' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sandboxId = searchParams.get('id')

    if (!sandboxId) {
      return NextResponse.json(
        { success: false, error: 'Sandbox ID required' },
        { status: 400 }
      )
    }

    await customSandboxService.stopSandbox(sandboxId)
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to stop sandbox' },
      { status: 500 }
    )
  }
} 