'use client'

import { useState } from 'react'
import { Play, Square, RotateCcw, ExternalLink, Monitor, Code, Eye, Loader2, MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { api } from '@/trpc/client'
import { FileEditor } from './file-editor'
import { DeploymentPanel } from './deployment-panel'
import { ProjectChat } from './project-chat'

interface ProjectFile {
  id: string
  filename: string
  path: string
  content: string
  language: string | null
  createdAt: string
}

interface Sandbox {
  id: string
  e2bId: string
  url: string | null
  status: 'CREATING' | 'RUNNING' | 'STOPPED' | 'ERROR'
  port: number | null
}

interface ProjectPreviewProps {
  project: {
    id: string
    name: string
    description: string | null
    framework: string | null
    files: ProjectFile[]
    sandboxes: Sandbox[]
  }
  className?: string
}

export function ProjectPreview({ project, className }: ProjectPreviewProps) {
  const [activeTab, setActiveTab] = useState('preview')
  const [isCreatingSandbox, setIsCreatingSandbox] = useState(false)

  const activeSandbox = project.sandboxes.find(s => s.status === 'RUNNING') || project.sandboxes[0]

  const createSandbox = api.project.createSandbox.useMutation({
    onSuccess: () => {
      toast.success('🚀 Sandbox created! Your app is now running.')
      setIsCreatingSandbox(false)
      // Refresh the project data
      window.location.reload()
    },
    onError: (error) => {
      toast.error(`Failed to create sandbox: ${error.message}`)
      setIsCreatingSandbox(false)
    }
  })

  const stopSandbox = api.project.stopSandbox.useMutation({
    onSuccess: () => {
      toast.success('Sandbox stopped successfully')
      window.location.reload()
    },
    onError: (error) => {
      toast.error(`Failed to stop sandbox: ${error.message}`)
    }
  })

  const restartSandbox = api.project.restartSandbox.useMutation({
    onSuccess: () => {
      toast.success('Sandbox restarted successfully')
      window.location.reload()
    },
    onError: (error) => {
      toast.error(`Failed to restart sandbox: ${error.message}`)
    }
  })

  const handleCreateSandbox = () => {
    setIsCreatingSandbox(true)
    createSandbox.mutate({ projectId: project.id })
  }

  const handleStopSandbox = () => {
    if (activeSandbox) {
      stopSandbox.mutate({ sandboxId: activeSandbox.id })
    }
  }

  const handleRestartSandbox = () => {
    if (activeSandbox) {
      restartSandbox.mutate({ sandboxId: activeSandbox.id })
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'RUNNING':
        return 'bg-green-100 text-green-800'
      case 'CREATING':
        return 'bg-yellow-100 text-yellow-800'
      case 'STOPPED':
        return 'bg-gray-100 text-gray-800'
      case 'ERROR':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'RUNNING':
        return <Play className="h-4 w-4" />
      case 'CREATING':
        return <Loader2 className="h-4 w-4 animate-spin" />
      case 'STOPPED':
        return <Square className="h-4 w-4" />
      case 'ERROR':
        return <Square className="h-4 w-4" />
      default:
        return <Square className="h-4 w-4" />
    }
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Project Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{project.name}</h1>
          {project.description && (
            <p className="text-gray-600 mt-2">{project.description}</p>
          )}
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="outline">{project.framework || 'Next.js'}</Badge>
            <Badge variant="outline">{project.files.length} files</Badge>
          </div>
        </div>

        {/* Sandbox Controls */}
        <div className="flex items-center gap-2">
          {activeSandbox ? (
            <>
              <div className="flex items-center gap-2">
                <Badge className={getStatusColor(activeSandbox.status)}>
                  {getStatusIcon(activeSandbox.status)}
                  <span className="ml-1">{activeSandbox.status}</span>
                </Badge>
              </div>
              
              {activeSandbox.status === 'RUNNING' && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(activeSandbox.url!, '_blank')}
                    disabled={!activeSandbox.url}
                  >
                    <ExternalLink className="h-4 w-4 mr-1" />
                    Open
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRestartSandbox}
                    disabled={restartSandbox.isPending}
                  >
                    <RotateCcw className="h-4 w-4 mr-1" />
                    Restart
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleStopSandbox}
                    disabled={stopSandbox.isPending}
                  >
                    <Square className="h-4 w-4 mr-1" />
                    Stop
                  </Button>
                </>
              )}
              
              {activeSandbox.status === 'STOPPED' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRestartSandbox}
                  disabled={restartSandbox.isPending}
                >
                  <Play className="h-4 w-4 mr-1" />
                  Start
                </Button>
              )}
            </>
          ) : (
            <Button
              onClick={handleCreateSandbox}
              disabled={isCreatingSandbox || createSandbox.isPending}
              size="sm"
            >
              {isCreatingSandbox || createSandbox.isPending ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-1" />
              )}
              Run Project
            </Button>
          )}
        </div>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="preview" className="flex items-center gap-2">
            <Monitor className="h-4 w-4" />
            Preview
          </TabsTrigger>
          <TabsTrigger value="files" className="flex items-center gap-2">
            <Code className="h-4 w-4" />
            Files
          </TabsTrigger>
          <TabsTrigger value="chat" className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4" />
            AI Chat
          </TabsTrigger>
          <TabsTrigger value="deploy" className="flex items-center gap-2">
            <ExternalLink className="h-4 w-4" />
            Deploy
          </TabsTrigger>
          <TabsTrigger value="logs" className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Logs
          </TabsTrigger>
        </TabsList>

        {/* Preview Tab */}
        <TabsContent value="preview" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Monitor className="h-5 w-5" />
                Live Preview
                {activeSandbox?.status === 'RUNNING' && activeSandbox.url && (
                  <Badge className="ml-auto bg-green-100 text-green-800">Live</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activeSandbox?.status === 'RUNNING' && activeSandbox.url ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm font-medium">Running at:</span>
                    <a
                      href={activeSandbox.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline text-sm"
                    >
                      {activeSandbox.url}
                    </a>
                  </div>
                  
                  <div className="border rounded-lg overflow-hidden">
                    <iframe
                      src={activeSandbox.url}
                      className="w-full h-[600px] border-0"
                      title={`${project.name} Preview`}
                      sandbox="allow-same-origin allow-scripts allow-forms"
                    />
                  </div>
                </div>
              ) : activeSandbox?.status === 'CREATING' ? (
                <div className="flex flex-col items-center justify-center h-[400px] text-center">
                  <Loader2 className="h-12 w-12 text-blue-500 animate-spin mb-4" />
                  <h3 className="text-lg font-medium">Creating Sandbox...</h3>
                  <p className="text-gray-600">Setting up your development environment</p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-[400px] text-center">
                  <Monitor className="h-12 w-12 text-gray-300 mb-4" />
                  <h3 className="text-lg font-medium">No Running Preview</h3>
                  <p className="text-gray-600 mb-4">
                    Start a sandbox to see your project running live
                  </p>
                  <Button onClick={handleCreateSandbox} disabled={isCreatingSandbox}>
                    <Play className="h-4 w-4 mr-2" />
                    Run Project
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Files Tab */}
        <TabsContent value="files" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="h-5 w-5" />
                File Editor
                {activeSandbox?.status === 'RUNNING' && (
                  <Badge className="ml-auto bg-blue-100 text-blue-800">Live Sync</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <FileEditor 
                projectId={project.id}
                height="700px"
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Chat Tab */}
        <TabsContent value="chat" className="mt-6">
          <div className="h-[600px]">
            <ProjectChat projectId={project.id} />
          </div>
        </TabsContent>

        {/* Deploy Tab */}
        <TabsContent value="deploy" className="mt-6">
          <DeploymentPanel 
            projectId={project.id}
            projectName={project.name}
          />
        </TabsContent>

        {/* Logs Tab */}
        <TabsContent value="logs" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Sandbox Logs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-black text-green-400 p-4 rounded-lg font-mono text-sm h-[400px] overflow-y-auto">
                {activeSandbox ? (
                  <div className="space-y-1">
                    <div>📦 Sandbox ID: {activeSandbox.e2bId}</div>
                    <div>🚀 Status: {activeSandbox.status}</div>
                    <div>🌐 Port: {activeSandbox.port}</div>
                    {activeSandbox.url && <div>🔗 URL: {activeSandbox.url}</div>}
                    <div>⏰ Framework: {project.framework}</div>
                    <div>📁 Files: {project.files.length} files generated</div>
                    <div className="text-yellow-400 mt-2">
                      💡 Tip: Use the restart button to reload your application
                    </div>
                  </div>
                ) : (
                  <div>No sandbox created yet. Run your project to see logs.</div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
} 