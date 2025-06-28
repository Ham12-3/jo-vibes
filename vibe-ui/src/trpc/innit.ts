import { initTRPC, TRPCError } from '@trpc/server'
import { type Context, type User } from './context'
import { ZodError } from 'zod'

// Initialize tRPC
const t = initTRPC.context<Context>().create({
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError
            ? error.cause.flatten()
            : null,
      },
    }
  },
})

// Export reusable router and procedure helpers
export const createTRPCRouter = t.router
export const publicProcedure = t.procedure

// Protected procedure that requires authentication
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' })
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user as User, // user is now guaranteed to be non-null
    },
  })
})
