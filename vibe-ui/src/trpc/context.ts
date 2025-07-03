import { type FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch'
import { db } from '@/lib/db'
import { authOptions } from '@/lib/auth'
import { getServerSession } from 'next-auth'

export async function createTRPCContext(_opts: FetchCreateContextFnOptions) {
  const session = await getServerSession(authOptions)
  return {
    db,
    user: session?.user ?? null,
  }
}

export type Context = Awaited<ReturnType<typeof createTRPCContext>> 