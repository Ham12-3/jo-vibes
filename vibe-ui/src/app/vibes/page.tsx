import { HydrationBoundary, dehydrate } from '@tanstack/react-query'
import { makeQueryClient } from '@/lib/query-client'
import { serverTRPC } from '@/trpc/server'
import { PublicFeed } from '@/components/public-feed'
import { InngestTest } from '@/components/inngest-test'

export default async function VibesPage() {
  const limit = 10
  const queryClient = makeQueryClient()

  const queryKey = ['vibe.getPublic', { input: { limit }, type: 'query' }]
  const data = await serverTRPC.vibe.getPublic({ limit })
  queryClient.setQueryData(queryKey, data)

  const dehydratedState = dehydrate(queryClient)

  return (
    <main className="max-w-4xl mx-auto py-10 space-y-8">
      <h1 className="text-3xl font-bold mb-6">Jo-Vibes Public Feed (SSR + Hydration)</h1>
      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">🔧 Test Background Jobs</h2>
        <div className="flex justify-center">
          <InngestTest />
        </div>
      </div>
      <div>
        <h2 className="text-2xl font-semibold mb-4">📱 Public Vibes Feed</h2>
        <HydrationBoundary state={dehydratedState}>
          <PublicFeed limit={limit} />
        </HydrationBoundary>
      </div>
    </main>
  )
}