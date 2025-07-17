'use client'

import { useState } from 'react'
import { api } from '@/trpc/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { 
  Folder, 
  Play, 
  ExternalLink, 
  Calendar, 
  Code, 
  GitBranch,
  Zap,
  Monitor,
  Square,
  Trash2,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import Link from 'next/link'
import { ProjectCardSkeleton, EmptyState } from '@/components/ui/loading-states'
import { toast } from 'sonner'

interface ProjectDashboardProps {
  limit?: number
}

export function ProjectDashboard({ limit = 10 }: ProjectDashboardProps) {
  const [deletingProject, setDeletingProject] = useState<string | null>(null)
  const { data: projects, isLoading, error, refetch } = api.project.getUserProjects.useQuery({ limit })

  // Delete project mutation
  const deleteProject = api.project.deleteProject.useMutation({
    onSuccess: () => {
      toast.success('Project deleted successfully')
      refetch()
      setDeletingProject(null)
    },
    onError: (error) => {
      toast.error(`Failed to delete project: ${error.message}`)
      setDeletingProject(null)
    }
  })

  // Debug sandbox creation mutation
  const testSandboxCreation = api.project.testSandboxCreation.useMutation({
    onSuccess: (data) => {
      console.log('🔍 Debug info:', data)
      toast.success(`Debug: Project has ${data.fileCount} files`)
    },
    onError: (error) => {
      toast.error(`Debug failed: ${error.message}`)
    }
  })

  // Test sandbox creation with logs
  const testSandboxWithLogs = api.project.testSandboxCreationWithLogs.useMutation({
    onSuccess: (data) => {
      console.log('🧪 Test sandbox result:', data)
      if (data.success && 'sandboxInfo' in data) {
        toast.success(`✅ Sandbox created! URL: ${data.sandboxInfo?.url}`)
        refetch() // Refresh to show the new sandbox
      } else if (!data.success && 'error' in data) {
        toast.error(`❌ Sandbox failed: ${data.error}`)
      } else {
        toast.error('❌ Unknown sandbox result')
      }
    },
    onError: (error) => {
      toast.error(`Test failed: ${error.message}`)
    }
  })

  // Create sandbox mutation
  const createSandbox = api.project.createSandbox.useMutation({
    onSuccess: (sandbox) => {
      console.log('🚀 Sandbox created:', sandbox)
      toast.success('Live preview created!')
      refetch() // Refresh the project list to show the new sandbox
    },
    onError: (error) => {
      console.error('❌ Sandbox creation failed:', error)
      toast.error(`Failed to create preview: ${error.message}`)
    }
  })

  const handleDeleteProject = (projectId: string) => {
    setDeletingProject(projectId)
    deleteProject.mutate({ id: projectId })
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <ProjectCardSkeleton key={i} />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <div className="text-red-500 mb-4">
          <Code className="h-12 w-12 mx-auto mb-2" />
          <p className="text-lg font-medium">Failed to load projects</p>
          <p className="text-sm text-gray-600">{error.message}</p>
        </div>
      </div>
    )
  }

  if (!projects?.length) {
    return (
      <div className="p-6">
        <EmptyState
          icon={Folder}
          title="No projects yet"
          description="Start building your first application with AI assistance. Upload a screenshot or describe your idea to get started."
        />
      </div>
    )
  }

  // Helper function to get project status info
  const getProjectStatusInfo = (status: string) => {
    switch (status) {
      case 'READY':
        return {
          color: 'bg-green-100 text-green-800 border-green-200',
          icon: CheckCircle,
          label: 'Ready',
          description: 'Project is ready to run'
        }
      case 'BUILDING':
        return {
          color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
          icon: Clock,
          label: 'Building',
          description: 'AI is generating your project'
        }
      case 'DEPLOYED':
        return {
          color: 'bg-blue-100 text-blue-800 border-blue-200',
          icon: Zap,
          label: 'Deployed',
          description: 'Project is live on the web'
        }
      case 'ERROR':
        return {
          color: 'bg-red-100 text-red-800 border-red-200',
          icon: XCircle,
          label: 'Error',
          description: 'Something went wrong'
        }
      case 'DRAFT':
        return {
          color: 'bg-gray-100 text-gray-800 border-gray-200',
          icon: Folder,
          label: 'Draft',
          description: 'Project is in draft mode'
        }
      default:
        return {
          color: 'bg-gray-100 text-gray-800 border-gray-200',
          icon: Folder,
          label: status,
          description: 'Project status'
        }
    }
  }

  // Helper function to get sandbox status info
  const getSandboxStatusInfo = (status: string) => {
    switch (status) {
      case 'RUNNING':
        return {
          color: 'bg-green-100 text-green-800 border-green-200',
          icon: Play,
          label: 'Live',
          description: 'Preview is running'
        }
      case 'CREATING':
        return {
          color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
          icon: Clock,
          label: 'Starting',
          description: 'Setting up preview'
        }
      case 'STOPPED':
        return {
          color: 'bg-gray-100 text-gray-800 border-gray-200',
          icon: Square,
          label: 'Stopped',
          description: 'Preview is stopped'
        }
      case 'ERROR':
        return {
          color: 'bg-red-100 text-red-800 border-red-200',
          icon: XCircle,
          label: 'Error',
          description: 'Preview failed to start'
        }
      default:
        return {
          color: 'bg-gray-100 text-gray-800 border-gray-200',
          icon: Monitor,
          label: status,
          description: 'Preview status'
        }
    }
  }

  return (
    <div className="p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((project) => {
          const activeSandbox = project.sandboxes?.[0]
          const hasRunningApp = activeSandbox?.status === 'RUNNING' && activeSandbox.url
          const projectStatus = getProjectStatusInfo(project.status)
          const sandboxStatus = activeSandbox ? getSandboxStatusInfo(activeSandbox.status) : null
          
          return (
            <Card key={project.id} className="card-hover hover-lift fade-in-up group border border-gray-200 hover:border-purple-300 transition-all duration-200">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0 pr-3">
                    <CardTitle className="text-lg font-semibold text-gray-900 group-hover:text-purple-600 transition-colors line-clamp-2 leading-tight">
                      {project.name}
                    </CardTitle>
                    <CardDescription className="text-sm text-gray-600 mt-2 line-clamp-2 leading-relaxed">
                      {project.description || 'No description provided'}
                    </CardDescription>
                  </div>
                  <div className="flex flex-col gap-2 ml-2 min-w-0">
                    {/* Project Status Badge */}
                    <Badge className={`text-xs px-2 py-1 border ${projectStatus.color} flex items-center gap-1`}>
                      <projectStatus.icon className="h-3 w-3" />
                      <span className="truncate">{projectStatus.label}</span>
                    </Badge>
                    
                    {/* Sandbox Status Badge (if exists) */}
                    {sandboxStatus && (
                      <Badge className={`text-xs px-2 py-1 border ${sandboxStatus.color} flex items-center gap-1`}>
                        <sandboxStatus.icon className="h-3 w-3" />
                        <span className="truncate">{sandboxStatus.label}</span>
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                <div className="space-y-3">
                  {/* Framework & Tech Stack */}
                  {project.framework && (
                    <div className="flex items-center text-sm text-gray-600 bg-gray-50 px-2 py-1 rounded">
                      <GitBranch className="h-4 w-4 mr-2 text-gray-500" />
                      <span className="font-medium">{project.framework}</span>
                      {project.styling && (
                        <span className="ml-2 text-gray-500">• {project.styling}</span>
                      )}
                    </div>
                  )}

                  {/* Status Description */}
                  <div className="flex items-center text-sm text-gray-600">
                    <AlertCircle className="h-4 w-4 mr-2 text-gray-500" />
                    <span>{projectStatus.description}</span>
                  </div>

                  {/* Live Preview Status */}
                  {hasRunningApp && (
                    <div className="flex items-center text-sm text-green-600 bg-green-50 px-2 py-1 rounded">
                      <Play className="h-4 w-4 mr-2" />
                      <span className="font-medium">Live Preview Available</span>
                    </div>
                  )}

                  {/* File Count */}
                  <div className="flex items-center text-sm text-gray-500">
                    <Code className="h-4 w-4 mr-2" />
                    <span>{project._count.files} files generated</span>
                  </div>

                  {/* Last Updated */}
                  <div className="flex items-center text-sm text-gray-500">
                    <Calendar className="h-4 w-4 mr-2" />
                    <span>Updated {formatDistanceToNow(new Date(project.updatedAt), { addSuffix: true })}</span>
                  </div>

                  {/* Action Buttons - Consistent Layout */}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <div className="flex gap-2">
                      {/* Edit Button - Always present */}
                      <Link href={`/project/${project.id}`}>
                        <Button size="sm" variant="outline" className="text-xs h-8">
                          <Code className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                      </Link>
                      
                      {/* Debug Button - Only in development */}
                      {process.env.NODE_ENV === 'development' && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs h-8 text-orange-600 hover:text-orange-700"
                            onClick={() => testSandboxCreation.mutate({ projectId: project.id })}
                            disabled={testSandboxCreation.isPending}
                          >
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Debug
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs h-8 text-purple-600 hover:text-purple-700"
                            onClick={() => testSandboxWithLogs.mutate({ projectId: project.id })}
                            disabled={testSandboxWithLogs.isPending}
                          >
                            <Code className="h-3 w-3 mr-1" />
                            Test
                          </Button>
                        </>
                      )}
                      
                      {/* Preview Button - Only when sandbox is running */}
                      {hasRunningApp && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-8"
                          onClick={() => window.open(activeSandbox.url!, '_blank')}
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          Preview
                        </Button>
                      )}
                    </div>

                    <div className="flex gap-2">
                      {/* Run/Live Button - Consistent logic */}
                      {hasRunningApp ? (
                        <Badge className="bg-green-100 text-green-800 text-xs px-2 py-1 border border-green-200 flex items-center gap-1">
                          <Zap className="h-3 w-3" />
                          Live
                        </Badge>
                      ) : project.status === 'READY' ? (
                        <Button 
                          size="sm" 
                          variant="default" 
                          className="text-xs h-8 bg-green-600 hover:bg-green-700"
                          onClick={() => createSandbox.mutate({ projectId: project.id })}
                          disabled={createSandbox.isPending}
                        >
                          {createSandbox.isPending ? (
                            <>
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1" />
                              Starting...
                            </>
                          ) : (
                            <>
                              <Play className="h-3 w-3 mr-1" />
                              Run
                            </>
                          )}
                        </Button>
                      ) : null}
                      
                      {/* Delete Button - Always present */}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="text-xs h-8 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 hover:border-red-300"
                            aria-label={`Delete project ${project.name}`}
                          >
                            <Trash2 className="h-3 w-3 mr-1" aria-hidden="true" />
                            Delete
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent 
                          className="sm:max-w-md bg-white border border-gray-200 shadow-lg"
                        >
                          <AlertDialogHeader>
                            <AlertDialogTitle 
                              className="text-red-600 font-semibold text-lg flex items-center gap-2"
                            >
                              <Trash2 className="h-5 w-5" aria-hidden="true" />
                              Delete Project
                            </AlertDialogTitle>
                            <AlertDialogDescription 
                              className="text-sm text-gray-600 space-y-2"
                            >
                              <p>
                                Are you sure you want to delete <strong>&quot;{project.name}&quot;</strong>?
                              </p>
                              <p className="text-red-600 font-medium">
                                ⚠️ This action cannot be undone.
                              </p>
                              <p className="text-xs text-gray-500">
                                This will permanently delete:
                              </p>
                              <ul className="text-xs text-gray-500 ml-4 list-disc space-y-1">
                                <li>All project files ({project._count.files} files)</li>
                                <li>Live previews and sandboxes</li>
                                <li>Deployment history</li>
                                <li>Chat sessions and messages</li>
                              </ul>
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter className="flex flex-col-reverse sm:flex-row gap-2">
                            <AlertDialogCancel 
                              className="w-full sm:w-auto"
                              autoFocus
                              aria-label="Cancel deletion and keep project"
                            >
                              Cancel
                            </AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteProject(project.id)}
                              disabled={deletingProject === project.id}
                              className="w-full sm:w-auto bg-red-600 hover:bg-red-700 focus:ring-red-500 focus:ring-offset-2"
                              aria-label={`Permanently delete ${project.name}`}
                            >
                              {deletingProject === project.id ? (
                                <>
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                                  Deleting...
                                </>
                              ) : (
                                <>
                                  <Trash2 className="h-4 w-4 mr-2" aria-hidden="true" />
                                  Delete Project
                                </>
                              )}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
