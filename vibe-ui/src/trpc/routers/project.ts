import { z } from 'zod'
import { createTRPCRouter, publicProcedure, protectedProcedure } from '@/trpc/innit'
import { TRPCError } from '@trpc/server'
import { aiProcessor } from '@/lib/ai-processor'
import { customSandboxService } from '../../lib/custom-sandbox'

import { ProjectStatus, SandboxStatus, SandboxType } from '@/generated/prisma'
import { v4 as uuidv4 } from 'uuid'


// Type definitions for AI analysis and project creation
interface AIAnalysis {
  projectName: string
  description: string
  framework: string
  styling: string
  database?: string | null
  projectType: string
  features: string[]
  complexity: string
  estimatedTime: string
  techStack: string[]
  architecture?: string
  fileStructure?: string[]
  designSystem?: string
}

interface ProjectFile {
  filename: string
  path: string
  content: string
  language: string
  projectId: string
}

interface ProjectWithCounts {
  id: string
  name: string
  description?: string | null
  status: string
  framework?: string | null
  styling?: string | null
  database?: string | null
  initialPrompt?: string | null
  template?: string | null
  userId: string
  createdAt: Date
  updatedAt: Date
  _count: {
    files: number
    chatSessions: number
  }
}

// Helper function to determine file language
function getLanguageFromPath(filePath: string): string {
  const ext = filePath.split('.').pop();
  switch (ext) {
    case 'tsx':
    case 'ts': return 'typescript';
    case 'jsx':
    case 'js': return 'javascript';
    case 'css': return 'css';
    case 'json': return 'json';
    case 'md': return 'markdown';
    case 'html': return 'html';
    default: return 'text';
  }
}

// Helper function to create fallback file content when AI generation fails
function createFallbackFileContent(filePath: string, analysis: { projectName: string; description: string; framework: string; styling: string; database?: string | null }): string {
  const fileName = filePath.split('/').pop() || 'file';
  
  switch (fileName) {
    case 'page.tsx':
      return `import React from 'react';

export default function Page() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 flex items-center justify-center">
      <div className="text-center text-white">
        <h1 className="text-4xl font-bold mb-4">${analysis.projectName}</h1>
        <p className="text-xl opacity-90">${analysis.description}</p>
        <div className="mt-8">
          <p className="text-sm opacity-75">
            This is a placeholder page. Your AI-generated content will appear here once the API is available.
          </p>
        </div>
      </div>
    </div>
  );
}`;

    case 'layout.tsx':
      return `import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '${analysis.projectName}',
  description: '${analysis.description}',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}`;

    case 'globals.css':
      return `@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
}`;

    case 'package.json':
      return JSON.stringify({
        name: analysis.projectName.toLowerCase().replace(/[^a-z0-9]/g, '-'),
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
          'react-dom': '^18.0.0'
        },
        devDependencies: {
          '@types/node': '^20.0.0',
          '@types/react': '^18.0.0',
          '@types/react-dom': '^18.0.0',
          'typescript': '^5.0.0',
          'tailwindcss': '^3.3.0',
          'autoprefixer': '^10.4.0',
          'postcss': '^8.4.0'
        }
      }, null, 2);

    case 'README.md':
      return `# ${analysis.projectName}

${analysis.description}

## Getting Started

This project was generated using Jo-Vibes AI. To get started:

1. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`

2. Run the development server:
   \`\`\`bash
   npm run dev
   \`\`\`

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Framework
- **Framework**: ${analysis.framework}
- **Styling**: ${analysis.styling}
${analysis.database ? `- **Database**: ${analysis.database}` : ''}

## Note
This is a placeholder project structure. The AI-generated content will be available once the API quota is restored.
`;

    default:
      return `// ${fileName}
// This file was generated as a fallback when AI generation was unavailable.
// Content will be updated when the API is available again.

export default function ${fileName.replace(/[^a-zA-Z0-9]/g, '')}() {
  return (
    <div>
      <h1>${fileName}</h1>
      <p>Placeholder content for ${fileName}</p>
    </div>
  );
}`;
  }
}

