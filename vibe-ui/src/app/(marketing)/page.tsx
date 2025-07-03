import Link from 'next/link'
export default function MarketingHome() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center text-center bg-background">
      <h1 className="text-5xl font-extrabold mb-6 text-primary">Build Something Lovable</h1>
      <p className="text-lg text-gray-600 mb-8 max-w-xl">
        Chat with AI to generate full-stack apps in seconds. Sign in to get started!
      </p>
      <Link href="/auth/signin" className="px-6 py-3 bg-primary text-white rounded-lg font-semibold hover:opacity-90 transition">
        Sign In
      </Link>
    </main>
  )
}