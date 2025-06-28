import { type FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch'
import { db } from '@/lib/db'

// Replace this with your actual session/auth logic
// For now, I'm setting up a placeholder for user authentication
export type User = {
  id: string
  email: string
  username: string
  name?: string | null
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function createTRPCContext(_opts: FetchCreateContextFnOptions) {
  // TODO: Add your authentication logic here
  // This could be from cookies, JWT tokens, session, etc.
  // For example, if using NextAuth.js:
  // const session = await getServerAuthSession(opts.req)
  
  // Placeholder user - replace with actual auth
  // For now, creating a mock user to avoid type errors
  const user: User | null = {
    id: 'mock-user-id',
    email: 'test@example.com',
    username: 'testuser',
    name: 'Test User'
  } // Change this to null when you implement real auth

  return {
    db,
    user,
  }
}

export type Context = Awaited<ReturnType<typeof createTRPCContext>> 