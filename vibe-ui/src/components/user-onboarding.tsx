"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { 
  CheckCircle, 
  ArrowRight, 
  Sparkles, 
  Code, 
  Globe, 
  Users 
} from 'lucide-react'

const ONBOARDING_STEPS = [
  {
    title: "Welcome to Jo Vibes!",
    description: "Let's get you set up to build amazing apps with AI",
    icon: Sparkles
  },
  {
    title: "Tell us about yourself",
    description: "Help us personalize your experience",
    icon: Users
  },
  {
    title: "Your first project",
    description: "Create your first AI-powered application",
    icon: Code
  },
  {
    title: "You're all set!",
    description: "Start building amazing things",
    icon: CheckCircle
  }
]

const PROJECT_TEMPLATES = [
  {
    id: 'todo',
    name: 'Todo App',
    description: 'A simple task management application',
    prompt: 'Create a modern todo app with React, TypeScript, and Tailwind CSS. Include add, edit, delete, and mark as complete functionality.',
    icon: '✅'
  },
  {
    id: 'landing',
    name: 'Landing Page',
    description: 'Professional landing page for your business',
    prompt: 'Create a modern landing page with hero section, features, testimonials, and contact form using React and Tailwind CSS.',
    icon: '🚀'
  },
  {
    id: 'dashboard',
    name: 'Dashboard',
    description: 'Analytics dashboard with charts and metrics',
    prompt: 'Create a modern dashboard with charts, metrics cards, and data visualization using React, TypeScript, and chart libraries.',
    icon: '📊'
  },
  {
    id: 'ecommerce',
    name: 'E-commerce Store',
    description: 'Complete online store with shopping cart',
    prompt: 'Create an e-commerce store with product listings, shopping cart, and checkout using React and modern design.',
    icon: '🛒'
  }
]

interface UserOnboardingProps {
  onComplete: () => void
}

export function UserOnboarding({ onComplete }: UserOnboardingProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [userInfo, setUserInfo] = useState({
    role: '',
    experience: '',
    interests: []
  })
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [customPrompt, setCustomPrompt] = useState('')
  const router = useRouter()

  const currentStepData = ONBOARDING_STEPS[currentStep]
  const Icon = currentStepData.icon

  const handleNext = () => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      onComplete()
    }
  }

  const handleSkip = () => {
    onComplete()
  }

  const handleCreateProject = () => {
    const template = PROJECT_TEMPLATES.find(t => t.id === selectedTemplate)
    const prompt = customPrompt || template?.prompt || ''
    
    // Redirect to dashboard with the project prompt
    router.push(`/dashboard?prompt=${encodeURIComponent(prompt)}`)
    onComplete()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-blue-100 p-3 rounded-full">
              <Icon className="h-8 w-8 text-blue-600" />
            </div>
          </div>
          <CardTitle className="text-2xl">{currentStepData.title}</CardTitle>
          <CardDescription className="text-lg">
            {currentStepData.description}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Progress Bar */}
          <div className="flex items-center justify-between">
            {ONBOARDING_STEPS.map((_, index) => (
              <div
                key={index}
                className={`h-2 flex-1 mx-1 rounded-full ${
                  index <= currentStep ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>

          {/* Step Content */}
          {currentStep === 0 && (
            <div className="text-center space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <Code className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                  <h3 className="font-semibold">AI-Powered</h3>
                  <p className="text-sm text-gray-600">Generate complete apps with AI</p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <Globe className="h-8 w-8 mx-auto mb-2 text-green-600" />
                  <h3 className="font-semibold">Live Preview</h3>
                  <p className="text-sm text-gray-600">See your app running instantly</p>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <Users className="h-8 w-8 mx-auto mb-2 text-purple-600" />
                  <h3 className="font-semibold">Easy to Use</h3>
                  <p className="text-sm text-gray-600">No coding experience needed</p>
                </div>
              </div>
            </div>
          )}

          {currentStep === 1 && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="role">What&apos;s your role?</Label>
                <Input
                  id="role"
                  placeholder="e.g., Developer, Designer, Entrepreneur"
                  value={userInfo.role}
                  onChange={(e) => setUserInfo({...userInfo, role: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="experience">Experience level</Label>
                <div className="flex space-x-2 mt-2">
                  {['Beginner', 'Intermediate', 'Advanced'].map((level) => (
                    <Badge
                      key={level}
                      variant={userInfo.experience === level ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => setUserInfo({...userInfo, experience: level})}
                    >
                      {level}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-4">
              <div>
                <Label>Choose a template to get started</Label>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  {PROJECT_TEMPLATES.map((template) => (
                    <div
                      key={template.id}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        selectedTemplate === template.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setSelectedTemplate(template.id)}
                    >
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="text-2xl">{template.icon}</span>
                        <h3 className="font-semibold">{template.name}</h3>
                      </div>
                      <p className="text-sm text-gray-600">{template.description}</p>
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <Label htmlFor="custom-prompt">Or describe your own project</Label>
                <Textarea
                  id="custom-prompt"
                  placeholder="Describe the app you want to build..."
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="text-center space-y-4">
              <div className="bg-green-50 p-6 rounded-lg">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-600" />
                <h3 className="text-xl font-semibold mb-2">Welcome to Jo Vibes!</h3>
                                 <p className="text-gray-600">
                   You&apos;re all set to start building amazing applications with AI. 
                   Click the button below to go to your dashboard.
                 </p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={handleSkip}
              disabled={currentStep === ONBOARDING_STEPS.length - 1}
            >
              Skip
            </Button>
            
            <Button
              onClick={currentStep === 2 ? handleCreateProject : handleNext}
              disabled={currentStep === 2 && !selectedTemplate && !customPrompt}
            >
              {currentStep === ONBOARDING_STEPS.length - 1 ? 'Go to Dashboard' : 'Next'}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 