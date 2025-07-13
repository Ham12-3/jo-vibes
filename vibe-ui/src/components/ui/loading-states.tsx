"use client"

import { cn } from "@/lib/utils"
import { Loader2, Sparkles, Zap, Bot, Code, FileText, Globe } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg"
  className?: string
}

export function LoadingSpinner({ size = "md", className }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-6 w-6", 
    lg: "h-8 w-8"
  }

  return (
    <Loader2 className={cn("animate-spin", sizeClasses[size], className)} />
  )
}

interface LoadingDotProps {
  className?: string
}

export function LoadingDots({ className }: LoadingDotProps) {
  return (
    <div className={cn("flex items-center gap-1", className)}>
      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
    </div>
  )
}

interface AIProcessingIndicatorProps {
  stage: "analyzing" | "generating" | "creating" | "deploying" | "complete"
  progress?: number
  message?: string
  className?: string
}

export function AIProcessingIndicator({ stage, progress, message, className }: AIProcessingIndicatorProps) {
  const stageConfig = {
    analyzing: { icon: Sparkles, label: "Analyzing your request", color: "text-purple-500" },
    generating: { icon: Code, label: "Generating files", color: "text-blue-500" },
    creating: { icon: FileText, label: "Creating project structure", color: "text-green-500" },
    deploying: { icon: Zap, label: "Deploying to sandbox", color: "text-orange-500" },
    complete: { icon: Bot, label: "Complete", color: "text-green-600" }
  }

  const { icon: Icon, label, color } = stageConfig[stage]

  return (
    <div className={cn("flex items-center gap-3 p-4 bg-gray-50 rounded-lg", className)}>
      <div className={cn("p-2 rounded-full bg-white shadow-sm", color)}>
        <Icon className="h-5 w-5 animate-pulse" />
      </div>
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium text-gray-900">{label}</span>
          {progress !== undefined && (
            <span className="text-xs text-gray-500">{Math.round(progress)}%</span>
          )}
        </div>
        {progress !== undefined && (
          <Progress value={progress} className="h-2 mb-1" />
        )}
        {message && (
          <p className="text-xs text-gray-600">{message}</p>
        )}
      </div>
    </div>
  )
}

interface ProjectCardSkeletonProps {
  className?: string
}

export function ProjectCardSkeleton({ className }: ProjectCardSkeletonProps) {
  return (
    <Card className={cn("animate-pulse", className)}>
      <CardHeader className="space-y-2">
        <div className="h-5 bg-gray-200 rounded w-3/4"></div>
        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 bg-gray-200 rounded"></div>
          <div className="h-3 bg-gray-200 rounded w-20"></div>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 bg-gray-200 rounded"></div>
          <div className="h-3 bg-gray-200 rounded w-16"></div>
        </div>
        <div className="flex justify-between items-center">
          <div className="h-3 bg-gray-200 rounded w-12"></div>
          <div className="h-6 bg-gray-200 rounded w-16"></div>
        </div>
      </CardContent>
    </Card>
  )
}

interface FileTreeSkeletonProps {
  depth?: number
  className?: string
}

export function FileTreeSkeleton({ depth = 3, className }: FileTreeSkeletonProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: depth }).map((_, i) => (
        <div key={i} className="flex items-center gap-2 animate-pulse">
          <div className="h-4 w-4 bg-gray-200 rounded"></div>
          <div className="h-3 bg-gray-200 rounded" style={{ width: `${Math.random() * 100 + 50}px` }}></div>
        </div>
      ))}
    </div>
  )
}

interface ChatMessageSkeletonProps {
  isAI?: boolean
  className?: string
}

export function ChatMessageSkeleton({ isAI = false, className }: ChatMessageSkeletonProps) {
  return (
    <div className={cn("flex items-start gap-3", isAI ? "justify-start" : "justify-end", className)}>
      {isAI && <div className="h-8 w-8 bg-blue-200 rounded-full animate-pulse"></div>}
      <div className={cn("max-w-[70%] space-y-2", isAI ? "" : "order-2")}>
        <div className={cn("p-3 rounded-lg animate-pulse", isAI ? "bg-gray-200" : "bg-blue-200")}>
          <div className="space-y-1">
            <div className="h-3 bg-gray-300 rounded w-3/4"></div>
            <div className="h-3 bg-gray-300 rounded w-1/2"></div>
          </div>
        </div>
        <div className={cn("flex items-center gap-2", isAI ? "justify-start" : "justify-end")}>
          <div className="h-2 w-8 bg-gray-200 rounded"></div>
        </div>
      </div>
      {!isAI && <div className="h-8 w-8 bg-gray-200 rounded-full animate-pulse"></div>}
    </div>
  )
}

