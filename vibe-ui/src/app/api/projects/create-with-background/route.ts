import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { backgroundJobService } from '@/lib/inngest/trigger'
import { auth } from '@clerk/nextjs/server'

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { prompt } = body

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      )
    }

    // Step 1: Create project record immediately
    const project = await db.project.create({
      data: {
        name: prompt.slice(0, 50).replace(/[^a-zA-Z0-9\s]/g, '').trim() || 'My App',
        description: prompt,
        framework: 'Next.js',
        styling: 'Tailwind CSS',
        initialPrompt: prompt,
        template: 'web-app',
        userId: userId,
        status: 'DRAFT', // Will be updated by background job
      },
      include: {
        _count: {
          select: {
            files: true,
            chatSessions: true,
          },
        },
      },
    })

    // Step 2: Trigger background job for AI processing
    const jobTriggered = await backgroundJobService.triggerProjectGeneration(
      project.id,
      userId,
      prompt
    )

    if (!jobTriggered) {
      // If background job fails, update project status
      await db.project.update({
        where: { id: project.id },
        data: { status: 'ERROR' }
      })
      
      return NextResponse.json(
        { error: 'Failed to start background processing' },
        { status: 500 }
      )
    }

    // Step 3: Return immediate response
    return NextResponse.json({
      success: true,
      project: {
        ...project,
        status: 'DRAFT',
        message: 'Project creation started. You will be notified when it\'s ready.'
      },
      backgroundJob: {
        triggered: true,
        estimatedTime: '2-5 minutes'
      }
    })

  } catch (error) {
    console.error('Project creation failed:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 