'use client'

import { useState, useEffect, useRef } from 'react'
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
  createdAt: Date
  updatedAt: Date
  projectId: string
}

interface Sandbox {
  id: string
  e2bId: string | null // Container ID (legacy field name)
  url: string | null
  status: 'CREATING' | 'RUNNING' | 'STOPPED' | 'ERROR'
  port: number | null
  createdAt: Date
  updatedAt: Date
  expiresAt: Date | null
  projectId: string
}

interface ProjectPreviewProps {
  project: {
    id: string
    name: string
    description: string | null
    framework: string | null
    files: ProjectFile[]
    sandboxes: Sandbox[] // Updated type name
  }
  className?: string
}

export function ProjectPreview({ project, className }: ProjectPreviewProps) {
  const [activeTab, setActiveTab] = useState('preview')
  const [isCreatingSandbox, setIsCreatingSandbox] = useState(false)
  const [pollingSandboxId, setPollingSandboxId] = useState<string | null>(null)
  const [pollingAttempts, setPollingAttempts] = useState(0)
  const [startupTime, setStartupTime] = useState(0)
  const [isForceRestarting, setIsForceRestarting] = useState(false)
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const startTimeRef = useRef<number>(0)

  const activeSandbox = project.sandboxes.find(s => s.status === 'RUNNING') || project.sandboxes[0]

  // Polling function to check sandbox status
  const pollSandboxStatus = async (sandboxId: string) => {
    try {
      const response = await fetch(`/api/sandbox/status/${sandboxId}`)
      if (response.ok) {
        const data = await response.json()
        
        // Update startup time
        if (data.timeSinceCreation) {
          setStartupTime(data.timeSinceCreation)
        }
        
        if (data.status === 'RUNNING') {
          // Sandbox is ready, stop polling and refresh page
          setPollingSandboxId(null)
          setPollingAttempts(0)
          setStartupTime(0)
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current)
            pollingIntervalRef.current = null
          }
          toast.success('🎉 Sandbox is ready! Your app is now running.')
          window.location.reload()
        } else if (data.status === 'ERROR') {
          // Sandbox failed to start
          setPollingSandboxId(null)
          setPollingAttempts(0)
          setStartupTime(0)
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current)
            pollingIntervalRef.current = null
          }
          toast.error('❌ Sandbox failed to start. Please try again.')
        } else {
          // Still creating, increment attempts
          setPollingAttempts(prev => prev + 1)
          
          // Show progress updates every 30 seconds (10 attempts at 3-second intervals)
          if (pollingAttempts % 10 === 0 && pollingAttempts > 0) {
            const minutes = Math.floor(startupTime / 60)
            const seconds = startupTime % 60
            toast.info(`⏳ Sandbox is still starting up... (${minutes}m ${seconds}s)`)
          }
        }
      }
    } catch (error) {
      console.error('Failed to poll sandbox status:', error)
      setPollingAttempts(prev => prev + 1)
    }
  }

  // Start polling when a sandbox is in CREATING status
  useEffect(() => {
    const creatingSandbox = project.sandboxes.find(s => s.status === 'CREATING')
    
    if (creatingSandbox && !pollingSandboxId) {
      setPollingSandboxId(creatingSandbox.id)
      setPollingAttempts(0)
      setStartupTime(0)
      startTimeRef.current = Date.now()
      
      // Poll every 3 seconds for up to 10 minutes (200 attempts)
      pollingIntervalRef.current = setInterval(() => {
        pollSandboxStatus(creatingSandbox.id)
        
        // Stop polling after 10 minutes (200 attempts)
        if (pollingAttempts >= 200) {
          setPollingSandboxId(null)
          setPollingAttempts(0)
          setStartupTime(0)
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current)
            pollingIntervalRef.current = null
          }
          toast.error('⏰ Sandbox startup timeout. Please try again.')
        }
      }, 3000)
    } else if (!creatingSandbox && pollingSandboxId) {
      // Stop polling if no sandbox is creating
      setPollingSandboxId(null)
      setPollingAttempts(0)
      setStartupTime(0)
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
        pollingIntervalRef.current = null
      }
    }

    // Cleanup on unmount
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
      }
    }
  }, [project.sandboxes, pollingSandboxId, pollingAttempts])

  const createSandbox = api.project.createSandbox.useMutation({
    onSuccess: (data) => {
      toast.success('🚀 Sandbox created! Starting up... (this may take 2-4 minutes)')
      setIsCreatingSandbox(false)
      // Start polling for the new sandbox
      if (data.status === 'CREATING') {
        setPollingSandboxId(data.id)
        setPollingAttempts(0)
        setStartupTime(0)
        startTimeRef.current = Date.now()
        pollingIntervalRef.current = setInterval(() => {
          pollSandboxStatus(data.id)
        }, 3000)
      }
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
            restartSandbox.mutate({ sandboxId: activeSandbox?.e2bId || '' })
  }

  const handleForceRestart = async () => {
    if (!activeSandbox) return
    
    setIsForceRestarting(true)
    try {
      const response = await fetch(`/api/sandbox/force-restart/${activeSandbox.id}`, {
        method: 'POST'
      })
      
      if (response.ok) {
        toast.success('🔄 Sandbox force restarted! Creating new sandbox...')
        window.location.reload()
      } else {
        toast.error('❌ Failed to force restart sandbox')
      }
    } catch {
      toast.error('❌ Failed to force restart sandbox')
    } finally {
      setIsForceRestarting(false)
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
                  {activeSandbox.status === 'CREATING' && pollingSandboxId && (
                    <span className="ml-1 text-xs">(checking...)</span>
                  )}
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
              {activeSandbox?.status === 'CREATING' && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleStopSandbox}
                    disabled={stopSandbox.isPending}
                  >
                    <Square className="h-4 w-4 mr-1" />
                    Stop
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleForceRestart}
                    disabled={isForceRestarting}
                  >
                    {isForceRestarting ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <RotateCcw className="h-4 w-4 mr-1" />
                    )}
                    Force Restart
                  </Button>
                </>
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
                {activeSandbox?.status === 'CREATING' && (
                  <Badge className="ml-auto bg-yellow-100 text-yellow-800">
                    Starting... {startupTime > 0 && `(${Math.floor(startupTime / 60)}m ${startupTime % 60}s)`}
                  </Badge>
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
                      onError={() => {
                        console.log('Iframe failed to load, sandbox may still be starting...')
                      }}
                    />
                  </div>
                </div>
              ) : activeSandbox?.status === 'CREATING' ? (
                <div className="flex flex-col items-center justify-center h-[400px] text-center">
                  <Loader2 className="h-12 w-12 text-blue-500 animate-spin mb-4" />
                  <h3 className="text-lg font-medium">Starting Custom Sandbox...</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Creating a Docker container for your project
                  </p>
                  <div className="space-y-2 text-sm text-gray-600">
                    <p>Custom sandboxes typically take 30-60 seconds to start up</p>
                    <p>💡 <strong>What&apos;s happening:</strong> Docker is provisioning a secure container environment,
                    installing dependencies, and starting your application server.</p>
                    <p>🔒 <strong>Security:</strong> Your code runs in an isolated container with no access to your local system.</p>
                    <p>⚡ <strong>Performance:</strong> Once started, your app will be available instantly for live preview.</p>
                  </div>
                  <div className="mt-6">
                    <Button onClick={handleCreateSandbox} disabled={isCreatingSandbox}>
                      {isCreatingSandbox ? (
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      ) : (
                        <Play className="h-4 w-4 mr-1" />
                      )}
                      Start a Custom Sandbox to see your project running live
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-[400px] text-center">
                  <Monitor className="h-12 w-12 text-gray-300 mb-4" />
                  <h3 className="text-lg font-medium">No Running Preview</h3>
                  <p className="text-gray-600 mb-4">
                    Start a Custom Sandbox to see your project running live
                  </p>
                  <Button onClick={handleCreateSandbox} disabled={isCreatingSandbox}>
                    {isCreatingSandbox ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <Play className="h-4 w-4 mr-1" />
                    )}
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
                Custom Sandbox Logs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-black text-green-400 p-4 rounded-lg font-mono text-sm h-[400px] overflow-y-auto">
                {activeSandbox ? (
                  <div className="space-y-1">
                    <div>📦 Container ID: {activeSandbox.e2bId}</div>
                    <div>🚀 Status: {activeSandbox.status}</div>
                    <div>🌐 Port: {activeSandbox.port}</div>
                    {activeSandbox.url && <div>🔗 URL: {activeSandbox.url}</div>}
                    <div>⏰ Framework: {project.framework}</div>
                    <div>📁 Files: {project.files.length} files generated</div>
                    <div>🕐 Created: {new Date(activeSandbox.createdAt).toLocaleString()}</div>
                    <div>🔄 Updated: {new Date(activeSandbox.updatedAt).toLocaleString()}</div>
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