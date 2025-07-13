'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight, File, Folder, FolderOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'

interface ProjectFile {
  id: string
  filename: string
  path: string
  content: string
  language: string
  createdAt: string
}

interface ProjectFilesPreviewProps {
  files: ProjectFile[]
  projectName: string
  className?: string
}

export function ProjectFilesPreview({ files, projectName, className }: ProjectFilesPreviewProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['src']))
  const [selectedFile, setSelectedFile] = useState<ProjectFile | null>(null)

  // Organize files into a tree structure
  const fileTree = files.reduce((tree, file) => {
    const pathParts = file.path.split('/')
    const fileName = pathParts.pop() || file.filename
    const folderPath = pathParts.join('/')
    
    if (!tree[folderPath]) {
      tree[folderPath] = []
    }
    tree[folderPath].push({ ...file, displayName: fileName })
    return tree
  }, {} as Record<string, (ProjectFile & { displayName: string })[]>)

  const toggleFolder = (folderPath: string) => {
    const newExpanded = new Set(expandedFolders)
    if (newExpanded.has(folderPath)) {
      newExpanded.delete(folderPath)
    } else {
      newExpanded.add(folderPath)
    }
    setExpandedFolders(newExpanded)
  }

  const getFileIcon = (filename: string) => {
    const ext = filename.split('.').pop()
    switch (ext) {
      case 'tsx':
      case 'ts': return '⚡'
      case 'jsx':
      case 'js': return '📄'
      case 'css': return '🎨'
      case 'json': return '📋'
      case 'md': return '📝'
      case 'html': return '🌐'
      default: return '📄'
    }
  }

  const getLanguageBadge = (language: string) => {
    const colors = {
      typescript: 'bg-blue-100 text-blue-800',
      javascript: 'bg-yellow-100 text-yellow-800',
      css: 'bg-pink-100 text-pink-800',
      json: 'bg-gray-100 text-gray-800',
      markdown: 'bg-green-100 text-green-800',
      html: 'bg-orange-100 text-orange-800',
    }
    return colors[language as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${className}`}>
      {/* File Tree */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Folder className="h-5 w-5" />
            {projectName} Files ({files.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <div className="space-y-1">
              {Object.entries(fileTree).map(([folderPath, folderFiles]) => (
                <div key={folderPath}>
                  {folderPath && (
                    <Collapsible
                      open={expandedFolders.has(folderPath)}
                      onOpenChange={() => toggleFolder(folderPath)}
                    >
                      <CollapsibleTrigger className="flex items-center gap-2 w-full text-left p-2 hover:bg-gray-50 rounded">
                        {expandedFolders.has(folderPath) ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                        {expandedFolders.has(folderPath) ? (
                          <FolderOpen className="h-4 w-4 text-blue-500" />
                        ) : (
                          <Folder className="h-4 w-4 text-blue-500" />
                        )}
                        <span className="text-sm font-medium">{folderPath || 'Root'}</span>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="ml-6">
                        {folderFiles.map((file) => (
                          <Button
                            key={file.id}
                            variant="ghost"
                            className="w-full justify-start gap-2 h-auto p-2"
                            onClick={() => setSelectedFile(file)}
                          >
                            <File className="h-4 w-4 text-gray-500" />
                            <span className="mr-2">{getFileIcon(file.filename)}</span>
                            <span className="text-sm">{file.displayName}</span>
                            <Badge className={`ml-auto text-xs ${getLanguageBadge(file.language)}`}>
                              {file.language}
                            </Badge>
                          </Button>
                        ))}
                      </CollapsibleContent>
                    </Collapsible>
                  )}
                  {!folderPath && folderFiles.map((file) => (
                    <Button
                      key={file.id}
                      variant="ghost"
                      className="w-full justify-start gap-2 h-auto p-2"
                      onClick={() => setSelectedFile(file)}
                    >
                      <File className="h-4 w-4 text-gray-500" />
                      <span className="mr-2">{getFileIcon(file.filename)}</span>
                      <span className="text-sm">{file.displayName}</span>
                      <Badge className={`ml-auto text-xs ${getLanguageBadge(file.language)}`}>
                        {file.language}
                      </Badge>
                    </Button>
                  ))}
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* File Content */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <File className="h-5 w-5" />
            {selectedFile ? selectedFile.filename : 'Select a file'}
          </CardTitle>
          {selectedFile && (
            <div className="text-sm text-gray-500">{selectedFile.path}</div>
          )}
        </CardHeader>
        <CardContent>
          {selectedFile ? (
            <ScrollArea className="h-[400px]">
              <pre className="text-sm bg-gray-50 p-4 rounded-lg overflow-x-auto">
                <code>{selectedFile.content}</code>
              </pre>
            </ScrollArea>
          ) : (
            <div className="h-[400px] flex items-center justify-center text-gray-500">
              <div className="text-center">
                <File className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Select a file to view its contents</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 