import 'server-only' // Ensures this file can't be imported on client-side

import { db } from '@/lib/db'
import { appRouter } from './root'
import type { User } from './context'

/**
 * Create server-side tRPC caller for public operations
 * Use this for non-authenticated server-side calls
 */
// Create a context without user for public operations
const publicContext = {
  db,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  user: null as any, // Temporary fix for type compatibility - will be resolved with proper auth
}

export const serverTRPC = appRouter.createCaller(publicContext)

/**
 * Create server-side tRPC caller with authenticated user context
 * Use this when you have user authentication in server components
 */
export function createAuthenticatedServerTRPC(user: User) {
  return appRouter.createCaller({
    db,
    user,
  })
}

/**
 * Helper function to prefetch public vibes in Server Components
 * 
 * @example
 * // In app/page.tsx
 * export default async function HomePage() {
 *   const initialVibes = await prefetchPublicVibes(10)
 *   return <VibeList initialData={initialVibes} />
 * }
 */
export async function prefetchPublicVibes(limit = 10) {
  try {
    return await serverTRPC.vibe.getPublic({ limit })
  } catch (error) {
    console.error('Failed to prefetch vibes:', error)
    return []
  }
}

/**
 * Helper to get vibes by mood server-side
 */
export async function getVibesByMoodSSR(
  mood: 'HAPPY' | 'SAD' | 'EXCITED' | 'CALM' | 'ENERGETIC' | 'ROMANTIC' | 'NOSTALGIC' | 'MYSTERIOUS' | 'UPBEAT' | 'CHILL',
  limit = 10
) {
  try {
    return await serverTRPC.vibe.getByMood({ mood, limit })
  } catch (error) {
    console.error('Failed to get vibes by mood:', error)
    return []
  }
}

/**
 * Helper to get user by email server-side
 */
export async function getUserByEmailSSR(email: string) {
  try {
    return await serverTRPC.user.getByEmail({ email })
  } catch (error) {
    console.error('Failed to get user by email:', error)
    return null
  }
}

/**
 * Helper to get user by username server-side
 */
export async function getUserByUsernameSSR(username: string) {
  try {
    return await serverTRPC.user.getByUsername({ username })
  } catch (error) {
    console.error('Failed to get user by username:', error)
    return null
  }
}

/**
 * Get vibe with full details (including comments and likes) server-side
 */
export async function getVibeWithDetailsSSR(id: string) {
  try {
    return await serverTRPC.vibe.getWithDetails({ id })
  } catch (error) {
    console.error('Failed to get vibe details:', error)
    return null
  }
}

// Note: searchByTags procedure not implemented yet in vibe router
// You can add this to your vibe router if needed

/**
 * Server Actions - Use these for form submissions and mutations
 * 
 * @example
 * // In a form action
 * 'use server'
 * import { createVibeServerAction } from '@/trpc/server'
 * 
 * export async function handleCreateVibe(formData: FormData) {
 *   const user = await getCurrentUser() // Your auth logic
 *   if (!user) throw new Error('Unauthorized')
 *   
 *   return createVibeServerAction(user, {
 *     title: formData.get('title') as string,
 *     mood: 'HAPPY',
 *     description: formData.get('description') as string,
 *   })
 * }
 */
export async function createVibeServerAction(
  user: User,
  data: {
    title: string
    mood: 'HAPPY' | 'SAD' | 'EXCITED' | 'CALM' | 'ENERGETIC' | 'ROMANTIC' | 'NOSTALGIC' | 'MYSTERIOUS' | 'UPBEAT' | 'CHILL'
    description?: string
    color?: string
    tags?: string[]
    isPublic?: boolean
  }
) {
  const authenticatedTRPC = createAuthenticatedServerTRPC(user)
  
  try {
    return await authenticatedTRPC.vibe.create(data)
  } catch (error) {
    console.error('Failed to create vibe:', error)
    throw error
  }
}

/**
 * Server action to toggle like
 */
export async function toggleLikeServerAction(user: User, vibeId: string) {
  const authenticatedTRPC = createAuthenticatedServerTRPC(user)
  
  try {
    return await authenticatedTRPC.like.toggle({ vibeId })
  } catch (error) {
    console.error('Failed to toggle like:', error)
    throw error
  }
}

/**
 * Server action to create comment
 */
export async function createCommentServerAction(
  user: User,
  data: { vibeId: string; content: string }
) {
  const authenticatedTRPC = createAuthenticatedServerTRPC(user)
  
  try {
    return await authenticatedTRPC.comment.create(data)
  } catch (error) {
    console.error('Failed to create comment:', error)
    throw error
  }
} 