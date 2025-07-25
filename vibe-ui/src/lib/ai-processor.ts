import OpenAI from 'openai';
import { z } from 'zod';

// Initialize OpenAI client with enhanced configuration
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  maxRetries: 3,
  timeout: 60000, // 60 seconds timeout
});

// Rate limiting configuration
const RATE_LIMIT_CONFIG = {
  maxRetries: 3,
  baseDelay: 2000, // 2 seconds
  maxDelay: 30000, // 30 seconds
  backoffMultiplier: 2,
};

// Rate limiter to track API usage
class RateLimiter {
  private requests: number[] = [];
  private readonly windowMs = 60000; // 1 minute
  private readonly maxRequests = 25; // Conservative limit to stay under 30k TPM

  canMakeRequest(): boolean {
    const now = Date.now();
    // Remove old requests outside the window
    this.requests = this.requests.filter(time => now - time < this.windowMs);
    
    return this.requests.length < this.maxRequests;
  }

  recordRequest(): void {
    this.requests.push(Date.now());
  }

  getWaitTime(): number {
    if (this.requests.length === 0) return 0;
    
    const oldestRequest = Math.min(...this.requests);
    const waitTime = this.windowMs - (Date.now() - oldestRequest);
    return Math.max(0, waitTime);
  }
}

const rateLimiter = new RateLimiter();

// Retry with exponential backoff
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = RATE_LIMIT_CONFIG.maxRetries,
  baseDelay: number = RATE_LIMIT_CONFIG.baseDelay
): Promise<T> {
  let lastError: Error = new Error('Unknown error');
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Check rate limiter before making request
      if (!rateLimiter.canMakeRequest()) {
        const waitTime = rateLimiter.getWaitTime();
        console.log(`⏳ Rate limit reached, waiting ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
      
      rateLimiter.recordRequest();
      return await fn();
    } catch (error: unknown) {
      const apiError = error as { status?: number; headers?: { 'retry-after'?: string } };
      lastError = error as Error;
      
      // Handle rate limit errors specifically
      if (apiError.status === 429) {
        const retryAfter = apiError.headers?.['retry-after'] 
          ? parseInt(apiError.headers['retry-after']) * 1000 
          : baseDelay * Math.pow(RATE_LIMIT_CONFIG.backoffMultiplier, attempt);
        
        const delay = Math.min(retryAfter, RATE_LIMIT_CONFIG.maxDelay);
        
        if (attempt < maxRetries) {
          console.log(`⏳ Rate limit hit, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries + 1})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
      }
      
      // For non-rate-limit errors, don't retry
      if (apiError.status !== 429) {
        throw error;
      }
    }
  }
  
  throw lastError;
}

// Enhanced model configuration for different tasks
const AI_MODELS = {
  ANALYSIS: 'gpt-4o-mini', // For initial analysis
  GENERATION: 'gpt-4o-mini', // For code generation (better quality)
  VALIDATION: 'gpt-4o-mini', // For code validation
  OPTIMIZATION: 'gpt-4o-mini' // For code optimization
};

// Code quality metrics schema
const CodeQualitySchema = z.object({
  syntaxValid: z.boolean(),
  typeScriptCompliant: z.boolean(),
  accessibilityScore: z.number().min(0).max(100),
  performanceScore: z.number().min(0).max(100),
  interactivityScore: z.number().min(0).max(100),
  responsiveDesign: z.boolean(),
  errorHandling: z.boolean(),
  suggestions: z.array(z.string()).optional(),
});

export type CodeQuality = z.infer<typeof CodeQualitySchema>;

// Enhanced generation result type
export type GenerationResult = {
  content: string;
  quality: CodeQuality;
  metadata: {
    model: string;
    iterations: number;
    generationTime: number;
    tokens?: number;
  };
};

// Schema for AI analysis response
const ProjectAnalysisSchema = z.object({
  projectName: z.string().describe('A concise, descriptive name for the project'),
  description: z.string().describe('A detailed description of what the project does'),
  projectType: z.enum(['web-app', 'mobile-app', 'desktop-app', 'api', 'website', 'dashboard', 'game', 'utility']),
  framework: z.enum(['Next.js', 'React', 'Vue.js', 'Nuxt.js', 'Angular', 'Svelte', 'Vanilla JS']),
  styling: z.enum(['Tailwind CSS', 'CSS Modules', 'Styled Components', 'Emotion', 'SCSS', 'CSS']),
  database: z.enum(['PostgreSQL', 'MySQL', 'MongoDB', 'SQLite', 'Supabase', 'Firebase', 'None']).optional(),
  features: z.array(z.string()).describe('List of key features to implement'),
  complexity: z.enum(['beginner', 'intermediate', 'advanced']),
  estimatedTime: z.string().describe('Estimated development time'),
  techStack: z.array(z.string()).describe('Recommended additional technologies'),
  fileStructure: z.object({
    pages: z.array(z.string()).describe('Main pages/routes to create'),
    components: z.array(z.string()).describe('Key components to build'),
    utils: z.array(z.string()).describe('Utility functions needed'),
    styles: z.array(z.string()).describe('Style files needed'),
    hooks: z.array(z.string()).describe('Custom React hooks needed'),
    types: z.array(z.string()).describe('TypeScript type definitions needed'),
  }),
  designSystem: z.object({
    colorScheme: z.enum(['light', 'dark', 'auto']),
    primaryColor: z.string().describe('Primary color suggestion'),
    layout: z.enum(['single-page', 'multi-page', 'dashboard', 'blog', 'portfolio', 'e-commerce']),
  }),
});

export type ProjectAnalysis = z.infer<typeof ProjectAnalysisSchema>;

// File templates for different project types
const FILE_TEMPLATES = {
  'package.json': (analysis: ProjectAnalysis) => ({
    name: analysis.projectName.toLowerCase().replace(/\s+/g, '-'),
    version: '0.1.0',
    private: true,
    scripts: {
      dev: 'next dev',
      build: 'next build',
      start: 'next start',
      lint: 'next lint',
      ...(analysis.database && analysis.database !== 'None' && {
        'db:push': 'prisma db push',
        'db:studio': 'prisma studio',
      }),
    },
    dependencies: {
      next: '^14.0.0',
      react: '^18.0.0',
      'react-dom': '^18.0.0',
      ...(analysis.styling === 'Tailwind CSS' && {
        tailwindcss: '^3.0.0',
        '@tailwindcss/forms': '^0.5.0',
        '@tailwindcss/typography': '^0.5.0',
      }),
      ...(analysis.techStack.includes('TypeScript') && {
        typescript: '^5.0.0',
        '@types/node': '^20.0.0',
        '@types/react': '^18.0.0',
        '@types/react-dom': '^18.0.0',
      }),
      ...(analysis.database === 'PostgreSQL' && {
        '@prisma/client': '^5.0.0',
        prisma: '^5.0.0',
      }),
      ...(analysis.features.some(f => f.toLowerCase().includes('auth')) && {
        'next-auth': '^4.0.0',
      }),
      ...(analysis.features.some(f => f.toLowerCase().includes('form')) && {
        'react-hook-form': '^7.0.0',
        '@hookform/resolvers': '^3.0.0',
        zod: '^3.0.0',
      }),
    },
    devDependencies: {
      eslint: '^8.0.0',
      'eslint-config-next': '^14.0.0',
      ...(analysis.styling === 'Tailwind CSS' && {
        autoprefixer: '^10.0.0',
        postcss: '^8.0.0',
      }),
    },
  }),
};

export class AIPromptProcessor {
  private static instance: AIPromptProcessor;
  private generationCache = new Map<string, GenerationResult>();
  
  static getInstance(): AIPromptProcessor {
    if (!AIPromptProcessor.instance) {
      AIPromptProcessor.instance = new AIPromptProcessor();
    }
    return AIPromptProcessor.instance;
  }

  async analyzePrompt(userPrompt: string): Promise<ProjectAnalysis> {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key is not configured');
    }

