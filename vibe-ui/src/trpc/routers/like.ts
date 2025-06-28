import { z } from 'zod'
import { createTRPCRouter, protectedProcedure } from '../innit'

export const likeRouter = createTRPCRouter({
  // Toggle like on a vibe
  toggle: protectedProcedure
    .input(z.object({ vibeId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.like.findUnique({
        where: {
          userId_vibeId: { 
            userId: ctx.user.id, 
            vibeId: input.vibeId 
          }
        }
      })

      if (existing) {
        // Unlike
        await ctx.db.like.delete({
          where: { id: existing.id }
        })
        return { liked: false }
      } else {
        // Like
        await ctx.db.like.create({
          data: { 
            userId: ctx.user.id, 
            vibeId: input.vibeId 
          }
        })
        return { liked: true }
      }
    }),

  // Check if user liked a vibe
  checkUserLike: protectedProcedure
    .input(z.object({ vibeId: z.string() }))
    .query(async ({ ctx, input }) => {
      const like = await ctx.db.like.findUnique({
        where: {
          userId_vibeId: { 
            userId: ctx.user.id, 
            vibeId: input.vibeId 
          }
        }
      })
      return !!like
    }),

  // Get user's liked vibes
  getUserLikes: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(50).default(10),
      cursor: z.string().optional(),
    }))
    .query(({ ctx, input }) => {
      return ctx.db.like.findMany({
        where: { userId: ctx.user.id },
        take: input.limit + 1,
        ...(input.cursor && { cursor: { id: input.cursor }, skip: 1 }),
        orderBy: { createdAt: 'desc' },
        include: {
          vibe: {
            include: {
              author: {
                select: { id: true, username: true, name: true, avatar: true }
              },
              _count: {
                select: { likes: true, comments: true }
              }
            }
          }
        }
      })
    }),
}) 