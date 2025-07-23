import { db } from './db'

export interface AgentTool {
  name: string
  description: string
  parameters: Record<string, unknown>
  execute: (args: Record<string, unknown>) => Promise<{
    success: boolean
    result?: unknown
    error?: string
    message: string
  }>
}

export interface AgentMemory {
  key: string
  value: unknown
  context: string
  timestamp: Date
}

export interface AgentContext {
  projectId: string
  userId: string
  conversationHistory: Array<{
    role: 'user' | 'assistant' | 'system' | 'function'
    content: string
    timestamp: Date
  }>
  currentTask: string
  projectFiles: Array<{
    path: string
    content: string
    language: string
  }>
}

export interface AgentExecutionResult {
  success: boolean
  result: unknown
  summary: string
  filesModified: string[]
  messages: Array<{
    role: 'user' | 'assistant' | 'system' | 'function'
    content: string
    timestamp: Date
  }>
}

export class AIAgentSystem {
  private static instance: AIAgentSystem
  private tools: Map<string, AgentTool>

  constructor() {
    this.tools = this.initializeTools()
  }

  static getInstance(): AIAgentSystem {
    if (!AIAgentSystem.instance) {
      AIAgentSystem.instance = new AIAgentSystem()
    }
    return AIAgentSystem.instance
  }

  private initializeTools(): Map<string, AgentTool> {
    const tools = new Map<string, AgentTool>()

    // Terminal Tool - Allows agent to run commands within the sandbox
    tools.set('terminal', {
      name: 'terminal',
      description: 'Run terminal commands in the sandbox environment. Returns detailed output including stdout and stderr for debugging.',
      parameters: {
        type: 'object',
        properties: {
          command: {
            type: 'string',
            description: 'The command to execute'
          },
          workingDirectory: {
            type: 'string',
            description: 'Working directory for the command (optional)',
            default: '/app'
          }
        },
        required: ['command']
      },
      execute: async (args: Record<string, unknown>) => {
        try {
          const command = args.command as string
          const workingDirectory = args.workingDirectory as string || '/app'
          
          console.log(`🔧 Executing command: ${command}`)
          
          // Simulate command execution
          const result = {
            stdout: `Command executed successfully: ${command}`,
            stderr: '',
            exitCode: 0,
            workingDirectory
          }

          return {
            success: true,
            result,
            message: `Command executed successfully with exit code ${result.exitCode}`
          }
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            message: 'Command execution failed'
          }
        }
      }
    })

