import { NextRequest, NextResponse } from 'next/server';
import { customSandboxService } from '@/lib/custom-sandbox';
import { db } from '@/lib/db';

function log(message: string, data?: unknown) {
  console.log(`[Custom Sandbox Status] ${message}`, data || '');
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sandboxId } = await params;
    log('🔍 Checking custom sandbox status...', { sandboxId })

    // Get sandbox status from custom service
    const sandboxStatus = await customSandboxService.getSandboxStatus(sandboxId);

    if (!sandboxStatus) {
      log('❌ Sandbox not found')
      return NextResponse.json({ error: 'Sandbox not found' }, { status: 404 })
    }

    log('✅ Sandbox status retrieved', {
      id: sandboxStatus.id,
      status: sandboxStatus.status,
      url: sandboxStatus.url,
      port: sandboxStatus.port
    })

    // Update database with current status
    await db.sandbox.update({
      where: { id: sandboxId },
      data: {
        status: sandboxStatus.status,
        url: sandboxStatus.url,
        port: sandboxStatus.port,
        updatedAt: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      sandbox: {
        id: sandboxStatus.id,
        status: sandboxStatus.status,
        url: sandboxStatus.url,
        port: sandboxStatus.port,
        containerId: sandboxStatus.containerId,
        logs: sandboxStatus.logs.slice(-10), // Last 10 log lines
        createdAt: sandboxStatus.createdAt,
        updatedAt: sandboxStatus.updatedAt
      }
    });

  } catch (error) {
    log('❌ Failed to get sandbox status', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })
    return NextResponse.json(
      { 
        error: 'Failed to get sandbox status',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 