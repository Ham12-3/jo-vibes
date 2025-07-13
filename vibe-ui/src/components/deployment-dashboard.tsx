"use client"

import { useState } from 'react'
import { 
  Globe, 
  ExternalLink, 
  Copy, 
  Trash2,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  Rocket,
  Filter,
  Search
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { api } from '@/trpc/client'
import { toast } from 'sonner'
import Link from 'next/link'

export function DeploymentDashboard() {
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Get user deployments
  const { data: deployments, isLoading, refetch } = api.deployment.getUserDeployments.useQuery({
    limit: 50,
  })

  // Delete deployment mutation
  const deleteDeployment = api.deployment.deleteDeployment.useMutation({
    onSuccess: () => {
      toast.success('Deployment deleted successfully')
      refetch()
    },
    onError: (error) => {
      toast.error(`Failed to delete deployment: ${error.message}`)
    },
  })

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success('URL copied to clipboard!')
    } catch {
      toast.error('Failed to copy URL')
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'SUCCESS':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'FAILED':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'BUILDING':
      case 'PENDING':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SUCCESS':
        return 'bg-green-100 text-green-800'
      case 'FAILED':
        return 'bg-red-100 text-red-800'
      case 'BUILDING':
      case 'PENDING':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  // Filter deployments
  const filteredDeployments = deployments?.filter((deployment) => {
    const matchesStatus = statusFilter === 'all' || deployment.status.toLowerCase() === statusFilter.toLowerCase()
    const matchesSearch = !searchQuery || 
      deployment.project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      deployment.url?.toLowerCase().includes(searchQuery.toLowerCase())
    
    return matchesStatus && matchesSearch
  }) || []

  const successfulDeployments = deployments?.filter(d => d.status === 'SUCCESS').length || 0
  const failedDeployments = deployments?.filter(d => d.status === 'FAILED').length || 0
  const pendingDeployments = deployments?.filter(d => d.status === 'PENDING' || d.status === 'BUILDING').length || 0

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Globe className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm font-medium text-gray-600">Total Deployments</p>
                <p className="text-2xl font-bold">{deployments?.length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm font-medium text-gray-600">Successful</p>
                <p className="text-2xl font-bold text-green-600">{successfulDeployments}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Loader2 className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm font-medium text-gray-600">Building</p>
                <p className="text-2xl font-bold text-blue-600">{pendingDeployments}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <XCircle className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-sm font-medium text-gray-600">Failed</p>
                <p className="text-2xl font-bold text-red-600">{failedDeployments}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Deployments List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Rocket className="h-5 w-5" />
                Your Deployments
              </CardTitle>
              <CardDescription>
                Manage all your deployed projects
              </CardDescription>
            </div>
          </div>

          {/* Filters */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Search className="h-4 w-4 text-gray-500" />
              <Input
                placeholder="Search deployments..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-64"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="building">Building</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent>
          {filteredDeployments.length > 0 ? (
            <div className="space-y-4">
              {filteredDeployments.map((deployment) => (
                <div
                  key={deployment.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    {getStatusIcon(deployment.status)}
                    
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <Link
                          href={`/project/${deployment.project.id}`}
                          className="font-medium text-gray-900 hover:text-blue-600"
                        >
                          {deployment.project.name}
                        </Link>
                        <Badge className={getStatusColor(deployment.status)}>
                          {deployment.status}
                        </Badge>
                      </div>
                      
                      {deployment.url ? (
                        <a
                          href={`https://${deployment.url}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:underline flex items-center space-x-1"
                        >
                          <Globe className="h-3 w-3" />
                          <span>{deployment.url}</span>
                        </a>
                      ) : (
                        <span className="text-sm text-gray-500">No URL available</span>
                      )}
                      
                      <p className="text-xs text-gray-500 mt-1">
                        Deployed {new Date(deployment.createdAt).toLocaleDateString()} at{' '}
                        {new Date(deployment.createdAt).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {deployment.url && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(`https://${deployment.url}`)}
                          title="Copy URL"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          asChild
                          title="Open deployment"
                        >
                          <a
                            href={`https://${deployment.url}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      </>
                    )}
                    
                    <Link href={`/project/${deployment.project.id}`}>
                      <Button variant="ghost" size="sm" title="View project">
                        View Project
                      </Button>
                    </Link>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" title="Delete deployment">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Deployment</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete this deployment? 
                            This will remove it from Vercel and make it inaccessible.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteDeployment.mutate({ deploymentId: deployment.id })}
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Rocket className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchQuery || statusFilter !== 'all' ? 'No deployments found' : 'No deployments yet'}
              </h3>
              <p className="text-gray-600 mb-4">
                {searchQuery || statusFilter !== 'all' 
                  ? 'Try adjusting your search or filter criteria'
                  : 'Deploy your first project to see it here'
                }
              </p>
              {!searchQuery && statusFilter === 'all' && (
                <Link href="/dashboard">
                  <Button>
                    <Rocket className="h-4 w-4 mr-2" />
                    Create Project
                  </Button>
                </Link>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 