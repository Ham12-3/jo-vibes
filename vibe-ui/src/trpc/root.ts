import { createTRPCRouter } from './innit'
import { userRouter } from './routers/user'
import { vibeRouter } from './routers/vibe'
import { likeRouter } from './routers/like'
import { commentRouter } from './routers/comment'

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  user: userRouter,
  vibe: vibeRouter,
  like: likeRouter,
  comment: commentRouter,
})

// export type definition of API
export type AppRouter = typeof appRouter 