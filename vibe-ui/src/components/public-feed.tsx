'use client'

import { useQuery } from '@tanstack/react-query'
import { useTRPC } from '@/trpc/client'

export function PublicFeed({ limit = 10 }: { limit?: number }) {
  const trpc = useTRPC()
  const { data, isLoading, error } = useQuery(
    trpc.vibe.getPublic.queryOptions({ limit })
  )

  if (isLoading) return <p className="p-4">Loading vibes...</p>
  if (error) return <p className="p-4 text-red-500">Error: {error.message}</p>

  if (!data?.length) return <p className="p-4">No vibes yet. Be the first to post!</p>

  return (
    <ul className="space-y-4 p-4">
      {data.map((vibe) => (
        <li key={vibe.id} className="border rounded-lg p-4 shadow-sm">
          <h3 className="font-semibold text-lg">{vibe.title}</h3>
          {vibe.description && (
            <p className="text-gray-600 mt-1 line-clamp-3">{vibe.description}</p>
          )}
          <div className="flex items-center gap-4 text-sm text-gray-500 mt-2">
            <span>By: {vibe.author.username}</span>
            <span>Mood: {vibe.mood}</span>
            <span>❤️ {vibe._count.likes}</span>
            <span>💬 {vibe._count.comments}</span>
          </div>
        </li>
      ))}
    </ul>
  )
} 