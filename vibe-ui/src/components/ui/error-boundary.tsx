"use client"

import { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCw, Home, Bug, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { toast } from 'sonner'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
  isDetailsOpen: boolean
  retryCount: number
}

export class ErrorBoundary extends Component<Props, State> {
  private maxRetries = 3

  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      isDetailsOpen: false,
      retryCount: 0
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo
    })

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo)

    // Log error to console for development
    console.error('ErrorBoundary caught an error:', error, errorInfo)

    // You could also log to an error reporting service here
    // logErrorToService(error, errorInfo)
  }

  handleRetry = () => {
    if (this.state.retryCount < this.maxRetries) {
      this.setState(prevState => ({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: prevState.retryCount + 1
      }))
      
      toast.info(`Retrying... (${this.state.retryCount + 1}/${this.maxRetries})`)
    } else {
      toast.error('Maximum retry attempts reached. Please refresh the page.')
    }
  }

  handleRefresh = () => {
    window.location.reload()
  }

  handleGoHome = () => {
    window.location.href = '/'
  }

  toggleDetails = () => {
    this.setState(prevState => ({
      isDetailsOpen: !prevState.isDetailsOpen
    }))
  }

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl fade-in-up">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="p-3 bg-red-100 rounded-full">
                  <AlertTriangle className="h-8 w-8 text-red-600" />
                </div>
              </div>
              <CardTitle className="text-2xl font-bold text-red-800">
                Something went wrong
              </CardTitle>
              <CardDescription className="text-red-600 mt-2">
                We encountered an unexpected error. Don&apos;t worry, we&apos;re working to fix it.
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {/* Error Summary */}
              <Alert className="border-red-200 bg-red-50">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-red-800">
                  <strong>Error:</strong> {this.state.error?.name || 'Unknown Error'}
                  <br />
                  <span className="text-sm text-red-600">
                    {this.state.error?.message || 'An unexpected error occurred'}
                  </span>
                </AlertDescription>
              </Alert>

              {/* Retry Information */}
              {this.state.retryCount > 0 && (
                <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-200">
                  <div className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 text-orange-600" />
                    <span className="text-sm text-orange-800">
                      Retry attempts: {this.state.retryCount}/{this.maxRetries}
                    </span>
                  </div>
                  <Badge variant="outline" className="text-orange-600 border-orange-300">
                    {this.maxRetries - this.state.retryCount} remaining
                  </Badge>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={this.handleRetry}
                  disabled={this.state.retryCount >= this.maxRetries}
                  className="flex-1 button-press focus-ring"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
                
                <Button
                  onClick={this.handleRefresh}
                  variant="outline"
                  className="flex-1 button-press focus-ring"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Page
                </Button>
                
                <Button
                  onClick={this.handleGoHome}
                  variant="outline"
                  className="flex-1 button-press focus-ring"
                >
                  <Home className="h-4 w-4 mr-2" />
                  Go Home
                </Button>
              </div>

              {/* Error Details (Collapsible) */}
              <Collapsible open={this.state.isDetailsOpen} onOpenChange={this.toggleDetails}>
                <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-gray-50 rounded-lg border hover:bg-gray-100 transition-colors">
                  <div className="flex items-center gap-2">
                    <Bug className="h-4 w-4 text-gray-600" />
                    <span className="text-sm font-medium text-gray-700">
                      Technical Details
                    </span>
                  </div>
                  {this.state.isDetailsOpen ? (
                    <ChevronUp className="h-4 w-4 text-gray-600" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-gray-600" />
                  )}
                </CollapsibleTrigger>
                
                <CollapsibleContent className="mt-3">
                  <div className="p-4 bg-gray-900 rounded-lg text-green-400 font-mono text-sm custom-scrollbar overflow-auto max-h-64">
                    <div className="space-y-2">
                      <div>
                        <strong className="text-red-400">Error:</strong> {this.state.error?.name}
                      </div>
                      <div>
                        <strong className="text-red-400">Message:</strong> {this.state.error?.message}
                      </div>
                      {this.state.error?.stack && (
                        <div>
                          <strong className="text-red-400">Stack Trace:</strong>
                          <pre className="mt-1 text-xs whitespace-pre-wrap break-all">
                            {this.state.error.stack}
                          </pre>
                        </div>
                      )}
                      {this.state.errorInfo?.componentStack && (
                        <div>
                          <strong className="text-red-400">Component Stack:</strong>
                          <pre className="mt-1 text-xs whitespace-pre-wrap break-all">
                            {this.state.errorInfo.componentStack}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* Help Text */}
              <div className="text-center text-sm text-gray-600 space-y-1">
                <p>If the problem persists, please contact our support team.</p>
                <p>
                  Include the technical details above to help us diagnose the issue faster.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}

// Utility component for wrapping specific sections
interface ErrorFallbackProps {
  error: Error
  retry: () => void
  className?: string
}

export function ErrorFallback({ error, retry, className = "" }: ErrorFallbackProps) {
  return (
    <div className={`text-center p-8 ${className}`}>
      <div className="p-4 bg-red-50 rounded-lg border border-red-200 max-w-md mx-auto fade-in">
        <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-red-800 mb-2">Something went wrong</h3>
        <p className="text-red-600 text-sm mb-4">{error.message}</p>
        <Button onClick={retry} size="sm" className="button-press focus-ring">
          <RefreshCw className="h-4 w-4 mr-2" />
          Try Again
        </Button>
      </div>
    </div>
  )
}

// Hook for using error boundaries with React Query
export function useErrorHandler() {
  return (error: Error) => {
    console.error('Caught error:', error)
    toast.error(`Error: ${error.message}`)
  }
} 