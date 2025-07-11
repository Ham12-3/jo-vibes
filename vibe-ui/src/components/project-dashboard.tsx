'use client'

import { api } from '@/trpc/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Folder, 
  Play, 
  Settings, 
  ExternalLink, 
  Calendar, 
  Code, 
  Globe,
  GitBranch,
  Zap
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import Link from 'next/link'

interface ProjectDashboardProps {
  limit?: number
}

export function ProjectDashboard({ limit = 10 }: ProjectDashboardProps) {
  const { data: projects, isLoading, error } = api.project.getUserProjects.useQuery({ limit })

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 rounded"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                </div>
              </CardContent>
            </Card>
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
      <div className="p-12 text-center">
        <div className="text-gray-400 mb-6">
          <Folder className="h-16 w-16 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-gray-900 mb-2">No projects yet</h3>
          <p className="text-gray-600 max-w-md mx-auto">
            Start building your first application with AI assistance. Upload a screenshot or describe your idea to get started.
          </p>
        </div>
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

  return (
    <div className="p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((project) => (
          <Card key={project.id} className="hover:shadow-lg transition-shadow duration-200 group">
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
                <Badge className={`ml-2 text-xs ${getStatusColor(project.status)}`}>
                  {project.status}
                </Badge>
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
                    
                    {project.status === 'READY' && (
                      <Link href={`/project/${project.id}/preview`}>
                        <Button size="sm" variant="outline" className="text-xs">
                          <Play className="h-3 w-3 mr-1" />
                          Preview
                        </Button>
                      </Link>
                    )}
                  </div>

                  <div className="flex gap-1">
                    {project.deployments?.some(d => d.status === 'SUCCESS') && (
                      <Button size="sm" variant="ghost" className="p-1 h-8 w-8">
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    )}
                    
                    <Button size="sm" variant="ghost" className="p-1 h-8 w-8">
                      <Settings className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
