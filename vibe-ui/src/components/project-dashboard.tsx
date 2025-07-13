'use client'

import { api } from '@/trpc/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Folder, 
  Play, 
  ExternalLink, 
  Calendar, 
  Code, 
  GitBranch,
  Zap,
  Monitor,
  Square
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import Link from 'next/link'
import { ProjectCardSkeleton, EmptyState } from '@/components/ui/loading-states'

interface ProjectDashboardProps {
  limit?: number
}

export function ProjectDashboard({ limit = 10 }: ProjectDashboardProps) {
  const { data: projects, isLoading, error } = api.project.getUserProjects.useQuery({ limit })

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
