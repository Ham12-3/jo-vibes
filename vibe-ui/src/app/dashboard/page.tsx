import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { LovablePromptBar } from '@/components/LovablePromptBar'
import { ProjectDashboard } from '@/components/project-dashboard'
import { DeploymentDashboard } from '@/components/deployment-dashboard'
import { CustomSandboxManager } from '@/components/custom-sandbox-manager'
import { UserButton } from '@clerk/nextjs'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Rocket, FolderOpen, Container } from 'lucide-react'
import { db } from '@/lib/db'

export default async function DashboardPage() {
  const { userId } = await auth()

  if (!userId) {
    redirect('/sign-in')
  }

  // Fetch projects for the sandbox manager
  const projects = await db.project.findMany({
    where: { userId },
    select: {
      id: true,
      name: true,
      framework: true,
      status: true
    }
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">Jo Vibes</h1>
              <span className="ml-2 text-sm text-gray-500">Build with AI</span>
            </div>
            <div className="flex items-center space-x-4">
              <UserButton 
                afterSignOutUrl="/"
                appearance={{
                  elements: {
                    avatarBox: "h-10 w-10",
                  },
                }}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Welcome Section */}
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              What would you like to build today?
            </h2>
            <p className="text-lg text-gray-600 mb-8">
              Describe your project idea and let AI create it for you
            </p>
          </div>

          {/* Prompt Bar */}
          <div className="flex justify-center">
            <LovablePromptBar />
          </div>

          {/* Dashboard Tabs */}
          <div className="mt-12">
            <Tabs defaultValue="projects" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="projects" className="flex items-center gap-2">
                  <FolderOpen className="h-4 w-4" />
                  Projects
                </TabsTrigger>
                <TabsTrigger value="sandboxes" className="flex items-center gap-2">
                  <Container className="h-4 w-4" />
                  Sandboxes
                </TabsTrigger>
                <TabsTrigger value="deployments" className="flex items-center gap-2">
                  <Rocket className="h-4 w-4" />
                  Deployments
                </TabsTrigger>
              </TabsList>

              <TabsContent value="projects" className="mt-6">
                <ProjectDashboard />
              </TabsContent>

              <TabsContent value="sandboxes" className="mt-6">
                <CustomSandboxManager projects={projects} />
              </TabsContent>

              <TabsContent value="deployments" className="mt-6">
                <DeploymentDashboard />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>
    </div>
  )
} 