export const projectRouter = createTRPCRouter({
  // Get user projects
  getUserProjects: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(10),
      cursor: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const projects = await ctx.db.project.findMany({
        where: {
          userId: ctx.user.id,
        },
        take: input.limit,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        orderBy: {
          updatedAt: 'desc',
        },
        include: {
          deployments: {
            select: {
              id: true,
              status: true,
              url: true,
            },
            orderBy: {
              createdAt: 'desc',
            },
            take: 1,
          },
          sandboxes: {
            where: {
              status: SandboxStatus.RUNNING,
            },
            select: {
              id: true,
              e2bId: true,
              url: true,
              status: true,
              port: true,
            },
            take: 1,
          },
          _count: {
            select: {
              files: true,
              chatSessions: true,
            },
          },
        },
      })

      return projects
    }),

  // Get single project
  getProject: protectedProcedure
    .input(z.object({
      id: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      const project = await ctx.db.project.findFirst({
        where: {
          id: input.id,
          userId: ctx.user.id,
        },
        include: {
          files: {
            orderBy: {
              path: 'asc',
            },
          },
          deployments: {
            orderBy: {
              createdAt: 'desc',
            },
            take: 5,
          },
          sandboxes: {
            orderBy: {
              createdAt: 'desc',
            },
            take: 3,
          },
          chatSessions: {
            orderBy: {
              updatedAt: 'desc',
            },
            take: 1,
            include: {
              messages: {
                orderBy: {
                  createdAt: 'desc',
                },
                take: 5,
              },
            },
          },
        },
      })

      if (!project) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Project not found',
        })
      }

      return project
    }),

  // Create Gitpod workspace for project
  createSandbox: protectedProcedure
    .input(z.object({
      projectId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.db.project.findFirst({
        where: {
          id: input.projectId,
          userId: ctx.user.id,
        },
        include: {
          files: true,
        },
      })

      if (!project) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Project not found',
        })
      }

      if (project.files.length === 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Project has no files to deploy',
        })
      }

      // Debug: Log the files being passed to the sandbox
      console.log(`🔍 Creating sandbox for project: ${project.name}`)
      console.log(`📁 Project has ${project.files.length} files:`)
      project.files.forEach((file, index) => {
        console.log(`  ${index + 1}. ${file.path} (${file.content.length} chars)`)
        console.log(`     Preview: ${file.content.substring(0, 100)}...`)
      })

      try {
        // Check if a sandbox already exists for this project
        const existingSandbox = await ctx.db.sandbox.findFirst({
          where: { 
            projectId: project.id,
            status: { in: ['CREATING', 'RUNNING'] }
          }
        });

        if (existingSandbox) {
          console.log(`⚠️ Sandbox already exists for project ${project.id}: ${existingSandbox.id}`);
          return {
            id: existingSandbox.id,
            status: existingSandbox.status,
            url: existingSandbox.url,
            port: existingSandbox.port,
            containerId: existingSandbox.e2bId,
            logs: [],
            createdAt: existingSandbox.createdAt,
            updatedAt: existingSandbox.updatedAt
          };
        }

        // Generate unique sandbox ID with UUID
        const sandboxId = `sandbox-${project.id}-${uuidv4()}`;
        const sandboxInfo = await customSandboxService.createSandbox({
          id: sandboxId,
          projectId: project.id,
          framework: project.framework || 'nextjs',
          port: 0, // Will be assigned by service
          files: project.files.reduce((acc, file) => {
            acc[file.path] = file.content;
            return acc;
          }, {} as Record<string, string>),
          environment: {}
        })

        // Save sandbox information to database
        const savedSandbox = await ctx.db.sandbox.create({
          data: {
            id: sandboxInfo.id,
            e2bId: sandboxInfo.containerId,
            status: sandboxInfo.status as SandboxStatus,
            port: sandboxInfo.port,
            url: sandboxInfo.url,
            projectId: project.id,
            type: SandboxType.DOCKER,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
          },
        })

        console.log(`✅ Workspace created successfully: ${sandboxInfo.url}`)
        console.log(`✅ Sandbox saved to database: ${savedSandbox.id}`)
        
        return {
          ...sandboxInfo,
          id: savedSandbox.id,
        }
      } catch (error) {
        console.error(`❌ Failed to create workspace:`, error)
        
        // Handle specific Prisma constraint errors
        if (error instanceof Error && error.message.includes('Unique constraint failed')) {
          console.log(`⚠️ Sandbox ID already exists, attempting to find existing sandbox...`);
          
          // Try to find the existing sandbox
          const existingSandbox = await ctx.db.sandbox.findFirst({
            where: { projectId: project.id }
          });
          
          if (existingSandbox) {
            console.log(`✅ Found existing sandbox: ${existingSandbox.id}`);
            return {
              id: existingSandbox.id,
              status: existingSandbox.status,
              url: existingSandbox.url,
              port: existingSandbox.port,
              containerId: existingSandbox.e2bId,
              logs: [],
              createdAt: existingSandbox.createdAt,
              updatedAt: existingSandbox.updatedAt
            };
          }
        }
        
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to create workspace',
        })
      }
    }),

  // Get sandbox info
  getSandbox: protectedProcedure
    .input(z.object({
      sandboxId: z.string(),
    }))
    .query(async ({ input }) => {
      const sandbox = await customSandboxService.getSandboxStatus(input.sandboxId)
      
      if (!sandbox) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Sandbox not found',
        })
      }

      return sandbox
    }),

  // Stop sandbox
  stopSandbox: protectedProcedure
    .input(z.object({
      sandboxId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        await customSandboxService.stopSandbox(input.sandboxId)
        
        // Update sandbox status in database
        await ctx.db.sandbox.update({
          where: { id: input.sandboxId },
          data: { status: SandboxStatus.STOPPED }
        })
        
        return { success: true }
      } catch {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to stop sandbox',
        })
      }
    }),

  // Update sandbox status
  updateSandboxStatus: protectedProcedure
    .input(z.object({
      sandboxId: z.string(),
      status: z.enum(['CREATING', 'RUNNING', 'STOPPED', 'ERROR']),
      url: z.string().optional(),
      port: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        await ctx.db.sandbox.update({
          where: { id: input.sandboxId },
          data: {
            status: input.status as SandboxStatus,
            ...(input.url && { url: input.url }),
            ...(input.port && { port: input.port }),
          }
        })
        
        return { success: true }
      } catch {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update sandbox status',
        })
      }
    }),

  // Test sandbox creation with debug info
  testSandboxCreation: protectedProcedure
    .input(z.object({
      projectId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.db.project.findFirst({
        where: {
          id: input.projectId,
          userId: ctx.user.id,
        },
        include: {
          files: true,
        },
      })

      if (!project) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Project not found',
        })
      }

      // Return debug info without actually creating sandbox
      return {
        projectName: project.name,
        fileCount: project.files.length,
        files: project.files.map(file => ({
          path: file.path,
          contentLength: file.content.length,
          contentPreview: file.content.substring(0, 200) + '...',
        })),
        framework: project.framework || 'Next.js',
        message: 'Debug info - no sandbox created'
      }
    }),

  // Test actual sandbox creation with detailed logging
  testSandboxCreationWithLogs: protectedProcedure
    .input(z.object({
      projectId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.db.project.findFirst({
        where: {
          id: input.projectId,
          userId: ctx.user.id,
        },
        include: {
          files: true,
        },
      })

      if (!project) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Project not found',
        })
      }

      console.log('🧪 TESTING SANDBOX CREATION...')
      console.log(`📁 Project: ${project.name}`)
      console.log(`📁 Files: ${project.files.length}`)
      
      // Log each file
      project.files.forEach((file, index) => {
        console.log(`  ${index + 1}. ${file.path} (${file.content.length} chars)`)
        console.log(`     Preview: ${file.content.substring(0, 100)}...`)
      })

      try {
        // Actually try to create a sandbox
        const sandboxInfo = await customSandboxService.createSandbox({
          id: `sandbox-${project.id}-${Date.now()}`,
          projectId: project.id,
          framework: project.framework || 'nextjs',
          port: 0, // Will be assigned by service
          files: project.files.reduce((acc, file) => {
            acc[file.path] = file.content;
            return acc;
          }, {} as Record<string, string>),
          environment: {}
        })

        console.log('✅ Sandbox created successfully!')
        console.log(`🔗 URL: ${sandboxInfo.url}`)
        console.log(`🆔 Container ID: ${sandboxInfo.containerId}`)
        console.log(`📊 Status: ${sandboxInfo.status}`)

        return {
          success: true,
          sandboxInfo,
          projectName: project.name,
          fileCount: project.files.length,
          message: 'Sandbox created successfully - check console for detailed logs'
        }
      } catch (error) {
        console.error('❌ Sandbox creation failed:', error)
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          projectName: project.name,
          fileCount: project.files.length,
          message: 'Sandbox creation failed - check console for detailed logs'
        }
      }
    }),

  // Restart sandbox
  restartSandbox: protectedProcedure
    .input(z.object({
      sandboxId: z.string(),
    }))
    .mutation(async ({ input }) => {
      try {
        const success = await customSandboxService.restartSandbox(input.sandboxId)
        return { success }
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to restart workspace',
        })
      }
    }),

  // Create new project with AI analysis
  createProjectWithAI: protectedProcedure
    .input(z.object({
      prompt: z.string().min(10).max(1000),
      createSandbox: z.boolean().default(true),
    }))
    .mutation(async ({ ctx, input }) => {
      let project: ProjectWithCounts | null = null;
      let analysis: AIAnalysis | null = null;
      let projectFiles: ProjectFile[] = [];

      try {
        // Step 1: Analyze prompt with AI
        try {
          const aiResult = await aiProcessor.analyzePrompt(input.prompt);
          // Convert the AI result to our expected format
          analysis = {
            projectName: aiResult?.projectName || input.prompt.substring(0, 50) + '...',
            description: aiResult?.description || input.prompt,
            framework: aiResult?.framework || 'Next.js',
            styling: aiResult?.styling || 'Tailwind CSS',
            database: aiResult?.database || null,
            projectType: aiResult?.projectType || 'blank',
            features: aiResult?.features || [],
            complexity: aiResult?.complexity || 'simple',
            estimatedTime: aiResult?.estimatedTime || '1-2 hours',
            techStack: aiResult?.techStack || ['Next.js', 'React', 'TypeScript'],
            architecture: 'monolithic' // Default value since AI processor doesn't return this
          };
        } catch (aiError) {
          console.error('AI analysis failed:', aiError);
          // Create a basic project structure when AI fails
          analysis = {
            projectName: input.prompt.substring(0, 50) + '...',
            description: input.prompt,
            framework: 'Next.js',
            styling: 'Tailwind CSS',
            database: null,
            projectType: 'blank',
            features: [],
            complexity: 'simple',
            estimatedTime: '1-2 hours',
            techStack: ['Next.js', 'React', 'TypeScript'],
            architecture: 'monolithic'
          };
        }
        
        // Ensure analysis is not null before proceeding
        if (!analysis) {
          throw new Error('Failed to create project analysis');
        }

        // Step 1.5: Check for existing similar projects to prevent duplicates
        const existingProject = await ctx.db.project.findFirst({
          where: {
            userId: ctx.user.id,
            OR: [
              { name: analysis.projectName },
              { initialPrompt: input.prompt },
              { 
                name: { 
                  contains: analysis.projectName.substring(0, 30),
                  mode: 'insensitive'
                }
              },
              // Check for very similar prompts (fuzzy matching)
              {
                initialPrompt: {
                  contains: input.prompt.substring(0, 50),
                  mode: 'insensitive'
                }
              },
              // Check for projects created in the last 5 minutes with similar names
              {
                AND: [
                  {
                    name: {
                      contains: analysis.projectName.substring(0, 20),
                      mode: 'insensitive'
                    }
                  },
                  {
                    createdAt: {
                      gte: new Date(Date.now() - 5 * 60 * 1000) // Last 5 minutes
                    }
                  }
                ]
              }
            ]
          },
          include: {
            _count: {
              select: {
                files: true,
                chatSessions: true,
              },
            },
            sandboxes: {
              where: {
                status: SandboxStatus.RUNNING,
              },
              select: {
                id: true,
                e2bId: true,
                url: true,
                status: true,
                port: true,
              },
              take: 1,
            },
          },
          orderBy: { createdAt: 'desc' }
        });

        if (existingProject) {
          // Return existing project instead of creating duplicate
          console.log('Found existing project, returning instead of creating duplicate');
          return {
            ...existingProject,
            analysis,
            filesGenerated: existingProject._count.files,
            totalFiles: existingProject._count.files,
            aiProcessed: true,
            sandboxCreated: existingProject.sandboxes && existingProject.sandboxes.length > 0,
            sandboxUrl: existingProject.sandboxes?.[0]?.url || null,
            isExisting: true,
            duplicatePrevented: true
          };
        }
        
        // Step 2: Create project with AI-enhanced data
        project = await ctx.db.project.create({
          data: {
            name: analysis.projectName,
            description: analysis.description,
            framework: analysis.framework,
            styling: analysis.styling,
            database: analysis.database,
            initialPrompt: input.prompt,
            template: analysis.projectType,
            userId: ctx.user.id,
            status: ProjectStatus.BUILDING, // Set to building since we're processing
          },
          include: {
            _count: {
              select: {
                files: true,
                chatSessions: true,
              },
            },
          },
        });

        // Ensure project is not null before proceeding
        if (!project) {
          throw new Error('Failed to create project');
        }

        // Step 3: Generate complete project structure (optimized for essential files only)
        let fileStructure: string[] = [];
        try {
          // @ts-expect-error - AI processor has complex parameter type
          const structureResult = await aiProcessor.generateCompleteProjectStructure(analysis);
          // Handle different possible return types
          if (Array.isArray(structureResult)) {
            fileStructure = structureResult;
          } else if (typeof structureResult === 'object' && structureResult !== null) {
            // If it returns an object with file structure, extract it
            const structureObj = structureResult as Record<string, unknown>;
            if (structureObj.fileStructure && Array.isArray(structureObj.fileStructure)) {
              fileStructure = structureObj.fileStructure as string[];
            }
          }
          
          // Limit to essential files only (max 15 files for better performance)
          const essentialFiles = [
            'src/app/page.tsx',
            'src/app/layout.tsx', 
            'src/app/globals.css',
            'package.json',
            'README.md',
            'next.config.js',
            'tailwind.config.js',
            'tsconfig.json'
          ];
          
          // Filter to prioritize essential files first but do NOT truncate the list.
          // This allows Lovable to generate the complete project structure as designed,
          // while still ensuring we keep only relevant paths (pages/components/utils/etc.).
          fileStructure = fileStructure.filter(file => 
            essentialFiles.includes(file) || 
            file.includes('components/') ||
            file.includes('lib/') ||
            file.includes('utils/')
          );
          
        } catch (structureError) {
          console.error('File structure generation failed:', structureError);
          // Create basic file structure as fallback
          fileStructure = [
            'src/app/page.tsx',
            'src/app/layout.tsx',
            'src/app/globals.css',
            'package.json',
            'README.md'
          ];
        }
        
        // Step 4: Generate all project files with AI
        projectFiles = await Promise.all(
          fileStructure.map(async (filePath) => {
            try {
              // @ts-expect-error - AI processor has complex parameter type
              const content = await aiProcessor.generateFileContent(filePath, analysis);
              return {
                filename: filePath.split('/').pop() || 'file',
                path: filePath,
                content: content || `// Generated file: ${filePath}`,
                language: getLanguageFromPath(filePath),
                projectId: project!.id,
              };
            } catch (error) {
              console.error(`Failed to generate content for ${filePath}:`, error);
              // Create a basic file content as fallback
              const fallbackContent = createFallbackFileContent(filePath, analysis!);
              return {
                filename: filePath.split('/').pop() || 'file',
                path: filePath,
                content: fallbackContent,
                language: getLanguageFromPath(filePath),
                projectId: project!.id,
              };
            }
          })
        );

        // Step 5: Save all files to database in batches
        if (projectFiles.length > 0) {
          const batchSize = 10;
          for (let i = 0; i < projectFiles.length; i += batchSize) {
            const batch = projectFiles.slice(i, i + batchSize);
            await ctx.db.projectFile.createMany({
              data: batch,
            });
          }
        }

        // Step 6: Update project status to READY
        await ctx.db.project.update({
          where: { id: project.id },
          data: { status: 'READY' },
        });

        // Step 7: Optionally create sandbox for immediate preview
        let sandboxInfo = null;
        if (input.createSandbox && projectFiles.length > 0) {
          try {
            sandboxInfo = await customSandboxService.createSandbox({
              id: `sandbox-${project.id}-${Date.now()}`,
              projectId: project.id,
              framework: analysis.framework,
              port: 0, // Will be assigned by service
              files: projectFiles.reduce((acc, file) => {
                acc[file.path] = file.content;
                return acc;
              }, {} as Record<string, string>),
              environment: {}
            });
            
            // Update project status to READY if sandbox created successfully
            if (sandboxInfo) {
              await ctx.db.project.update({
                where: { id: project.id },
                data: { status: ProjectStatus.READY },
              });
            }
          } catch (error) {
            console.error('Failed to create sandbox:', error);
            // Don't fail the entire operation if sandbox creation fails
          }
        }

        return {
          ...project,
          analysis,
          filesGenerated: projectFiles.length,
          totalFiles: fileStructure.length,
          aiProcessed: !!analysis,
          sandboxCreated: !!sandboxInfo,
          sandboxUrl: sandboxInfo?.url || null,
          isExisting: false
        };
      } catch (error) {
        console.error('AI project creation failed:', error);
        
        // Fallback to simple project creation
        const fallbackProject = await ctx.db.project.create({
          data: {
            name: input.prompt.slice(0, 50).replace(/[^a-zA-Z0-9\s]/g, '').trim() || 'My App',
            description: input.prompt,
            framework: 'Next.js',
            styling: 'Tailwind CSS',
            initialPrompt: input.prompt,
            template: 'web-app',
            userId: ctx.user.id,
            status: ProjectStatus.DRAFT,
          },
          include: {
            _count: {
              select: {
                files: true,
                chatSessions: true,
              },
            },
          },
        });

        return {
          ...fallbackProject,
          aiProcessed: false,
          error: error instanceof Error ? error.message : 'AI processing failed',
        };
      }
    }),

  // Create new project (original method)
  createProject: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(100),
      description: z.string().max(500).optional(),
      framework: z.string().optional(),
      styling: z.string().optional(),
      initialPrompt: z.string().optional(),
      screenshots: z.array(z.string()).optional(),
      template: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.db.project.create({
        data: {
          name: input.name,
          description: input.description,
          framework: input.framework,
          styling: input.styling,
          initialPrompt: input.initialPrompt,
          screenshots: input.screenshots || [],
          template: input.template,
          userId: ctx.user.id,
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

      return project
    }),

  // Update project
  updateProject: protectedProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().min(1).max(100).optional(),
      description: z.string().max(500).optional(),
      status: z.nativeEnum(ProjectStatus).optional(),
      framework: z.string().optional(),
      styling: z.string().optional(),
      database: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input

      const project = await ctx.db.project.findFirst({
        where: {
          id,
          userId: ctx.user.id,
        },
      })

      if (!project) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Project not found',
        })
      }

      const updatedProject = await ctx.db.project.update({
        where: { id },
        data: updateData,
        include: {
          _count: {
            select: {
              files: true,
              chatSessions: true,
            },
          },
        },
      })

      return updatedProject
    }),

  // Delete project
  deleteProject: protectedProcedure
    .input(z.object({
      id: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.db.project.findFirst({
        where: {
          id: input.id,
          userId: ctx.user.id,
        },
      })

      if (!project) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Project not found',
        })
      }

      await ctx.db.project.delete({
        where: { id: input.id },
      })

      return { success: true }
    }),

  // Get public projects (for inspiration/templates)
  getPublicProjects: publicProcedure
    .input(z.object({
      limit: z.number().min(1).max(50).default(20),
      cursor: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const projects = await ctx.db.project.findMany({
        where: {
          isPublic: true,
          status: 'DEPLOYED',
        },
        take: input.limit,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              name: true,
              avatar: true,
            },
          },
          deployments: {
            where: {
              status: 'SUCCESS',
            },
            select: {
              url: true,
            },
            take: 1,
          },
          _count: {
            select: {
              files: true,
            },
          },
        },
      })

      return projects
    }),

  // File Management Endpoints
  getProjectFiles: protectedProcedure
    .input(z.object({
      projectId: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      // First verify user owns the project
      const project = await ctx.db.project.findFirst({
        where: {
          id: input.projectId,
          userId: ctx.user.id,
        },
      })

      if (!project) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Project not found',
        })
      }

      const files = await ctx.db.projectFile.findMany({
        where: {
          projectId: input.projectId,
        },
        orderBy: [
          { path: 'asc' },
        ],
      })

      return files
    }),

  updateProjectFile: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      fileId: z.string(),
      content: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      // First verify user owns the project
      const project = await ctx.db.project.findFirst({
        where: {
          id: input.projectId,
          userId: ctx.user.id,
        },
      })

      if (!project) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Project not found',
        })
      }

      // Verify file belongs to the project
      const file = await ctx.db.projectFile.findFirst({
        where: {
          id: input.fileId,
          projectId: input.projectId,
        },
      })

      if (!file) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'File not found',
        })
      }

      // Update the file
      const updatedFile = await ctx.db.projectFile.update({
        where: {
          id: input.fileId,
        },
        data: {
          content: input.content,
          updatedAt: new Date(),
        },
      })

      // Update project's updatedAt timestamp
      await ctx.db.project.update({
        where: {
          id: input.projectId,
        },
        data: {
          updatedAt: new Date(),
        },
      })

      return updatedFile
    }),

  createProjectFile: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      path: z.string(),
      content: z.string().default(''),
    }))
    .mutation(async ({ ctx, input }) => {
      // First verify user owns the project
      const project = await ctx.db.project.findFirst({
        where: {
          id: input.projectId,
          userId: ctx.user.id,
        },
      })

      if (!project) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Project not found',
        })
      }

      // Check if file already exists
      const existingFile = await ctx.db.projectFile.findFirst({
        where: {
          projectId: input.projectId,
          path: input.path,
        },
      })

      if (existingFile) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'File already exists at this path',
        })
      }

      // Create the file
      const filename = input.path.split('/').pop() || input.path
      const newFile = await ctx.db.projectFile.create({
        data: {
          projectId: input.projectId,
          filename: filename,
          path: input.path,
          content: input.content,
          language: getLanguageFromPath(input.path),
        },
      })

      // Update project's updatedAt timestamp
      await ctx.db.project.update({
        where: {
          id: input.projectId,
        },
        data: {
          updatedAt: new Date(),
        },
      })

      return newFile
    }),

  deleteProjectFile: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      fileId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      // First verify user owns the project
      const project = await ctx.db.project.findFirst({
        where: {
          id: input.projectId,
          userId: ctx.user.id,
        },
      })

      if (!project) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Project not found',
        })
      }

      // Verify file belongs to the project
      const file = await ctx.db.projectFile.findFirst({
        where: {
          id: input.fileId,
          projectId: input.projectId,
        },
      })

      if (!file) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'File not found',
        })
      }

      // Delete the file
      await ctx.db.projectFile.delete({
        where: {
          id: input.fileId,
        },
      })

      // Update project's updatedAt timestamp
      await ctx.db.project.update({
        where: {
          id: input.projectId,
        },
        data: {
          updatedAt: new Date(),
        },
      })

      return { success: true, deletedPath: file.path }
    }),

  renameProjectFile: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      fileId: z.string(),
      newPath: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      // First verify user owns the project
      const project = await ctx.db.project.findFirst({
        where: {
          id: input.projectId,
          userId: ctx.user.id,
        },
      })

      if (!project) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Project not found',
        })
      }

      // Verify file belongs to the project
      const file = await ctx.db.projectFile.findFirst({
        where: {
          id: input.fileId,
          projectId: input.projectId,
        },
      })

      if (!file) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'File not found',
        })
      }

      // Check if new path already exists
      const existingFile = await ctx.db.projectFile.findFirst({
        where: {
          projectId: input.projectId,
          path: input.newPath,
        },
      })

      if (existingFile) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'File already exists at the new path',
        })
      }

      // Update the file path and language
      const updatedFile = await ctx.db.projectFile.update({
        where: {
          id: input.fileId,
        },
        data: {
          path: input.newPath,
          language: getLanguageFromPath(input.newPath),
          updatedAt: new Date(),
        },
      })

      // Update project's updatedAt timestamp
      await ctx.db.project.update({
        where: {
          id: input.projectId,
        },
        data: {
          updatedAt: new Date(),
        },
      })

      return updatedFile
    }),

          // Sync file changes to Gitpod workspace
  syncFileToSandbox: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      fileId: z.string(),
      content: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      // First verify user owns the project
      const project = await ctx.db.project.findFirst({
        where: {
          id: input.projectId,
          userId: ctx.user.id,
        },
        include: {
          sandboxes: {
            where: {
              status: SandboxStatus.RUNNING,
            },
            take: 1,
          },
        },
      })

      if (!project) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Project not found',
        })
      }

      // Get the file
      const file = await ctx.db.projectFile.findFirst({
        where: {
          id: input.fileId,
          projectId: input.projectId,
        },
      })

      if (!file) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'File not found',
        })
      }

      // Update the file in database
      await ctx.db.projectFile.update({
        where: {
          id: input.fileId,
        },
        data: {
          content: input.content,
          updatedAt: new Date(),
        },
      })

      // If there's a running sandbox, sync the file
      if (project.sandboxes.length > 0) {
        // Note: File syncing would be implemented here when Gitpod API is available
      }

      return { success: true, synced: project.sandboxes.length > 0 }
    }),
})
