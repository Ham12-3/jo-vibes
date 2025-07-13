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
  Trash2
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'READY':
        return 'bg-green-100 text-green-800'
      case 'BUILDING':
        return 'bg-yellow-100 text-yellow-800'
      case 'DEPLOYED':
        return 'bg-blue-100 text-blue-800'
      case 'ERROR':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getSandboxStatusColor = (status: string) => {
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

  return (
    <div className="p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((project) => {
          const activeSandbox = project.sandboxes?.[0]
          const hasRunningApp = activeSandbox?.status === 'RUNNING' && activeSandbox.url
          
          return (
            <Card key={project.id} className="card-hover hover-lift fade-in-up group">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg font-semibold truncate group-hover:text-purple-600 transition-colors">
                      {project.name}
                    </CardTitle>
                    <CardDescription className="text-sm text-gray-600 mt-1 line-clamp-2">
                      {project.description || 'No description provided'}
                    </CardDescription>
                  </div>
                  <div className="flex flex-col gap-1 ml-2">
                    <Badge className={`text-xs ${getStatusColor(project.status)}`}>
                      {project.status}
                    </Badge>
                    {activeSandbox && (
                      <Badge className={`text-xs ${getSandboxStatusColor(activeSandbox.status)}`}>
                        <Monitor className="h-3 w-3 mr-1" />
                        {activeSandbox.status}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                <div className="space-y-3">
                  {/* Framework & Tech Stack */}
                  {project.framework && (
                    <div className="flex items-center text-sm text-gray-600">
                      <GitBranch className="h-4 w-4 mr-2" />
                      <span>{project.framework}</span>
                      {project.styling && (
                        <span className="ml-2 text-gray-400">• {project.styling}</span>
                      )}
                    </div>
                  )}

                  {/* Sandbox Status */}
                  {activeSandbox && (
                    <div className="flex items-center text-sm">
                      {activeSandbox.status === 'RUNNING' ? (
                        <div className="flex items-center text-green-600">
                          <Play className="h-4 w-4 mr-2" />
                          <span>Live Preview Available</span>
                        </div>
                      ) : (
                        <div className="flex items-center text-gray-600">
                          <Square className="h-4 w-4 mr-2" />
                          <span>Sandbox {activeSandbox.status.toLowerCase()}</span>
                        </div>
                      )}
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

                  {/* Action Buttons */}
                  <div className="flex items-center justify-between pt-2">
                    <div className="flex gap-2">
                      <Link href={`/project/${project.id}`}>
                        <Button size="sm" variant="outline" className="text-xs">
                          <Code className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                      </Link>
                      
                      {hasRunningApp && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs"
                          onClick={() => window.open(activeSandbox.url!, '_blank')}
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          Preview
                        </Button>
                      )}
                    </div>

                    <div className="flex gap-1">
                      {project.status === 'READY' && !activeSandbox && (
                        <Link href={`/project/${project.id}?tab=preview`}>
                          <Button size="sm" variant="default" className="text-xs">
                            <Play className="h-3 w-3 mr-1" />
                            Run
                          </Button>
                        </Link>
                      )}
                      
                      {hasRunningApp && (
                        <Badge className="bg-green-100 text-green-800 text-xs">
                          <Zap className="h-3 w-3 mr-1" />
                          Live
                        </Badge>
                      )}
                      
                      {/* Delete Button */}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 hover:border-red-300"
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
