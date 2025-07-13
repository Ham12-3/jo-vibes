"use client"

import { useState, useEffect } from 'react'
import { 
  Globe, 
  Rocket, 
  Loader2, 
  CheckCircle, 
  XCircle, 
  ExternalLink, 
  Copy,
  Trash2,
  RefreshCw,
  AlertCircle,
  Clock
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { api } from '@/trpc/client'
import { toast } from 'sonner'
import { EmptyState, LoadingSpinner } from '@/components/ui/loading-states'

interface DeploymentPanelProps {
  projectId: string
  projectName: string
}



export function DeploymentPanel({ projectId }: DeploymentPanelProps) {
  const [isDeploying, setIsDeploying] = useState(false)
  const [customDomain, setCustomDomain] = useState('')
  const [showCustomDomain, setShowCustomDomain] = useState(false)

  // Check if deployment is available
  const { data: deploymentAvailability } = api.deployment.isDeploymentAvailable.useQuery()

  // Get project deployments
  const { data: deployments, isLoading: deploymentsLoading, refetch: refetchDeployments } = api.deployment.getProjectDeployments.useQuery({
    projectId,
  })

  // Deploy project mutation
  const deployProject = api.deployment.deployProject.useMutation({
    onSuccess: () => {
      toast.success('🚀 Deployment started!', {
        description: 'Your project is being deployed to Vercel. This may take a few minutes.',
        duration: 5000,
      })
      setIsDeploying(false)
      setCustomDomain('')
      setShowCustomDomain(false)
      refetchDeployments()
    },
    onError: (error) => {
      toast.error(`Deployment failed: ${error.message}`)
      setIsDeploying(false)
    },
  })

  // Delete deployment mutation
  const deleteDeployment = api.deployment.deleteDeployment.useMutation({
    onSuccess: () => {
      toast.success('Deployment deleted successfully')
      refetchDeployments()
    },
    onError: (error) => {
      toast.error(`Failed to delete deployment: ${error.message}`)
    },
  })

  // Auto-refresh deployments every 10 seconds if there are pending/building deployments
  useEffect(() => {
    const hasPendingDeployments = deployments?.some(
      d => d.status === 'PENDING' || d.status === 'BUILDING'
    )

    if (hasPendingDeployments) {
      const interval = setInterval(() => {
        refetchDeployments()
      }, 10000)

      return () => clearInterval(interval)
    }
  }, [deployments, refetchDeployments])

  const handleDeploy = async () => {
    setIsDeploying(true)
    deployProject.mutate({
      projectId,
      customDomain: customDomain || undefined,
    })
  }

  const handleDeleteDeployment = async (deploymentId: string) => {
    deleteDeployment.mutate({ deploymentId })
  }

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

  const activeDeployment = deployments?.find(d => d.status === 'SUCCESS' && d.url)

  if (!deploymentAvailability?.available) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-orange-500" />
            Deployment Unavailable
          </CardTitle>
          <CardDescription>
            {deploymentAvailability?.message}
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Active Deployment Card */}
      {activeDeployment && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-800">
              <Globe className="h-5 w-5" />
              Live Deployment
            </CardTitle>
            <CardDescription className="text-green-700">
              Your project is live and accessible to the world
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
              <div className="flex items-center space-x-2">
                <Globe className="h-4 w-4 text-green-600" />
                <a
                  href={`https://${activeDeployment.url}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline font-medium"
                >
                  {activeDeployment.url}
                </a>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(`https://${activeDeployment.url}`)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                >
                  <a
                    href={`https://${activeDeployment.url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Deployment Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Rocket className="h-5 w-5" />
            Deploy Project
          </CardTitle>
          <CardDescription>
            Deploy your project to Vercel for live hosting
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Button
              onClick={handleDeploy}
              disabled={isDeploying || deployProject.isPending}
              className="flex-1"
            >
              {isDeploying || deployProject.isPending ? (
                <LoadingSpinner size="sm" className="mr-2" />
              ) : (
                <Rocket className="h-4 w-4 mr-2" />
              )}
              {activeDeployment ? 'Redeploy' : 'Deploy Now'}
            </Button>

            <Dialog open={showCustomDomain} onOpenChange={setShowCustomDomain}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  Custom Domain
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Deploy with Custom Domain</DialogTitle>
                  <DialogDescription>
                    Enter a custom domain for your deployment (optional)
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="domain">Custom Domain</Label>
                    <Input
                      id="domain"
                      placeholder="my-app.example.com"
                      value={customDomain}
                      onChange={(e) => setCustomDomain(e.target.value)}
                    />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button
                      variant="outline"
                      onClick={() => setShowCustomDomain(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleDeploy}
                      disabled={isDeploying}
                    >
                      Deploy
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {/* Deployment History */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Deployment History
              </CardTitle>
              <CardDescription>
                Track all deployments for this project
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchDeployments()}
              disabled={deploymentsLoading}
            >
              <RefreshCw className={`h-4 w-4 ${deploymentsLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {deploymentsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : deployments && deployments.length > 0 ? (
            <div className="space-y-3">
              {deployments.map((deployment) => (
                <div
                  key={deployment.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(deployment.status)}
                    <div>
                      <div className="flex items-center space-x-2">
                        <Badge className={getStatusColor(deployment.status)}>
                          {deployment.status}
                        </Badge>
                        <span className="text-sm text-gray-600">
                          {new Date(deployment.createdAt).toLocaleString()}
                        </span>
                      </div>
                      {deployment.url && (
                        <a
                          href={`https://${deployment.url}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:underline"
                        >
                          {deployment.url}
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {deployment.url && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(`https://${deployment.url}`)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          asChild
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
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm">
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
                            onClick={() => handleDeleteDeployment(deployment.id)}
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
            <EmptyState
              icon={Rocket}
              title="No deployments yet"
              description="Deploy your project to see it here"
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
} 