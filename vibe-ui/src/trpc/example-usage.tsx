'use client'

import { useQuery, useMutation } from '@tanstack/react-query'
import { useTRPC } from './client'

// Example component showing how to use the new tRPC client
export function ExampleVibeList() {
  const trpc = useTRPC()

  // Using the new TanStack React Query integration
  const vibesQuery = useQuery(
    trpc.vibe.getPublic.queryOptions({ limit: 10 })
  )

  const createVibe = useMutation(
    trpc.vibe.create.mutationOptions()
  )

  if (vibesQuery.isLoading) return <div>Loading vibes...</div>
  if (vibesQuery.error) return <div>Error loading vibes</div>

  return (
    <div>
      <h2>Vibes</h2>
      <button
        onClick={() => createVibe.mutate({
          title: 'New Vibe',
          mood: 'HAPPY',
          description: 'Testing the new tRPC setup!'
        })}
        disabled={createVibe.isPending}
      >
        {createVibe.isPending ? 'Creating...' : 'Create Vibe'}
      </button>
      
      <div>
        {vibesQuery.data?.map((vibe) => (
          <div key={vibe.id}>
            <h3>{vibe.title}</h3>
            <p>Mood: {vibe.mood}</p>
            <p>By: {vibe.author.username}</p>
          </div>
        ))}
      </div>
    </div>
  )
} 