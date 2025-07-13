import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowRight, Code, Zap, Globe } from 'lucide-react'

export default async function Home() {
  const { userId } = await auth()

  // Redirect authenticated users to dashboard
  if (userId) {
    redirect('/dashboard')
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 text-white">
      {/* Top Navigation Bar */}
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
        <div className="flex items-center">
          <Link href="/" className="text-2xl font-bold">Jo Vibes</Link>
        </div>
        <div className="flex items-center space-x-4">
          <Link 
            href="/sign-in" 
            className="text-white/90 hover:text-white transition-colors"
          >
            Sign in
          </Link>
          <Link href="/sign-up">
            <Button variant="outline" className="bg-white text-blue-600 hover:bg-gray-100 border-white">
              Get started
            </Button>
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <div className="mb-8">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 tracking-tight">
            Build apps with{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 to-pink-200">
              AI power
            </span>
          </h1>
          <p className="text-xl md:text-2xl text-white/80 mb-8 max-w-3xl mx-auto">
            Describe your app idea and watch AI create a complete, working application with live preview in seconds
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
          <Link href="/sign-up">
            <Button 
              size="lg" 
              className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-6 text-lg font-semibold"
            >
              Start building free
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
          <Link href="/sign-in">
            <Button 
              size="lg" 
              variant="outline" 
              className="border-white text-white hover:bg-white/10 px-8 py-6 text-lg font-semibold"
            >
              Sign in
            </Button>
          </Link>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <div className="text-center p-6 bg-white/10 rounded-lg backdrop-blur-sm">
            <div className="bg-white/20 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <Code className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-xl font-semibold mb-2">AI-Powered Generation</h3>
            <p className="text-white/80">
              Describe your app and get complete code with React, TypeScript, and modern frameworks
            </p>
          </div>

          <div className="text-center p-6 bg-white/10 rounded-lg backdrop-blur-sm">
            <div className="bg-white/20 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <Zap className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Live Preview</h3>
            <p className="text-white/80">
              Instantly see your app running in a live sandbox environment with real URLs
            </p>
          </div>

          <div className="text-center p-6 bg-white/10 rounded-lg backdrop-blur-sm">
            <div className="bg-white/20 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <Globe className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Full-Stack Apps</h3>
            <p className="text-white/80">
              Get complete applications with databases, authentication, and deployment ready
            </p>
          </div>
        </div>
      </div>

      {/* How It Works Section */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
          How it works
        </h2>
        
        <div className="grid md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="bg-blue-500 rounded-full p-6 w-20 h-20 mx-auto mb-6 flex items-center justify-center">
              <span className="text-2xl font-bold">1</span>
            </div>
            <h3 className="text-xl font-semibold mb-4">Describe Your App</h3>
            <p className="text-white/80">
              Tell us what you want to build - a todo app, e-commerce site, or anything else
            </p>
          </div>

          <div className="text-center">
            <div className="bg-purple-500 rounded-full p-6 w-20 h-20 mx-auto mb-6 flex items-center justify-center">
              <span className="text-2xl font-bold">2</span>
            </div>
            <h3 className="text-xl font-semibold mb-4">AI Creates Code</h3>
            <p className="text-white/80">
              Our AI generates complete, working code with proper structure and best practices
            </p>
          </div>

          <div className="text-center">
            <div className="bg-pink-500 rounded-full p-6 w-20 h-20 mx-auto mb-6 flex items-center justify-center">
              <span className="text-2xl font-bold">3</span>
            </div>
            <h3 className="text-xl font-semibold mb-4">Edit & Deploy</h3>
            <p className="text-white/80">
              Edit your code in our editor and see changes live in your running application
            </p>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <h2 className="text-3xl md:text-4xl font-bold mb-6">
          Ready to build something amazing?
        </h2>
        <p className="text-xl text-white/80 mb-8">
          Join thousands of developers creating apps with AI
        </p>
        <Link href="/sign-up">
          <Button 
            size="lg" 
            className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-6 text-lg font-semibold"
          >
            Get started for free
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </Link>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/20 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="text-white/80 mb-4 md:mb-0">
              © 2024 Jo Vibes. All rights reserved.
            </div>
            <div className="flex space-x-6">
              <Link href="/privacy" className="text-white/80 hover:text-white">Privacy</Link>
              <Link href="/terms" className="text-white/80 hover:text-white">Terms</Link>
              <Link href="/support" className="text-white/80 hover:text-white">Support</Link>
            </div>
          </div>
        </div>
      </footer>
    </main>
  )
}