    // Create or Update Files Tool - Enables agent to generate and modify files
    tools.set('createOrUpdateFiles', {
      name: 'createOrUpdateFiles',
      description: 'Create new files or update existing files in the project. Accepts structured input with file paths and content.',
      parameters: {
        type: 'object',
        properties: {
          files: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                path: {
                  type: 'string',
                  description: 'File path relative to project root'
                },
                content: {
                  type: 'string',
                  description: 'File content'
                }
              },
              required: ['path', 'content']
            }
          }
        },
        required: ['files']
      },
      execute: async (args: Record<string, unknown>) => {
        try {
          const files = args.files as Array<{ path: string; content: string }>
          console.log(`📝 Creating/updating ${files.length} files...`)
          
          const results: Array<{ path: string; status: string; message: string }> = []
          
          for (const file of files) {
            // Save file to database
            await db.projectFile.upsert({
              where: {
                projectId_path: {
                  projectId: 'current-project-id', // This would be passed from context
                  path: file.path
                }
              },
              update: {
                content: file.content,
                updatedAt: new Date()
              },
              create: {
                projectId: 'current-project-id',
                filename: file.path.split('/').pop() || 'file',
                path: file.path,
                content: file.content,
                language: this.getLanguageFromPath(file.path)
              }
            })

            results.push({
              path: file.path,
              status: 'success',
              message: 'File created/updated successfully'
            })
          }

          return {
            success: true,
            result: results,
            message: `Successfully processed ${files.length} files`
          }
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            message: 'File operation failed'
          }
        }
      }
    })

    // Read Files Tool - Allows agent to read existing files for context
    tools.set('readFiles', {
      name: 'readFiles',
      description: 'Read existing files from the project to understand current structure and content.',
      parameters: {
        type: 'object',
        properties: {
          paths: {
            type: 'array',
            items: {
              type: 'string'
            },
            description: 'Array of file paths to read'
          },
          includeContent: {
            type: 'boolean',
            description: 'Whether to include file content in response',
            default: true
          }
        },
        required: ['paths']
      },
      execute: async (args: Record<string, unknown>) => {
        try {
          const paths = args.paths as string[]
          const includeContent = args.includeContent as boolean ?? true
          
          console.log(`📖 Reading ${paths.length} files...`)
          
          const files = await db.projectFile.findMany({
            where: {
              path: {
                in: paths
              }
            }
          })

          const results = files.map(file => ({
            path: file.path,
            exists: true,
            content: includeContent ? file.content : undefined,
            language: file.language,
            size: file.content.length
          }))

          // Add missing files
          const existingPaths = files.map(f => f.path)
          const missingPaths = paths.filter(path => !existingPaths.includes(path))
          
          for (const path of missingPaths) {
            results.push({
              path,
              exists: false,
              content: undefined,
              language: null,
              size: 0
            })
          }

          return {
            success: true,
            result: { files: results },
            message: `Read ${files.length} existing files, ${missingPaths.length} files not found`
          }
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            message: 'File reading failed'
          }
        }
      }
    })

    // Project Analysis Tool - Analyzes the current project state
    tools.set('analyzeProject', {
      name: 'analyzeProject',
      description: 'Analyze the current project structure, dependencies, and code quality.',
      parameters: {
        type: 'object',
        properties: {
          includeQualityAnalysis: {
            type: 'boolean',
            description: 'Whether to include detailed code quality analysis',
            default: true
          }
        }
      },
      execute: async (args: Record<string, unknown>) => {
        try {
          console.log('🔍 Analyzing project structure...')
          
          const projectFiles = await db.projectFile.findMany({
            where: {
              projectId: 'current-project-id' // This would be passed from context
            }
          })

          const analysis = {
            totalFiles: projectFiles.length,
            fileTypes: this.analyzeFileTypes(projectFiles),
            projectStructure: this.analyzeProjectStructure(projectFiles),
            dependencies: this.extractDependencies(projectFiles),
            qualityAnalysis: args.includeQualityAnalysis !== false ? 
              await this.analyzeCodeQuality(projectFiles) : undefined
          }

          return {
            success: true,
            result: analysis,
            message: 'Project analysis completed successfully'
          }
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            message: 'Project analysis failed'
          }
        }
      }
    })

    return tools
  }

  async executeCodingTask(
    projectId: string, 
    userId: string, 
    task: string
  ): Promise<AgentExecutionResult> {
    try {
      console.log(`🤖 Executing coding task for project ${projectId}: ${task}`)
      
      // Simulate AI agent execution
      const messages: Array<{
        role: 'user' | 'assistant' | 'system' | 'function'
        content: string
        timestamp: Date
      }> = [
        {
          role: 'system',
          content: 'You are an expert AI coding agent specialized in building modern web applications.',
          timestamp: new Date()
        },
        {
          role: 'user',
          content: task,
          timestamp: new Date()
        }
      ]

      // Simulate tool execution
      const filesModified: string[] = []
      
      // Execute project analysis
      const analysisTool = this.tools.get('analyzeProject')
      if (analysisTool) {
        const analysisResult = await analysisTool.execute({ includeQualityAnalysis: true })
        if (analysisResult.success) {
          messages.push({
            role: 'function',
            content: `Project analysis completed: ${analysisResult.message}`,
            timestamp: new Date()
          })
        }
      }

      // Simulate file creation/updates
      const createFilesTool = this.tools.get('createOrUpdateFiles')
      if (createFilesTool) {
        const sampleFiles = [
          {
            path: 'src/components/Example.tsx',
            content: '// Example component generated by AI agent'
          }
        ]
        
        const createResult = await createFilesTool.execute({ files: sampleFiles })
        if (createResult.success) {
          filesModified.push(...sampleFiles.map(f => f.path))
          messages.push({
            role: 'function',
            content: `Files created: ${createResult.message}`,
            timestamp: new Date()
          })
        }
      }

      // Generate summary
      const summary = `Successfully executed coding task: ${task}. Modified ${filesModified.length} files.`

      messages.push({
        role: 'assistant',
        content: summary,
        timestamp: new Date()
      })

      return {
        success: true,
        result: { task, projectId, userId },
        summary,
        filesModified,
        messages
      }

    } catch (error) {
      console.error('❌ Coding task execution failed:', error)
      return {
        success: false,
        result: null,
        summary: error instanceof Error ? error.message : 'Unknown error',
        filesModified: [],
        messages: [
          {
            role: 'system',
            content: `Task execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            timestamp: new Date()
          }
        ]
      }
    }
  }

  private getLanguageFromPath(filePath: string): string {
    const ext = filePath.split('.').pop()?.toLowerCase()
    switch (ext) {
      case 'tsx':
      case 'ts': return 'typescript'
      case 'jsx':
      case 'js': return 'javascript'
      case 'css': return 'css'
      case 'json': return 'json'
      case 'md': return 'markdown'
      case 'html': return 'html'
      default: return 'text'
    }
  }

  private analyzeFileTypes(files: Array<{ language: string | null }>): Record<string, number> {
    const fileTypes: Record<string, number> = {}
    files.forEach(file => {
      const language = file.language || 'unknown'
      fileTypes[language] = (fileTypes[language] || 0) + 1
    })
    return fileTypes
  }

  private analyzeProjectStructure(files: Array<{ path: string; language: string | null }>): Record<string, unknown> {
    const structure: Record<string, unknown> = {}
    files.forEach(file => {
      const pathParts = file.path.split('/')
      let current = structure
      pathParts.forEach((part, index) => {
        if (index === pathParts.length - 1) {
          current[part] = { type: 'file', language: file.language }
        } else {
          current[part] = current[part] || { type: 'directory', children: {} }
          current = (current[part] as Record<string, unknown>).children as Record<string, unknown>
        }
      })
    })
    return structure
  }

  private extractDependencies(files: Array<{ path: string; content: string }>): string[] {
    const packageJson = files.find(f => f.path === 'package.json')
    if (packageJson) {
      try {
        const pkg = JSON.parse(packageJson.content)
        return [
          ...Object.keys(pkg.dependencies || {}),
          ...Object.keys(pkg.devDependencies || {})
        ]
      } catch (error) {
        console.error('Failed to parse package.json:', error)
      }
    }
    return []
  }

  private async analyzeCodeQuality(files: Array<{ content: string }>): Promise<{
    totalLines: number
    averageFileSize: number
    complexityScore: number
    issues: string[]
  }> {
    const qualityAnalysis = {
      totalLines: 0,
      averageFileSize: 0,
      complexityScore: 0,
      issues: [] as string[]
    }

    files.forEach(file => {
      const lines = file.content.split('\n').length
      qualityAnalysis.totalLines += lines
      
      // Simple complexity analysis
      const complexity = this.calculateComplexity(file.content)
      qualityAnalysis.complexityScore += complexity
    })

    qualityAnalysis.averageFileSize = qualityAnalysis.totalLines / files.length

    return qualityAnalysis
  }

  private calculateComplexity(content: string): number {
    // Simple complexity calculation
    const complexityFactors = [
      content.split('if').length - 1,
      content.split('for').length - 1,
      content.split('while').length - 1,
      content.split('switch').length - 1,
      content.split('catch').length - 1
    ]
    return complexityFactors.reduce((sum, factor) => sum + factor, 0)
  }

  // Memory management
  async saveAgentMemory(key: string, value: Record<string, unknown>, context: string): Promise<void> {
    await db.agentMemory.upsert({
      where: { key },
      update: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        value: value as any,
        context,
        updatedAt: new Date()
      },
      create: {
        key,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        value: value as any,
        context
      }
    })
  }

  async getAgentMemory(key: string): Promise<Record<string, unknown> | null> {
    const memory = await db.agentMemory.findUnique({
      where: { key }
    })
    return memory?.value as Record<string, unknown> | null
  }

  async clearAgentMemory(key: string): Promise<void> {
    await db.agentMemory.delete({
      where: { key }
    })
  }

  // Get available tools
  getAvailableTools(): AgentTool[] {
    return Array.from(this.tools.values())
  }

  getTool(toolName: string): AgentTool | undefined {
    return this.tools.get(toolName)
  }
}

export const aiAgentSystem = AIAgentSystem.getInstance() 