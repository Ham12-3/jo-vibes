import OpenAI from 'openai';
import { z } from 'zod';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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

    const systemPrompt = `You are an expert web developer and project analyzer. Analyze the user's project request and provide detailed recommendations for building their application.

Your task is to:
1. Extract the core project requirements from the user's description
2. Recommend the most suitable technology stack
3. Suggest a comprehensive project structure
4. Identify key features to implement
5. Provide realistic complexity and time estimates
6. Suggest specific files and components needed

Be specific and practical in your recommendations. Choose technologies that are:
- Modern and widely adopted
- Suitable for the project type
- Beginner-friendly when possible
- Well-documented and supported

For file structures, be comprehensive and include:
- All necessary pages and routes
- Key components for the UI
- Utility functions and helpers
- Style files and theme configuration
- Custom hooks for state management
- TypeScript types and interfaces

Response format: Return a JSON object that matches the required schema exactly.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { 
          role: 'user', 
          content: `Analyze this project request and provide detailed recommendations: "${userPrompt}"` 
        }
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' },
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

  async generateFileContent(filePath: string, analysis: ProjectAnalysis): Promise<string> {
    // Handle special template files
    if (filePath === 'package.json') {
      return JSON.stringify(FILE_TEMPLATES['package.json'](analysis), null, 2);
    }

    if (filePath === 'tsconfig.json') {
      return JSON.stringify({
        compilerOptions: {
          target: 'es5',
          lib: ['dom', 'dom.iterable', 'es6'],
          allowJs: true,
          skipLibCheck: true,
          strict: true,
          forceConsistentCasingInFileNames: true,
          noEmit: true,
          esModuleInterop: true,
          module: 'esnext',
          moduleResolution: 'node',
          resolveJsonModule: true,
          isolatedModules: true,
          jsx: 'preserve',
          incremental: true,
          plugins: [{ name: 'next' }],
          baseUrl: '.',
          paths: {
            '@/*': ['./src/*'],
          },
        },
        include: ['next-env.d.ts', '**/*.ts', '**/*.tsx', '.next/types/**/*.ts'],
        exclude: ['node_modules'],
      }, null, 2);
    }

    if (filePath === 'next.config.js') {
      return `/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
}

module.exports = nextConfig`;
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
        primary: '${analysis.designSystem.primaryColor}',
      },
    },
  },
  plugins: [],
}`;
    }

    if (filePath === 'README.md') {
      return `# ${analysis.projectName}

${analysis.description}

## Features

${analysis.features.map(feature => `- ${feature}`).join('\n')}

## Tech Stack

${analysis.techStack.map(tech => `- ${tech}`).join('\n')}

## Getting Started

First, install dependencies:

\`\`\`bash
npm install
\`\`\`

Then, run the development server:

\`\`\`bash
npm run dev
\`\`\`

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Project Structure

- \`src/app/\` - Next.js app router pages
- \`src/components/\` - Reusable UI components
- \`src/lib/\` - Utility functions and configurations
- \`src/hooks/\` - Custom React hooks
- \`src/types/\` - TypeScript type definitions
- \`src/styles/\` - CSS and styling files

## Learn More

To learn more about the technologies used in this project, check out the following resources:

- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://reactjs.org/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
`;
    }

    if (filePath === '.gitignore') {
      return `# Dependencies
node_modules/
.pnpm-debug.log*

# Next.js
.next/
out/
dist/
build/

# Environment variables
.env
.env.local
.env.production.local

# Logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Runtime data
pids
*.pid
*.seed
*.pid.lock

# Coverage directory used by tools like istanbul
coverage/

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Prisma
prisma/migrations/
`;
    }

    // Generate AI content for code files
    if (!process.env.OPENAI_API_KEY) {
      return this.generateFallbackContent(filePath, analysis);
    }

    const systemPrompt = `You are an expert web developer. Generate complete, production-ready code for the specified file based on the project analysis.

Project Details:
- Name: ${analysis.projectName}
- Type: ${analysis.projectType}
- Framework: ${analysis.framework}
- Styling: ${analysis.styling}
- Features: ${analysis.features.join(', ')}
- Complexity: ${analysis.complexity}
- Design System: ${analysis.designSystem.layout} layout with ${analysis.designSystem.colorScheme} theme

Requirements:
- Use modern, clean code practices
- Include proper TypeScript types
- Add helpful comments where needed
- Follow ${analysis.framework} best practices
- Use ${analysis.styling} for styling
- Make it production-ready and functional
- Include proper imports and exports
- Add error handling where appropriate
- Use semantic HTML and accessibility best practices

Generate ONLY the code for the file, no explanations or markdown formatting.`;

    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { 
            role: 'user', 
            content: `Generate the complete code for this file: ${filePath}

File context:
- This is part of a ${analysis.projectType} project
- The file should integrate with the overall project structure
- Follow the project's design system and architecture
- Include proper TypeScript types and error handling` 
          }
        ],
        temperature: 0.3,
        max_tokens: 2000,
      });

      return completion.choices[0]?.message?.content || this.generateFallbackContent(filePath, analysis);
    } catch (error) {
      console.error(`Failed to generate AI content for ${filePath}:`, error);
      return this.generateFallbackContent(filePath, analysis);
    }
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