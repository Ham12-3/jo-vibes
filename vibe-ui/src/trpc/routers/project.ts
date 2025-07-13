import { z } from 'zod'
import { createTRPCRouter, publicProcedure, protectedProcedure } from '@/trpc/innit'
import { TRPCError } from '@trpc/server'
import { aiProcessor } from '@/lib/ai-processor'
import { e2bService } from '@/lib/e2b-service-new'

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
              status: 'RUNNING',
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

  // Create E2B sandbox for project
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

      try {
        const sandboxInfo = await e2bService.createProjectSandbox({
          projectId: project.id,
          userId: ctx.user.id,
          files: project.files.map(file => ({
            path: file.path,
            content: file.content,
          })),
          framework: project.framework || 'Next.js',
          port: 3000,
        })

        return sandboxInfo
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to create sandbox',
        })
      }
    }),

  // Get sandbox info
  getSandbox: protectedProcedure
    .input(z.object({
      sandboxId: z.string(),
    }))
    .query(async ({ input }) => {
      const sandbox = await e2bService.getSandboxInfo(input.sandboxId)
      
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
    .mutation(async ({ input }) => {
      try {
        await e2bService.stopSandbox(input.sandboxId)
        return { success: true }
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to stop sandbox',
        })
      }
    }),

  // Restart sandbox
  restartSandbox: protectedProcedure
    .input(z.object({
      sandboxId: z.string(),
    }))
    .mutation(async ({ input }) => {
      try {
        const url = await e2bService.restartSandbox(input.sandboxId)
        return { success: true, url }
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to restart sandbox',
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
      try {
        // Step 1: Analyze prompt with AI
        const analysis = await aiProcessor.analyzePrompt(input.prompt);
        
        // Step 2: Create project with AI-enhanced data
        const project = await ctx.db.project.create({
          data: {
            name: analysis.projectName,
            description: analysis.description,
            framework: analysis.framework,
            styling: analysis.styling,
            database: analysis.database,
            initialPrompt: input.prompt,
            template: analysis.projectType,
            userId: ctx.user.id,
            status: 'BUILDING', // Set to building since we're processing
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

        // Step 3: Generate complete project structure
        const fileStructure = await aiProcessor.generateCompleteProjectStructure(analysis);
        
        // Step 4: Generate all project files with AI
        const projectFiles = await Promise.all(
          fileStructure.map(async (filePath) => {
            try {
              const content = await aiProcessor.generateFileContent(filePath, analysis);
              return {
                filename: filePath.split('/').pop() || 'file',
                path: filePath,
                content: content || `// Generated file: ${filePath}`,
                language: getLanguageFromPath(filePath),
                projectId: project.id,
              };
            } catch (error) {
              console.error(`Failed to generate content for ${filePath}:`, error);
              return {
                filename: filePath.split('/').pop() || 'file',
                path: filePath,
                content: `// File: ${filePath}\n// Content generation failed, will be updated soon...`,
                language: getLanguageFromPath(filePath),
                projectId: project.id,
              };
            }
          })
        );

        // Step 5: Save all files to database in batches
        const batchSize = 10;
        for (let i = 0; i < projectFiles.length; i += batchSize) {
          const batch = projectFiles.slice(i, i + batchSize);
          await ctx.db.projectFile.createMany({
            data: batch,
          });
        }

        // Step 6: Update project status to READY
        await ctx.db.project.update({
          where: { id: project.id },
          data: { status: 'READY' },
        });

        // Step 7: Optionally create sandbox for immediate preview
        let sandboxInfo = null;
        if (input.createSandbox) {
          try {
            sandboxInfo = await e2bService.createProjectSandbox({
              projectId: project.id,
              userId: ctx.user.id,
              files: projectFiles.map(file => ({
                path: file.path,
                content: file.content,
              })),
              framework: analysis.framework,
              port: 3000,
            });
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
          aiProcessed: true,
          sandboxCreated: !!sandboxInfo,
          sandboxUrl: sandboxInfo?.url || null,
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
            status: 'DRAFT',
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
      status: z.enum(['DRAFT', 'BUILDING', 'READY', 'DEPLOYED', 'ERROR']).optional(),
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

  // Sync file changes to E2B sandbox
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
              status: 'RUNNING',
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
        const sandbox = project.sandboxes[0]
        try {
          await e2bService.syncFileToSandbox(
            sandbox.e2bId!,
            file.path,
            input.content
          )
        } catch (error) {
          console.error('Failed to sync file to sandbox:', error)
          // Don't throw - file update succeeded even if sync failed
        }
      }

      return { success: true, synced: project.sandboxes.length > 0 }
    }),
})
