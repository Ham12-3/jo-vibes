"use client"

import { toast } from 'sonner'
import { 
  CheckCircle, 
  AlertCircle, 
  AlertTriangle, 
  Info, 
  Sparkles,
  Zap,
  Rocket
} from 'lucide-react'

interface NotificationOptions {
  duration?: number
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
}

export const notifications = {
  success: (message: string, options?: NotificationOptions) => {
    return toast.success(message, {
      icon: <CheckCircle className="h-5 w-5" />,
      duration: options?.duration || 4000,
      description: options?.description,
      action: options?.action ? {
        label: options.action.label,
        onClick: options.action.onClick
      } : undefined
    })
  },

  error: (message: string, options?: NotificationOptions) => {
    return toast.error(message, {
      icon: <AlertCircle className="h-5 w-5" />,
      duration: options?.duration || 5000,
      description: options?.description,
      action: options?.action ? {
        label: options.action.label,
        onClick: options.action.onClick
      } : undefined
    })
  },

  warning: (message: string, options?: NotificationOptions) => {
    return toast.warning(message, {
      icon: <AlertTriangle className="h-5 w-5" />,
      duration: options?.duration || 4000,
      description: options?.description,
      action: options?.action ? {
        label: options.action.label,
        onClick: options.action.onClick
      } : undefined
    })
  },

  info: (message: string, options?: NotificationOptions) => {
    return toast.info(message, {
      icon: <Info className="h-5 w-5" />,
      duration: options?.duration || 3000,
      description: options?.description,
      action: options?.action ? {
        label: options.action.label,
        onClick: options.action.onClick
      } : undefined
    })
  },

  loading: (message: string, options?: NotificationOptions) => {
    return toast.loading(message, {
      icon: <div className="animate-spin h-5 w-5 border-2 border-current border-t-transparent rounded-full" />,
      duration: options?.duration,
      description: options?.description
    })
  },

  // Custom themed notifications
  ai: (message: string, options?: NotificationOptions) => {
    return toast.success(message, {
      icon: <Sparkles className="h-5 w-5 text-purple-500" />,
      duration: options?.duration || 4000,
      description: options?.description,
      action: options?.action ? {
        label: options.action.label,
        onClick: options.action.onClick
      } : undefined
    })
  },

  deployment: (message: string, options?: NotificationOptions) => {
    return toast.success(message, {
      icon: <Rocket className="h-5 w-5 text-blue-500" />,
      duration: options?.duration || 4000,
      description: options?.description,
      action: options?.action ? {
        label: options.action.label,
        onClick: options.action.onClick
      } : undefined
    })
  },

  sandbox: (message: string, options?: NotificationOptions) => {
    return toast.success(message, {
      icon: <Zap className="h-5 w-5 text-orange-500" />,
      duration: options?.duration || 4000,
      description: options?.description,
      action: options?.action ? {
        label: options.action.label,
        onClick: options.action.onClick
      } : undefined
    })
  },

  // Promise-based toasts for async operations
  promise: (
    promise: Promise<unknown>,
    options: {
      loading: string
      success: string | ((data: unknown) => string)
      error: string | ((error: Error) => string)
    }
  ) => {
    return toast.promise(promise, options)
  },

  // Specialized notifications for common use cases
  projectCreated: (projectName: string, projectId: string) => {
    return notifications.ai(`🎉 Created "${projectName}" successfully!`, {
      description: 'Your AI-generated project is ready to use',
      action: {
        label: 'View Project',
        onClick: () => window.location.href = `/project/${projectId}`
      }
    })
  },

  projectDeployed: (projectName: string, url: string) => {
    return notifications.deployment(`🚀 "${projectName}" deployed successfully!`, {
      description: 'Your project is now live and accessible',
      action: {
        label: 'Open Live Site',
        onClick: () => window.open(url, '_blank')
      }
    })
  },

  fileSaved: (fileName: string) => {
    return notifications.success(`💾 Saved "${fileName}"`, {
      description: 'File changes have been saved successfully'
    })
  },

  fileError: (fileName: string, error: string) => {
    return notifications.error(`Failed to save "${fileName}"`, {
      description: error
    })
  },

  sandboxStarted: (url: string) => {
    return notifications.sandbox('🏃 Sandbox is running!', {
      description: 'Your development environment is ready',
      action: {
        label: 'Open Preview',
        onClick: () => window.open(url, '_blank')
      }
    })
  },

  chatMessage: (message: string) => {
    return notifications.info('💬 New message from AI', {
      description: message.substring(0, 100) + (message.length > 100 ? '...' : '')
    })
  },

  copied: (text: string) => {
    return notifications.success('📋 Copied to clipboard', {
      description: text.length > 50 ? `${text.substring(0, 50)}...` : text,
      duration: 2000
    })
  },

  downloadStarted: (fileName: string) => {
    return notifications.info(`📥 Downloading "${fileName}"`, {
      description: 'Download will begin shortly'
    })
  },

  // Batch operations
  batchSuccess: (count: number, operation: string) => {
    return notifications.success(`✅ ${operation} completed`, {
      description: `Successfully processed ${count} items`
    })
  },

  batchError: (count: number, operation: string) => {
    return notifications.error(`❌ ${operation} failed`, {
      description: `Failed to process ${count} items`
    })
  },

  // Custom dismiss function
  dismiss: (toastId?: string | number) => {
    return toast.dismiss(toastId)
  },

  // Dismiss all toasts
  dismissAll: () => {
    return toast.dismiss()
  }
}

// Custom hook for common notification patterns
export function useNotifications() {
  const asyncWrapper = async (
    operation: () => Promise<unknown>,
    messages: {
      loading: string
      success: string | ((data: unknown) => string)
      error: string | ((error: Error) => string)
    }
  ): Promise<unknown> => {
    const toastId = notifications.loading(messages.loading)
    
    try {
      const result = await operation()
      notifications.dismiss(toastId)
      notifications.success(
        typeof messages.success === 'function' 
          ? messages.success(result) 
          : messages.success
      )
      return result
    } catch (error) {
      notifications.dismiss(toastId)
      notifications.error(
        typeof messages.error === 'function' 
          ? messages.error(error as Error) 
          : messages.error
      )
      throw error
    }
  }

  const confirm = (
    message: string,
    onConfirm: () => void
  ) => {
    const toastId = notifications.info(message, {
      duration: 10000,
      action: {
        label: 'Confirm',
        onClick: () => {
          notifications.dismiss(toastId)
          onConfirm()
        }
      }
    })
  }

  return {
    ...notifications,
    async: asyncWrapper,
    confirm
  }
}

// Toast positioning and styling
export const toastConfig = {
  position: 'top-right' as const,
  duration: 4000,
  style: {
    background: 'white',
    border: '1px solid #e5e7eb',
    borderRadius: '0.5rem',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
  }
} 