interface DeploymentStatusIndicatorProps {
  status: "pending" | "building" | "ready" | "error"
  progress?: number
  className?: string
}

export function DeploymentStatusIndicator({ status, progress, className }: DeploymentStatusIndicatorProps) {
  const statusConfig = {
    pending: { icon: Loader2, label: "Queued", color: "text-gray-500", bgColor: "bg-gray-100" },
    building: { icon: Zap, label: "Building", color: "text-blue-500", bgColor: "bg-blue-100" },
    ready: { icon: Globe, label: "Live", color: "text-green-500", bgColor: "bg-green-100" },
    error: { icon: Loader2, label: "Failed", color: "text-red-500", bgColor: "bg-red-100" }
  }

  const { icon: Icon, label, color, bgColor } = statusConfig[status]

  return (
    <div className={cn("flex items-center gap-2 p-2 rounded-lg", bgColor, className)}>
      <Icon className={cn("h-4 w-4", color, status === "building" ? "animate-spin" : "")} />
      <span className={cn("text-sm font-medium", color)}>{label}</span>
      {progress !== undefined && status === "building" && (
        <div className="flex-1 ml-2">
          <Progress value={progress} className="h-1" />
        </div>
      )}
    </div>
  )
}

interface FileUploadProgressProps {
  files: { name: string; progress: number; status: "uploading" | "complete" | "error" }[]
  className?: string
}

export function FileUploadProgress({ files, className }: FileUploadProgressProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {files.map((file, index) => (
        <div key={index} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
          <div className="flex-1">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium truncate">{file.name}</span>
              <span className="text-gray-500">{file.progress}%</span>
            </div>
            <Progress value={file.progress} className="h-1 mt-1" />
          </div>
          <div className={cn("p-1 rounded-full", {
            "bg-blue-100 text-blue-600": file.status === "uploading",
            "bg-green-100 text-green-600": file.status === "complete",
            "bg-red-100 text-red-600": file.status === "error"
          })}>
            {file.status === "uploading" && <Loader2 className="h-3 w-3 animate-spin" />}
            {file.status === "complete" && <div className="h-3 w-3 rounded-full bg-green-600"></div>}
            {file.status === "error" && <div className="h-3 w-3 rounded-full bg-red-600"></div>}
          </div>
        </div>
      ))}
    </div>
  )
}

interface EmptyStateProps {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
  action?: React.ReactNode
  className?: string
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center p-8 text-center", className)}>
      <div className="p-4 rounded-full bg-gray-100 mb-4">
        <Icon className="h-8 w-8 text-gray-400" />
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 max-w-md mb-4">{description}</p>
      {action && <div>{action}</div>}
    </div>
  )
}

interface SuccessAnimationProps {
  message: string
  description?: string
  action?: React.ReactNode
  className?: string
}

export function SuccessAnimation({ message, description, action, className }: SuccessAnimationProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center p-8 text-center", className)}>
      <div className="relative mb-4">
        <div className="p-4 rounded-full bg-green-100 animate-pulse">
          <Sparkles className="h-8 w-8 text-green-600" />
        </div>
        <div className="absolute inset-0 rounded-full bg-green-200 animate-ping"></div>
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">{message}</h3>
      {description && <p className="text-gray-600 max-w-md mb-4">{description}</p>}
      {action && <div>{action}</div>}
    </div>
  )
}

interface LoadingOverlayProps {
  message?: string
  className?: string
}

export function LoadingOverlay({ message = "Loading...", className }: LoadingOverlayProps) {
  return (
    <div className={cn("fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50", className)}>
      <div className="bg-white rounded-lg p-6 flex items-center gap-3">
        <LoadingSpinner size="md" />
        <span className="text-gray-900">{message}</span>
      </div>
    </div>
  )
} 