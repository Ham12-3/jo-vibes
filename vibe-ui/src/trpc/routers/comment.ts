import { z } from 'zod'
import { createTRPCRouter, publicProcedure, protectedProcedure } from '../innit'

export const commentRouter = createTRPCRouter({
  // Get comments for a vibe
  getByVibeId: publicProcedure
    .input(z.object({
      vibeId: z.string(),
      limit: z.number().min(1).max(50).default(10),
      cursor: z.string().optional(),
    }))
    .query(({ ctx, input }) => {
      return ctx.db.comment.findMany({
        where: { vibeId: input.vibeId },
        take: input.limit + 1,
        ...(input.cursor && { cursor: { id: input.cursor }, skip: 1 }),
        orderBy: { createdAt: 'desc' },
        include: {
          author: {
            select: { id: true, username: true, name: true, avatar: true }
          }
        }
      })
    }),

  // Create a comment (protected)
  create: protectedProcedure
    .input(z.object({
      vibeId: z.string(),
      content: z.string().min(1).max(500),
    }))
    .mutation(({ ctx, input }) => {
      return ctx.db.comment.create({
        data: {
          content: input.content,
          vibeId: input.vibeId,
          authorId: ctx.user.id,
        },
        include: {
          author: {
            select: { id: true, username: true, name: true, avatar: true }
          }
        }
      })
    }),

  // Update a comment (protected)
  update: protectedProcedure
    .input(z.object({
      id: z.string(),
      content: z.string().min(1).max(500),
    }))
    .mutation(async ({ ctx, input }) => {
      // Check if user owns the comment
      const comment = await ctx.db.comment.findUnique({
        where: { id: input.id },
        select: { authorId: true }
      })
      
      if (!comment || comment.authorId !== ctx.user.id) {
        throw new Error('Unauthorized')
      }

      return ctx.db.comment.update({
        where: { id: input.id },
        data: { content: input.content },
        include: {
          author: {
            select: { id: true, username: true, name: true, avatar: true }
          }
        }
      })
    }),

  // Delete a comment (protected)
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Check if user owns the comment
      const comment = await ctx.db.comment.findUnique({
        where: { id: input.id },
        select: { authorId: true }
      })
      
      if (!comment || comment.authorId !== ctx.user.id) {
        throw new Error('Unauthorized')
      }

      return ctx.db.comment.delete({
        where: { id: input.id }
      })
    }),

  // Get user's comments (protected)
  getMyComments: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(50).default(10),
      cursor: z.string().optional(),
    }))
    .query(({ ctx, input }) => {
      return ctx.db.comment.findMany({
        where: { authorId: ctx.user.id },
        take: input.limit + 1,
        ...(input.cursor && { cursor: { id: input.cursor }, skip: 1 }),
        orderBy: { createdAt: 'desc' },
        include: {
          vibe: {
            select: { id: true, title: true, authorId: true }
          }
        }
      })
    }),
}) 