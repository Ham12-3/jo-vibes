import { db } from './db'

interface DeploymentFile {
  file: string // path
  data: string // content (base64 encoded for binary, plain text for text files)
}

interface VercelDeployment {
  id: string
  url: string
  status: 'READY' | 'ERROR' | 'BUILDING' | 'QUEUED' | 'CANCELED'
  createdAt: number
  buildingAt?: number
  readyAt?: number
}

interface DeploymentResponse {
  id: string
  url: string
  status: string
  deploymentUrl: string
}

class DeploymentService {
  private readonly vercelToken: string
  private readonly vercelTeamId?: string

  constructor() {
    this.vercelToken = process.env.VERCEL_TOKEN || ''
    this.vercelTeamId = process.env.VERCEL_TEAM_ID
    
    if (!this.vercelToken) {
      console.warn('VERCEL_TOKEN not found. Deployment features will be disabled.')
    }
  }

  async deployProject(
    projectId: string, 
    userId: string,
    customDomain?: string
  ): Promise<DeploymentResponse> {
    try {
      // Get project with files from database
      const project = await db.project.findFirst({
        where: {
          id: projectId,
          userId: userId,
        },
        include: {
          files: true,
        },
      })

      if (!project) {
        throw new Error('Project not found')
      }

      if (project.files.length === 0) {
        throw new Error('No files to deploy')
      }

      // Prepare files for Vercel deployment
      const deploymentFiles = this.prepareFilesForDeployment(project.files)
      
      // Create deployment on Vercel
      const vercelDeployment = await this.createVercelDeployment(
        project.name,
        deploymentFiles,
        customDomain
      )

      // Save deployment record in database
      const deployment = await db.deployment.create({
        data: {
          id: vercelDeployment.id,
          url: vercelDeployment.url,
          status: 'PENDING',
          provider: 'VERCEL',
          projectId: projectId,
          userId: userId,
          buildLog: '',
        },
      })

      // Start monitoring deployment status
      this.monitorDeployment(vercelDeployment.id).catch(console.error)

      return {
        id: deployment.id,
        url: vercelDeployment.url,
        status: 'PENDING',
        deploymentUrl: vercelDeployment.url,
      }
    } catch (error) {
      console.error('Deployment failed:', error)
      throw new Error(`Deployment failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private prepareFilesForDeployment(files: Array<{ path: string; content: string }>): DeploymentFile[] {
    const deploymentFiles: DeploymentFile[] = []

    // Add project files
    for (const file of files) {
      deploymentFiles.push({
        file: file.path,
        data: file.content,
      })
    }

    // Add package.json if not present
    const hasPackageJson = files.some(f => f.path === 'package.json')
    if (!hasPackageJson) {
      deploymentFiles.push({
        file: 'package.json',
        data: JSON.stringify({
          name: 'jo-vibes-project',
          version: '0.1.0',
          private: true,
          scripts: {
            dev: 'next dev',
            build: 'next build',
            start: 'next start',
            lint: 'next lint'
          },
          dependencies: {
            'next': '^14.0.0',
            'react': '^18.0.0',
            'react-dom': '^18.0.0',
            'typescript': '^5.0.0',
            '@types/node': '^20.0.0',
            '@types/react': '^18.0.0',
            '@types/react-dom': '^18.0.0',
            'tailwindcss': '^3.4.0',
            'autoprefixer': '^10.0.0',
            'postcss': '^8.0.0'
          }
        }, null, 2),
      })
    }

    // Add Next.js config if not present
    const hasNextConfig = files.some(f => f.path.includes('next.config'))
    if (!hasNextConfig) {
      deploymentFiles.push({
        file: 'next.config.js',
        data: `/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
}

module.exports = nextConfig`,
      })
    }

    // Add vercel.json for optimal deployment
    deploymentFiles.push({
      file: 'vercel.json',
      data: JSON.stringify({
        framework: 'nextjs',
        buildCommand: 'npm run build',
        devCommand: 'npm run dev',
        installCommand: 'npm install',
        functions: {
          'app/**/*.js': {
            runtime: 'nodejs18.x'
          }
        }
      }, null, 2),
    })

    return deploymentFiles
  }

  private async createVercelDeployment(
    projectName: string, 
    files: DeploymentFile[],
    customDomain?: string
  ): Promise<VercelDeployment> {
    const deploymentData = {
      name: this.sanitizeProjectName(projectName),
      files: files,
      projectSettings: {
        framework: 'nextjs',
        buildCommand: 'npm run build',
        devCommand: 'npm run dev',
        installCommand: 'npm install',
      },
      target: 'production',
      ...(customDomain && { alias: [customDomain] }),
    }

    const response = await fetch('https://api.vercel.com/v13/deployments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.vercelToken}`,
        'Content-Type': 'application/json',
        ...(this.vercelTeamId && { 'X-Vercel-Team-Id': this.vercelTeamId }),
      },
      body: JSON.stringify(deploymentData),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Vercel deployment failed: ${error}`)
    }

    const deployment = await response.json() as VercelDeployment
    return deployment
  }

  private async monitorDeployment(deploymentId: string): Promise<void> {
    const maxAttempts = 60 // 10 minutes with 10s intervals
    let attempts = 0

    const checkStatus = async (): Promise<void> => {
      try {
        const response = await fetch(`https://api.vercel.com/v13/deployments/${deploymentId}`, {
          headers: {
            'Authorization': `Bearer ${this.vercelToken}`,
            ...(this.vercelTeamId && { 'X-Vercel-Team-Id': this.vercelTeamId }),
          },
        })

        if (!response.ok) {
          throw new Error(`Failed to get deployment status: ${response.statusText}`)
        }

        const deployment = await response.json() as VercelDeployment

        // Update deployment status in database
        await db.deployment.updateMany({
          where: { id: deploymentId },
          data: {
            status: deployment.status === 'READY' ? 'SUCCESS' : 
                   deployment.status === 'ERROR' ? 'FAILED' : 'BUILDING',
            url: deployment.status === 'READY' ? deployment.url : undefined,
            updatedAt: new Date(),
          },
        })

        // Continue monitoring if still building
        if (deployment.status === 'BUILDING' || deployment.status === 'QUEUED') {
          attempts++
          if (attempts < maxAttempts) {
            setTimeout(checkStatus, 10000) // Check again in 10 seconds
          } else {
            // Timeout - mark as failed
            await db.deployment.updateMany({
              where: { id: deploymentId },
              data: {
                status: 'FAILED',
                buildLog: 'Deployment timeout after 10 minutes',
                updatedAt: new Date(),
              },
            })
          }
        }
      } catch (error) {
        console.error('Error monitoring deployment:', error)
        await db.deployment.updateMany({
          where: { id: deploymentId },
          data: {
            status: 'FAILED',
            buildLog: `Monitoring error: ${error instanceof Error ? error.message : 'Unknown error'}`,
            updatedAt: new Date(),
          },
        })
      }
    }

    // Start monitoring
    setTimeout(checkStatus, 5000) // Initial check after 5 seconds
  }

  async getDeploymentStatus(deploymentId: string): Promise<any> {
    try {
      const response = await fetch(`https://api.vercel.com/v13/deployments/${deploymentId}`, {
        headers: {
          'Authorization': `Bearer ${this.vercelToken}`,
          ...(this.vercelTeamId && { 'X-Vercel-Team-Id': this.vercelTeamId }),
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to get deployment status: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error getting deployment status:', error)
      throw error
    }
  }

  async deleteDeployment(deploymentId: string): Promise<void> {
    try {
      const response = await fetch(`https://api.vercel.com/v13/deployments/${deploymentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.vercelToken}`,
          ...(this.vercelTeamId && { 'X-Vercel-Team-Id': this.vercelTeamId }),
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to delete deployment: ${response.statusText}`)
      }

      // Update database
      await db.deployment.updateMany({
        where: { id: deploymentId },
        data: {
          status: 'DELETED',
          updatedAt: new Date(),
        },
      })
    } catch (error) {
      console.error('Error deleting deployment:', error)
      throw error
    }
  }

  private sanitizeProjectName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/--+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 63) // Vercel limit
  }

  isConfigured(): boolean {
    return !!this.vercelToken
  }
}

export const deploymentService = new DeploymentService() 