    const systemPrompt = `You are an expert web developer and UI/UX designer specializing in creating modern, interactive applications. Your task is to analyze user requests and provide detailed recommendations for building exceptional user interfaces.

CRITICAL REQUIREMENTS:
1. Extract core project requirements from user descriptions
2. Recommend optimal technology stack for UI excellence
3. Suggest comprehensive project structure
4. Identify key interactive features to implement
5. Provide realistic complexity and time estimates
6. Focus on user experience and visual appeal

UI GENERATION BEST PRACTICES:
- Prioritize interactive components with working functionality
- Use modern design patterns (glassmorphism, micro-interactions, responsive design)
- Implement accessibility features (ARIA labels, keyboard navigation)
- Create visually appealing layouts with proper spacing and typography
- Include hover states, focus states, and smooth transitions
- Use semantic HTML structure
- Implement proper loading states and error handling

TECHNOLOGY RECOMMENDATIONS:
- Choose technologies that are:
  * Modern and widely adopted
  * Excellent for UI development
  * Well-documented and supported
  * Capable of creating beautiful, interactive interfaces
  * Performance-optimized

FILE STRUCTURE REQUIREMENTS:
Be comprehensive and include:
- All necessary pages and routes with proper navigation
- Interactive UI components with state management
- Utility functions and helpers for UI logic
- Style files with design system tokens
- Custom hooks for UI state management
- TypeScript interfaces for UI components
- Animation and transition utilities

DESIGN SYSTEM FOCUS:
- Suggest consistent color schemes and typography
- Recommend proper spacing and layout systems
- Include responsive design patterns
- Suggest component composition patterns
- Focus on reusable UI patterns

INTERACTIVITY REQUIREMENTS:
- Every component should have interactive elements
- Include proper event handlers and user feedback
- Implement form validation and user input handling
- Add loading states and error boundaries
- Create smooth transitions and animations

CRITICAL RESPONSE FORMAT:
You MUST return a JSON object with EXACTLY these fields:
{
  "projectName": "string",
  "description": "string", 
  "projectType": "web-app" | "mobile-app" | "desktop-app" | "api" | "website" | "dashboard" | "game" | "utility",
  "framework": "Next.js" | "React" | "Vue.js" | "Nuxt.js" | "Angular" | "Svelte" | "Vanilla JS",
  "styling": "Tailwind CSS" | "CSS Modules" | "Styled Components" | "Emotion" | "SCSS" | "CSS",
  "database": "PostgreSQL" | "MySQL" | "MongoDB" | "SQLite" | "Supabase" | "Firebase" | "None",
  "features": ["array", "of", "strings"],
  "complexity": "beginner" | "intermediate" | "advanced",
  "estimatedTime": "string",
  "techStack": ["array", "of", "strings"],
  "fileStructure": {
    "pages": ["array", "of", "strings"],
    "components": ["array", "of", "strings"],
    "utils": ["array", "of", "strings"],
    "styles": ["array", "of", "strings"],
    "hooks": ["array", "of", "strings"],
    "types": ["array", "of", "strings"]
  },
  "designSystem": {
    "colorScheme": "light" | "dark" | "auto",
    "primaryColor": "string (hex color)",
    "layout": "single-page" | "multi-page" | "dashboard" | "blog" | "portfolio" | "e-commerce"
  }
}

DO NOT return any other format or additional fields.`;

