import { NextRequest, NextResponse } from 'next/server';
import { customSandboxService } from '@/lib/custom-sandbox';
import { db } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, framework, files } = body;

    if (!projectId || !framework) {
      return NextResponse.json(
        { error: 'Missing required fields: projectId, framework' },
        { status: 400 }
      );
    }

    // Get project details
    const project = await db.project.findUnique({
      where: { id: projectId }
    });

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Generate unique sandbox ID with UUID
    const sandboxId = `sandbox-${projectId}-${uuidv4()}`;

    // Create sandbox configuration
    const config = {
      id: sandboxId,
      projectId,
      framework,
      port: 0, // Will be assigned by service
      files: files || {},
      environment: {}
    };

    // Create the sandbox
    const sandbox = await customSandboxService.createSandbox(config);

    console.log('✅ Custom sandbox created:', sandbox);

    return NextResponse.json({
      success: true,
      sandbox: {
        id: sandbox.id,
        status: sandbox.status,
        url: sandbox.url,
        port: sandbox.port,
        containerId: sandbox.containerId
      }
    });

  } catch (error) {
    console.error('❌ Failed to create custom sandbox:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create sandbox',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 