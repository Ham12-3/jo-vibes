'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTRPC } from '@/trpc/client'
import { useState } from 'react'

export function VibeExample() {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const [newVibeTitle, setNewVibeTitle] = useState('')

  // 1. QUERY - Fetch public vibes
  const vibesQuery = useQuery(
    trpc.vibe.getPublic.queryOptions({ 
      limit: 10 
    })
  )

  // 2. MUTATION - Create new vibe  
  const createVibeMutation = useMutation(
    trpc.vibe.create.mutationOptions({
      onSuccess: () => {
        // Refresh the vibes list after creating
        queryClient.invalidateQueries({
          queryKey: trpc.vibe.getPublic.queryKey()
        })
        setNewVibeTitle('')
      }
    })
  )

  // 3. MUTATION - Toggle like on a vibe
  const toggleLikeMutation = useMutation(
    trpc.like.toggle.mutationOptions({
      onSuccess: () => {
        // Refresh vibes to show updated like count
        queryClient.invalidateQueries({
          queryKey: trpc.vibe.getPublic.queryKey()
        })
      }
    })
  )

  const handleCreateVibe = () => {
    if (!newVibeTitle.trim()) return
    
    createVibeMutation.mutate({
      title: newVibeTitle,
      mood: 'HAPPY',
      description: 'Created via tRPC!',
      isPublic: true
    })
  }

  const handleToggleLike = (vibeId: string) => {
    toggleLikeMutation.mutate({ vibeId })
  }

  if (vibesQuery.isLoading) {
    return <div className="p-4">Loading vibes...</div>
  }

  if (vibesQuery.error) {
    return <div className="p-4 text-red-500">Error: {vibesQuery.error.message}</div>
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">tRPC Vibes Example</h1>
      
      {/* Create New Vibe */}
      <div className="mb-8 p-4 border rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Create New Vibe</h2>
        <div className="flex gap-2">
          <input
            type="text"
            value={newVibeTitle}
            onChange={(e) => setNewVibeTitle(e.target.value)}
            placeholder="Enter vibe title..."
            className="flex-1 px-3 py-2 border rounded"
          />
          <button
            onClick={handleCreateVibe}
            disabled={createVibeMutation.isPending || !newVibeTitle.trim()}
            className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
          >
            {createVibeMutation.isPending ? 'Creating...' : 'Create Vibe'}
          </button>
        </div>
        {createVibeMutation.error && (
          <p className="text-red-500 mt-2">
            Error: {createVibeMutation.error.message}
          </p>
        )}
      </div>

      {/* Vibes List */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Recent Vibes</h2>
        {vibesQuery.data?.map((vibe) => (
          <div key={vibe.id} className="p-4 border rounded-lg">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold text-lg">{vibe.title}</h3>
                {vibe.description && (
                  <p className="text-gray-600 mt-1">{vibe.description}</p>
                )}
                <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                  <span>Mood: {vibe.mood}</span>
                  <span>By: {vibe.author.username}</span>
                  <span>{vibe._count.likes} likes</span>
                  <span>{vibe._count.comments} comments</span>
                </div>
              </div>
              <button
                onClick={() => handleToggleLike(vibe.id)}
                disabled={toggleLikeMutation.isPending}
                className="px-3 py-1 bg-pink-100 text-pink-600 rounded hover:bg-pink-200 disabled:opacity-50"
              >
                {toggleLikeMutation.isPending ? '...' : '❤️'} Like
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Debug Info */}
      <div className="mt-8 p-4 bg-gray-50 rounded-lg text-sm">
        <h3 className="font-semibold mb-2">tRPC Debug Info:</h3>
        <div className="space-y-1 font-mono text-xs">
          <div>Total vibes: {vibesQuery.data?.length}</div>
          <div>Query status: {vibesQuery.status}</div>
          <div>Is fetching: {vibesQuery.isFetching ? 'Yes' : 'No'}</div>
          <div>Create mutation status: {createVibeMutation.status}</div>
        </div>
      </div>
    </div>
  )
} 