"use client"

import { useState, useEffect, useRef, useCallback } from 'react'
import { Editor } from '@monaco-editor/react'
import { 
  FileText, 
  FolderOpen, 
  Folder, 
  Save, 
  Plus, 
  Trash2, 
  Edit, 
  ChevronRight, 
  ChevronDown,
  RefreshCw,
  Loader2,
  Sparkles
} from 'lucide-react'
import { api } from '@/trpc/client'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from './ui/dialog'
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogTrigger 
} from './ui/alert-dialog'

interface FileTreeItem {
  id: string
  name: string
  path: string
  type: 'file' | 'folder'
  children?: FileTreeItem[]
  content?: string
  language?: string
}

interface FileEditorProps {
  projectId: string
  height?: string
}

export function FileEditor({ projectId, height = "600px" }: FileEditorProps) {
  const [selectedFile, setSelectedFile] = useState<FileTreeItem | null>(null)
  const [fileContent, setFileContent] = useState('')
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const [fileTree, setFileTree] = useState<FileTreeItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true)
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  const queryClient = useQueryClient()

  // Get project files
  const { data: files, isLoading: filesLoading, refetch } = api.project.getProjectFiles.useQuery({
    projectId,
  }, {
    staleTime: 0, // Always fetch fresh data
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  })

  // Get project with sandboxes
  const { data: project } = api.project.getProject.useQuery({
    id: projectId,
  })

  // File operations
  const updateFile = api.project.updateProjectFile.useMutation({
    onSuccess: () => {
      setHasUnsavedChanges(false)
      queryClient.invalidateQueries({ queryKey: ['project.getProjectFiles'] })
      toast.success('File saved successfully')
    },
    onError: (error) => {
      toast.error(`Failed to save file: ${error.message}`)
    },
  })

  const syncFileToSandbox = api.project.syncFileToSandbox.useMutation({
    onSuccess: (data) => {
      if (data.synced) {
        toast.success('File synced to live preview', { duration: 3000 })
      }
    },
    onError: (error) => {
      toast.error(`Failed to sync to sandbox: ${error.message}`)
    },
  })

  const createFile = api.project.createProjectFile.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project.getProjectFiles'] })
      toast.success('File created successfully')
    },
    onError: (error) => {
      toast.error(`Failed to create file: ${error.message}`)
    },
  })

  const deleteFile = api.project.deleteProjectFile.useMutation({
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['project.getProjectFiles'] })
      toast.success(`File ${data.deletedPath} deleted successfully`)
      
      // Clear selected file if it was deleted
      if (selectedFile?.id === data.deletedPath) {
        setSelectedFile(null)
        setFileContent('')
      }
    },
    onError: (error) => {
      toast.error(`Failed to delete file: ${error.message}`)
    },
  })

  const renameFile = api.project.renameProjectFile.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project.getProjectFiles'] })
      toast.success('File renamed successfully')
    },
    onError: (error) => {
      toast.error(`Failed to rename file: ${error.message}`)
    },
  })

  const cleanProjectFiles = api.project.cleanProjectFiles.useMutation({
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['project.getProjectFiles'] })
      toast.success(`Cleaned ${data.cleanedFiles} files of markdown contamination`)
    },
    onError: (error) => {
      toast.error(`Failed to clean files: ${error.message}`)
    },
  })

  const aiAutoFixBuildErrors = api.project.aiAutoFixBuildErrors.useMutation({
    onSuccess: (data) => {
      const message = 'message' in data ? data.message : `AI applied ${data.fixesApplied} fixes to resolve build errors`
      toast.success(message)
      
      // Show detailed results
      if (data.results && data.results.length > 0) {
        const successfulFixes = data.results.filter(r => r.success)
        if (successfulFixes.length > 0) {
          console.log('🔧 AI Fixes Applied:', successfulFixes.map(r => r.fix.description))
        }
      }
      
      // Refresh files after fixes
      setTimeout(() => {
        refetch()
      }, 2000)
    },
    onError: (error) => {
      toast.error(`Failed to auto-fix build errors: ${error.message}`)
    },
  })

  // Sync files from sandbox
  const syncSandboxFiles = api.project.syncSandboxFiles.useMutation({
    onSuccess: (data) => {
      toast.success(data.message || `Synced ${data.syncedCount} files from sandbox`)
      refetch()
    },
    onError: (error) => {
      toast.error(`Failed to sync files: ${error.message}`)
    },
  })

  // Clean up port conflicts
  const cleanupPortConflicts = api.project.cleanupPortConflicts.useMutation({
    onSuccess: (data) => {
      toast.success(data.message || `Cleaned up ${data.cleanedCount} containers`)
    },
    onError: (error) => {
      toast.error(`Failed to clean up port conflicts: ${error.message}`)
    },
  })

  // Convert flat file list to tree structure
  const buildFileTree = useCallback((files: Array<{ id: string; path: string; content: string; language?: string | null }>): FileTreeItem[] => {
    const tree: FileTreeItem[] = []
    const folderMap = new Map<string, FileTreeItem>()

    // Sort files by path
    const sortedFiles = [...files].sort((a, b) => a.path.localeCompare(b.path))

    for (const file of sortedFiles) {
      const parts = file.path.split('/')
      let currentPath = ''
      let currentLevel = tree

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i]
        const isLast = i === parts.length - 1
        currentPath = currentPath ? `${currentPath}/${part}` : part

        if (isLast) {
          // This is a file
          currentLevel.push({
            id: file.id,
            name: part,
            path: currentPath,
            type: 'file',
            content: file.content,
            language: file.language || undefined,
          })
        } else {
          // This is a folder
          let folder = folderMap.get(currentPath)
          if (!folder) {
            folder = {
              id: currentPath,
              name: part,
              path: currentPath,
              type: 'folder',
              children: [],
            }
            folderMap.set(currentPath, folder)
            currentLevel.push(folder)
          }
          currentLevel = folder.children!
        }
      }
    }

    return tree
  }, [])

  // Save file handler
  const handleSaveFile = useCallback(async () => {
    if (!selectedFile || !hasUnsavedChanges) return

    setIsLoading(true)
    try {
      // Save file to database
      updateFile.mutate({
        projectId,
        fileId: selectedFile.id,
        content: fileContent,
      })
      
              // Sync to Gitpod workspace in parallel
      syncFileToSandbox.mutate({
        projectId,
        fileId: selectedFile.id,
        content: fileContent,
      })
    } catch (error) {
      console.error('Error saving file:', error)
    } finally {
      setIsLoading(false)
    }
  }, [selectedFile, hasUnsavedChanges, updateFile, syncFileToSandbox, projectId, fileContent])

  // Update file tree when files change
  useEffect(() => {
    if (files) {
      console.log('🔄 Files received from API:', files.length)
      files.forEach((file, index) => {
        console.log(`  ${index + 1}. ${file.path} (${file.content.length} chars)`)
        console.log(`     Preview: ${file.content.substring(0, 100)}...`)
      })
      
      const tree = buildFileTree(files)
      setFileTree(tree)
    }
  }, [files, buildFileTree])

  // Auto-save functionality
  useEffect(() => {
    if (autoSaveEnabled && hasUnsavedChanges && selectedFile) {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current)
      }

      autoSaveTimeoutRef.current = setTimeout(() => {
        void handleSaveFile()
      }, 2000) // Auto-save after 2 seconds of inactivity
    }

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current)
      }
    }
  }, [autoSaveEnabled, hasUnsavedChanges, selectedFile, handleSaveFile])

  const handleFileSelect = (file: FileTreeItem) => {
    if (file.type === 'file') {
      console.log('📁 Selected file:', file.path)
      console.log('📄 File content length:', file.content?.length || 0)
      console.log('📄 File content preview:', file.content?.substring(0, 200) || 'No content')
      
      setSelectedFile(file)
      setFileContent(file.content || '')
      setHasUnsavedChanges(false)
    }
  }

  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      setFileContent(value)
      setHasUnsavedChanges(value !== selectedFile?.content)
    }
  }

  const handleCreateFile = async (path: string) => {
    createFile.mutate({
      projectId,
      path,
      content: '',
    })
  }

  const handleDeleteFile = async (fileId: string) => {
    deleteFile.mutate({
      projectId,
      fileId,
    })
  }

  const handleRenameFile = async (fileId: string, newPath: string) => {
    renameFile.mutate({
      projectId,
      fileId,
      newPath,
    })
  }

  const toggleFolder = (path: string) => {
    const newExpanded = new Set(expandedFolders)
    if (newExpanded.has(path)) {
      newExpanded.delete(path)
    } else {
      newExpanded.add(path)
    }
    setExpandedFolders(newExpanded)
  }

  const getFileIcon = (file: FileTreeItem) => {
    if (file.type === 'folder') {
      return expandedFolders.has(file.path) ? (
        <FolderOpen className="h-4 w-4 text-blue-500" />
      ) : (
        <Folder className="h-4 w-4 text-blue-500" />
      )
    }
    return <FileText className="h-4 w-4 text-gray-500" />
  }

  const renderFileTree = (items: FileTreeItem[], level = 0) => {
    return items.map((item) => (
      <div key={item.id} className="select-none">
        <div
          className={`flex items-center py-1 px-2 hover:bg-gray-100 cursor-pointer rounded ${
            selectedFile?.id === item.id ? 'bg-blue-50 border-l-2 border-blue-500' : ''
          }`}
          style={{ paddingLeft: `${level * 16 + 8}px` }}
          onClick={() => {
            if (item.type === 'folder') {
              toggleFolder(item.path)
            } else {
              handleFileSelect(item)
            }
          }}
        >
          {item.type === 'folder' && (
            <div className="mr-1">
              {expandedFolders.has(item.path) ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </div>
          )}
          
          <div className="mr-2">{getFileIcon(item)}</div>
          
          <span className="text-sm text-gray-700 flex-1 truncate">{item.name}</span>
          
          {item.type === 'file' && (
            <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100">
              <FileOperations
                file={item}
                onDelete={() => handleDeleteFile(item.id)}
                onRename={(newPath) => handleRenameFile(item.id, newPath)}
              />
            </div>
          )}
        </div>
        
        {item.type === 'folder' && expandedFolders.has(item.path) && item.children && (
          <div>
            {renderFileTree(item.children, level + 1)}
          </div>
        )}
      </div>
    ))
  }

  const getEditorLanguage = (file: FileTreeItem) => {
    if (file.language) {
      // Map our language names to Monaco language IDs
      const languageMap: Record<string, string> = {
        'typescript': 'typescript',
        'javascript': 'javascript',
        'css': 'css',
        'json': 'json',
        'html': 'html',
        'markdown': 'markdown',
        'text': 'plaintext',
      }
      return languageMap[file.language] || 'plaintext'
    }
    
    // Fallback to file extension
    const ext = file.path.split('.').pop()
    switch (ext) {
      case 'tsx':
      case 'ts': return 'typescript'
      case 'jsx':
      case 'js': return 'javascript'
      case 'css': return 'css'
      case 'json': return 'json'
      case 'html': return 'html'
      case 'md': return 'markdown'
      default: return 'plaintext'
    }
  }

  return (
    <div className="flex border border-gray-200 rounded-lg overflow-hidden" style={{ height }}>
      {/* File Tree Sidebar */}
      <div className="w-1/3 bg-gray-50 border-r border-gray-200 flex flex-col">
        <div className="p-3 border-b border-gray-200 bg-white">
                      <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-medium text-gray-700">Files</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // Navigate to Lovable interface
                    window.location.href = `/project/${projectId}/lovable`
                  }}
                  className="text-xs"
                >
                  <Sparkles className="h-3 w-3 mr-1" />
                  Lovable Mode
                </Button>
              </div>
              <div className="flex items-center space-x-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => refetch()}
                disabled={filesLoading}
              >
                <RefreshCw className={`h-4 w-4 ${filesLoading ? 'animate-spin' : ''}`} />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => cleanProjectFiles.mutate({ projectId })}
                disabled={cleanProjectFiles.isPending}
                title="Clean markdown contamination from all files"
              >
                {cleanProjectFiles.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <span className="text-xs">🧹</span>
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  // Get the first sandbox ID for this project
                  const firstSandbox = project?.sandboxes?.[0];
                  if (firstSandbox?.id) {
                    aiAutoFixBuildErrors.mutate({ projectId, sandboxId: firstSandbox.id });
                  } else {
                    toast.error('No sandbox found for this project');
                  }
                }}
                disabled={aiAutoFixBuildErrors.isPending}
                title="AI auto-fix build errors"
              >
                {aiAutoFixBuildErrors.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <span className="text-xs">🤖</span>
                )}
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  // Get the first sandbox ID for this project
                  const firstSandbox = project?.sandboxes?.[0];
                  if (firstSandbox?.id) {
                    syncSandboxFiles.mutate({ 
                      projectId, 
                      sandboxId: firstSandbox.id 
                    });
                  } else {
                    toast.error('No sandbox found for this project');
                  }
                }}
                disabled={syncSandboxFiles.isPending}
                title="Sync files from sandbox to database"
              >
                {syncSandboxFiles.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <span className="text-xs">🔄</span>
                )}
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  cleanupPortConflicts.mutate({ projectId });
                }}
                disabled={cleanupPortConflicts.isPending}
                title="Clean up port conflicts and existing containers"
              >
                {cleanupPortConflicts.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <span className="text-xs">🧹</span>
                )}
              </Button>
              <CreateFileDialog
                onCreateFile={handleCreateFile}
                existingPaths={files?.map(f => f.path) || []}
              />
            </div>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2">
          {filesLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : (
            <div className="space-y-1">
              {renderFileTree(fileTree)}
            </div>
          )}
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 flex flex-col">
        {selectedFile ? (
          <>
            <div className="p-3 border-b border-gray-200 bg-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <FileText className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">
                    {selectedFile.path}
                  </span>
                  {hasUnsavedChanges && (
                    <span className="text-xs bg-orange-100 text-orange-600 px-2 py-1 rounded">
                      Unsaved
                    </span>
                  )}
                </div>
                
                <div className="flex items-center space-x-2">
                  <label className="flex items-center space-x-2 text-xs text-gray-500">
                    <input
                      type="checkbox"
                      checked={autoSaveEnabled}
                      onChange={(e) => setAutoSaveEnabled(e.target.checked)}
                      className="rounded"
                    />
                    <span>Auto-save</span>
                  </label>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSaveFile}
                    disabled={!hasUnsavedChanges || isLoading}
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
            
            <div className="flex-1">
              <Editor
                height="100%"
                language={getEditorLanguage(selectedFile)}
                value={fileContent}
                onChange={handleEditorChange}
                theme="vs-dark"
                options={{
                  fontSize: 14,
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  wordWrap: 'on',
                  tabSize: 2,
                  insertSpaces: true,
                }}
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-lg font-medium">Select a file to edit</p>
              <p className="text-sm text-gray-400">Choose a file from the sidebar to start editing</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// File Operations Component
function FileOperations({ 
  file, 
  onDelete, 
  onRename 
}: { 
  file: FileTreeItem
  onDelete: () => void
  onRename: (newPath: string) => void
}) {
  return (
    <div className="flex items-center space-x-1">
      <RenameFileDialog file={file} onRename={onRename} />
      <DeleteFileDialog file={file} onDelete={onDelete} />
    </div>
  )
}

// Create File Dialog
function CreateFileDialog({ 
  onCreateFile, 
  existingPaths 
}: { 
  onCreateFile: (path: string) => void
  existingPaths: string[]
}) {
  const [open, setOpen] = useState(false)
  const [path, setPath] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (path.trim()) {
      if (existingPaths.includes(path.trim())) {
        toast.error('File already exists at this path')
        return
      }
      onCreateFile(path.trim())
      setPath('')
      setOpen(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Plus className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New File</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            placeholder="src/components/MyComponent.tsx"
            value={path}
            onChange={(e) => setPath(e.target.value)}
            autoFocus
          />
          <Button type="submit" disabled={!path.trim()}>
            Create File
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// Rename File Dialog
function RenameFileDialog({ 
  file, 
  onRename 
}: { 
  file: FileTreeItem
  onRename: (newPath: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [newPath, setNewPath] = useState(file.path)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (newPath.trim() && newPath !== file.path) {
      onRename(newPath.trim())
      setOpen(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Edit className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rename File</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            value={newPath}
            onChange={(e) => setNewPath(e.target.value)}
            autoFocus
          />
          <Button type="submit" disabled={!newPath.trim() || newPath === file.path}>
            Rename
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// Delete File Dialog
function DeleteFileDialog({ 
  file, 
  onDelete 
}: { 
  file: FileTreeItem
  onDelete: () => void
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete File</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete &quot;{file.path}&quot;? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onDelete}>Delete</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
} 