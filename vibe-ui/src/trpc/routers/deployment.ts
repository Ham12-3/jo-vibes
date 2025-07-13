import { z } from 'zod'
import { createTRPCRouter, protectedProcedure } from '@/trpc/innit'
import { TRPCError } from '@trpc/server'
import { deploymentService } from '@/lib/deployment-service'

export const deploymentRouter = createTRPCRouter({
  // Deploy a project
  deployProject: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      customDomain: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify user owns the project
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

      if (!deploymentService.isConfigured()) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Deployment service is not configured. Please contact support.',
        })
      }

      try {
        const deployment = await deploymentService.deployProject(
          input.projectId,
          ctx.user.id,
          input.customDomain
        )

        return deployment
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Deployment failed',
        })
      }
    }),

  // Get deployments for a project
  getProjectDeployments: protectedProcedure
    .input(z.object({
      projectId: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      // Verify user owns the project
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

      const deployments = await ctx.db.deployment.findMany({
        where: {
          projectId: input.projectId,
          userId: ctx.user.id,
        },
        orderBy: {
          createdAt: 'desc',
        },
      })

      return deployments
    }),

  // Get user's all deployments
  getUserDeployments: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(10),
      cursor: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const deployments = await ctx.db.deployment.findMany({
        where: {
          userId: ctx.user.id,
        },
        take: input.limit,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          project: {
            select: {
              id: true,
              name: true,
              description: true,
            },
          },
        },
      })

      return deployments
    }),

  // Delete a deployment
  deleteDeployment: protectedProcedure
    .input(z.object({
      deploymentId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify user owns the deployment
      const deployment = await ctx.db.deployment.findFirst({
        where: {
          id: input.deploymentId,
          userId: ctx.user.id,
        },
      })

      if (!deployment) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Deployment not found',
        })
      }

      if (!deploymentService.isConfigured()) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Deployment service is not configured.',
        })
      }

      try {
        await deploymentService.deleteDeployment(input.deploymentId)
        return { success: true }
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to delete deployment',
        })
      }
    }),

  // Get deployment status
  getDeploymentStatus: protectedProcedure
    .input(z.object({
      deploymentId: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      // Verify user owns the deployment
      const deployment = await ctx.db.deployment.findFirst({
        where: {
          id: input.deploymentId,
          userId: ctx.user.id,
        },
      })

      if (!deployment) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Deployment not found',
        })
      }

      return deployment
    }),

  // Check if deployment service is available
  isDeploymentAvailable: protectedProcedure
    .query(() => {
      return {
        available: deploymentService.isConfigured(),
        message: deploymentService.isConfigured() 
          ? 'Deployment service is ready' 
          : 'Deployment service is not configured. Contact support to enable deployments.',
      }
    }),
}) 