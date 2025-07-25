"use client"

import { useState, useEffect, useRef } from 'react'
import { Editor } from '@monaco-editor/react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Textarea } from './ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { 
  RotateCcw, 
  Sparkles, 
  Code, 
  Eye, 
  Terminal,
  Loader2,
  CheckCircle,
  AlertCircle
} from 'lucide-react'
import { api } from '@/trpc/client'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

interface LovableInterfaceProps {
  projectId: string
  sandboxId?: string
}

export function LovableInterface({ projectId, sandboxId }: LovableInterfaceProps) {
  const [prompt, setPrompt] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationProgress, setGenerationProgress] = useState(0)
  const [liveCode, setLiveCode] = useState('')
  const [previewUrl, setPreviewUrl] = useState('')
  const [activeTab, setActiveTab] = useState('prompt')
  const [terminalOutput, setTerminalOutput] = useState<string[]>([])
  const [buildStatus, setBuildStatus] = useState<'idle' | 'building' | 'success' | 'error'>('idle')
  
  const _queryClient = useQueryClient()
  const generationIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const previewFrameRef = useRef<HTMLIFrameElement>(null)

  // Get project files
  const { data: _files, refetch: refetchFiles } = api.project.getProjectFiles.useQuery({
    projectId,
  })

  // Get sandbox status (only if sandboxId is provided)
  const { data: sandboxStatus } = api.project.getSandbox.useQuery({
    sandboxId: sandboxId || '',
  }, {
    enabled: !!sandboxId,
    refetchInterval: 5000, // Poll every 5 seconds
  })

  // AI auto-fix build errors
  const aiAutoFix = api.project.aiAutoFixBuildErrors.useMutation({
    onSuccess: (data) => {
      const message = 'message' in data ? data.message : `AI applied ${data.fixesApplied} fixes!`
      toast.success(message)
      setBuildStatus('success')
      
      // Show detailed results
      if (data.results && data.results.length > 0) {
        const successfulFixes = data.results.filter(r => r.success)
        if (successfulFixes.length > 0) {
          console.log('🔧 AI Fixes Applied:', successfulFixes.map(r => r.fix.description))
        }
      }
      
      // Refresh preview after fixes
      setTimeout(() => {
        if (previewFrameRef.current) {
          previewFrameRef.current.src = previewFrameRef.current.src
        }
      }, 2000)
    },
    onError: (error) => {
      toast.error(`Auto-fix failed: ${error.message}`)
      setBuildStatus('error')
    },
  })

  // Sync files from sandbox
  const syncSandboxFiles = api.project.syncSandboxFiles.useMutation({
    onSuccess: (data) => {
      toast.success(data.message || `Synced ${data.syncedCount} files from sandbox`)
      refetchFiles()
    },
    onError: (error) => {
      toast.error(`Failed to sync files: ${error.message}`)
    },
  })

  // AI terminal access
  const aiTerminal = api.project.aiTerminalAccess.useMutation({
    onSuccess: (data) => {
      setTerminalOutput(prev => [...prev, `$ ${data.command}`, data.stdout, data.stderr].filter(Boolean))
      if (data.success) {
        toast.success(`Command executed: ${data.command}`)
      } else {
        toast.error(`Command failed: ${data.stderr}`)
      }
    },
    onError: (error) => {
      toast.error(`Terminal error: ${error.message}`)
    },
  })

  // Simulate live code generation
  const simulateLiveGeneration = (targetCode: string) => {
    setIsGenerating(true)
    setGenerationProgress(0)
    setLiveCode('')
    
    const characters = targetCode.split('')
    let currentIndex = 0
    
    generationIntervalRef.current = setInterval(() => {
      if (currentIndex < characters.length) {
        setLiveCode(prev => prev + characters[currentIndex])
        currentIndex++
        setGenerationProgress((currentIndex / characters.length) * 100)
      } else {
        setIsGenerating(false)
        setGenerationProgress(100)
        if (generationIntervalRef.current) {
          clearInterval(generationIntervalRef.current)
        }
      }
    }, 50) // Type 20 characters per second
  }

  // Handle prompt submission
  const handlePromptSubmit = async () => {
    if (!prompt.trim()) return

    setIsGenerating(true)
    setActiveTab('code')
    
    try {
      // Simulate AI processing
      const sampleCode = `import React from 'react'

export default function GeneratedComponent() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
        <h1 className="text-3xl font-bold text-gray-800 mb-4">
          ${prompt}
        </h1>
        <p className="text-gray-600 mb-6">
          This component was generated based on your prompt: "${prompt}"
        </p>
        <button className="w-full bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors">
          Get Started
        </button>
      </div>
    </div>
  )
}`

      simulateLiveGeneration(sampleCode)
      
      // Update preview URL when sandbox is ready
      if (sandboxStatus?.url) {
        setPreviewUrl(sandboxStatus.url)
      }
      
    } catch (_error) {
      toast.error('Failed to generate code')
      setIsGenerating(false)
    }
  }

  // Auto-fix build errors
  const handleAutoFix = () => {
    if (!sandboxId) {
      toast.error('No sandbox available')
      return
    }
    
    setBuildStatus('building')
    aiAutoFix.mutate({ projectId, sandboxId })
  }

  // Execute terminal command
  const handleTerminalCommand = (command: string) => {
    if (!sandboxId) {
      toast.error('No sandbox available')
      return
    }
    
    aiTerminal.mutate({ 
      projectId, 
      sandboxId, 
      command,
      purpose: 'User command'
    })
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (generationIntervalRef.current) {
        clearInterval(generationIntervalRef.current)
      }
    }
  }, [])

  // Update preview URL when sandbox status changes
  useEffect(() => {
    if (sandboxStatus?.url) {
      setPreviewUrl(sandboxStatus.url)
    }
  }, [sandboxStatus?.url])

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Sparkles className="h-6 w-6 text-purple-600" />
            <h1 className="text-xl font-bold text-gray-900">Lovable Interface</h1>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleAutoFix}
              disabled={aiAutoFix.isPending}
            >
              {aiAutoFix.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Terminal className="h-4 w-4" />
              )}
              AI Auto-Fix
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (sandboxId) {
                  syncSandboxFiles.mutate({ projectId, sandboxId })
                } else {
                  toast.error('No sandbox available for syncing')
                }
              }}
              disabled={syncSandboxFiles.isPending}
            >
              {syncSandboxFiles.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <span>🔄</span>
              )}
              Sync Files
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchFiles()}
            >
              <RotateCcw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Left Panel - Prompt & Code */}
        <div className="w-1/2 flex flex-col border-r border-gray-200">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="prompt" className="flex items-center space-x-2">
                <Sparkles className="h-4 w-4" />
                <span>Prompt</span>
              </TabsTrigger>
              <TabsTrigger value="code" className="flex items-center space-x-2">
                <Code className="h-4 w-4" />
                <span>Live Code</span>
                {isGenerating && <Loader2 className="h-4 w-4 animate-spin" />}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="prompt" className="flex-1 p-4">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Sparkles className="h-5 w-5 text-purple-600" />
                    <span>Describe Your Component</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Textarea
                    placeholder="Describe what you want to build... (e.g., 'Create a modern login form with social media buttons')"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    className="min-h-[200px] resize-none"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                        handlePromptSubmit()
                      }
                    }}
                  />
                  
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-500">
                      Press Cmd+Enter to generate
                    </p>
                    <Button
                      onClick={handlePromptSubmit}
                      disabled={!prompt.trim() || isGenerating}
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4 mr-2" />
                          Generate
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="code" className="flex-1 p-4">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Code className="h-5 w-5 text-blue-600" />
                      <span>Live Code Generation</span>
                    </div>
                    {isGenerating && (
                      <div className="flex items-center space-x-2 text-sm text-gray-500">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                        <span>Typing...</span>
                        <span>{Math.round(generationProgress)}%</span>
                      </div>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="h-full">
                  <Editor
                    height="100%"
                    language="typescript"
                    value={liveCode}
                    onChange={() => {}} // Read-only for live generation
                    theme="vs-dark"
                    options={{
                      readOnly: true,
                      fontSize: 14,
                      minimap: { enabled: false },
                      scrollBeyondLastLine: false,
                      automaticLayout: true,
                      wordWrap: 'on',
                    }}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Panel - Preview & Terminal */}
        <div className="w-1/2 flex flex-col">
          <Tabs defaultValue="preview" className="flex-1 flex flex-col">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="preview" className="flex items-center space-x-2">
                <Eye className="h-4 w-4" />
                <span>Live Preview</span>
                {buildStatus === 'building' && <Loader2 className="h-4 w-4 animate-spin" />}
                {buildStatus === 'success' && <CheckCircle className="h-4 w-4 text-green-500" />}
                {buildStatus === 'error' && <AlertCircle className="h-4 w-4 text-red-500" />}
              </TabsTrigger>
              <TabsTrigger value="terminal" className="flex items-center space-x-2">
                <Terminal className="h-4 w-4" />
                <span>Terminal</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="preview" className="flex-1 p-4">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Eye className="h-5 w-5 text-green-600" />
                    <span>Live Preview</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="h-full p-0">
                  {previewUrl ? (
                    <iframe
                      ref={previewFrameRef}
                      src={previewUrl}
                      className="w-full h-full border-0"
                      title="Live Preview"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">
                      <div className="text-center">
                        <Eye className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <p>Preview will appear here when sandbox is ready</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="terminal" className="flex-1 p-4">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Terminal className="h-5 w-5 text-orange-600" />
                    <span>AI Terminal</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex space-x-2">
                    <Input
                      placeholder="Enter command (e.g., npm install)"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const command = e.currentTarget.value
                          if (command.trim()) {
                            handleTerminalCommand(command)
                            e.currentTarget.value = ''
                          }
                        }
                      }}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleTerminalCommand('npm install')}
                    >
                      Install
                    </Button>
                  </div>
                  
                  <div className="bg-black text-green-400 p-4 rounded-lg h-64 overflow-y-auto font-mono text-sm">
                    {terminalOutput.length === 0 ? (
                      <p className="text-gray-500">Terminal output will appear here...</p>
                    ) : (
                      terminalOutput.map((line, index) => (
                        <div key={index} className="whitespace-pre-wrap">{line}</div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
} 