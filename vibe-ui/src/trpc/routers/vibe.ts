import { z } from 'zod'
import { Mood } from '@/generated/prisma'
import { createTRPCRouter, publicProcedure, protectedProcedure } from '../innit'

export const vibeRouter = createTRPCRouter({
  // Get public vibes with pagination
  getPublic: publicProcedure
    .input(z.object({
      limit: z.number().min(1).max(50).default(10),
      cursor: z.string().optional(),
    }))
    .query(({ ctx, input }) => {
      return ctx.db.vibe.findMany({
        where: { isPublic: true },
        take: input.limit + 1,
        ...(input.cursor && { cursor: { id: input.cursor }, skip: 1 }),
        orderBy: { createdAt: 'desc' },
        include: {
          author: {
            select: { id: true, username: true, name: true, avatar: true }
          },
          _count: {
            select: { likes: true, comments: true }
          }
        }
      })
    }),

  // Get vibes by mood
  getByMood: publicProcedure
    .input(z.object({
      mood: z.nativeEnum(Mood),
      limit: z.number().min(1).max(50).default(10),
    }))
    .query(({ ctx, input }) => {
      return ctx.db.vibe.findMany({
        where: { 
          mood: input.mood,
          isPublic: true 
        },
        take: input.limit,
        orderBy: { createdAt: 'desc' },
        include: {
          author: {
            select: { id: true, username: true, name: true, avatar: true }
          },
          _count: {
            select: { likes: true, comments: true }
          }
        }
      })
    }),

  // Get vibe with full details
  getWithDetails: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(({ ctx, input }) => {
      return ctx.db.vibe.findUnique({
        where: { id: input.id },
        include: {
          author: {
            select: { id: true, username: true, name: true, avatar: true }
          },
          comments: {
            orderBy: { createdAt: 'desc' },
            include: {
              author: {
                select: { id: true, username: true, name: true, avatar: true }
              }
            }
          },
          likes: {
            include: {
              user: {
                select: { id: true, username: true, name: true }
              }
            }
          }
        }
      })
    }),

  // Create a new vibe (protected)
  create: protectedProcedure
    .input(z.object({
      title: z.string().min(1).max(100),
      description: z.string().optional(),
      mood: z.nativeEnum(Mood),
      color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
      tags: z.array(z.string()).default([]),
      isPublic: z.boolean().default(true),
    }))
    .mutation(({ ctx, input }) => {
      return ctx.db.vibe.create({
        data: {
          ...input,
          authorId: ctx.user.id,
        },
        include: {
          author: {
            select: { id: true, username: true, name: true, avatar: true }
          },
          _count: {
            select: { likes: true, comments: true }
          }
        }
      })
    }),
}) 