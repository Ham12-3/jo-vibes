import { type FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'

export type User = {
  id: string
  email: string
  username: string
  name?: string | null
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function createTRPCContext(_: FetchCreateContextFnOptions) {
  const { userId } = await auth()
  
  let user: User | null = null
  
  if (userId) {
    // Try to get user from database first
    let dbUser = await db.user.findUnique({
      where: { id: userId },
    })
    
    // If user doesn't exist in database, create from Clerk data
    if (!dbUser) {
      // Import clerkClient to get user details
      const { clerkClient } = await import('@clerk/nextjs/server')
      const client = await clerkClient()
      const clerkUser = await client.users.getUser(userId)
      
      // Create user in database
      dbUser = await db.user.create({
        data: {
          id: userId,
          email: clerkUser.emailAddresses[0]?.emailAddress || '',
          username: clerkUser.username || clerkUser.emailAddresses[0]?.emailAddress.split('@')[0] || 'user',
          name: clerkUser.firstName && clerkUser.lastName 
            ? `${clerkUser.firstName} ${clerkUser.lastName}`
            : clerkUser.firstName || clerkUser.lastName || null,
          avatar: clerkUser.imageUrl,
        },
      })
    }
    
    user = {
      id: dbUser.id,
      email: dbUser.email,
      username: dbUser.username,
      name: dbUser.name,
    }
  }

  return {
    db,
    user,
  }
}

export type Context = Awaited<ReturnType<typeof createTRPCContext>> 