import { cache } from 'react'
import { createHydrationHelpers } from '@trpc/tanstack-react-query/rsc'

import { appRouter } from './root'
import { db } from '@/lib/db'
import { makeQueryClient } from '@/lib/query-client'

// Create a per-request query client
export const getQueryClient = cache(makeQueryClient)

// Minimal public context (no auth yet)
const getContext = cache(async () => ({
  db,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  user: null as any,
}))

// Create a caller factory for server-side usage
const caller = appRouter.createCaller(await getContext())

export const { trpc: hydrationTRPC, HydrateClient } = createHydrationHelpers<typeof appRouter>(
  () => caller,
  getQueryClient,
) 