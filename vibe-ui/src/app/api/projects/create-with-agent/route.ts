import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { enhancedBackgroundJobService } from '@/lib/inngest/enhanced-trigger'

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse request body
    const body = await request.json()
    const { 
      name, 
      description, 
      userPrompt, 
      framework, 
      styling, 
      template
    } = body

    // Validate required fields
    if (!name || !userPrompt) {
      return NextResponse.json(
        { error: 'Name and user prompt are required' }, 
        { status: 400 }
      )
    }

    // Create project record in database
    const project = await db.project.create({
      data: {
        name,
        description: description || undefined,
        status: 'DRAFT', // Will be updated by background job
        framework: framework || undefined,
        styling: styling || undefined,
        template: template || 'nextjs-modern',
        initialPrompt: userPrompt,
        userId,
        isPublic: false
      }
    })

    console.log(`📁 Created project: ${project.id} - ${name}`)

    // Trigger enhanced agent-based project generation
    const success = await enhancedBackgroundJobService.triggerProjectGenerationWithAgent(
      project.id,
      userId,
      userPrompt,
      framework,
      styling
    )

    if (!success) {
      // If background job trigger fails, update project status to error
      await db.project.update({
        where: { id: project.id },
        data: { status: 'ERROR' }
      })
      
      return NextResponse.json(
        { error: 'Failed to start project generation' }, 
        { status: 500 }
      )
    }

    // Return immediate success response
    return NextResponse.json({
      success: true,
      message: 'Project generation started successfully',
      project: {
        id: project.id,
        name: project.name,
        status: project.status,
        estimatedCompletion: new Date(Date.now() + 5 * 60 * 1000) // 5 minutes estimate
      },
      nextSteps: [
        'AI agent is analyzing your requirements',
        'Generating project structure and files',
        'Setting up development environment',
        'Running code quality checks',
        'Preparing for deployment'
      ]
    })

  } catch (error) {
    console.error('❌ Error creating project with agent:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' }, 
        { status: 400 }
      )
    }

    // Get project status
    const project = await db.project.findUnique({
      where: { 
        id: projectId,
        userId // Ensure user owns the project
      },
      include: {
        files: true,
        sandboxes: {
          where: { status: 'RUNNING' },
          take: 1
        },
        deployments: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    })

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' }, 
        { status: 404 }
      )
    }

    // Get system health for additional context
    const systemHealth = await enhancedBackgroundJobService.getSystemHealth()

    return NextResponse.json({
      project: {
        id: project.id,
        name: project.name,
        status: project.status,
        framework: project.framework,
        styling: project.styling,
        initialPrompt: project.initialPrompt,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
        filesCount: project.files.length,
        sandboxUrl: project.sandboxes[0]?.url,
        deploymentUrl: project.deployments[0]?.url
      },
      systemHealth,
      estimatedCompletion: project.status === 'BUILDING' ? 
        new Date(Date.now() + 3 * 60 * 1000) : // 3 minutes if building
        null
    })

  } catch (error) {
    console.error('❌ Error getting project status:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
} 