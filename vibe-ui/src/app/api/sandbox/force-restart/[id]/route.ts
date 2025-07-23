import { NextRequest, NextResponse } from 'next/server'
import { customSandboxService } from '@/lib/custom-sandbox'
import { db } from '@/lib/db'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sandboxId } = await params
    console.log('🔄 Force restarting sandbox...', { sandboxId })

    // Get the sandbox record
    const sandbox = await db.sandbox.findUnique({
      where: { id: sandboxId },
      include: { project: true }
    })

    if (!sandbox) {
      return NextResponse.json(
        { error: 'Sandbox not found' },
        { status: 404 }
      )
    }

    // Get project files for the new sandbox
    const projectFiles = await db.projectFile.findMany({
      where: { projectId: sandbox.projectId },
      orderBy: { path: 'asc' }
    })

    const files = projectFiles.reduce((acc, file) => {
      acc[file.path] = file.content;
      return acc;
    }, {} as Record<string, string>);

    // Create new sandbox
    const newSandboxInfo = await customSandboxService.createSandbox({
      id: `sandbox-${sandbox.projectId}-${Date.now()}`,
      projectId: sandbox.projectId,
      framework: sandbox.project?.framework || 'nextjs',
      port: 0, // Will be assigned by service
      files,
      environment: {}
    })

    // Update the existing sandbox record with new sandbox info
    await db.sandbox.update({
      where: { id: sandboxId },
      data: {
        e2bId: newSandboxInfo.containerId,
        url: newSandboxInfo.url,
        port: newSandboxInfo.port,
        status: newSandboxInfo.status,
        updatedAt: new Date()
      }
    })

    console.log('✅ Sandbox force restarted successfully:', newSandboxInfo)

    return NextResponse.json({
      success: true,
      sandbox: newSandboxInfo
    })

  } catch (error) {
    console.error('❌ Failed to force restart sandbox:', error)
    return NextResponse.json(
      { error: 'Failed to force restart sandbox' },
      { status: 500 }
    )
  }
} 