import { NextRequest, NextResponse } from 'next/server';
import { customSandboxService } from '@/lib/custom-sandbox';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sandboxId } = await params;
    
    const success = await customSandboxService.restartSandbox(sandboxId);

    if (success) {
      return NextResponse.json({
        success: true,
        message: 'Sandbox restarted successfully'
      });
    } else {
      return NextResponse.json(
        { error: 'Failed to restart sandbox' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('❌ Failed to restart sandbox:', error);
    return NextResponse.json(
      { 
        error: 'Failed to restart sandbox',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 