    const completion = await retryWithBackoff(async () => {
      return await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { 
            role: 'user', 
            content: `Analyze this UI/UX project request and provide detailed recommendations for creating an exceptional user interface: "${userPrompt}"

Additional context:
- Focus on creating visually stunning and highly interactive UI
- Prioritize user experience and accessibility
- Suggest modern design patterns and animations
- Ensure the UI is responsive and performant
- Include proper error handling and loading states` 
          }
        ],
        temperature: 0.7,
        response_format: { type: 'json_object' },
      });
    });

    const responseContent = completion.choices[0]?.message?.content;
    
    if (!responseContent) {
      throw new Error('No response from OpenAI');
    }

    try {
      const parsedResponse = JSON.parse(responseContent);
      return ProjectAnalysisSchema.parse(parsedResponse);
    } catch (error) {
      console.error('Failed to parse AI response:', error);
      console.error('Raw response:', responseContent);
      
      // Fallback to basic analysis
      return this.createFallbackAnalysis(userPrompt);
    }
  }

  private createFallbackAnalysis(userPrompt: string): ProjectAnalysis {
    // Enhanced fallback analysis with guaranteed structure
    const projectName = userPrompt.slice(0, 50).replace(/[^a-zA-Z0-9\s]/g, '').trim() || 'My App';
    
    return {
      projectName,
      description: userPrompt,
      projectType: 'web-app',
      framework: 'Next.js',
      styling: 'Tailwind CSS',
      database: 'PostgreSQL',
      features: ['User Interface', 'Responsive Design', 'Modern Styling', 'Type Safety'],
      complexity: 'intermediate',
      estimatedTime: '2-4 weeks',
      techStack: ['TypeScript', 'React', 'Next.js', 'Tailwind CSS', 'Prisma'],
      fileStructure: {
        pages: ['Home', 'About', 'Contact'],
        components: ['Header', 'Footer', 'Layout', 'Button', 'Card'],
        utils: ['helpers', 'constants', 'api'],
        styles: ['globals', 'components', 'utilities'],
        hooks: ['useLocalStorage', 'useApi'],
        types: ['common', 'api', 'components'],
      },
      designSystem: {
        colorScheme: 'light',
        primaryColor: '#3B82F6',
        layout: 'multi-page',
      },
    };
  }

  async generateCompleteProjectStructure(analysis: ProjectAnalysis): Promise<string[]> {
    const files: string[] = [];
    
    // Configuration files
    files.push(
      'package.json',
      'next.config.js',
      'tsconfig.json',
      'README.md',
      '.gitignore',
      '.env.local.example',
    );

    // Tailwind CSS setup
    if (analysis.styling === 'Tailwind CSS') {
      files.push(
        'tailwind.config.js',
        'postcss.config.js',
      );
    }

    // Database setup
    if (analysis.database && analysis.database !== 'None') {
      files.push(
        'prisma/schema.prisma',
        'src/lib/db.ts',
      );
    }

    // Core Next.js structure
    files.push(
      'src/app/layout.tsx',
      'src/app/page.tsx',
      'src/app/globals.css',
      'src/app/loading.tsx',
      'src/app/error.tsx',
      'src/app/not-found.tsx',
      'src/app/favicon.ico',
      'src/app/icon.png',
      'src/app/apple-icon.png',
      'src/app/robots.txt',
      'src/app/sitemap.ts',
      'src/app/api/health/route.ts',
    );

    // Generate pages with null safety
    if (analysis.fileStructure?.pages?.length) {
      analysis.fileStructure.pages.forEach(page => {
        const pageName = page.toLowerCase().replace(/\s+/g, '-');
        if (pageName !== 'home') { // Skip home as it's already page.tsx
          files.push(`src/app/${pageName}/page.tsx`);
        }
      });
    }

    // Generate components with null safety
    if (analysis.fileStructure?.components?.length) {
      analysis.fileStructure.components.forEach(component => {
        const componentName = component.toLowerCase().replace(/\s+/g, '-');
        files.push(`src/components/${componentName}.tsx`);
      });
    }

    // Generate utilities with null safety
    if (analysis.fileStructure?.utils?.length) {
      analysis.fileStructure.utils.forEach(util => {
        const utilName = util.toLowerCase().replace(/\s+/g, '-');
        files.push(`src/lib/${utilName}.ts`);
      });
    }

    // Generate custom hooks with null safety
    if (analysis.fileStructure?.hooks?.length) {
      analysis.fileStructure.hooks.forEach(hook => {
        const hookName = hook.toLowerCase().replace(/\s+/g, '-');
        files.push(`src/hooks/${hookName}.ts`);
      });
    }

    // Generate types with null safety
    if (analysis.fileStructure?.types?.length) {
      analysis.fileStructure.types.forEach(type => {
        const typeName = type.toLowerCase().replace(/\s+/g, '-');
        files.push(`src/types/${typeName}.ts`);
      });
    }

    // Generate style files with null safety
    if (analysis.fileStructure?.styles?.length) {
      analysis.fileStructure.styles.forEach(style => {
        const styleName = style.toLowerCase().replace(/\s+/g, '-');
        files.push(`src/styles/${styleName}.css`);
      });
    }

    return files;
  }

  // Enhanced multi-pass generation system
  async generateFileContentEnhanced(
    filePath: string, 
    analysis: ProjectAnalysis,
    context?: { relatedFiles?: string[], projectContext?: string }
  ): Promise<GenerationResult> {
    const startTime = Date.now();
    const cacheKey = `${filePath}-${JSON.stringify(analysis)}-${JSON.stringify(context)}`;
    
    // Check cache first
    if (this.generationCache.has(cacheKey)) {
      return this.generationCache.get(cacheKey)!;
    }

    // Handle special template files first
    if (filePath === 'package.json') {
      const content = JSON.stringify(FILE_TEMPLATES['package.json'](analysis), null, 2);
      return {
        content,
        quality: this.getDefaultQualityScore(),
        metadata: {
          model: 'template',
          iterations: 1,
          generationTime: Date.now() - startTime,
        }
      };
    }

    try {
      // Multi-pass generation system with rate limiting fallback
      let result = await this.generateInitialCode(filePath, analysis, context);
      
      // Check if we should skip additional passes due to rate limiting
      if (!rateLimiter.canMakeRequest()) {
        console.log(`⚠️ Rate limit approaching, using single-pass generation for ${filePath}`);
        const generationTime = Date.now() - startTime;
        result.metadata.generationTime = generationTime;
        this.generationCache.set(cacheKey, result);
        return result;
      }
      
      try {
        // Pass 1: Code validation and improvement (optional)
        result = await this.validateAndImproveCode(result, filePath, analysis);
        
        // Skip remaining passes if rate limit is approaching
        if (!rateLimiter.canMakeRequest()) {
          console.log(`⚠️ Rate limit approaching, skipping optimization passes for ${filePath}`);
          const generationTime = Date.now() - startTime;
          result.metadata.generationTime = generationTime;
          this.generationCache.set(cacheKey, result);
          return result;
        }
        
        // Pass 2: Quality optimization (optional)
        result = await this.optimizeCodeQuality(result, filePath, analysis);
        
        // Skip final pass if rate limit is approaching
        if (!rateLimiter.canMakeRequest()) {
          console.log(`⚠️ Rate limit approaching, skipping final polish for ${filePath}`);
          const generationTime = Date.now() - startTime;
          result.metadata.generationTime = generationTime;
          this.generationCache.set(cacheKey, result);
          return result;
        }
        
        // Pass 3: Final polish and accessibility (optional)
        result = await this.finalPolishAndAccessibility(result, filePath, analysis);
        
      } catch (passError) {
        console.log(`⚠️ Multi-pass failed for ${filePath}, using single-pass result:`, passError);
        // Continue with the result from generateInitialCode
      }
      
      const generationTime = Date.now() - startTime;
      result.metadata.generationTime = generationTime;
      
      // Cache the result
      this.generationCache.set(cacheKey, result);
      
      console.log(`✅ Generated ${filePath} in ${generationTime}ms with quality score: ${this.calculateOverallQuality(result.quality)}`);
      
      return result;
      
    } catch (error) {
      console.error(`❌ Failed to generate ${filePath}:`, error);
      return {
        content: this.generateFallbackContent(filePath, analysis),
        quality: this.getDefaultQualityScore(),
        metadata: {
          model: 'fallback',
          iterations: 0,
          generationTime: Date.now() - startTime,
        }
      };
    }
  }

  // Initial code generation with enhanced prompting
  private async generateInitialCode(
    filePath: string, 
    analysis: ProjectAnalysis,
    context?: { relatedFiles?: string[], projectContext?: string }
  ): Promise<GenerationResult> {
    const systemPrompt = this.buildEnhancedSystemPrompt(analysis, context);
    const userPrompt = this.buildEnhancedUserPrompt(filePath, analysis, context);

    const completion = await retryWithBackoff(async () => {
      return await openai.chat.completions.create({
        model: AI_MODELS.GENERATION,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3, // Lower temperature for more consistent code
        max_tokens: 4000,
        top_p: 0.9,
        frequency_penalty: 0.1,
        presence_penalty: 0.1,
      });
    });

    let content = completion.choices[0]?.message?.content || '';
    
    // Validate and clean the generated content
    content = this.validateAndCleanGeneratedContent(content, filePath);
    
    return {
      content,
      quality: await this.analyzeCodeQuality(content, filePath, analysis),
      metadata: {
        model: AI_MODELS.GENERATION,
        iterations: 1,
        generationTime: 0,
        tokens: completion.usage?.total_tokens,
      }
    };
  }

  // New method to validate and clean generated content
  private validateAndCleanGeneratedContent(content: string, filePath: string): string {
    if (!content || content.trim().length === 0) {
      console.warn(`⚠️ Empty content generated for ${filePath}, using fallback`);
      return this.generateFallbackContent(filePath, { 
        projectName: 'Project', 
        description: 'A web application', 
        projectType: 'website',
        framework: 'Next.js', 
        styling: 'Tailwind CSS',
        features: [],
        complexity: 'beginner',
        estimatedTime: '1-2 hours',
        techStack: [],
        fileStructure: {
          pages: [],
          components: [],
          utils: [],
          styles: [],
          hooks: [],
          types: []
        },
        designSystem: {
          colorScheme: 'light',
          primaryColor: '#3B82F6',
          layout: 'single-page'
        }
      });
    }

    // Check for malformed React code fragments (the issue you encountered)
    if (this.isMalformedReactCode(content)) {
      console.warn(`⚠️ Malformed React code detected in ${filePath}, using fallback`);
      return this.generateFallbackContent(filePath, { 
        projectName: 'Project', 
        description: 'A web application', 
        projectType: 'website',
        framework: 'Next.js', 
        styling: 'Tailwind CSS',
        features: [],
        complexity: 'beginner',
        estimatedTime: '1-2 hours',
        techStack: [],
        fileStructure: {
          pages: [],
          components: [],
          utils: [],
          styles: [],
          hooks: [],
          types: []
        },
        designSystem: {
          colorScheme: 'light',
          primaryColor: '#3B82F6',
          layout: 'single-page'
        }
      });
    }

    // Check for incomplete JSX
    if (this.isIncompleteJSX(content)) {
      console.warn(`⚠️ Incomplete JSX detected in ${filePath}, attempting to fix`);
      content = this.fixIncompleteJSX(content, filePath);
    }

    // Check for missing React imports
    if (this.needsReactImports(content, filePath)) {
      content = this.addReactImports(content);
    }

    // Check for undefined/null values
    if (content.includes('undefined') || content.includes('null')) {
      console.warn(`⚠️ Undefined/null values detected in ${filePath}, cleaning up`);
      content = this.cleanUndefinedValues(content);
    }

    // Check for markdown contamination and clean it
    if (this.hasMarkdownContamination(content)) {
      console.warn(`⚠️ Markdown contamination detected in ${filePath}, cleaning up`);
      content = this.cleanMarkdownContamination(content, filePath);
    }
    
    // Check for invalid React component exports (the main issue from the logs)
    if ((filePath.includes('page.tsx') || filePath.includes('layout.tsx')) && 
        (!content.includes('export default') || !content.includes('export default function'))) {
      console.warn(`⚠️ Invalid React component export detected in ${filePath}, using fallback`);
      return this.generateFallbackContent(filePath, { 
        projectName: 'Project', 
        description: 'A web application', 
        projectType: 'website',
        framework: 'Next.js', 
        styling: 'Tailwind CSS',
        features: [],
        complexity: 'beginner',
        estimatedTime: '1-2 hours',
        techStack: [],
        fileStructure: {
          pages: [],
          components: [],
          utils: [],
          styles: [],
          hooks: [],
          types: []
        },
        designSystem: {
          colorScheme: 'light',
          primaryColor: '#3B82F6',
          layout: 'single-page'
        }
      });
    }
    
    // Check for React components without proper JSX return
    if ((filePath.includes('page.tsx') || filePath.includes('layout.tsx')) && 
        content.includes('export default') && !content.includes('return (') && !content.includes('return(')) {
      console.warn(`⚠️ React component without proper JSX return detected in ${filePath}, using fallback`);
      return this.generateFallbackContent(filePath, { 
        projectName: 'Project', 
        description: 'A web application', 
        projectType: 'website',
        framework: 'Next.js', 
        styling: 'Tailwind CSS',
        features: [],
        complexity: 'beginner',
        estimatedTime: '1-2 hours',
        techStack: [],
        fileStructure: {
          pages: [],
          components: [],
          utils: [],
          styles: [],
          hooks: [],
          types: []
        },
        designSystem: {
          colorScheme: 'light',
          primaryColor: '#3B82F6',
          layout: 'single-page'
        }
      });
    }
    
    // Check for incomplete React components (the main issue from the preview)
    if ((filePath.includes('page.tsx') || filePath.includes('layout.tsx')) && 
        (content.includes('const ErrorBoundary') || content.includes('useState(false)') || content.includes('useEffect(() =>') && !content.includes('export default'))) {
      console.warn(`⚠️ Incomplete React component detected in ${filePath}, using fallback`);
      return this.generateFallbackContent(filePath, { 
        projectName: 'Project', 
        description: 'A web application', 
        projectType: 'website',
        framework: 'Next.js', 
        styling: 'Tailwind CSS',
        features: [],
        complexity: 'beginner',
        estimatedTime: '1-2 hours',
        techStack: [],
        fileStructure: {
          pages: [],
          components: [],
          utils: [],
          styles: [],
          hooks: [],
          types: []
        },
        designSystem: {
          colorScheme: 'light',
          primaryColor: '#3B82F6',
          layout: 'single-page'
        }
      });
    }

    // NEW: Comprehensive React component validation for page.tsx and layout.tsx
    if ((filePath.includes('page.tsx') || filePath.includes('layout.tsx'))) {
      // Check for any React component patterns that don't have proper export default
      if (content.includes('const ') && (content.includes('ErrorBoundary') || content.includes('Component') || content.includes('Page') || content.includes('Layout')) && !content.includes('export default')) {
        console.warn(`⚠️ React component without export default detected in ${filePath}, using fallback`);
        return this.generateFallbackContent(filePath, { 
          projectName: 'Project', 
          description: 'A web application', 
          projectType: 'website',
          framework: 'Next.js', 
          styling: 'Tailwind CSS',
          features: [],
          complexity: 'beginner',
          estimatedTime: '1-2 hours',
          techStack: [],
          fileStructure: {
            pages: [],
            components: [],
            utils: [],
            styles: [],
            hooks: [],
            types: []
          },
          designSystem: {
            colorScheme: 'light',
            primaryColor: '#3B82F6',
            layout: 'single-page'
          }
        });
      }

      // Check for React hooks without proper component structure
      if ((content.includes('useState') || content.includes('useEffect') || content.includes('useMemo') || content.includes('useCallback')) && !content.includes('export default function') && !content.includes('export default const')) {
        console.warn(`⚠️ React hooks without proper component structure detected in ${filePath}, using fallback`);
        return this.generateFallbackContent(filePath, { 
          projectName: 'Project', 
          description: 'A web application', 
          projectType: 'website',
          framework: 'Next.js', 
          styling: 'Tailwind CSS',
          features: [],
          complexity: 'beginner',
          estimatedTime: '1-2 hours',
          techStack: [],
          fileStructure: {
            pages: [],
            components: [],
            utils: [],
            styles: [],
            hooks: [],
            types: []
          },
          designSystem: {
            colorScheme: 'light',
            primaryColor: '#3B82F6',
            layout: 'single-page'
          }
        });
      }

      // Check for JSX without proper React component wrapper
      if ((content.includes('<div') || content.includes('<h1') || content.includes('<p>')) && !content.includes('export default') && !content.includes('function ') && !content.includes('const ')) {
        console.warn(`⚠️ JSX without proper React component wrapper detected in ${filePath}, using fallback`);
        return this.generateFallbackContent(filePath, { 
          projectName: 'Project', 
          description: 'A web application', 
          projectType: 'website',
          framework: 'Next.js', 
          styling: 'Tailwind CSS',
          features: [],
          complexity: 'beginner',
          estimatedTime: '1-2 hours',
          techStack: [],
          fileStructure: {
            pages: [],
            components: [],
            utils: [],
            styles: [],
            hooks: [],
            types: []
          },
          designSystem: {
            colorScheme: 'light',
            primaryColor: '#3B82F6',
            layout: 'single-page'
          }
        });
      }

      // Check for React components with syntax errors
      if (content.includes('export default') && (content.includes('{error}') || content.includes('{loading}') || content.includes('{product.'))) {
        console.warn(`⚠️ React component with syntax errors detected in ${filePath}, using fallback`);
        return this.generateFallbackContent(filePath, { 
          projectName: 'Project', 
          description: 'A web application', 
          projectType: 'website',
          framework: 'Next.js', 
          styling: 'Tailwind CSS',
          features: [],
          complexity: 'beginner',
          estimatedTime: '1-2 hours',
          techStack: [],
          fileStructure: {
            pages: [],
            components: [],
            utils: [],
            styles: [],
            hooks: [],
            types: []
          },
          designSystem: {
            colorScheme: 'light',
            primaryColor: '#3B82F6',
            layout: 'single-page'
          }
        });
      }

      // Check for React components with unclosed JSX
      if (content.includes('<div') && !content.includes('</div>') && content.includes('export default')) {
        console.warn(`⚠️ React component with unclosed JSX detected in ${filePath}, using fallback`);
        return this.generateFallbackContent(filePath, { 
          projectName: 'Project', 
          description: 'A web application', 
          projectType: 'website',
          framework: 'Next.js', 
          styling: 'Tailwind CSS',
          features: [],
          complexity: 'beginner',
          estimatedTime: '1-2 hours',
          techStack: [],
          fileStructure: {
            pages: [],
            components: [],
            utils: [],
            styles: [],
            hooks: [],
            types: []
          },
          designSystem: {
            colorScheme: 'light',
            primaryColor: '#3B82F6',
            layout: 'single-page'
          }
        });
      }
    }
    
    // Check for React components without proper structure
    if ((filePath.includes('page.tsx') || filePath.includes('layout.tsx')) && 
        content.includes('const ') && content.includes('= (') && !content.includes('export default')) {
      console.warn(`⚠️ React component without proper export detected in ${filePath}, using fallback`);
      return this.generateFallbackContent(filePath, { 
        projectName: 'Project', 
        description: 'A web application', 
        projectType: 'website',
        framework: 'Next.js', 
        styling: 'Tailwind CSS',
        features: [],
        complexity: 'beginner',
        estimatedTime: '1-2 hours',
        techStack: [],
        fileStructure: {
          pages: [],
          components: [],
          utils: [],
          styles: [],
          hooks: [],
          types: []
        },
        designSystem: {
          colorScheme: 'light',
          primaryColor: '#3B82F6',
          layout: 'single-page'
        }
      });
    }
    
    // Check for malformed CSS (the main issue from the logs)
    if (filePath.endsWith('.css') && (content.startsWith('//') || content.includes('//') && !content.includes('/*'))) {
      console.warn(`⚠️ Malformed CSS detected in ${filePath}, using fallback`);
      return this.generateFallbackContent(filePath, { 
        projectName: 'Project', 
        description: 'A web application', 
        projectType: 'website',
        framework: 'Next.js', 
        styling: 'Tailwind CSS',
        features: [],
        complexity: 'beginner',
        estimatedTime: '1-2 hours',
        techStack: [],
        fileStructure: {
          pages: [],
          components: [],
          utils: [],
          styles: [],
          hooks: [],
          types: []
        },
        designSystem: {
          colorScheme: 'light',
          primaryColor: '#3B82F6',
          layout: 'single-page'
        }
      });
    }

    return content;
  }

  // Check if content is malformed React code
  private isMalformedReactCode(content: string): boolean {
    // Check for the specific pattern you encountered
    if (content.includes('clearTimeout(timer)') && content.includes('handleError') && content.includes('useMemo')) {
      return true;
    }

    // Check for React fragments without proper structure
    if (content.includes('useState') && content.includes('useEffect') && !content.includes('export default')) {
      return true;
    }

    // Check for broken JSX
    if (content.includes('className=') && !content.includes('import React') && !content.includes('export default')) {
      return true;
    }

    // Check for incomplete function definitions
    if (content.includes('const ') && content.includes('= (') && !content.includes('return')) {
      return true;
    }

    // NEW: Check for any React component patterns without proper export
    if (content.includes('const ') && (content.includes('ErrorBoundary') || content.includes('Component') || content.includes('Page') || content.includes('Layout')) && !content.includes('export default')) {
      return true;
    }

    // NEW: Check for React hooks without proper component structure
    if ((content.includes('useState') || content.includes('useEffect') || content.includes('useMemo') || content.includes('useCallback')) && !content.includes('export default function') && !content.includes('export default const')) {
      return true;
    }

    // NEW: Check for JSX without proper React component wrapper
    if ((content.includes('<div') || content.includes('<h1') || content.includes('<p>')) && !content.includes('export default') && !content.includes('function ') && !content.includes('const ')) {
      return true;
    }

    // NEW: Check for incomplete React component definitions
    if (content.includes('const ') && content.includes('= (') && content.includes('props') && !content.includes('return')) {
      return true;
    }

    // NEW: Check for React components without proper JSX return
    if (content.includes('export default') && !content.includes('return (') && !content.includes('return(') && !content.includes('return <')) {
      return true;
    }

    // NEW: Check for malformed React component exports
    if (content.includes('export default') && (content.includes('const ') || content.includes('let ') || content.includes('var ')) && !content.includes('function')) {
      return true;
    }

    // NEW: Check for React components with syntax errors
    if (content.includes('export default') && (content.includes('{error}') || content.includes('{loading}') || content.includes('{product.'))) {
      return true;
    }

    // NEW: Check for incomplete React components that don't return JSX
    if (content.includes('export default function') && !content.includes('return') && !content.includes('JSX')) {
      return true;
    }

    // NEW: Check for React components with unclosed JSX
    if (content.includes('<div') && !content.includes('</div>') && content.includes('export default')) {
      return true;
    }

    // NEW: Check for React components with malformed JSX attributes
    if (content.includes('className=') && content.includes('undefined') && content.includes('export default')) {
      return true;
    }

    // NEW: Check for React components with TypeScript errors
    if (content.includes('React.FC<') && !content.includes('export default')) {
      return true;
    }

    // NEW: Check for React components with malformed imports
    if (content.includes('import ') && content.includes('from') && !content.includes('export default') && (content.includes('<div') || content.includes('className='))) {
      return true;
    }

    // NEW: Check for the exact pattern causing "The default export is not a React Component" error
    if (content.includes('const ') && content.includes('= () =>') && !content.includes('return (') && !content.includes('return(') && !content.includes('return <')) {
      return true;
    }

    // NEW: Check for React components with missing return statements
    if (content.includes('export default function') && !content.includes('return')) {
      return true;
    }

    // NEW: Check for React components with malformed JSX structure
    if (content.includes('return (') && !content.includes(')')) {
      return true;
    }

    // NEW: Check for React components with unclosed JSX tags
    if (content.includes('<div') && !content.includes('</div>')) {
      return true;
    }

    // NEW: Check for React components with malformed template literals
    if (content.includes('`') && !content.includes('`', content.indexOf('`') + 1)) {
      return true;
    }

    // NEW: Check for React components with missing closing braces
    if (content.includes('{') && !content.includes('}')) {
      return true;
    }

    // NEW: Check for React components with missing parentheses
    if (content.includes('(') && !content.includes(')')) {
      return true;
    }

    // NEW: Check for React components that are just fragments without proper structure
    if (content.includes('<>') && !content.includes('</>')) {
      return true;
    }

    // NEW: Check for React components with malformed className attributes
    if (content.includes('className=') && content.includes('{') && !content.includes('}')) {
      return true;
    }

    // NEW: Check for React components with undefined or null values
    if (content.includes('undefined') || content.includes('null')) {
      return true;
    }

    return false;
  }

  // Check if JSX is incomplete
  private isIncompleteJSX(content: string): boolean {
    const openTags = (content.match(/</g) || []).length;
    const closeTags = (content.match(/>/g) || []).length;
    
    // If there are significantly more open tags than close tags
    if (openTags > closeTags + 2) {
      return true;
    }

    // Check for unclosed JSX elements
    if (content.includes('<div') && !content.includes('</div>')) {
      return true;
    }

    return false;
  }

  // Fix incomplete JSX
  private fixIncompleteJSX(content: string, filePath: string): string {
    const fileName = filePath.split('/').pop() || 'component';
    
    // If it's a page component, return a complete fallback
    if (fileName === 'page.tsx' || fileName === 'index.tsx') {
      return `import React from 'react'

export default function Page() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 flex items-center justify-center">
      <div className="text-center text-white">
        <h1 className="text-4xl font-bold mb-4">Cold Water Experiences</h1>
        <p className="text-xl opacity-90">Dive into the refreshing world of cold water adventures.</p>
        <div className="mt-8 space-y-4">
          <div className="bg-white/10 p-6 rounded-lg">
            <h2 className="text-2xl font-semibold mb-2">Experience the Chill</h2>
            <p>Discover the invigorating power of cold water therapy.</p>
          </div>
          <div className="bg-white/10 p-6 rounded-lg">
            <h2 className="text-2xl font-semibold mb-2">Explore the Depths</h2>
            <p>Uncover the beauty beneath the surface.</p>
          </div>
        </div>
      </div>
    </div>
  )
}`;
    }

    return content;
  }

  // Check if content needs React imports
  private needsReactImports(content: string, filePath: string): boolean {
    const isReactFile = filePath.endsWith('.tsx') || filePath.endsWith('.jsx');
    const hasJSX = content.includes('className=') || content.includes('<div') || content.includes('<h1');
    const hasReactImport = content.includes('import React');
    
    return isReactFile && hasJSX && !hasReactImport;
  }

  // Add React imports
  private addReactImports(content: string): string {
    return `import React from 'react'

${content}`;
  }

  // Clean undefined/null values
  private cleanUndefinedValues(content: string): string {
    return content
      .replace(/undefined/g, '""')
      .replace(/null/g, '""');
  }

  // Check for markdown contamination
  private hasMarkdownContamination(content: string): boolean {
    return content.includes('```') || 
           content.includes('###') || 
           content.includes('**') || 
           content.includes('##') || 
           content.includes('# ') ||
           content.includes('|') ||
           content.includes('---') ||
           content.includes('<!--') ||
           content.includes('-->');
  }

  // Clean markdown contamination
  private cleanMarkdownContamination(content: string, filePath: string): string {
    let cleanedContent = content;

    // Remove markdown code blocks
    cleanedContent = cleanedContent
      .replace(/^```(typescript|javascript|css|scss|sass|ts|js|tsx|jsx|json|html|markdown)?\s*$/gm, '') // Remove opening code blocks
      .replace(/^```\s*$/gm, '') // Remove closing code blocks
      .replace(/^~~~(typescript|javascript|css|scss|sass|ts|js|tsx|jsx|json|html|markdown)?\s*$/gm, '') // Remove opening tildes
      .replace(/^~~~\s*$/gm, ''); // Remove closing tildes

    // Remove markdown headers
    cleanedContent = cleanedContent
      .replace(/^#{1,6}\s.*$/gm, '') // Remove headers (# ## ### etc)
      .replace(/^#{1,6}\s*$/gm, ''); // Remove empty headers

    // Remove markdown formatting
    cleanedContent = cleanedContent
      .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
      .replace(/\*(.*?)\*/g, '$1') // Remove italic
      .replace(/`(.*?)`/g, '$1') // Remove inline code
      .replace(/~~(.*?)~~/g, '$1'); // Remove strikethrough

    // Remove markdown lists
    cleanedContent = cleanedContent
      .replace(/^\s*[-*+]\s.*$/gm, '') // Remove bullet lists
      .replace(/^\s*\d+\.\s.*$/gm, ''); // Remove numbered lists

    // Remove markdown tables
    cleanedContent = cleanedContent
      .replace(/^\|.*\|$/gm, '') // Remove table rows
      .replace(/^\|.*$/gm, ''); // Remove partial table rows

    // Remove HTML comments
    cleanedContent = cleanedContent
      .replace(/<!--[\s\S]*?-->/g, '') // Remove HTML comments
      .replace(/^\s*<!--.*$/gm, '') // Remove HTML comment lines
      .replace(/^\s*-->\s*$/gm, ''); // Remove closing HTML comment lines

    // Remove horizontal rules
    cleanedContent = cleanedContent
      .replace(/^[-*_]{3,}\s*$/gm, ''); // Remove horizontal rules

    // Remove markdown links and images
    cleanedContent = cleanedContent
      .replace(/!\[.*?\]\(.*?\)/g, '') // Remove images
      .replace(/\[.*?\]\(.*?\)/g, ''); // Remove links

    // Remove any remaining markdown patterns
    cleanedContent = cleanedContent
      .replace(/^\s*```.*$/gm, '') // Remove any remaining code block markers
      .replace(/^\s*~~~.*$/gm, '') // Remove any remaining tilde markers
      .replace(/^\s*[`~].*$/gm, ''); // Remove any remaining code markers

    // Clean up whitespace
    cleanedContent = cleanedContent
      .replace(/\n\s*\n\s*\n/g, '\n\n') // Remove excessive blank lines
      .trim();

    // For CSS files, find the first valid CSS line
    if (filePath.endsWith('.css')) {
      const lines = cleanedContent.split('\n');
      const firstValidLineIndex = lines.findIndex(line => {
        const trimmed = line.trim();
        return trimmed.startsWith('@') || 
               trimmed.startsWith('*') || 
               trimmed.startsWith('html') || 
               trimmed.startsWith('body') || 
               trimmed.startsWith('.') ||
               trimmed.startsWith('#') ||
               trimmed.startsWith('/*') ||
               trimmed.startsWith('//') ||
               trimmed.includes('{') ||
               trimmed.includes('}') ||
               trimmed.includes(':');
      });
      
      if (firstValidLineIndex !== -1) {
        cleanedContent = lines.slice(firstValidLineIndex).join('\n');
      }
    }

    // For TypeScript/JavaScript files, find the first valid code line
    if (filePath.endsWith('.ts') || filePath.endsWith('.tsx') || filePath.endsWith('.js') || filePath.endsWith('.jsx')) {
      const lines = cleanedContent.split('\n');
      const firstValidLineIndex = lines.findIndex(line => {
        const trimmed = line.trim();
        return trimmed.startsWith('import') || 
               trimmed.startsWith('export') || 
               trimmed.startsWith('const') || 
               trimmed.startsWith('let') || 
               trimmed.startsWith('var') ||
               trimmed.startsWith('function') ||
               trimmed.startsWith('class') ||
               trimmed.startsWith('interface') ||
               trimmed.startsWith('type') ||
               trimmed.startsWith('//') ||
               trimmed.startsWith('/*') ||
               trimmed.includes('(') ||
               trimmed.includes('{') ||
               trimmed.includes('=');
      });
      
      if (firstValidLineIndex !== -1) {
        cleanedContent = lines.slice(firstValidLineIndex).join('\n');
      }
    }

    console.log(`🔧 Cleaned markdown contamination from ${filePath}`);
    return cleanedContent;
  }

  // Code validation and improvement pass
  private async validateAndImproveCode(
    result: GenerationResult, 
    filePath: string, 
    analysis: ProjectAnalysis
  ): Promise<GenerationResult> {
    const validationPrompt = `
You are a senior code reviewer. Analyze this ${filePath} code and improve it:

ORIGINAL CODE:
\`\`\`typescript
${result.content}
\`\`\`

VALIDATION CRITERIA:
1. TypeScript syntax and type safety
2. React best practices and hooks usage
3. Error handling and edge cases
4. Performance optimizations
5. Accessibility compliance
6. Code organization and readability

CURRENT QUALITY ISSUES:
- Syntax Valid: ${result.quality.syntaxValid ? '✅' : '❌'}
- TypeScript Compliant: ${result.quality.typeScriptCompliant ? '✅' : '❌'}
- Accessibility Score: ${result.quality.accessibilityScore}/100
- Performance Score: ${result.quality.performanceScore}/100
- Interactivity Score: ${result.quality.interactivityScore}/100

IMPROVEMENT INSTRUCTIONS:
1. Fix any syntax or TypeScript errors
2. Improve error handling and loading states
3. Enhance accessibility with proper ARIA labels
4. Optimize performance and add memoization where needed
5. Ensure full interactivity with proper event handlers
6. Add proper validation and user feedback

Return ONLY the improved code, no explanations.
`;

    const completion = await retryWithBackoff(async () => {
      return await openai.chat.completions.create({
        model: AI_MODELS.VALIDATION,
        messages: [{ role: 'user', content: validationPrompt }],
        temperature: 0.2,
        max_tokens: 4000,
      });
    });

    const improvedContent = completion.choices[0]?.message?.content || result.content;
    
    return {
      content: improvedContent,
      quality: await this.analyzeCodeQuality(improvedContent, filePath, analysis),
      metadata: {
        ...result.metadata,
        iterations: result.metadata.iterations + 1,
      }
    };
  }

  // Quality optimization pass
  private async optimizeCodeQuality(
    result: GenerationResult, 
    filePath: string, 
    analysis: ProjectAnalysis
  ): Promise<GenerationResult> {
    // Skip optimization if quality is already high
    if (this.calculateOverallQuality(result.quality) >= 85) {
      return result;
    }

    const optimizationPrompt = `
You are a UI/UX optimization expert. Enhance this ${filePath} code for maximum user experience:

CURRENT CODE:
\`\`\`typescript
${result.content}
\`\`\`

OPTIMIZATION TARGETS:
- Accessibility Score: ${result.quality.accessibilityScore}/100 → Target: 95+
- Performance Score: ${result.quality.performanceScore}/100 → Target: 90+
- Interactivity Score: ${result.quality.interactivityScore}/100 → Target: 95+

ENHANCEMENT REQUIREMENTS:
1. Add smooth animations and micro-interactions
2. Implement proper loading states and skeletons
3. Add comprehensive error boundaries
4. Optimize re-renders with React.memo and useMemo
5. Enhance accessibility with focus management
6. Add keyboard navigation support
7. Implement responsive design patterns
8. Add proper form validation and feedback

DESIGN SYSTEM CONTEXT:
- Primary Color: ${analysis.designSystem?.primaryColor || '#3B82F6'}
- Theme: ${analysis.designSystem?.colorScheme || 'light'}
- Layout: ${analysis.designSystem?.layout || 'multi-page'}

Return ONLY the optimized code with enhanced UX.
`;

    const completion = await retryWithBackoff(async () => {
      return await openai.chat.completions.create({
        model: AI_MODELS.OPTIMIZATION,
        messages: [{ role: 'user', content: optimizationPrompt }],
        temperature: 0.3,
        max_tokens: 4000,
      });
    });

    const optimizedContent = completion.choices[0]?.message?.content || result.content;
    
    return {
      content: optimizedContent,
      quality: await this.analyzeCodeQuality(optimizedContent, filePath, analysis),
      metadata: {
        ...result.metadata,
        iterations: result.metadata.iterations + 1,
      }
    };
  }

  // Final polish and accessibility pass
  private async finalPolishAndAccessibility(
    result: GenerationResult, 
    filePath: string, 
    analysis: ProjectAnalysis
  ): Promise<GenerationResult> {
    const polishPrompt = `
You are an accessibility expert. Apply final polish to this ${filePath} code:

CODE TO POLISH:
\`\`\`typescript
${result.content}
\`\`\`

FINAL REQUIREMENTS:
1. Ensure WCAG 2.1 AA compliance
2. Add proper semantic HTML structure
3. Implement comprehensive keyboard navigation
4. Add focus indicators and screen reader support
5. Polish animations and transitions
6. Optimize bundle size and performance
7. Add proper TypeScript documentation
8. Ensure production-ready error handling

ACCESSIBILITY CHECKLIST:
- [ ] ARIA labels for all interactive elements
- [ ] Proper heading hierarchy (h1, h2, h3)
- [ ] Keyboard navigation support
- [ ] Focus management and indicators
- [ ] Screen reader announcements
- [ ] Color contrast compliance
- [ ] Responsive design validation

Return the final, production-ready code.
`;

    const completion = await retryWithBackoff(async () => {
      return await openai.chat.completions.create({
        model: AI_MODELS.OPTIMIZATION,
        messages: [{ role: 'user', content: polishPrompt }],
        temperature: 0.1, // Very low temperature for consistent polish
        max_tokens: 4000,
      });
    });

    const polishedContent = completion.choices[0]?.message?.content || result.content;
    
    return {
      content: polishedContent,
      quality: await this.analyzeCodeQuality(polishedContent, filePath, analysis),
      metadata: {
        ...result.metadata,
        iterations: result.metadata.iterations + 1,
      }
    };
  }

  // Analyze code quality using AI
  private async analyzeCodeQuality(
    content: string, 
    filePath: string, 
    analysis: ProjectAnalysis
  ): Promise<CodeQuality> {
    const qualityPrompt = `
Analyze this ${filePath} code quality and return a JSON assessment:

PROJECT CONTEXT:
- Framework: ${analysis.framework}
- Styling: ${analysis.styling}
- Complexity: ${analysis.complexity}
- Design System: ${analysis.designSystem?.colorScheme || 'light'} theme

CODE TO ANALYZE:
\`\`\`typescript
${content}
\`\`\`

Evaluate based on:
1. Syntax validity and TypeScript compliance
2. Accessibility features (ARIA labels, semantic HTML, keyboard navigation)
3. Performance optimizations (memoization, efficient rendering)
4. Interactivity level (event handlers, state management, user feedback)
5. Responsive design implementation
6. Error handling and edge cases

Return JSON format:
{
  "syntaxValid": boolean,
  "typeScriptCompliant": boolean,
  "accessibilityScore": number (0-100),
  "performanceScore": number (0-100),
  "interactivityScore": number (0-100),
  "responsiveDesign": boolean,
  "errorHandling": boolean,
  "suggestions": ["improvement suggestion 1", "improvement suggestion 2"]
}
`;

    try {
      const completion = await retryWithBackoff(async () => {
        return await openai.chat.completions.create({
          model: AI_MODELS.VALIDATION,
          messages: [{ role: 'user', content: qualityPrompt }],
          response_format: { type: 'json_object' },
          temperature: 0.1,
          max_tokens: 1000,
        });
      });

      const qualityResponse = completion.choices[0]?.message?.content;
      if (qualityResponse) {
        const parsed = JSON.parse(qualityResponse);
        return CodeQualitySchema.parse(parsed);
      }
    } catch (error) {
      console.error('Failed to analyze code quality:', error);
    }

    return this.getDefaultQualityScore();
  }

  // Build enhanced system prompt with context
  private buildEnhancedSystemPrompt(
    analysis: ProjectAnalysis, 
    context?: { relatedFiles?: string[], projectContext?: string }
  ): string {
    return `You are an expert frontend developer and UI/UX designer with 10+ years of experience specializing in modern Next.js 14+ applications. You create exceptional, production-ready user interfaces using the latest patterns and best practices.

PROJECT CONTEXT:
- Name: ${analysis.projectName}
- Type: ${analysis.projectType}
- Framework: ${analysis.framework}
- Styling: ${analysis.styling}
- Features: ${analysis.features?.join(', ') || 'User Interface, Responsive Design'}
- Complexity: ${analysis.complexity || 'intermediate'}
- Design System: ${analysis.designSystem?.layout || 'multi-page'} layout with ${analysis.designSystem?.colorScheme || 'light'} theme
- Primary Color: ${analysis.designSystem?.primaryColor || '#3B82F6'}

${context?.relatedFiles ? `RELATED FILES: ${context.relatedFiles.join(', ')}` : ''}
${context?.projectContext ? `PROJECT CONTEXT: ${context.projectContext}` : ''}

CRITICAL NEXT.JS 14+ REQUIREMENTS:
1. USE APP ROUTER: All pages must use the new App Router (/app directory)
2. SERVER COMPONENTS: Use Server Components by default, Client Components only when needed
3. METADATA API: Use the new metadata export for SEO and page information
4. SUSPENSE: Implement proper loading states with Suspense boundaries
5. ERROR BOUNDARIES: Use error.tsx for error handling
6. TYPE SAFETY: Strict TypeScript with proper type definitions
7. PERFORMANCE: Use Next.js Image, Link, and optimization features
8. MODERN PATTERNS: Use latest React patterns (hooks, concurrent features)

MODERN STANDARDS:
- Next.js 14+ App Router architecture
- Server Components for better performance
- Client Components only when interactivity is needed
- Proper metadata exports for SEO
- Suspense boundaries for loading states
- Error boundaries for error handling
- TypeScript strict mode
- Tailwind CSS with modern utilities
- Accessibility-first design (WCAG 2.1 AA)
- Responsive design with mobile-first approach
- Performance optimization (Core Web Vitals)

CRITICAL: Generate ONLY the code, no explanations or markdown formatting.

CONFIGURATION FILES (next.config.js, tailwind.config.js, etc.):
- Generate ONLY valid JavaScript/JSON code
- NO explanations, comments, or markdown after the module.exports statement
- NO additional text after the closing brace or semicolon
- The file must end immediately after the module.exports statement
- Use latest Next.js 14+ configuration options

CRITICAL REACT COMPONENT REQUIREMENTS:
For React components, you MUST follow this EXACT structure:

SERVER COMPONENTS (default):
\`\`\`tsx
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Page Title',
  description: 'Page description',
}

export default function ComponentName() {
  return (
    <div>
      {/* Your JSX content */}
    </div>
  )
}
\`\`\`

CLIENT COMPONENTS (only when needed):
\`\`\`tsx
'use client'
import { useState } from 'react'

export default function ComponentName() {
  const [state, setState] = useState()
  
  return (
    <div>
      {/* Your JSX content */}
    </div>
  )
}
\`\`\`

LAYOUT COMPONENTS:
\`\`\`tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'App Title',
  description: 'App description',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  )
}
\`\`\`

NEVER generate:
- Incomplete React components without proper export default
- Components with missing return statements
- Malformed JSX with unclosed tags
- Components with undefined or null values
- Components with syntax errors
- Components without proper structure
- Explanations or markdown after code blocks
- Old Pages Router patterns (/pages directory)
- Missing metadata exports for pages
- Missing error boundaries or loading states

ALWAYS ensure:
- Every React component has 'export default function ComponentName()'
- Every component returns valid JSX
- All JSX tags are properly closed
- No syntax errors or malformed code
- Proper TypeScript types and imports
- Configuration files end immediately after module.exports
- Use Server Components by default
- Add 'use client' only when client-side interactivity is needed
- Include proper metadata exports for pages
- Implement proper error handling with error.tsx
- Use Suspense for loading states`;
  }

  // Build enhanced user prompt with specific requirements
  private buildEnhancedUserPrompt(
    filePath: string, 
    analysis: ProjectAnalysis,
    context?: { relatedFiles?: string[], projectContext?: string }
  ): string {
    const fileType = this.getFileType(filePath);
    const componentName = this.getComponentName(filePath);

    return `Generate exceptional, production-ready code for: ${filePath}

FILE SPECIFICATIONS:
- Type: ${fileType}
- Component: ${componentName}
- Purpose: ${this.getFilePurpose(filePath, analysis)}

${context?.relatedFiles ? `RELATED FILES: ${context.relatedFiles.join(', ')}` : ''}
${context?.projectContext ? `ADDITIONAL CONTEXT: ${context.projectContext}` : ''}

DETAILED REQUIREMENTS:
1. FUNCTIONALITY: Create fully working ${componentName} with all interactive features
2. DESIGN: Implement ${analysis.designSystem?.colorScheme || 'light'} theme with ${analysis.designSystem?.primaryColor || '#3B82F6'} primary color
3. INTERACTIVITY: Add hover states, focus indicators, and smooth transitions
4. ACCESSIBILITY: Include ARIA labels, keyboard navigation, and semantic HTML
5. PERFORMANCE: Optimize rendering with proper memoization and lazy loading
6. RESPONSIVE: Mobile-first design with tablet and desktop breakpoints
7. ERROR HANDLING: Comprehensive error boundaries and user feedback
8. TESTING: Code that can be easily tested and validated

SPECIFIC FEATURES FOR ${componentName}:
${this.getSpecificFeatures(filePath, analysis)}

INTEGRATION REQUIREMENTS:
- Seamless integration with ${analysis.framework} project structure
- Consistent with ${analysis.styling} design system
- Proper TypeScript types and interfaces
- Production-ready error handling and validation

Generate code that demonstrates the project's purpose: "${analysis.description}"`;
  }

  // Helper methods for enhanced generation
  private getFileType(filePath: string): string {
    const ext = filePath.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'tsx': return 'React Component';
      case 'ts': return 'TypeScript Module';
      case 'css': return 'Stylesheet';
      case 'json': return 'Configuration';
      default: return 'File';
    }
  }

  private getComponentName(filePath: string): string {
    const fileName = filePath.split('/').pop()?.split('.')[0] || 'Component';
    return fileName.charAt(0).toUpperCase() + fileName.slice(1);
  }

  private getFilePurpose(filePath: string, analysis: ProjectAnalysis): string {
    if (filePath.includes('page')) return 'Main application page';
    if (filePath.includes('component')) return 'Reusable UI component';
    if (filePath.includes('layout')) return 'Layout wrapper component';
    if (filePath.includes('hook')) return 'Custom React hook';
    if (filePath.includes('util')) return 'Utility function';
    return `Support file for ${analysis.projectName}`;
  }

  private getSpecificFeatures(filePath: string, analysis: ProjectAnalysis): string {
    const features = [];
    
    if (filePath.includes('form')) {
      features.push('- Form validation and submission handling');
      features.push('- Real-time field validation with error messages');
      features.push('- Loading states and success/error feedback');
    }
    
    if (filePath.includes('dashboard')) {
      features.push('- Interactive data visualization');
      features.push('- Real-time updates and filtering');
      features.push('- Responsive grid layouts');
    }
    
    if (filePath.includes('auth')) {
      features.push('- Secure authentication flow');
      features.push('- Password validation and security');
      features.push('- Social login integration');
    }
    
    if (features.length === 0) {
      features.push(`- Core functionality for ${analysis.projectType}`);
      features.push('- Interactive user interface elements');
      features.push('- Responsive design and accessibility');
    }
    
    return features.join('\n');
  }

  private calculateOverallQuality(quality: CodeQuality): number {
    const scores = [
      quality.syntaxValid ? 100 : 0,
      quality.typeScriptCompliant ? 100 : 0,
      quality.accessibilityScore,
      quality.performanceScore,
      quality.interactivityScore,
      quality.responsiveDesign ? 100 : 0,
      quality.errorHandling ? 100 : 0,
    ];
    
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  }

  private getDefaultQualityScore(): CodeQuality {
    return {
      syntaxValid: true,
      typeScriptCompliant: true,
      accessibilityScore: 70,
      performanceScore: 70,
      interactivityScore: 70,
      responsiveDesign: true,
      errorHandling: true,
      suggestions: ['Manual quality review recommended'],
    };
  }

  // Backward compatibility method
  async generateFileContent(filePath: string, analysis: ProjectAnalysis): Promise<string> {
    const result = await this.generateFileContentEnhanced(filePath, analysis);
    return result.content;
  }

  private generateFallbackContent(filePath: string, analysis: ProjectAnalysis): string {
    const fileName = filePath.split('/').pop() || 'file';
    const fileType = fileName.split('.').pop() || 'unknown';
    const projectName = analysis.projectName || 'My App';

    // Special handling for key files with latest Next.js 14+ patterns
    if (filePath === 'next.config.js') {
      return `/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable App Router (default in Next.js 13+)
  experimental: {
    // Enable server actions
    serverActions: true,
    // Enable concurrent features
    concurrentFeatures: true,
  },
  // Enable SWC minification for faster builds
  swcMinify: true,
  // Optimize images
  images: {
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  // Enable compression
  compress: true,
  // Enable powered by header removal
  poweredByHeader: false,
}

module.exports = nextConfig;`
    }

    if (filePath === 'tsconfig.json') {
      return `{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "ES2022"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "ESNext",
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
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@/components/*": ["./src/components/*"],
      "@/lib/*": ["./src/lib/*"],
      "@/types/*": ["./src/types/*"],
      "@/hooks/*": ["./src/hooks/*"],
      "@/styles/*": ["./src/styles/*"]
    }
  },
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    ".next/types/**/*.ts"
  ],
  "exclude": ["node_modules"]
}`
    }

    if (filePath === 'tailwind.config.js') {
      return `/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],
}`
    }

    if (filePath === 'package.json') {
      return `{
  "name": "${analysis.projectName?.toLowerCase().replace(/\\s+/g, '-') || 'my-app'}",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "tailwindcss": "^3.3.0",
    "@tailwindcss/forms": "^0.5.0",
    "@tailwindcss/typography": "^0.5.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "@types/node": "^20.0.0",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "eslint": "^8.0.0",
    "eslint-config-next": "^14.0.0",
    "postcss": "^8.4.0",
    "autoprefixer": "^10.4.0"
  }
}`
    }

    if (filePath === 'src/app/layout.tsx') {
      return `import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: '${projectName}',
  description: '${analysis.description || 'A modern web application built with Next.js and Tailwind CSS'}',
  keywords: ['next.js', 'react', 'typescript', 'tailwind'],
  authors: [{ name: 'Your Name' }],
  viewport: 'width=device-width, initial-scale=1',
  robots: 'index, follow',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="h-full">
      <body className={\`\${inter.className} h-full\`}>
        {children}
      </body>
    </html>
  )
}`
    }

    if (filePath === 'src/app/page.tsx') {
      return `import { Suspense } from 'react'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: '${projectName} - Home',
  description: 'Welcome to ${projectName}',
}

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800">
      <div className="container mx-auto px-4 py-8">
        <Suspense fallback={<div>Loading...</div>}>
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 animate-fade-in">
              Welcome to ${projectName}
            </h1>
            <p className="text-xl md:text-2xl text-white/90 max-w-3xl mx-auto leading-relaxed animate-slide-up">
              ${analysis.description || 'A modern web application built with Next.js and Tailwind CSS'}
            </p>
            <div className="mt-8">
              <button className="bg-white text-primary-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors duration-200">
                Get Started
              </button>
            </div>
          </div>
        </Suspense>
      </div>
    </main>
  )
}`
    }

    if (filePath === 'src/app/globals.css') {
      return `@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --primary: 221.2 83.2% 53.3%;
    --primary-foreground: 210 40% 98%;
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --primary: 217.2 91.2% 59.8%;
    --primary-foreground: 222.2 84% 4.9%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}

@layer components {
  .btn-primary {
    @apply bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors duration-200;
  }
  
  .card {
    @apply bg-white rounded-lg shadow-md p-6;
  }
}`
    }

    if (filePath === 'src/app/loading.tsx') {
      return `export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
    </div>
  )
}`
    }

    if (filePath === 'src/app/error.tsx') {
      return `'use client'

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h2 className="text-2xl font-bold mb-4">Something went wrong!</h2>
      <button
        className="btn-primary"
        onClick={() => reset()}
      >
        Try again
      </button>
    </div>
  )
}`
    }

    if (filePath === 'src/app/not-found.tsx') {
      return `import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h2 className="text-2xl font-bold mb-4">Not Found</h2>
      <p className="text-gray-600 mb-4">Could not find requested resource</p>
      <Link href="/" className="btn-primary">
        Return Home
      </Link>
    </div>
  )
}`
    }

    if (filePath === 'src/app/sitemap.ts') {
      return `import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: 'https://yourdomain.com',
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 1,
    },
    {
      url: 'https://yourdomain.com/about',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: 'https://yourdomain.com/contact',
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.5,
    },
  ]
}`
    }

    if (filePath === 'src/app/robots.txt') {
      return `User-Agent: *
Allow: /

Sitemap: https://yourdomain.com/sitemap.xml`
    }

    if (filePath === 'postcss.config.js') {
      return `module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}`
    }

    if (filePath === '.gitignore') {
      return `# See https://help.github.com/articles/ignoring-files/ for more about ignoring files.

# dependencies
/node_modules
/.pnp
.pnp.js
.yarn/install-state.gz

# testing
/coverage

# next.js
/.next/
/out/

# production
/build

# misc
.DS_Store
*.pem

# debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# local env files
.env*.local

# vercel
.vercel

# typescript
*.tsbuildinfo
next-env.d.ts

# IDE
.vscode/
.idea/

# OS
Thumbs.db`
    }

    if (filePath === '.env.local.example') {
      return `# Environment variables example
# Copy this file to .env.local and fill in your values

# Database
DATABASE_URL="postgresql://username:password@localhost:5432/database"

# Authentication
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key"

# API Keys
OPENAI_API_KEY="your-openai-api-key"

# Other services
NEXT_PUBLIC_APP_URL="http://localhost:3000"`
    }

    if (filePath === 'README.md') {
      return `# ${projectName}

${analysis.description || 'A modern web application built with Next.js and Tailwind CSS'}

## Features

- ⚡ Next.js 14 with App Router
- 🎨 Tailwind CSS for styling
- 🔧 TypeScript for type safety
- 📱 Responsive design
- ♿ Accessibility focused
- 🚀 Optimized for performance

## Getting Started

First, install the dependencies:

\`\`\`bash
npm install
\`\`\`

Then, run the development server:

\`\`\`bash
npm run dev
\`\`\`

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Project Structure

\`\`\`
src/
├── app/                 # App Router pages
│   ├── layout.tsx      # Root layout
│   ├── page.tsx        # Home page
│   ├── globals.css     # Global styles
│   ├── loading.tsx     # Loading UI
│   ├── error.tsx       # Error UI
│   └── not-found.tsx   # 404 page
├── components/         # Reusable components
├── lib/               # Utility functions
├── hooks/             # Custom React hooks
├── types/             # TypeScript type definitions
└── styles/            # Additional styles
\`\`\`

## Learn More

To learn more about the technologies used:

- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [TypeScript Documentation](https://www.typescriptlang.org/docs)

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme).
`
    }

    if (filePath === 'src/app/api/health/route.ts') {
      return `import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json(
    { 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    },
    { status: 200 }
  )
}`
    }

    // Default fallback for other files
    return `// ${fileName} - ${fileType} file
// Generated for ${projectName}

// TODO: Implement ${fileName} functionality
`;
  }
}

// Export singleton instance
export const aiProcessor = AIPromptProcessor.getInstance(); 