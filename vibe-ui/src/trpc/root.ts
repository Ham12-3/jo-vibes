import { createTRPCRouter } from './innit'
import { userRouter } from './routers/user'
import { projectRouter } from './routers/project'
import { vibeRouter } from './routers/vibe'
import { likeRouter } from './routers/like'
import { commentRouter } from './routers/comment'
import { deploymentRouter } from './routers/deployment'
import { chatRouter } from './routers/chat'

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  user: userRouter,
  project: projectRouter,
  vibe: vibeRouter,
  like: likeRouter,
  comment: commentRouter,
  deployment: deploymentRouter,
  chat: chatRouter,
})

// export type definition of API
export type AppRouter = typeof appRouter 