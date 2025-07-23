import { NextRequest, NextResponse } from 'next/server';
import { customSandboxService } from '@/lib/custom-sandbox';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sandboxId } = await params;
    
    const success = await customSandboxService.stopSandbox(sandboxId);

    if (success) {
      return NextResponse.json({
        success: true,
        message: 'Sandbox stopped successfully'
      });
    } else {
      return NextResponse.json(
        { error: 'Failed to stop sandbox' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('❌ Failed to stop sandbox:', error);
    return NextResponse.json(
      { 
        error: 'Failed to stop sandbox',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 