import { HydrationBoundary, dehydrate } from '@tanstack/react-query'
import { makeQueryClient } from '@/lib/query-client'
import { serverTRPC } from '@/trpc/server'
import { ProjectDashboard } from '@/components/project-dashboard'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { LovablePromptBar } from '@/components/LovablePromptBar'

export default async function Home() {
  const limit = 10
  const queryClient = makeQueryClient()

  // Prefetch user projects
  const queryKey = ['project.getUserProjects', { input: { limit }, type: 'query' }]
  try {
    const data = await serverTRPC.project.getUserProjects({ limit })
    queryClient.setQueryData(queryKey, data)
  } catch {
    // Handle case where user is not authenticated
    console.log('User not authenticated, skipping prefetch')
  }

  const dehydratedState = dehydrate(queryClient)

  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-500 to-orange-500 text-white">
      {/* Top Navigation Bar */}
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
        <div className="flex items-center space-x-6">
          <Link href="/" className="text-xl font-bold">Lovable</Link>
          <Link href="/community" className="hover:underline">Community</Link>
          <Link href="/pricing" className="hover:underline">Pricing</Link>
          <Link href="/enterprise" className="hover:underline">Enterprise</Link>
          <Link href="/learn" className="hover:underline">Learn</Link>
          <Link href="/launched" className="hover:underline">Launched</Link>
        </div>
        <div className="flex items-center space-x-4">
          <Link href="/login" className="hover:underline">Log in</Link>
          <Button variant="outline" className="bg-white text-black hover:bg-gray-100">Get started</Button>
        </div>
      </nav>

      {/* Simplified Hero Section */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-32 text-center">
        <h1 className="text-6xl font-bold mb-4 tracking-tight">
          Build something <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-pink-200">Lovable</span>
        </h1>
        <p className="text-2xl text-white/80 mb-12">
          Create apps and websites by chatting with AI
        </p>
        
        {/* Lovable-style Input Bar - Ultra Realistic */}
        <div className="w-full max-w-3xl mx-auto">
          <LovablePromptBar />
        </div>
      </div>

      {/* Projects Dashboard - Moved down */}
      <div className="bg-white text-black py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gray-50 rounded-xl shadow-md overflow-hidden">
            <div className="border-b border-gray-200 px-6 py-4">
              <h2 className="text-2xl font-semibold text-gray-900">Your Projects</h2>
              <p className="text-sm text-gray-600 mt-1">Manage and continue working on your applications</p>
            </div>
            
            <HydrationBoundary state={dehydratedState}>
              <ProjectDashboard limit={limit} />
            </HydrationBoundary>
          </div>
        </div>
      </div>

      {/* Simple Cookie Consent Banner */}
      <div className="fixed bottom-4 right-4 bg-black text-white p-4 rounded-lg shadow-lg max-w-sm">
        <p className="text-sm mb-2">Choose your cookie preferences</p>
        <Button size="sm" className="bg-white text-black hover:bg-gray-200">Accept all</Button>
      </div>
    </main>
  )
}
