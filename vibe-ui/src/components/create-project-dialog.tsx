'use client'

import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { api } from '@/trpc/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Upload, 
  Loader2, 
  Image as ImageIcon, 
  FileText, 
  Code, 
  Palette, 
  Database,
  Sparkles
} from 'lucide-react'
import { toast } from 'sonner'

interface CreateProjectDialogProps {
  children: React.ReactNode
}

const frameworks = [
  { value: 'next.js', label: 'Next.js', popular: true },
  { value: 'react', label: 'React', popular: true },
  { value: 'vue', label: 'Vue.js', popular: true },
  { value: 'svelte', label: 'Svelte', popular: false },
  { value: 'astro', label: 'Astro', popular: false },
  { value: 'nuxt', label: 'Nuxt.js', popular: false },
]

const stylingOptions = [
  { value: 'tailwind', label: 'Tailwind CSS', popular: true },
  { value: 'styled-components', label: 'Styled Components', popular: true },
  { value: 'css-modules', label: 'CSS Modules', popular: false },
  { value: 'sass', label: 'Sass/SCSS', popular: false },
  { value: 'emotion', label: 'Emotion', popular: false },
]

const templates = [
  { 
    id: 'blank', 
    name: 'Blank Project', 
    description: 'Start from scratch with just the basic setup',
    icon: FileText
  },
  { 
    id: 'landing-page', 
    name: 'Landing Page', 
    description: 'Modern landing page with hero, features, and contact sections',
    icon: Sparkles
  },
  { 
    id: 'dashboard', 
    name: 'Admin Dashboard', 
    description: 'Complete admin dashboard with charts, tables, and forms',
    icon: Code
  },
  { 
    id: 'e-commerce', 
    name: 'E-commerce Store', 
    description: 'Full-featured online store with product catalog and cart',
    icon: Database
  },
]

