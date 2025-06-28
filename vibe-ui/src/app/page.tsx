import { PublicFeed } from '@/components/public-feed'

export default function Home() {
  return (
    <main className="max-w-4xl mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">Jo-Vibes Public Feed</h1>
      <PublicFeed limit={10} />
    </main>
  )
}
