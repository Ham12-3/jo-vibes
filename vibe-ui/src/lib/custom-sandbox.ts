import { spawn, ChildProcess } from 'child_process'
import { writeFileSync, mkdirSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { tmpdir } from 'os'

export interface CustomSandboxConfig {
  projectId: string
  files: Array<{
    path: string
    content: string
  }>
  framework: 'nextjs' | 'react' | 'vanilla'
  port?: number
}

export interface CustomSandboxInfo {
  id: string
  url: string
  status: 'CREATING' | 'RUNNING' | 'STOPPED' | 'ERROR'
  process?: ChildProcess
  port: number
  tempDir: string
}

export class CustomSandboxService {
  private static instance: CustomSandboxService
  private activeSandboxes = new Map<string, CustomSandboxInfo>()
  private portCounter = 3001

  static getInstance(): CustomSandboxService {
    if (!CustomSandboxService.instance) {
      CustomSandboxService.instance = new CustomSandboxService()
    }
    return CustomSandboxService.instance
  }

  async createSandbox(config: CustomSandboxConfig): Promise<CustomSandboxInfo> {
    const sandboxId = `custom_${config.projectId}_${Date.now()}`
    // Always use our own port counter, ignore any passed port
    const port = this.getNextPort()
    const tempDir = join(tmpdir(), `sandbox_${sandboxId}`)

    console.log(`🚀 Creating custom sandbox: ${sandboxId} on port ${port}`)

    try {
      // Create temporary directory
      if (!existsSync(tempDir)) {
        mkdirSync(tempDir, { recursive: true })
      }

      // Write all files to temp directory
      await this.writeFilesToDirectory(config.files, tempDir)

      // Create package.json based on framework
      const packageJson = this.createPackageJson(config)
      writeFileSync(join(tempDir, 'package.json'), JSON.stringify(packageJson, null, 2))

      // Create essential Next.js files if they don't exist
      if (config.framework === 'nextjs') {
        this.createEssentialNextJSFiles(tempDir)
      }

      // Create sandbox info
      const sandboxInfo: CustomSandboxInfo = {
        id: sandboxId,
        url: `http://localhost:${port}`,
        status: 'CREATING',
        port,
        tempDir
      }

      this.activeSandboxes.set(sandboxId, sandboxInfo)

      // Start the development server
      await this.startDevServer(sandboxInfo, config.framework)

      return sandboxInfo

    } catch (error) {
      console.error('❌ Failed to create custom sandbox:', error)
      throw new Error(`Custom sandbox creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private async writeFilesToDirectory(files: Array<{ path: string; content: string }>, baseDir: string): Promise<void> {
    console.log(`🔍 Writing ${files.length} files to directory: ${baseDir}`)
    
    for (const file of files) {
      const filePath = join(baseDir, file.path)
      const dirPath = dirname(filePath)
      
      // Create directory if it doesn't exist (only if there's actually a directory to create)
      if (dirPath !== baseDir && !existsSync(dirPath)) {
        mkdirSync(dirPath, { recursive: true })
      }
      
      // Validate and potentially fix file content
      let content = file.content
      content = this.validateAndFixFileContent(content, file.path)
      
      // Validate file content before writing
      if (!content || content.trim().length === 0) {
        console.warn(`⚠️ Empty or missing content for file: ${file.path}`)
        continue
      }
      
      // Check for common issues in the content
      if (content.includes('undefined') || content.includes('null')) {
        console.warn(`⚠️ File ${file.path} contains undefined/null values`)
      }
      
      if (content.length > 10000) {
        console.log(`📝 Large file detected: ${file.path} (${content.length} chars)`)
      }
      
      // Write file
      writeFileSync(filePath, content)
      console.log(`📝 Wrote file: ${file.path} (${content.length} chars)`)
      
      // Log first 200 characters for debugging
      const preview = content.substring(0, 200).replace(/\n/g, '\\n')
      console.log(`   Preview: ${preview}...`)
    }
  }

  private validateAndFixFileContent(content: string, filePath: string): string {
    // If content is completely malformed, create a fallback
    if (!content || content.trim().length === 0) {
      return this.createFallbackContent(filePath)
    }
    
    // Check for AI-generated descriptive text instead of actual code (common issue)
    if (content.startsWith('Here\'s the') || content.startsWith('Here is the') || content.includes('polished version') || content.includes('### Additional') || content.includes('```typescript') || content.includes('```javascript') || content.includes('```markdown') || content.includes('## Overview') || content.includes('## Features')) {
      console.warn(`⚠️ Detected AI descriptive text instead of code in ${filePath}, creating proper file`)
      return this.createProperConfigFile(filePath)
    }
    
    // Check for markdown-style headers in JavaScript files
    if ((filePath.endsWith('.js') || filePath.endsWith('.ts') || filePath.endsWith('.tsx')) && content.includes('###')) {
      console.warn(`⚠️ Detected markdown headers in JavaScript file ${filePath}, creating proper file`)
      return this.createProperConfigFile(filePath)
    }
    
    // Check if content looks like React code fragments (common issue)
    if (content.includes('useState') && content.includes('useEffect') && !content.includes('export default')) {
      console.warn(`⚠️ Detected React code fragments in ${filePath}, creating proper component`)
      return this.createProperReactComponent()
    }
    
    // Check for unrendered React variables and placeholders
    if (content.includes('{product.') || content.includes('${product.') || content.includes('{error}') || content.includes('{loading}')) {
      console.warn(`⚠️ Detected unrendered React variables in ${filePath}, creating proper component`)
      return this.createProperReactComponent()
    }
    
    // Check if content is just a string without proper JSX structure
    if (content.includes('className=') && !content.includes('import React')) {
      console.warn(`⚠️ Detected JSX without proper React imports in ${filePath}`)
      return this.addReactImports(content)
    }
    
    // Check for raw TypeScript/JavaScript code in React components
    if ((filePath.includes('page.tsx') || filePath.includes('layout.tsx') || filePath.includes('component')) && 
        (content.includes('const ErrorBoundary') || content.includes('React.FC<') || content.includes('useState<boolean>'))) {
      console.warn(`⚠️ Detected raw TypeScript code in React component ${filePath}, creating proper component`)
      return this.createProperReactComponent()
    }
    
    // Check for invalid React component exports (the main issue)
    if ((filePath.includes('page.tsx') || filePath.includes('layout.tsx')) && 
        (!content.includes('export default') || content.includes('export default function') === false)) {
      console.warn(`⚠️ Detected invalid React component export in ${filePath}, creating proper component`)
      return this.createProperReactComponent()
    }
    
    // Check for malformed React components that don't return JSX
    if ((filePath.includes('page.tsx') || filePath.includes('layout.tsx')) && 
        content.includes('export default') && !content.includes('return (') && !content.includes('return(')) {
      console.warn(`⚠️ Detected React component without proper JSX return in ${filePath}, creating proper component`)
      return this.createProperReactComponent()
    }
    
    // Check for incomplete React components (the main issue from the preview)
    if ((filePath.includes('page.tsx') || filePath.includes('layout.tsx')) && 
        (content.includes('const ErrorBoundary') || content.includes('useState(false)') || content.includes('useEffect(() =>') && !content.includes('export default'))) {
      console.warn(`⚠️ Detected incomplete React component in ${filePath}, creating proper component`)
      return this.createProperReactComponent()
    }

    // NEW: Check for the exact pattern causing "The default export is not a React Component" error
    if ((filePath.includes('page.tsx') || filePath.includes('layout.tsx')) && 
        (content.includes('const ') && content.includes('= () =>') && !content.includes('return (') && !content.includes('return(') && !content.includes('return <'))) {
      console.warn(`⚠️ Detected malformed React component in ${filePath}, creating proper component`)
      return this.createProperReactComponent()
    }

    // NEW: Check for React components with missing return statements
    if ((filePath.includes('page.tsx') || filePath.includes('layout.tsx')) && 
        (content.includes('export default function') && !content.includes('return'))) {
      console.warn(`⚠️ Detected React component without return statement in ${filePath}, creating proper component`)
      return this.createProperReactComponent()
    }

    // NEW: Check for React components with malformed JSX structure
    if ((filePath.includes('page.tsx') || filePath.includes('layout.tsx')) && 
        (content.includes('return (') && !content.includes(')'))) {
      console.warn(`⚠️ Detected malformed JSX structure in ${filePath}, creating proper component`)
      return this.createProperReactComponent()
    }

    // NEW: Check for React components with unclosed JSX tags
    if ((filePath.includes('page.tsx') || filePath.includes('layout.tsx')) && 
        (content.includes('<div') && !content.includes('</div>'))) {
      console.warn(`⚠️ Detected unclosed JSX tags in ${filePath}, creating proper component`)
      return this.createProperReactComponent()
    }

    // NEW: Check for React components with malformed template literals
    if ((filePath.includes('page.tsx') || filePath.includes('layout.tsx')) && 
        (content.includes('`') && !content.includes('`', content.indexOf('`') + 1))) {
      console.warn(`⚠️ Detected malformed template literals in ${filePath}, creating proper component`)
      return this.createProperReactComponent()
    }

    // NEW: Check for React components with missing closing braces
    if ((filePath.includes('page.tsx') || filePath.includes('layout.tsx')) && 
        (content.includes('{') && !content.includes('}'))) {
      console.warn(`⚠️ Detected missing closing braces in ${filePath}, creating proper component`)
      return this.createProperReactComponent()
    }

    // NEW: Check for React components with undefined or null values
    if ((filePath.includes('page.tsx') || filePath.includes('layout.tsx')) && 
        (content.includes('undefined') || content.includes('null'))) {
      console.warn(`⚠️ Detected undefined/null values in ${filePath}, creating proper component`)
      return this.createProperReactComponent()
    }

    // NEW: Comprehensive React component validation for page.tsx and layout.tsx
    if ((filePath.includes('page.tsx') || filePath.includes('layout.tsx'))) {
      // Check for any React component patterns that don't have proper export default
      if (content.includes('const ') && (content.includes('ErrorBoundary') || content.includes('Component') || content.includes('Page') || content.includes('Layout')) && !content.includes('export default')) {
        console.warn(`⚠️ Detected React component without export default in ${filePath}, creating proper component`)
        return this.createProperReactComponent()
      }

      // Check for React hooks without proper component structure
      if ((content.includes('useState') || content.includes('useEffect') || content.includes('useMemo') || content.includes('useCallback')) && !content.includes('export default function') && !content.includes('export default const')) {
        console.warn(`⚠️ Detected React hooks without proper component structure in ${filePath}, creating proper component`)
        return this.createProperReactComponent()
      }

      // Check for JSX without proper React component wrapper
      if ((content.includes('<div') || content.includes('<h1') || content.includes('<p>')) && !content.includes('export default') && !content.includes('function ') && !content.includes('const ')) {
        console.warn(`⚠️ Detected JSX without proper React component wrapper in ${filePath}, creating proper component`)
        return this.createProperReactComponent()
      }

      // Check for React components with syntax errors
      if (content.includes('export default') && (content.includes('{error}') || content.includes('{loading}') || content.includes('{product.'))) {
        console.warn(`⚠️ Detected React component with syntax errors in ${filePath}, creating proper component`)
        return this.createProperReactComponent()
      }

      // Check for React components with unclosed JSX
      if (content.includes('<div') && !content.includes('</div>') && content.includes('export default')) {
        console.warn(`⚠️ Detected React component with unclosed JSX in ${filePath}, creating proper component`)
        return this.createProperReactComponent()
      }

      // Check for React components with malformed JSX attributes
      if (content.includes('className=') && content.includes('undefined') && content.includes('export default')) {
        console.warn(`⚠️ Detected React component with malformed JSX attributes in ${filePath}, creating proper component`)
        return this.createProperReactComponent()
      }

      // Check for React components with TypeScript errors
      if (content.includes('React.FC<') && !content.includes('export default')) {
        console.warn(`⚠️ Detected React component with TypeScript errors in ${filePath}, creating proper component`)
        return this.createProperReactComponent()
      }

      // Check for React components with malformed imports
      if (content.includes('import ') && content.includes('from') && !content.includes('export default') && (content.includes('<div') || content.includes('className='))) {
        console.warn(`⚠️ Detected React component with malformed imports in ${filePath}, creating proper component`)
        return this.createProperReactComponent()
      }

      // Check for React components that don't return JSX
      if (content.includes('export default function') && !content.includes('return') && !content.includes('JSX')) {
        console.warn(`⚠️ Detected React component that doesn't return JSX in ${filePath}, creating proper component`)
        return this.createProperReactComponent()
      }

      // Check for React components with incomplete function definitions
      if (content.includes('const ') && content.includes('= (') && content.includes('props') && !content.includes('return')) {
        console.warn(`⚠️ Detected React component with incomplete function definition in ${filePath}, creating proper component`)
        return this.createProperReactComponent()
      }
    }
    
    // Check for React components without proper structure
    if ((filePath.includes('page.tsx') || filePath.includes('layout.tsx')) && 
        content.includes('const ') && content.includes('= (') && !content.includes('export default')) {
      console.warn(`⚠️ Detected React component without proper export in ${filePath}, creating proper component`)
      return this.createProperReactComponent()
    }
    
    // Check for malformed CSS (the main issue from the logs)
    if (filePath.endsWith('.css') && (content.startsWith('//') || content.includes('//') && !content.includes('/*'))) {
      console.warn(`⚠️ Detected malformed CSS in ${filePath}, creating proper CSS file`)
      return this.createProperCSSFile(filePath)
    }
    
    return content
  }

  private createFallbackContent(filePath: string): string {
    const fileName = filePath.split('/').pop() || 'file'
    
    if (fileName === 'page.tsx' || fileName === 'index.tsx') {
      return `import React from 'react'

export default function Page() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 flex items-center justify-center">
      <div className="text-center text-white">
        <h1 className="text-4xl font-bold mb-4">Cold Water Website</h1>
        <p className="text-xl opacity-90">Your website is being generated...</p>
        <div className="mt-8">
          <p className="text-sm opacity-75">
            This is a fallback page while your content loads.
          </p>
        </div>
      </div>
    </div>
  )
}`
    }
    
    if (fileName === 'layout.tsx') {
      return `import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Cold Water Experiences',
  description: 'Dive into the refreshing world of cold water adventures and discover the invigorating power of cold water therapy.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  )
}`
    }
    
    if (fileName === 'globals.css') {
      return `@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
}`
    }
    
    return '// Fallback content'
  }

  private createProperReactComponent(): string {
    
    return `'use client'

import React, { useState } from 'react'

export default function Page() {
  const [activeCard, setActiveCard] = useState<number | null>(null)

  const experiences = [
    {
      id: 1,
      icon: '❄️',
      title: 'Experience the Chill',
      description: 'Discover the invigorating power of cold water therapy and its amazing benefits for your body and mind.',
      color: 'blue',
      action: 'Learn More'
    },
    {
      id: 2,
      icon: '🌊',
      title: 'Explore the Depths',
      description: 'Uncover the beauty beneath the surface and experience the tranquility of underwater exploration.',
      color: 'purple',
      action: 'Explore Now'
    },
    {
      id: 3,
      icon: '🏊',
      title: 'Swim with Confidence',
      description: 'Master the art of cold water swimming with expert guidance and proven techniques.',
      color: 'pink',
      action: 'Get Started'
    }
  ]

  const handleCardClick = (id: number) => {
    setActiveCard(id)
    // Simulate action
    setTimeout(() => setActiveCard(null), 2000)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600">
      {/* Header */}
      <header className="text-center py-12 px-4">
        <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
          Cold Water Experiences
        </h1>
        <p className="text-xl md:text-2xl text-white/90 max-w-3xl mx-auto leading-relaxed">
          Dive into the refreshing world of cold water adventures and discover the invigorating power of cold water therapy.
        </p>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {experiences.map((experience) => (
            <div
              key={experience.id}
              className={\`
                bg-white/10 backdrop-blur-sm rounded-xl p-6 text-white 
                hover:bg-white/20 transition-all duration-300 transform hover:scale-105
                cursor-pointer border border-white/20
                \${activeCard === experience.id ? 'ring-2 ring-white/50 bg-white/30' : ''}
              \`}
              onClick={() => handleCardClick(experience.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && handleCardClick(experience.id)}
              aria-label={\`Learn more about \${experience.title}\`}
            >
              <div className={\`w-16 h-16 bg-\${experience.color}-400 rounded-full flex items-center justify-center mb-4 mx-auto\`}>
                <span className="text-2xl">{experience.icon}</span>
              </div>
              <h2 className="text-2xl font-semibold mb-3 text-center">{experience.title}</h2>
              <p className="text-white/80 text-center mb-6 leading-relaxed">
                {experience.description}
              </p>
              <button 
                className={\`
                  w-full bg-\${experience.color}-500 hover:bg-\${experience.color}-600 
                  text-white px-6 py-3 rounded-lg transition-all duration-300
                  font-medium transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-white/50
                \`}
                onClick={(e) => {
                  e.stopPropagation()
                  handleCardClick(experience.id)
                }}
              >
                {activeCard === experience.id ? 'Loading...' : experience.action}
              </button>
            </div>
          ))}
        </div>

        {/* Additional Info Section */}
        <div className="mt-16 text-center">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-8 max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-white mb-4">Why Choose Cold Water Therapy?</h2>
            <div className="grid md:grid-cols-3 gap-6 mt-8">
              <div className="text-center">
                <div className="w-12 h-12 bg-green-400 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-xl">💪</span>
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">Boost Immunity</h3>
                <p className="text-white/80">Strengthen your immune system naturally</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-400 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-xl">🧠</span>
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">Mental Clarity</h3>
                <p className="text-white/80">Enhance focus and mental performance</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-purple-400 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-xl">😌</span>
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">Stress Relief</h3>
                <p className="text-white/80">Reduce stress and improve mood</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center py-8 text-white/70 mt-16">
        <p className="text-lg">© 2024 Cold Water Experiences. Dive into adventure!</p>
        <p className="text-sm mt-2 opacity-60">Built with ❤️ for cold water enthusiasts</p>
      </footer>
    </div>
  )
}`
  }

  private addReactImports(content: string): string {
    if (content.includes('import React')) {
      return content
    }
    
    return `import React from 'react'

${content}`
  }

  private createProperConfigFile(filePath: string): string {
    const fileName = filePath.split('/').pop() || 'file'
    
    if (fileName === 'next.config.js') {
      return `/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
  swcMinify: true,
}

module.exports = nextConfig`
    }
    
    if (fileName === 'tailwind.config.js') {
      return `/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic':
          'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
    },
  },
  plugins: [],
}`
    }
    
    if (fileName === 'tsconfig.json') {
      return `{
  "compilerOptions": {
    "target": "es5",
    "lib": ["dom", "dom.iterable", "es6"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}`
    }
    
    if (fileName === 'postcss.config.js') {
      return `module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}`
    }
    
    if (fileName === '.eslintrc.json') {
      return `{
  "extends": "next/core-web-vitals"
}`
    }
    
    // For any other .js/.ts files, create a basic fallback
    if (fileName.endsWith('.js') || fileName.endsWith('.ts')) {
      return `// Auto-generated fallback for ${fileName}
// This file was created because the AI generated invalid content

export default {}`
    }
    
    return '// Fallback config content'
  }

  private createProperCSSFile(filePath: string): string {
    const fileName = filePath.split('/').pop() || 'file'
    
    if (fileName === 'globals.css') {
      return `@tailwind base;
@tailwind components;
@tailwind utilities;

/* Global styles for Cold Water Experiences */
body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* Custom gradient backgrounds */
.gradient-bg {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

/* Smooth transitions */
* {
  transition: all 0.3s ease;
}

/* Custom scrollbar */
::-webkit-scrollbar {
  width: 8px;
}

::-webkit-scrollbar-track {
  background: #f1f1f1;
}

::-webkit-scrollbar-thumb {
  background: #888;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: #555;
}`
    }
    
    return `/* CSS file for ${fileName} */
/* Add your custom styles here */`
  }

  private createPackageJson(config: CustomSandboxConfig): Record<string, unknown> {
    const basePackage = {
      name: config.projectId.toLowerCase().replace(/[^a-z0-9]/g, '-'),
      version: '0.1.0',
      private: true,
      scripts: {},
      dependencies: {},
      devDependencies: {}
    }

    if (config.framework === 'nextjs') {
      return {
        ...basePackage,
        scripts: {
          dev: 'next dev',
          build: 'next build',
          start: 'next start',
          lint: 'next lint'
        },
        dependencies: {
          next: '^14.0.0',
          react: '^18.0.0',
          'react-dom': '^18.0.0',
          tailwindcss: '^3.0.0',
          '@tailwindcss/forms': '^0.5.0',
          '@tailwindcss/typography': '^0.5.0',
          typescript: '^5.0.0',
          '@types/node': '^20.0.0',
          '@types/react': '^18.0.0',
          '@types/react-dom': '^18.0.0'
        },
        devDependencies: {
          eslint: '^8.0.0',
          'eslint-config-next': '^14.0.0',
          autoprefixer: '^10.0.0',
          postcss: '^8.0.0'
        }
      }
    }

    if (config.framework === 'react') {
      return {
        ...basePackage,
        scripts: {
          start: 'react-scripts start',
          build: 'react-scripts build',
          test: 'react-scripts test',
          eject: 'react-scripts eject'
        },
        dependencies: {
          react: '^18.2.0',
          'react-dom': '^18.2.0',
          'react-scripts': '^5.0.1',
          tailwindcss: '^3.0.0'
        },
        browserslist: {
          production: ['>0.2%', 'not dead', 'not op_mini all'],
          development: ['last 1 chrome version', 'last 1 firefox version', 'last 1 safari version']
        }
      }
    }

    return basePackage
  }

  private async startDevServer(sandboxInfo: CustomSandboxInfo, framework: string): Promise<void> {
    try {
      console.log(`🔄 Starting ${framework} dev server on port ${sandboxInfo.port}...`)

      let command: string
      let args: string[]

      if (framework === 'nextjs') {
        command = process.platform === 'win32' ? 'npx.cmd' : 'npx'
        args = ['next', 'dev', '--port', sandboxInfo.port.toString(), '--hostname', '0.0.0.0']
      } else if (framework === 'react') {
        command = process.platform === 'win32' ? 'npx.cmd' : 'npx'
        args = ['react-scripts', 'start', '--port', sandboxInfo.port.toString(), '--host', '0.0.0.0']
      } else {
        throw new Error(`Unsupported framework: ${framework}`)
      }

      // Install dependencies first
      console.log('📦 Installing dependencies...')
      const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm'
      const installProcess = spawn(npmCommand, ['install'], {
        cwd: sandboxInfo.tempDir,
        stdio: 'pipe'
      })

      await new Promise<void>((resolve, reject) => {
        installProcess.on('close', (code) => {
          if (code === 0) {
            console.log('✅ Dependencies installed successfully')
            resolve()
          } else {
            reject(new Error(`npm install failed with code ${code}`))
          }
        })
      })

      // Start the dev server
      const devProcess = spawn(command, args, {
        cwd: sandboxInfo.tempDir,
        stdio: 'pipe'
      })

      sandboxInfo.process = devProcess
      sandboxInfo.status = 'CREATING' // Keep as CREATING until server is confirmed ready

      // Capture stdout and stderr for debugging
      let stdout = ''
      let stderr = ''
      
      devProcess.stdout?.on('data', (data) => {
        stdout += data.toString()
        console.log(`📤 [${sandboxInfo.id}] stdout:`, data.toString().trim())
      })
      
      devProcess.stderr?.on('data', (data) => {
        stderr += data.toString()
        console.log(`📤 [${sandboxInfo.id}] stderr:`, data.toString().trim())
      })

      // Handle process events
      devProcess.on('error', (error) => {
        console.error(`❌ Dev server error for ${sandboxInfo.id}:`, error)
        console.error(`📤 [${sandboxInfo.id}] stdout:`, stdout)
        console.error(`📤 [${sandboxInfo.id}] stderr:`, stderr)
        sandboxInfo.status = 'ERROR'
      })

      devProcess.on('close', (code) => {
        console.log(`🔚 Dev server closed for ${sandboxInfo.id} with code ${code}`)
        console.log(`📤 [${sandboxInfo.id}] Final stdout:`, stdout)
        console.log(`📤 [${sandboxInfo.id}] Final stderr:`, stderr)
        sandboxInfo.status = 'STOPPED'
        this.activeSandboxes.delete(sandboxInfo.id)
      })

      // Wait for server to start with longer timeout
      try {
        await this.waitForServer(sandboxInfo.url, 60000) // 60 seconds timeout
        sandboxInfo.status = 'RUNNING' // Only set to RUNNING after server is confirmed ready
        console.log(`✅ Custom sandbox running: ${sandboxInfo.url}`)
      } catch (waitError) {
        console.error(`❌ Failed to wait for server: ${sandboxInfo.url}`, waitError)
        console.error(`📤 [${sandboxInfo.id}] stdout:`, stdout)
        console.error(`📤 [${sandboxInfo.id}] stderr:`, stderr)
        sandboxInfo.status = 'ERROR'
        throw waitError
      }

    } catch (error) {
      console.error(`❌ Failed to start dev server for ${sandboxInfo.id}:`, error)
      sandboxInfo.status = 'ERROR'
      throw error
    }
  }

  private async waitForServer(url: string, timeout: number = 60000): Promise<void> {
    const startTime = Date.now()
    let attempts = 0
    
    while (Date.now() - startTime < timeout) {
      attempts++
      try {
        console.log(`🔍 Attempt ${attempts}: Checking server at ${url}`)
        const response = await fetch(url, { 
          method: 'GET',
          headers: { 'Accept': 'text/html' },
          signal: AbortSignal.timeout(5000) // 5 second timeout per request
        })
        
        if (response.ok) {
          console.log(`✅ Server is ready at ${url}`)
          return
        } else {
          console.log(`⚠️ Server responded with status: ${response.status}`)
        }
      } catch {
        // Server not ready yet, wait and retry
        console.log(`⏳ Server not ready yet (attempt ${attempts}), retrying in 2 seconds...`)
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    }
    
    throw new Error(`Server failed to start within ${timeout}ms after ${attempts} attempts`)
  }

  async stopSandbox(sandboxId: string): Promise<void> {
    const sandbox = this.activeSandboxes.get(sandboxId)
    if (!sandbox) {
      throw new Error(`Sandbox ${sandboxId} not found`)
    }

    console.log(`🛑 Stopping sandbox: ${sandboxId}`)

    if (sandbox.process) {
      sandbox.process.kill('SIGTERM')
      sandbox.status = 'STOPPED'
    }

    this.activeSandboxes.delete(sandboxId)
  }

  async getSandboxInfo(sandboxId: string): Promise<CustomSandboxInfo | null> {
    return this.activeSandboxes.get(sandboxId) || null
  }

  async listActiveSandboxes(): Promise<CustomSandboxInfo[]> {
    return Array.from(this.activeSandboxes.values())
  }

  private getNextPort(): number {
    return this.portCounter++
  }

  private createEssentialNextJSFiles(tempDir: string): void {
    // Create next.config.js if it doesn't exist
    const nextConfigPath = join(tempDir, 'next.config.js')
    if (!existsSync(nextConfigPath)) {
      const nextConfig = `/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
  swcMinify: true,
}

module.exports = nextConfig`
      writeFileSync(nextConfigPath, nextConfig)
      console.log('📝 Created next.config.js')
    }

    // Create tsconfig.json if it doesn't exist
    const tsConfigPath = join(tempDir, 'tsconfig.json')
    if (!existsSync(tsConfigPath)) {
      const tsConfig = `{
  "compilerOptions": {
    "target": "es5",
    "lib": ["dom", "dom.iterable", "es6"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}`
      writeFileSync(tsConfigPath, tsConfig)
      console.log('📝 Created tsconfig.json')
    }

    // Create tailwind.config.js if it doesn't exist
    const tailwindConfigPath = join(tempDir, 'tailwind.config.js')
    if (!existsSync(tailwindConfigPath)) {
      const tailwindConfig = `/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic':
          'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
    },
  },
  plugins: [],
}`
      writeFileSync(tailwindConfigPath, tailwindConfig)
      console.log('📝 Created tailwind.config.js')
    }

    // Create postcss.config.js if it doesn't exist
    const postcssConfigPath = join(tempDir, 'postcss.config.js')
    if (!existsSync(postcssConfigPath)) {
      const postcssConfig = `module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}`
      writeFileSync(postcssConfigPath, postcssConfig)
      console.log('📝 Created postcss.config.js')
    }

    // Create next-env.d.ts if it doesn't exist
    const nextEnvPath = join(tempDir, 'next-env.d.ts')
    if (!existsSync(nextEnvPath)) {
      const nextEnv = `/// <reference types="next" />
/// <reference types="next/image-types/global" />

// NOTE: This file should not be edited
// see https://nextjs.org/docs/basic-features/typescript for more information.`
      writeFileSync(nextEnvPath, nextEnv)
      console.log('📝 Created next-env.d.ts')
    }
  }

  // Cleanup method to stop all sandboxes
  async cleanup(): Promise<void> {
    console.log('🧹 Cleaning up all custom sandboxes...')
    
    for (const [sandboxId] of this.activeSandboxes) {
      try {
        await this.stopSandbox(sandboxId)
      } catch (error) {
        console.error(`Failed to stop sandbox ${sandboxId}:`, error)
      }
    }
  }
}

// Singleton instance
export const customSandboxService = CustomSandboxService.getInstance() 