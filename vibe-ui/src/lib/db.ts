import { PrismaClient, Mood } from '../generated/prisma'

// Prevent multiple instances of Prisma Client in development
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['query'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

// Common database operations for the vibe application
export const dbOperations = {
  // User operations
  user: {
    findByEmail: (email: string) => 
      db.user.findUnique({ where: { email } }),
    
    findByUsername: (username: string) => 
      db.user.findUnique({ where: { username } }),
    
    findWithVibes: (id: string) =>
      db.user.findUnique({
        where: { id },
        include: {
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
  },

  // Vibe operations
  vibe: {
    findPublic: (limit = 10, cursor?: string) =>
      db.vibe.findMany({
        where: { isPublic: true },
        take: limit,
        ...(cursor && { cursor: { id: cursor }, skip: 1 }),
        orderBy: { createdAt: 'desc' },
        include: {
          author: {
            select: { id: true, username: true, name: true, avatar: true }
          },
          _count: {
            select: { likes: true, comments: true }
          }
        }
      }),

    findByMood: (mood: Mood, limit = 10) =>
      db.vibe.findMany({
        where: { 
          mood: mood,
          isPublic: true 
        },
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          author: {
            select: { id: true, username: true, name: true, avatar: true }
          },
          _count: {
            select: { likes: true, comments: true }
          }
        }
      }),

    findWithDetails: (id: string) =>
      db.vibe.findUnique({
        where: { id },
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
      }),

    searchByTags: (tags: string[], limit = 10) =>
      db.vibe.findMany({
        where: {
          tags: { hasSome: tags },
          isPublic: true
        },
        take: limit,
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
  },

  // Like operations
  like: {
    toggle: async (userId: string, vibeId: string) => {
      const existing = await db.like.findUnique({
        where: {
          userId_vibeId: { userId, vibeId }
        }
      })

      if (existing) {
        // Unlike
        await db.like.delete({
          where: { id: existing.id }
        })
        return { liked: false }
      } else {
        // Like
        await db.like.create({
          data: { userId, vibeId }
        })
        return { liked: true }
      }
    },

    checkUserLike: (userId: string, vibeId: string) =>
      db.like.findUnique({
        where: {
          userId_vibeId: { userId, vibeId }
        }
      }).then(like => !!like)
  }
} 