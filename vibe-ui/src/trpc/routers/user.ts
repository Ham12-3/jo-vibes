import { z } from 'zod'
import { createTRPCRouter, publicProcedure, protectedProcedure } from '../innit'

export const userRouter = createTRPCRouter({
  // Get user by email
  getByEmail: publicProcedure
    .input(z.object({ email: z.string().email() }))
    .query(({ ctx, input }) => {
      return ctx.db.user.findUnique({
        where: { email: input.email },
        select: {
          id: true,
          email: true,
          username: true,
          name: true,
          bio: true,
          avatar: true,
          createdAt: true,
        },
      })
    }),

  // Get user by username
  getByUsername: publicProcedure
    .input(z.object({ username: z.string() }))
    .query(({ ctx, input }) => {
      return ctx.db.user.findUnique({
        where: { username: input.username },
        select: {
          id: true,
          email: true,
          username: true,
          name: true,
          bio: true,
          avatar: true,
          createdAt: true,
        },
      })
    }),

  // Get user with their vibes
  getWithVibes: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(({ ctx, input }) => {
      return ctx.db.user.findUnique({
        where: { id: input.id },
        select: {
          id: true,
          username: true,
          name: true,
          bio: true,
          avatar: true,
          createdAt: true,
          vibes: {
            orderBy: { createdAt: 'desc' },
            include: {
              _count: {
                select: { likes: true, comments: true }
              }
            }
          }
        }
      })
    }),

  // Update user profile (protected)
  updateProfile: protectedProcedure
    .input(z.object({
      name: z.string().optional(),
      bio: z.string().optional(),
      avatar: z.string().url().optional(),
    }))
    .mutation(({ ctx, input }) => {
      return ctx.db.user.update({
        where: { id: ctx.user.id },
        data: input,
        select: {
          id: true,
          email: true,
          username: true,
          name: true,
          bio: true,
          avatar: true,
          updatedAt: true,
        },
      })
    }),

  // Get current user (protected)
  getCurrent: protectedProcedure.query(({ ctx }) => {
    return ctx.db.user.findUnique({
      where: { id: ctx.user.id },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        bio: true,
        avatar: true,
        createdAt: true,
      },
    })
  }),
}) 