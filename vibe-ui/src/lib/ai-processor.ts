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

Response format: Return a JSON object that matches the required schema exactly, with enhanced focus on UI quality and user experience.`;

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
    // Enhanced fallback analysis
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
    );

    // Generate pages
    analysis.fileStructure.pages.forEach(page => {
      const pageName = page.toLowerCase().replace(/\s+/g, '-');
      if (pageName !== 'home') { // Skip home as it's already page.tsx
        files.push(`src/app/${pageName}/page.tsx`);
      }
    });

    // Generate components
    analysis.fileStructure.components.forEach(component => {
      const componentName = component.toLowerCase().replace(/\s+/g, '-');
      files.push(`src/components/${componentName}.tsx`);
    });

    // Generate utilities
    analysis.fileStructure.utils.forEach(util => {
      const utilName = util.toLowerCase().replace(/\s+/g, '-');
      files.push(`src/lib/${utilName}.ts`);
    });

    // Generate custom hooks
    analysis.fileStructure.hooks.forEach(hook => {
      const hookName = hook.toLowerCase().replace(/\s+/g, '-');
      files.push(`src/hooks/${hookName}.ts`);
    });

    // Generate types
    analysis.fileStructure.types.forEach(type => {
      const typeName = type.toLowerCase().replace(/\s+/g, '-');
      files.push(`src/types/${typeName}.ts`);
    });

    // Generate style files
    analysis.fileStructure.styles.forEach(style => {
      const styleName = style.toLowerCase().replace(/\s+/g, '-');
      files.push(`src/styles/${styleName}.css`);
    });

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

    const content = completion.choices[0]?.message?.content || '';
    
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
- Primary Color: ${analysis.designSystem.primaryColor}
- Theme: ${analysis.designSystem.colorScheme}
- Layout: ${analysis.designSystem.layout}

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
- Design System: ${analysis.designSystem.colorScheme} theme

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
    return `You are an expert frontend developer and UI/UX designer with 10+ years of experience. You specialize in creating exceptional, production-ready user interfaces that are both beautiful and functional.

PROJECT CONTEXT:
- Name: ${analysis.projectName}
- Type: ${analysis.projectType}
- Framework: ${analysis.framework}
- Styling: ${analysis.styling}
- Features: ${analysis.features.join(', ')}
- Complexity: ${analysis.complexity}
- Design System: ${analysis.designSystem.layout} layout with ${analysis.designSystem.colorScheme} theme
- Primary Color: ${analysis.designSystem.primaryColor}

${context?.relatedFiles ? `RELATED FILES: ${context.relatedFiles.join(', ')}` : ''}
${context?.projectContext ? `PROJECT CONTEXT: ${context.projectContext}` : ''}

CRITICAL REQUIREMENTS:
1. VISUAL EXCELLENCE: Create stunning interfaces with modern design patterns
2. FULL INTERACTIVITY: Every element must be fully functional with proper event handling
3. ACCESSIBILITY FIRST: Implement WCAG 2.1 AA compliance with ARIA labels and keyboard navigation
4. PERFORMANCE OPTIMIZED: Use React.memo, useMemo, and optimize rendering
5. RESPONSIVE DESIGN: Mobile-first approach with all breakpoints
6. ERROR HANDLING: Comprehensive error boundaries and user feedback
7. TYPESCRIPT STRICT: Proper type definitions and type safety
8. PRODUCTION READY: Code that can be deployed immediately

MODERN STANDARDS:
- Use latest React patterns (hooks, concurrent features)
- Implement proper state management and side effects
- Add smooth animations and micro-interactions
- Create reusable, composable components
- Follow accessibility best practices
- Optimize for Core Web Vitals
- Include proper loading states and error handling

Generate ONLY the code, no explanations or markdown formatting.`;
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
2. DESIGN: Implement ${analysis.designSystem.colorScheme} theme with ${analysis.designSystem.primaryColor} primary color
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

    switch (fileType) {
      case 'tsx':
        return `import React from 'react'

interface ${fileName.split('.')[0]}Props {
  // Add props here
}

export default function ${fileName.split('.')[0]}(props: ${fileName.split('.')[0]}Props) {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold">${fileName.split('.')[0]}</h1>
      <p>This is the ${fileName.split('.')[0]} component for ${analysis.projectName}</p>
    </div>
  )
}`;
      case 'ts':
        return `// ${fileName} - ${analysis.projectName}

export interface ${fileName.split('.')[0].charAt(0).toUpperCase() + fileName.split('.')[0].slice(1)} {
  // Add interface definitions here
}

export const ${fileName.split('.')[0]} = {
  // Add implementation here
}`;
      case 'css':
        return `/* ${fileName} - ${analysis.projectName} */

.${fileName.split('.')[0]} {
  /* Add styles here */
}`;
      default:
        return `/* ${fileName} - ${analysis.projectName} */
// Generated file for ${analysis.projectName}
// TODO: Implement ${fileName} functionality`;
    }
  }
}

// Export singleton instance
export const aiProcessor = AIPromptProcessor.getInstance(); 