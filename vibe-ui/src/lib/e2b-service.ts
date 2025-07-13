import { db } from './db'

export interface E2BSandboxConfig {
  projectId: string
  userId: string
  files: Array<{
    path: string
    content: string
  }>
  framework: string
  port?: number
}

export interface SandboxInfo {
  id: string
  e2bId: string
  url: string | null
  status: 'CREATING' | 'RUNNING' | 'STOPPED' | 'ERROR'
  port: number | null
}

export class E2BService {
  private static instance: E2BService

  static getInstance(): E2BService {
    if (!E2BService.instance) {
      E2BService.instance = new E2BService()
    }
    return E2BService.instance
  }

  async createProjectSandbox(config: E2BSandboxConfig): Promise<SandboxInfo> {
    try {
      if (!process.env.E2B_API_KEY) {
        throw new Error('E2B API key is not configured')
      }

      // Step 1: Create sandbox record in database
      const sandboxRecord = await db.sandbox.create({
        data: {
          projectId: config.projectId,
          status: 'CREATING',
          type: 'NODE',
          port: config.port || 3000,
        },
      })

      // Step 2: Simulate E2B sandbox creation
      // In a real implementation, this would use the E2B SDK
      const mockE2BId = `e2b_${Date.now()}_${Math.random().toString(36).substring(7)}`
      const mockUrl = `https://${mockE2BId}-${config.port || 3000}.e2b.dev`

      // Step 3: Update database with E2B ID and URL
      await db.sandbox.update({
        where: { id: sandboxRecord.id },
        data: {
          e2bId: mockE2BId,
          url: mockUrl,
          status: 'RUNNING',
        },
      })

      // Simulate setup time
      await new Promise(resolve => setTimeout(resolve, 2000))

      return {
        id: sandboxRecord.id,
        e2bId: mockE2BId,
        url: mockUrl,
        status: 'RUNNING',
        port: config.port || 3000,
      }
    } catch (error) {
      console.error('Failed to create E2B sandbox:', error)
      
      // Update sandbox status to ERROR
      try {
        await db.sandbox.update({
          where: { id: config.projectId },
          data: { status: 'ERROR' },
        })
      } catch {
        // Ignore if update fails
      }
      
      throw new Error(`Sandbox creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async getSandboxInfo(sandboxId: string): Promise<SandboxInfo | null> {
    try {
      const sandboxRecord = await db.sandbox.findUnique({
        where: { id: sandboxId },
      })

      if (!sandboxRecord) {
        return null
      }

      return {
        id: sandboxRecord.id,
        e2bId: sandboxRecord.e2bId || '',
        url: sandboxRecord.url,
        status: sandboxRecord.status as 'CREATING' | 'RUNNING' | 'STOPPED' | 'ERROR',
        port: sandboxRecord.port,
      }
    } catch (error) {
      console.error('Failed to get sandbox info:', error)
      return null
    }
  }

  async stopSandbox(sandboxId: string): Promise<void> {
    try {
      await db.sandbox.update({
        where: { id: sandboxId },
        data: { status: 'STOPPED' },
      })
    } catch (error) {
      console.error('Failed to stop sandbox:', error)
      throw error
    }
  }

  async restartSandbox(sandboxId: string): Promise<string | null> {
    try {
      const sandboxRecord = await db.sandbox.findUnique({
        where: { id: sandboxId },
        include: {
          project: {
            include: {
              files: true,
            },
          },
        },
      })

      if (!sandboxRecord || !sandboxRecord.project) {
        throw new Error('Sandbox or project not found')
      }

      // Update sandbox status to running
      await db.sandbox.update({
        where: { id: sandboxId },
        data: { status: 'RUNNING' },
      })

      return sandboxRecord.url
    } catch (error) {
      console.error('Failed to restart sandbox:', error)
      throw error
    }
  }

  async cleanupExpiredSandboxes(): Promise<void> {
    try {
      // Find sandboxes older than 2 hours
      const expiredSandboxes = await db.sandbox.findMany({
        where: {
          createdAt: {
            lt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
          },
          status: 'RUNNING',
        },
      })

      for (const sandbox of expiredSandboxes) {
        try {
          await this.stopSandbox(sandbox.id)
          console.log(`Cleaned up expired sandbox: ${sandbox.id}`)
        } catch (error) {
          console.error(`Failed to cleanup sandbox ${sandbox.id}:`, error)
        }
      }
    } catch (error) {
      console.error('Failed to cleanup expired sandboxes:', error)
    }
  }

  // Enhanced method for actual E2B integration
  async createRealE2BSandbox(config: E2BSandboxConfig): Promise<SandboxInfo> {
    // This method would contain the real E2B SDK integration
    // For now, it's a placeholder that calls the mock version
    return this.createProjectSandbox(config)
  }
}

// Export singleton instance
export const e2bService = E2BService.getInstance() 