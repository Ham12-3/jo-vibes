const sampleNextCode = `import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowRight, Code, Zap } from 'lucide-react'

export default async function AboutPage() {
  const { userId } = await auth()
  
  if (userId) {
    redirect('/dashboard')
  }
  
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-600 text-white">
      <div className="max-w-4xl mx-auto px-4 py-20">
        <h1 className="text-4xl font-bold mb-6">About Us</h1>
        <p className="text-xl mb-8">We are a team of passionate developers.</p>
        <Link href="/contact">
          <Button size="lg" className="bg-white text-blue-600">
            Contact Us
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </Link>
      </div>
    </main>
  )
}`

// Simulate the convertNextJSToReact function
function convertNextJSToReact(nextjsContent) {
  try {
    console.log('🔄 Converting Next.js to React...')
    console.log('📝 Original content preview:', nextjsContent.substring(0, 300) + '...')
    
    let reactContent = nextjsContent

    // Remove Next.js specific imports but keep UI components
    reactContent = reactContent.replace(/import.*?from\s+['"]next\/navigation['"];?\s*/g, '')
    reactContent = reactContent.replace(/import.*?from\s+['"]next\/link['"];?\s*/g, '')
    reactContent = reactContent.replace(/import.*?from\s+['"]next\/image['"];?\s*/g, '')
    reactContent = reactContent.replace(/import.*?from\s+['"]next\/router['"];?\s*/g, '')
    reactContent = reactContent.replace(/import.*?from\s+['"]next\/head['"];?\s*/g, '')
    reactContent = reactContent.replace(/import.*?from\s+['"]@clerk\/nextjs\/server['"];?\s*/g, '')
    
    // Replace Next.js Link with regular anchor tags
    reactContent = reactContent.replace(/<Link\s+href="([^"]+)"[^>]*>/g, '<a href="$1">')
    reactContent = reactContent.replace(/<\/Link>/g, '</a>')
    
    // Replace Next.js Image with regular img tags
    reactContent = reactContent.replace(/<Image\s+src="([^"]+)"[^>]*>/g, '<img src="$1" alt="" />')
    
    // Remove server-side auth and redirects
    reactContent = reactContent.replace(/const\s+\{\s*userId\s*\}\s*=\s*await\s+auth\(\)/g, 'const userId = "demo-user"')
    reactContent = reactContent.replace(/const\s+\{\s*userId\s*\}\s*=\s*auth\(\)/g, 'const userId = "demo-user"')
    reactContent = reactContent.replace(/if\s*\(\s*userId\s*\)\s*\{[^}]*redirect\([^)]*\)[^}]*\}/g, '// auth redirect removed')
    reactContent = reactContent.replace(/redirect\([^)]*\)/g, '// redirect removed')
    
    // Convert function name to App and remove async
    reactContent = reactContent.replace(/export\s+default\s+async\s+function\s+\w+/g, 'function App')
    reactContent = reactContent.replace(/export\s+default\s+function\s+\w+/g, 'function App')
    reactContent = reactContent.replace(/async\s+function\s+App/g, 'function App')
    reactContent = reactContent.replace(/await\s+/g, '')
    
    // Add React import if not present
    if (!reactContent.includes('import React')) {
      reactContent = `import React from 'react';\n\n${reactContent}`
    }
    
    // Replace @/ imports with inline component definitions
    reactContent = reactContent.replace(/import\s+\{[^}]+\}\s+from\s+['"]@\/components\/ui\/button['"];?\s*/g, `
const Button = ({ children, className = '', variant = 'default', size = 'default', ...props }) => (
  <button 
    className={\`px-4 py-2 rounded font-medium transition-colors \${
      variant === 'outline' ? 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50' : 
      variant === 'ghost' ? 'text-gray-700 hover:bg-gray-100' :
      'bg-blue-600 text-white hover:bg-blue-700'
    } \${className}\`}
    {...props}
  >
    {children}
  </button>
);`)
    
    // Remove other @/ imports
    reactContent = reactContent.replace(/import.*?from\s+['"]@\/[^'"]*['"];?\s*/g, '')
    
    // Mock lucide-react icons
    reactContent = reactContent.replace(/import\s+\{[^}]+\}\s+from\s+['"]lucide-react['"];?\s*/g, `
const ArrowRight = ({ className = '', ...props }) => <span className={\`inline-block \${className}\`} {...props}>→</span>;
const Code = ({ className = '', ...props }) => <span className={\`inline-block \${className}\`} {...props}>💻</span>;
const Zap = ({ className = '', ...props }) => <span className={\`inline-block \${className}\`} {...props}>⚡</span>;`)
    
    // Add export default if not present
    if (!reactContent.includes('export default')) {
      reactContent += '\n\nexport default App;'
    }
    
    console.log('✅ Conversion completed')
    console.log('📝 Converted content preview:', reactContent.substring(0, 300) + '...')
    
    return reactContent
  } catch (error) {
    console.error('❌ Error converting Next.js to React:', error)
    return nextjsContent
  }
}

console.log('=== ORIGINAL NEXT.JS CODE ===')
console.log(sampleNextCode)
console.log('\n=== CONVERTED REACT CODE ===')
const converted = convertNextJSToReact(sampleNextCode)
console.log(converted)
console.log('\n=== ANALYSIS ===')
console.log('- React import added:', converted.includes('import React'))
console.log('- Function converted to App:', converted.includes('function App'))
console.log('- No async/await:', !converted.includes('async') && !converted.includes('await'))
console.log('- No Next.js imports:', !converted.includes('next/'))
console.log('- Has export default:', converted.includes('export default'))
console.log('- Button component defined:', converted.includes('const Button'))
console.log('- Icons defined:', converted.includes('const ArrowRight')) 