export function CreateProjectDialog({ children }: CreateProjectDialogProps) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    framework: '',
    styling: '',
    template: 'blank',
    initialPrompt: '',
    screenshots: [] as string[]
  })
  const [screenshots, setScreenshots] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)

  const queryClient = useQueryClient()

  const createProject = api.project.createProject.useMutation({
    onSuccess: (project: any) => {
      toast.success('Project created successfully!')
      queryClient.invalidateQueries({ queryKey: ['project.getUserProjects'] })
      setOpen(false)
      resetForm()
      // Navigate to the project
      window.location.href = `/project/${project.id}`
    },
    onError: (error: any) => {
      toast.error(`Failed to create project: ${error.message}`)
    }
  })

  const resetForm = () => {
    setStep(1)
    setFormData({
      name: '',
      description: '',
      framework: '',
      styling: '',
      template: 'blank',
      initialPrompt: '',
      screenshots: []
    })
    setScreenshots([])
  }

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return

    setUploading(true)
    try {
      // In a real app, you'd upload to a service like AWS S3 or Cloudinary
      // For now, we'll just simulate the upload and store base64
      const uploadedUrls: string[] = []
      
      for (const file of Array.from(files)) {
        if (file.type.startsWith('image/')) {
          const reader = new FileReader()
          const base64 = await new Promise<string>((resolve) => {
            reader.onload = () => resolve(reader.result as string)
            reader.readAsDataURL(file)
          })
          uploadedUrls.push(base64)
        }
      }

      setFormData(prev => ({
        ...prev,
        screenshots: [...prev.screenshots, ...uploadedUrls]
      }))
    } catch (error) {
      toast.error('Failed to upload screenshots')
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      toast.error('Project name is required')
      return
    }

    createProject.mutate({
      name: formData.name,
      description: formData.description || undefined,
      framework: formData.framework || undefined,
      styling: formData.styling || undefined,
      template: formData.template,
      initialPrompt: formData.initialPrompt || undefined,
      screenshots: formData.screenshots
    })
  }

  const selectedTemplate = templates.find(t => t.id === formData.template)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            Create New Project
          </DialogTitle>
          <DialogDescription>
            Build amazing applications with AI assistance. Start from a template or describe your vision.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Step 1: Basic Info */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Project Name *</Label>
                <Input
                  id="name"
                  placeholder="My Awesome App"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe what your application should do..."
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Framework</Label>
                  <Select value={formData.framework} onValueChange={(value) => setFormData(prev => ({ ...prev, framework: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose framework" />
                    </SelectTrigger>
                    <SelectContent>
                      {frameworks.map((fw) => (
                        <SelectItem key={fw.value} value={fw.value}>
                          <div className="flex items-center gap-2">
                            {fw.label}
                            {fw.popular && <Badge variant="secondary" className="text-xs">Popular</Badge>}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Styling</Label>
                  <Select value={formData.styling} onValueChange={(value) => setFormData(prev => ({ ...prev, styling: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose styling" />
                    </SelectTrigger>
                    <SelectContent>
                      {stylingOptions.map((style) => (
                        <SelectItem key={style.value} value={style.value}>
                          <div className="flex items-center gap-2">
                            {style.label}
                            {style.popular && <Badge variant="secondary" className="text-xs">Popular</Badge>}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={() => setStep(2)}>
                  Next: Choose Template
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Template Selection */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">Choose a Template</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Select a starting point for your project. You can customize everything later.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {templates.map((template) => {
                  const Icon = template.icon
                  return (
                    <Card
                      key={template.id}
                      className={`cursor-pointer transition-all ${
                        formData.template === template.id
                          ? 'ring-2 ring-purple-500 bg-purple-50'
                          : 'hover:bg-gray-50'
                      }`}
                      onClick={() => setFormData(prev => ({ ...prev, template: template.id }))}
                    >
                      <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-base">
                          <Icon className="h-5 w-5" />
                          {template.name}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <CardDescription className="text-sm">
                          {template.description}
                        </CardDescription>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button onClick={() => setStep(3)}>
                  Next: AI Instructions
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: AI Instructions & Screenshots */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">AI Instructions</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Provide additional details or upload screenshots to help AI understand your vision.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="prompt">Additional Instructions</Label>
                <Textarea
                  id="prompt"
                  placeholder="Tell the AI more about what you want... e.g., 'Make it look modern with a dark theme' or 'Include a user authentication system'"
                  rows={4}
                  value={formData.initialPrompt}
                  onChange={(e) => setFormData(prev => ({ ...prev, initialPrompt: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Screenshots or Mockups</Label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e.target.files)}
                    className="hidden"
                    id="screenshot-upload"
                  />
                  <label htmlFor="screenshot-upload" className="cursor-pointer">
                    <div className="flex flex-col items-center gap-2">
                      {uploading ? (
                        <Loader2 className="h-8 w-8 text-gray-400 animate-spin" />
                      ) : (
                        <Upload className="h-8 w-8 text-gray-400" />
                      )}
                      <p className="text-sm text-gray-600">
                        {uploading ? 'Uploading...' : 'Click to upload screenshots or drag and drop'}
                      </p>
                      <p className="text-xs text-gray-500">PNG, JPG up to 10MB each</p>
                    </div>
                  </label>
                </div>

                {formData.screenshots.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-4">
                    {formData.screenshots.map((screenshot, index) => (
                      <div key={index} className="relative">
                        <img
                          src={screenshot}
                          alt={`Screenshot ${index + 1}`}
                          className="w-full h-20 object-cover rounded border"
                        />
                        <Button
                          size="sm"
                          variant="destructive"
                          className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                          onClick={() => {
                            setFormData(prev => ({
                              ...prev,
                              screenshots: prev.screenshots.filter((_, i) => i !== index)
                            }))
                          }}
                        >
                          ×
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(2)}>
                  Back
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={createProject.isPending}
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                >
                  {createProject.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Create Project
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Summary */}
          {step > 1 && (
            <div className="bg-gray-50 rounded-lg p-4 border-t">
              <h4 className="font-medium text-sm text-gray-700 mb-2">Project Summary:</h4>
              <div className="text-sm text-gray-600 space-y-1">
                <p><strong>Name:</strong> {formData.name || 'Untitled'}</p>
                {formData.framework && <p><strong>Framework:</strong> {frameworks.find(f => f.value === formData.framework)?.label}</p>}
                {formData.styling && <p><strong>Styling:</strong> {stylingOptions.find(s => s.value === formData.styling)?.label}</p>}
                {selectedTemplate && <p><strong>Template:</strong> {selectedTemplate.name}</p>}
                {formData.screenshots.length > 0 && <p><strong>Screenshots:</strong> {formData.screenshots.length} uploaded</p>}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
