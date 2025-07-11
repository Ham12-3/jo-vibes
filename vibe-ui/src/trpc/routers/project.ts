import { z } from 'zod'
import { createTRPCRouter, publicProcedure, protectedProcedure } from '@/trpc/innit'
import { TRPCError } from '@trpc/server'

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
            where: {
              status: 'RUNNING',
            },
            orderBy: {
              createdAt: 'desc',
            },
            take: 1,
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

  // Create new project
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
})
