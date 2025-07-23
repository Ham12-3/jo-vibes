import { NextResponse } from 'next/server';
import { customSandboxService } from '@/lib/custom-sandbox';

export async function GET() {
  try {
    const sandboxes = await customSandboxService.listSandboxes();

    return NextResponse.json({
      success: true,
      sandboxes: sandboxes.map(sandbox => ({
        id: sandbox.id,
        status: sandbox.status,
        url: sandbox.url,
        port: sandbox.port,
        containerId: sandbox.containerId,
        logs: sandbox.logs.slice(-10), // Last 10 log lines
        createdAt: sandbox.createdAt,
        updatedAt: sandbox.updatedAt
      }))
    });

  } catch (error) {
    console.error('❌ Failed to list sandboxes:', error);
    return NextResponse.json(
      { 
        error: 'Failed to list sandboxes',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 