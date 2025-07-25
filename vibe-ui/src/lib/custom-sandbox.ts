import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFile, mkdir, access, rmdir } from 'fs/promises';
import { join, dirname } from 'path';
import { db } from '@/lib/db';

const execAsync = promisify(exec);

export interface SandboxConfig {
  id: string;
  projectId: string;
  framework: string;
  port: number;
  files: Record<string, string>;
  environment: Record<string, string>;
}

export interface SandboxStatus {
  id: string;
  status: 'CREATING' | 'RUNNING' | 'STOPPED' | 'ERROR';
  url: string | null;
  port: number | null;
  containerId: string | null;
  logs: string[];
  createdAt: Date;
  updatedAt: Date;
}

export class CustomSandboxService {
  private basePort = 5000; // Start from 5000 to avoid conflicts with existing containers
  private usedPorts = new Set<number>();
  private sandboxDir = join(process.cwd(), 'sandboxes');

  constructor() {
    this.ensureSandboxDirectory();
  }

  private async ensureSandboxDirectory() {
    try {
      await access(this.sandboxDir);
    } catch {
      await mkdir(this.sandboxDir, { recursive: true });
    }
  }

  private async getAvailablePort(): Promise<number> {
    let port = this.basePort;
    const maxAttempts = 50; // Try more ports to find an available one
    
    while (port < this.basePort + maxAttempts) {
      if (!this.usedPorts.has(port) && !(await this.isPortInUse(port))) {
        this.usedPorts.add(port);
        console.log(`✅ Found available port: ${port}`);
        return port;
      }
      console.log(`⚠️ Port ${port} is in use, trying next port...`);
      port++;
    }
    
    // If we can't find a port, try to clean up and find one
    console.log('🔧 No ports available, attempting cleanup...');
    await this.cleanupUnusedPorts();
    
    // Try again after cleanup
    port = this.basePort;
    while (port < this.basePort + maxAttempts) {
      if (!this.usedPorts.has(port) && !(await this.isPortInUse(port))) {
        this.usedPorts.add(port);
        console.log(`✅ Found available port after cleanup: ${port}`);
        return port;
      }
      port++;
    }
    
    throw new Error(`No available ports found after trying ${maxAttempts} ports`);
  }

  private async isPortInUse(port: number): Promise<boolean> {
    try {
      const { execSync } = await import('child_process');
      // Use Windows-compatible command
      const isWindows = process.platform === 'win32';
      const command = isWindows 
        ? `netstat -an | findstr :${port}`
        : `netstat -an | grep :${port}`;
      
      execSync(command, { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }

  private async releasePort(port: number) {
    this.usedPorts.delete(port);
  }

  private async cleanupUnusedPorts(): Promise<void> {
    try {
      console.log('🧹 Cleaning up unused ports...');
      
      // Get all running containers
      const { execSync } = await import('child_process');
      const containers = execSync('docker ps --format "{{.Names}}"', { encoding: 'utf8' })
        .split('\n')
        .filter(name => name.trim() && name.includes('sandbox-'));
      
      console.log(`Found ${containers.length} running sandbox containers`);
      
      // Check which ports are actually in use by running containers
      const actuallyUsedPorts = new Set<number>();
      
      for (const containerName of containers) {
        try {
          const portInfo = execSync(`docker port ${containerName}`, { encoding: 'utf8' });
          const portMatch = portInfo.match(/:(\d+)/);
          if (portMatch) {
            const port = parseInt(portMatch[1]);
            actuallyUsedPorts.add(port);
            console.log(`Container ${containerName} is using port ${port}`);
          }
        } catch (_error) {
          console.log(`Could not get port info for ${containerName}`);
        }
      }
      
      // Release ports that are not actually in use
      for (const port of this.usedPorts) {
        if (!actuallyUsedPorts.has(port)) {
          this.usedPorts.delete(port);
          console.log(`Released port ${port} (not actually in use)`);
        }
      }
      
      console.log(`✅ Port cleanup complete. Available ports: ${Array.from(this.usedPorts).join(', ')}`);
    } catch (error) {
      console.error('Error during port cleanup:', error);
    }
  }

  private async cleanupExistingContainer(containerName: string): Promise<void> {
    try {
      console.log(`🧹 Checking for existing container: ${containerName}`);
      
      const { execSync } = await import('child_process');
      
      // Check if container exists
      try {
        const _containerInfo = execSync(`docker inspect ${containerName}`, { encoding: 'utf8' });
        console.log(`Found existing container: ${containerName}`);
        
        // Stop the container
        console.log(`🛑 Stopping container: ${containerName}`);
        execSync(`docker stop ${containerName}`, { stdio: 'ignore' });
        
        // Remove the container
        console.log(`🗑️ Removing container: ${containerName}`);
        execSync(`docker rm ${containerName}`, { stdio: 'ignore' });
        
        console.log(`✅ Successfully cleaned up existing container: ${containerName}`);
      } catch (_inspectError) {
        // Container doesn't exist, which is fine
        console.log(`No existing container found: ${containerName}`);
      }
    } catch (error) {
      console.error(`Error cleaning up existing container ${containerName}:`, error);
    }
  }

  private async createDockerfile(framework: string, projectDir: string): Promise<string> {
    console.log(`🔍 Creating Dockerfile for framework: "${framework}"`);
    const dockerfileContent = this.getDockerfileTemplate(framework);
    const dockerfilePath = join(projectDir, 'Dockerfile');
    await writeFile(dockerfilePath, dockerfileContent);
    console.log(`✅ Dockerfile created with template for: "${framework}"`);
    return dockerfilePath;
  }

  private getDockerfileTemplate(framework: string): string {
    if (framework === 'nextjs') {
      return `# Use Node.js 18 Alpine for smaller image size
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install dependencies first (for better caching)
COPY package*.json ./
RUN npm ci && npm cache clean --force

# Copy source code
COPY . .

# Set environment variables for Next.js development
ENV NODE_ENV=development
ENV PORT=3000
ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_PUBLIC_APP_URL=http://localhost:3000
ENV NEXT_MANUAL_SIG_HANDLE=true
ENV CHOKIDAR_USEPOLLING=true

# Create entrypoint script for proper signal handling
RUN echo '#!/bin/sh' > /usr/local/bin/docker-entrypoint.sh && \\
    echo 'set -e' >> /usr/local/bin/docker-entrypoint.sh && \\
    echo 'echo "Starting Next.js development server..."' >> /usr/local/bin/docker-entrypoint.sh && \\
    echo 'exec "$@"' >> /usr/local/bin/docker-entrypoint.sh && \\
    chmod +x /usr/local/bin/docker-entrypoint.sh

# Expose port
EXPOSE 3000

# Use entrypoint for proper signal handling
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]

# Start the application in development mode
CMD ["npm", "run", "dev"]`
    }
    
    if (framework === 'react') {
      return `# Use Node.js 18 Alpine for smaller image size
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install dependencies first (for better caching): 
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY . .

# Set environment variables
ENV NODE_ENV=development
ENV PORT=3000
ENV CHOKIDAR_USEPOLLING=true

# Create entrypoint script for proper signal handling
RUN echo '#!/bin/sh' > /usr/local/bin/docker-entrypoint.sh && \\
    echo 'set -e' >> /usr/local/bin/docker-entrypoint.sh && \\
    echo 'exec "$@"' >> /usr/local/bin/docker-entrypoint.sh && \\
    chmod +x /usr/local/bin/docker-entrypoint.sh

# Expose port
EXPOSE 3000

# Use entrypoint for proper signal handling
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]

# Start the application
CMD ["npm", "start"]`
    }
    
    if (framework === 'vue') {
      return `# Use Node.js 18 Alpine for smaller image size
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install dependencies first (for better caching)
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY . .

# Set environment variables
ENV NODE_ENV=development
ENV PORT=3000

# Create entrypoint script for proper signal handling
RUN echo '#!/bin/sh' > /usr/local/bin/docker-entrypoint.sh && \\
    echo 'set -e' >> /usr/local/bin/docker-entrypoint.sh && \\
    echo 'exec "$@"' >> /usr/local/bin/docker-entrypoint.sh && \\
    chmod +x /usr/local/bin/docker-entrypoint.sh

# Expose port
EXPOSE 3000

# Use entrypoint for proper signal handling
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]

# Start the application
CMD ["npm", "run", "dev"]`
    }
    
    // Default template for other frameworks
    return `# Use Node.js 18 Alpine for smaller image size
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install dependencies first (for better caching)
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY . .

# Set environment variables
ENV NODE_ENV=development
ENV PORT=3000

# Create entrypoint script for proper signal handling
RUN echo '#!/bin/sh' > /usr/local/bin/docker-entrypoint.sh && \\
    echo 'set -e' >> /usr/local/bin/docker-entrypoint.sh && \\
    echo 'exec "$@"' >> /usr/local/bin/docker-entrypoint.sh && \\
    chmod +x /usr/local/bin/docker-entrypoint.sh

# Expose port
EXPOSE 3000

# Use entrypoint for proper signal handling
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]

# Start the application
CMD ["npm", "start"]`
  }

  private async createPackageJson(framework: string, projectDir: string): Promise<string> {
    const packageJson = this.getPackageJsonTemplate(framework);
    const packagePath = join(projectDir, 'package.json');
    await writeFile(packagePath, JSON.stringify(packageJson, null, 2));
    return packagePath;
  }

  private async createNextConfig(framework: string, projectDir: string): Promise<void> {
    if (framework === 'nextjs') {
      const nextConfigContent = `/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Remove deprecated appDir option
  },
  // Enable static exports if needed
  output: 'standalone',
  // Disable telemetry via environment variable instead
}

module.exports = nextConfig`;
      
      const nextConfigPath = join(projectDir, 'next.config.js');
      await writeFile(nextConfigPath, nextConfigContent);
    }
  }

  private getPackageJsonTemplate(framework: string): Record<string, unknown> {
    const templates: Record<string, Record<string, unknown>> = {
      'nextjs': {
        name: "sandbox-nextjs",
        version: "0.1.0",
        private: true,
        scripts: {
          dev: "next dev --hostname 0.0.0.0 --port 3000",
          build: "next build",
          start: "next start",
          lint: "next lint"
        },
        dependencies: {
          next: "^14.0.0",
          react: "^18.2.0",
          "react-dom": "^18.2.0"
        },
        devDependencies: {
          typescript: "^5.0.0",
          "@types/node": "^20.0.0",
          "@types/react": "^18.2.0",
          "@types/react-dom": "^18.2.0",
          "eslint": "^8.0.0",
          "eslint-config-next": "^14.0.0",
          "tailwindcss": "^3.3.0",
          "@tailwindcss/forms": "^0.5.0",
          "@tailwindcss/typography": "^0.5.0",
          "postcss": "^8.4.0",
          "autoprefixer": "^10.4.0"
        }
      },
      'react': {
        name: "sandbox-react",
        version: "0.1.0",
        private: true,
        scripts: {
          start: "react-scripts start",
          build: "react-scripts build",
          test: "react-scripts test",
          eject: "react-scripts eject"
        },
        dependencies: {
          react: "latest",
          "react-dom": "latest",
          "react-scripts": "latest"
        }
      },
      'vue': {
        name: "sandbox-vue",
        version: "0.1.0",
        private: true,
        scripts: {
          dev: "vite",
          build: "vite build",
          preview: "vite preview"
        },
        dependencies: {
          vue: "latest"
        },
        devDependencies: {
          "@vitejs/plugin-vue": "latest",
          vite: "latest"
        }
      },
      'vanilla': {
        name: "sandbox-vanilla",
        version: "0.1.0",
        private: true,
        scripts: {
          dev: "vite",
          build: "vite build",
          preview: "vite preview"
        },
        devDependencies: {
          vite: "latest"
        }
      }
    };

    return templates[framework] || templates.vanilla;
  }

  async createSandbox(config: SandboxConfig): Promise<SandboxStatus> {
    try {
      console.log(`🚀 Creating sandbox for project ${config.projectId}...`);

      // Create project directory
      const projectDir = join(this.sandboxDir, config.id);
      console.log(`📁 Creating project directory: ${projectDir}`);
      await mkdir(projectDir, { recursive: true });

      // Get available port
      const port = await this.getAvailablePort();
      console.log(`🔌 Using port: ${port}`);

      // Clean up any existing containers with the same name
      await this.cleanupExistingContainer(config.id);

      // Create Dockerfile
      console.log(`🐳 Creating Dockerfile for framework: ${config.framework}`);
      await this.createDockerfile(config.framework, projectDir);

      // Create project files (including package.json)
      console.log(`📝 Creating ${Object.keys(config.files).length} project files...`);
      for (const [filename, content] of Object.entries(config.files)) {
        const filePath = join(projectDir, filename);
        const dir = dirname(filePath);
        
        // Only create directory if it's different from the project directory
        if (dir !== projectDir) {
          await mkdir(dir, { recursive: true });
        }
        
        // Fix package.json for Docker compatibility and ensure all dependencies
        let finalContent = content;
        if (filename === 'package.json') {
          try {
            // First ensure all required dependencies are present
            finalContent = await this.ensurePackageJsonDependencies(content, config.framework);
            
            // Then fix the dev script for Docker compatibility
            const packageJson = JSON.parse(finalContent);
            console.log(`🔍 Original package.json dev script:`, packageJson.scripts?.dev);
            
            // Always override with the correct dev script for Docker
            packageJson.scripts = {
              ...packageJson.scripts,
              dev: 'next dev --hostname 0.0.0.0 --port 3000'
            };
            
            // Ensure we have all required scripts
            if (!packageJson.scripts.build) packageJson.scripts.build = 'next build';
            if (!packageJson.scripts.start) packageJson.scripts.start = 'next start';
            if (!packageJson.scripts.lint) packageJson.scripts.lint = 'next lint';
            
            finalContent = JSON.stringify(packageJson, null, 2);
            console.log(`🔧 Fixed package.json dev script for Docker compatibility`);
            console.log(`🔍 New package.json dev script:`, packageJson.scripts.dev);
          } catch (error) {
            console.error(`❌ Failed to fix package.json:`, error);
          }
        }
        
            // Clean TypeScript/JavaScript files from markdown contamination
            if (filename.endsWith('.ts') || filename.endsWith('.tsx') || filename.endsWith('.js') || filename.endsWith('.jsx')) {
              try {
                const cleanedContent = content
                  // Remove ALL markdown code block delimiters (most important!)
                  .replace(/^```.*$/gm, '') // Remove any line that starts with ```
                  .replace(/^```.*$/gm, '') // Remove any line that starts with ```
                  .replace(/```$/gm, '') // Remove any line that ends with ```
                  .replace(/```$/gm, '') // Remove any line that ends with ```
                  // Remove markdown headers and formatting
                  .replace(/^###.*$/gm, '') // Remove markdown headers
                  .replace(/^\s*[-*+]\s.*$/gm, '') // Remove markdown list items
                  .replace(/^\s*#\s.*$/gm, '') // Remove markdown comments
                  // Remove common markdown contamination
                  .replace(/^,\->\s*```.*$/gm, '') // Remove the specific error pattern
                  .replace(/^\|.*$/gm, '') // Remove markdown table rows
                  .replace(/^`.*`$/gm, '') // Remove inline code blocks
                  // Remove numbered lists and bullet points
                  .replace(/^\d+\.\s.*$/gm, '') // Remove numbered lists
                  .replace(/^\*\s.*$/gm, '') // Remove bullet points
                  .replace(/^-\s.*$/gm, '') // Remove dash lists
                  // Remove accessibility notes and other markdown text
                  .replace(/^\*\*.*\*\*.*$/gm, '') // Remove bold text
                  .replace(/^.*WCAG.*$/gm, '') // Remove WCAG references
                  .replace(/^.*accessibility.*$/gmi, '') // Remove accessibility notes
                  // Remove any lines that start with numbers followed by text (like "1. **WCAG 2.1 AA Compliance**")
                  .replace(/^\d+\.\s*\*\*.*\*\*.*$/gm, '')
                  // Remove any remaining markdown-style text
                  .replace(/^.*\*\*.*\*\*.*$/gm, '')
                  // Remove any lines that are just markdown formatting
                  .replace(/^[`~]{3,}.*$/gm, '') // Remove any line with 3+ backticks or tildes
                  // Remove leading/trailing whitespace and empty lines
                  .trim();
                
                // Check if the cleaned content is still contaminated or empty
                if (cleanedContent.includes('```') || cleanedContent.includes('###') || cleanedContent.length < 10) {
                  console.log(`⚠️ File ${filename} still contaminated after cleaning, using fallback template`);
                  finalContent = this.getFallbackFileContent(filename, config.projectId);
                } else {
                  finalContent = cleanedContent;
                }
              } catch (error) {
                console.log(`⚠️ Failed to clean ${filename}, using fallback template:`, error);
                finalContent = this.getFallbackFileContent(filename, config.projectId);
              }
            }
        
        // Clean CSS files from markdown contamination
        if (filename.endsWith('.css')) {
          try {
            let cleanedContent = content
              // Remove markdown code block syntax - more aggressive pattern
              .replace(/^```(typescript|javascript|css|scss|sass|ts|js)?\s*$/gm, '') // Remove opening code blocks
              .replace(/^```\s*$/gm, '') // Remove closing code blocks
              // Remove markdown headers and formatting
              .replace(/^###.*$/gm, '') // Remove markdown headers
              .replace(/^\s*[-*+]\s.*$/gm, '') // Remove markdown list items
              .replace(/^\s*#\s.*$/gm, '') // Remove markdown comments
              // Remove common markdown contamination
              .replace(/^\s*<!--.*-->\s*$/gm, '') // Remove HTML comments
              .replace(/^\s*\/\*.*\*\/\s*$/gm, '') // Remove CSS comments
              .replace(/^\s*\/\/.*$/gm, '') // Remove single-line comments
              // Remove any lines that start with markdown patterns
              .replace(/^\s*```.*$/gm, '') // Remove any remaining code block markers
              .replace(/^\s*\|.*$/gm, '') // Remove markdown table rows
              .replace(/^\s*[`~].*$/gm, '') // Remove code markers
              .trim();
            
            // Find the first line that looks like valid CSS
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
            } else {
              // If no valid CSS found, use the default template
              cleanedContent = `@tailwind base;
@tailwind components;
@tailwind utilities;


:root {
  --foreground-rgb: 0, 0, 0;
  --background-start-rgb: 214, 219, 220;
  --background-end-rgb: 255, 255, 255;
}

@media (prefers-color-scheme: dark) {
  :root {
    --foreground-rgb: 255, 255, 255;
    --background-start-rgb: 0, 0, 0;
    --background-end-rgb: 0, 0, 0;
  }
}

body {
  color: rgb(var(--foreground-rgb));
  background: linear-gradient(
      to bottom,
      transparent,
      rgb(var(--background-end-rgb))
    )
    rgb(var(--background-start-rgb));
}

@layer utilities {
  .text-balance {
    text-wrap: balance;
  }
}`;
            }
            
            // Validate that it contains valid CSS
            if (cleanedContent.includes('@') || cleanedContent.includes('{') || cleanedContent.includes('}') || cleanedContent.includes(':')) {
              finalContent = cleanedContent;
              console.log(`🔧 Cleaned ${filename} from markdown contamination`);
            } else {
              console.warn(`⚠️ ${filename} appears to be empty or invalid after cleaning, using default template`);
              finalContent = `@tailwind base;
@tailwind components;
@tailwind utilities;`;
            }
          } catch (error) {
            console.error(`❌ Failed to clean ${filename}:`, error);
            // Fallback to default CSS
            finalContent = `@tailwind base;
@tailwind components;
@tailwind utilities;`;
          }
        }
        
        // Fix next.config.js for valid JavaScript syntax
        if (filename === 'next.config.js') {
          try {
            // Remove everything after module.exports and clean up markdown
            let cleanedContent = content
              .replace(/###.*$/gm, '') // Remove markdown headers
              .replace(/^\s*[-*+]\s.*$/gm, '') // Remove markdown list items
              .replace(/```.*$/gm, '') // Remove markdown code blocks
              .replace(/^\s*#\s.*$/gm, '') // Remove markdown comments
              .replace(/^\s*\/\/.*$/gm, '') // Remove single-line comments
              .replace(/\/\*[\s\S]*?\*\//gm, '') // Remove multi-line comments
              .trim();
            
            // Find the module.exports statement and remove everything after it
            const moduleExportsIndex = cleanedContent.indexOf('module.exports');
            if (moduleExportsIndex !== -1) {
              // Find the end of the module.exports statement (after the semicolon)
              const semicolonIndex = cleanedContent.indexOf(';', moduleExportsIndex);
              if (semicolonIndex !== -1) {
                cleanedContent = cleanedContent.substring(0, semicolonIndex + 1);
              } else {
                // If no semicolon, find the end of the line
                const newlineIndex = cleanedContent.indexOf('\n', moduleExportsIndex);
                if (newlineIndex !== -1) {
                  cleanedContent = cleanedContent.substring(0, newlineIndex);
                }
              }
            }
            
            // Ensure it starts with proper JavaScript and has valid syntax
            if (!cleanedContent.startsWith('/**') && !cleanedContent.startsWith('const') && !cleanedContent.startsWith('module.exports')) {
              cleanedContent = `/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Remove deprecated appDir option
  },
  // Enable static exports if needed
  output: 'standalone',
  // Disable telemetry via environment variable instead
}

module.exports = nextConfig;`;
            }
            
            // Validate the JavaScript syntax
            try {
              new Function(cleanedContent);
            } catch (syntaxError: unknown) {
              console.warn(`⚠️ Invalid JavaScript in next.config.js, using fallback:`, syntaxError instanceof Error ? syntaxError.message : String(syntaxError));
              cleanedContent = `/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {},
  output: 'standalone',
}

module.exports = nextConfig;`;
            }
            
            finalContent = cleanedContent;
            console.log(`🔧 Fixed next.config.js for valid JavaScript syntax`);
          } catch (error) {
            console.error(`❌ Failed to fix next.config.js:`, error);
            // Use a safe fallback
            finalContent = `/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {},
  output: 'standalone',
}

module.exports = nextConfig;`;
          }
        }
        
        // Fix tsconfig.json for valid JSON syntax
        if (filename === 'tsconfig.json') {
          try {
            // Clean up any markdown or invalid content
            let cleanedContent = content
              .replace(/###.*$/gm, '') // Remove markdown headers
              .replace(/^\s*[-*+]\s.*$/gm, '') // Remove markdown list items
              .replace(/```.*$/gm, '') // Remove markdown code blocks
              .replace(/^\s*#\s.*$/gm, '') // Remove markdown comments
              .replace(/^\s*\/\/.*$/gm, '') // Remove single-line comments
              .replace(/\/\*[\s\S]*?\*\//gm, '') // Remove multi-line comments
              .trim();
            
            // Find the first { and last } to extract valid JSON
            const firstBrace = cleanedContent.indexOf('{');
            const lastBrace = cleanedContent.lastIndexOf('}');
            
            if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
              cleanedContent = cleanedContent.substring(firstBrace, lastBrace + 1);
            }
            
            // Validate JSON syntax
            try {
              JSON.parse(cleanedContent);
              finalContent = cleanedContent;
              console.log(`🔧 Fixed tsconfig.json for valid JSON syntax`);
            } catch (jsonError: unknown) {
              console.warn(`⚠️ Invalid JSON in tsconfig.json, using fallback:`, jsonError instanceof Error ? jsonError.message : String(jsonError));
              finalContent = `{
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
}`;
            }
          } catch (error) {
            console.error(`❌ Failed to fix tsconfig.json:`, error);
            // Use a safe fallback
            finalContent = `{
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
}`;
          }
        }
        
        await writeFile(filePath, finalContent);
        console.log(`  ✅ Created: ${filename}`);
        
        // Log package.json content for debugging
        if (filename === 'package.json') {
          console.log(`📦 Package.json content:`, finalContent.substring(0, 500) + '...');
        }
      }

      // Create missing Next.js app files to prevent module not found errors
      console.log(`🔧 Creating missing Next.js app files...`);
      
      // Create error.tsx if it doesn't exist
      const errorFilePath = join(projectDir, 'src/app/error.tsx');
      try {
        await access(errorFilePath);
        console.log(`✅ error.tsx already exists`);
      } catch {
        const errorContent = `'use client'

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
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Something went wrong!</h2>
          <p className="text-gray-600 mb-6">
            {error.message || 'An unexpected error occurred'}
          </p>
          <button
            onClick={reset}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            Try again
          </button>
        </div>
      </div>
    </div>
  )
}`;
        await writeFile(errorFilePath, errorContent);
        console.log(`✅ Created error.tsx`);
      }

      // Create loading.tsx if it doesn't exist
      const loadingFilePath = join(projectDir, 'src/app/loading.tsx');
      try {
        await access(loadingFilePath);
        console.log(`✅ loading.tsx already exists`);
      } catch {
        const loadingContent = `export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading...</p>
      </div>
    </div>
  )
}`;
        await writeFile(loadingFilePath, loadingContent);
        console.log(`✅ Created loading.tsx`);
      }

      // Create not-found.tsx if it doesn't exist
      const notFoundFilePath = join(projectDir, 'src/app/not-found.tsx');
      try {
        await access(notFoundFilePath);
        console.log(`✅ not-found.tsx already exists`);
      } catch {
        const notFoundContent = `import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Not Found</h2>
        <p className="text-gray-600 mb-6">Could not find requested resource</p>
        <Link
          href="/"
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
        >
          Return Home
        </Link>
      </div>
    </div>
  )
}`;
        await writeFile(notFoundFilePath, notFoundContent);
        console.log(`✅ Created not-found.tsx`);
      }

      // Create global-error.tsx if it doesn't exist
      const globalErrorFilePath = join(projectDir, 'src/app/global-error.tsx');
      try {
        await access(globalErrorFilePath);
        console.log(`✅ global-error.tsx already exists`);
      } catch {
        const globalErrorContent = `'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html>
      <body>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Something went wrong!</h2>
              <p className="text-gray-600 mb-6">
                {error.message || 'An unexpected error occurred'}
              </p>
              <button
                onClick={reset}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  )
}`;
        await writeFile(globalErrorFilePath, globalErrorContent);
        console.log(`✅ Created global-error.tsx`);
      }

      // Create globals.css if it doesn't exist
      const globalsCssFilePath = join(projectDir, 'src/app/globals.css');
      try {
        await access(globalsCssFilePath);
        console.log(`✅ globals.css already exists`);
      } catch {
        const globalsCssContent = `@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --foreground-rgb: 0, 0, 0;
  --background-start-rgb: 214, 219, 220;
  --background-end-rgb: 255, 255, 255;
}

@media (prefers-color-scheme: dark) {
  :root {
    --foreground-rgb: 255, 255, 255;
    --background-start-rgb: 0, 0, 0;
    --background-end-rgb: 0, 0, 0;
  }
}

body {
  color: rgb(var(--foreground-rgb));
  background: linear-gradient(
      to bottom,
      transparent,
      rgb(var(--background-end-rgb))
    )
    rgb(var(--background-start-rgb));
}

@layer utilities {
  .text-balance {
    text-wrap: balance;
  }
}`;
        await writeFile(globalsCssFilePath, globalsCssContent);
        console.log(`✅ Created globals.css`);
      }

      // Create tailwind.config.js if it doesn't exist
      const tailwindConfigFilePath = join(projectDir, 'tailwind.config.js');
      try {
        await access(tailwindConfigFilePath);
        console.log(`✅ tailwind.config.js already exists`);
      } catch {
        const tailwindConfigContent = `/** @type {import('tailwindcss').Config} */
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
}`;
        await writeFile(tailwindConfigFilePath, tailwindConfigContent);
        console.log(`✅ Created tailwind.config.js`);
      }

      // Create postcss.config.js if it doesn't exist
      const postcssConfigFilePath = join(projectDir, 'postcss.config.js');
      try {
        await access(postcssConfigFilePath);
        console.log(`✅ postcss.config.js already exists`);
      } catch {
        const postcssConfigContent = `module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}`;
        await writeFile(postcssConfigFilePath, postcssConfigContent);
        console.log(`✅ Created postcss.config.js`);
      }

      // Create tsconfig.json if it doesn't exist
      const tsconfigFilePath = join(projectDir, 'tsconfig.json');
      try {
        await access(tsconfigFilePath);
        console.log(`✅ tsconfig.json already exists`);
      } catch {
        const tsconfigContent = `{
  "compilerOptions": {
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
}`;
        await writeFile(tsconfigFilePath, tsconfigContent);
        console.log(`✅ Created tsconfig.json`);
      }

      // Create .env file for the container
      const envContent = `NODE_ENV=development
PORT=3000
NEXT_TELEMETRY_DISABLED=1
NEXT_PUBLIC_APP_URL=http://localhost:3000
`;
      await writeFile(join(projectDir, '.env'), envContent);
      console.log(`🔧 Created .env file`);

      // Create .dockerignore file
      const dockerignoreContent = `node_modules
.next
.git
.env.local
.env.production
npm-debug.log*
yarn-debug.log*
yarn-error.log*
.DS_Store
*.pem
.vercel
`;
      await writeFile(join(projectDir, '.dockerignore'), dockerignoreContent);
      console.log(`🔧 Created .dockerignore file`);

      // Validate critical files exist before building
      const criticalFiles = ['package.json', 'next.config.js', 'src/app/page.tsx'];
      for (const file of criticalFiles) {
        const filePath = join(projectDir, file);
        try {
          await access(filePath);
          console.log(`✅ Verified: ${file}`);
        } catch {
          throw new Error(`Critical file missing: ${file}`);
        }
      }

      // Generate package-lock.json for consistent builds
      console.log(`📦 Generating package-lock.json...`);
      try {
        await execAsync('npm install --package-lock-only', { cwd: projectDir });
        console.log(`✅ Generated package-lock.json`);
      } catch (error) {
        console.log(`⚠️ Could not generate package-lock.json: ${error}, continuing with npm install...`);
      }

      // Build Docker image with optimizations
      const imageName = `sandbox-${config.id}`;
      
      // Use cross-platform approach for BuildKit
      const buildCommand = `docker build --no-cache --progress=plain -t ${imageName} ${projectDir}`;
      console.log(`🔨 Building Docker image: ${buildCommand}`);
      console.log(`⏳ This may take a few minutes for the first build...`);
      
      // Set BuildKit environment variable for the process
      const env = { ...process.env, DOCKER_BUILDKIT: '1' };
      await execAsync(buildCommand, { env });
      console.log(`✅ Docker image built successfully`);

      // Run container with resource limits and better configuration
      const containerName = `sandbox-${config.id}`;
      const runCommand = `docker run -d --name ${containerName} -p ${port}:3000 --env-file ${join(projectDir, '.env')} --memory=1g --cpus=1 --restart=unless-stopped ${imageName} npm run dev`;
      console.log(`🐳 Running container: ${runCommand}`);
      const { stdout } = await execAsync(runCommand);
      const containerId = stdout.trim();
      console.log(`✅ Container started with ID: ${containerId}`);

      // Wait for container to be ready
      console.log(`⏳ Waiting for container to be ready...`);
      await this.waitForContainerReady(containerId);

      const url = `http://localhost:${port}`;
      const status: SandboxStatus = {
        id: config.id,
        status: 'RUNNING',
        url,
        port,
        containerId,
        logs: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Update database
      await db.sandbox.upsert({
        where: { id: config.id },
        update: {
          status: 'RUNNING',
          url,
          port,
          e2bId: containerId, // Using e2bId field for container ID
          updatedAt: new Date()
        },
        create: {
          id: config.id,
          projectId: config.projectId,
          status: 'RUNNING',
          url,
          port,
          e2bId: containerId,
          type: 'DOCKER',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      console.log(`✅ Sandbox created successfully: ${url}`);
      console.log(`📁 Sandbox files are in: ${projectDir}`);
      console.log(`🔗 Live preview available at: ${url}`);
      console.log(`🆔 Container ID: ${containerId}`);

      console.log(`✅ Sandbox created successfully: ${url}`);
      return status;

    } catch (error) {
      console.error(`❌ Failed to create sandbox:`, error);
      throw error;
    }
  }

  private async checkApplicationHealth(url: string): Promise<boolean> {
    try {
      const response = await fetch(`${url}/api/health`, { 
        method: 'GET'
      });
      return response.ok;
    } catch {
      // Fallback to root endpoint if health endpoint fails
      try {
        const response = await fetch(url, { 
          method: 'GET'
        });
        return response.ok;
      } catch {
        return false;
      }
    }
  }

  private async waitForContainerReady(containerId: string, timeout = 120000): Promise<void> {
    console.log(`⏳ Waiting for container ${containerId} to be ready (timeout: ${timeout/1000}s)...`);
    
    const startTime = Date.now();
    let consecutiveFailures = 0;
    let readyDetected = false;
    
    while (Date.now() - startTime < timeout) {
      try {
        // Check container status
        const { stdout: status } = await execAsync(`docker inspect ${containerId} --format='{{.State.Status}}'`);
        const containerStatus = status.trim();
        
        // Get restart count
        const { stdout: restartCountStr } = await execAsync(`docker inspect ${containerId} --format='{{.RestartCount}}'`);
        const currentRestartCount = parseInt(restartCountStr.trim()) || 0;
        
        console.log(`📊 Container status: '${containerStatus}' (restarts: ${currentRestartCount}, ${Math.floor((Date.now() - startTime)/1000)}s elapsed)`);
        
        // If container is restarting too much, stop and rebuild
        if (currentRestartCount > 5) {
          console.log(`🔄 Container has restarted ${currentRestartCount} times. Stopping and rebuilding...`);
          await execAsync(`docker stop ${containerId}`);
          await execAsync(`docker rm ${containerId}`);
          throw new Error(`Container restarting too frequently (${currentRestartCount} times). Rebuild needed.`);
        }
        
        if (containerStatus === 'running') {
          // Get container logs to check if Next.js is ready
          const logs = await this.getContainerLogs(containerId);
          const logText = logs.join('\n');
          
          // Check for Next.js ready indicators
          const hasStartingMessage = logText.includes('Starting Next.js development server...');
          const hasLocalUrl = logText.includes('Local:        http://localhost:3000');
          const hasNetworkUrl = logText.includes('Network:      http://0.0.0.0:3000');
          const hasReadyMessage = logText.includes('✓ Ready in');
          
          // If we see "Ready in", Next.js is fully ready
          if (hasReadyMessage && !readyDetected) {
            console.log(`✅ Next.js is ready! Detected "Ready in" message`);
            readyDetected = true;
            
            // Give it a moment to fully stabilize
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            // Try to connect to the app
            const port = await this.getContainerPort(containerId);
            const url = `http://localhost:${port}`;
            
            // Try health check up to 3 times
            for (let attempt = 1; attempt <= 3; attempt++) {
              console.log(`🔍 Health check attempt ${attempt}/3 for ${url}`);
              
              if (await this.checkApplicationHealth(url)) {
                console.log(`✅ Container is ready! App accessible at ${url}`);
                return;
              }
              
              if (attempt < 3) {
                console.log(`⏳ Health check failed, retrying in 3s...`);
                await new Promise(resolve => setTimeout(resolve, 3000));
              }
            }
            
            // If health checks fail but Next.js is ready, consider it successful
            console.log(`⚠️ Health checks failed but Next.js is ready. Considering container ready.`);
            return;
          }
          
          // Wait for Next.js to fully initialize
          if (hasStartingMessage && (hasLocalUrl || hasNetworkUrl) && !readyDetected) {
            console.log(`⏳ Next.js starting detected, waiting for full initialization...`);
            await new Promise(resolve => setTimeout(resolve, 5000));
            continue;
          }
          
          // If not ready yet, wait longer
          if (!readyDetected) {
            console.log(`⏳ Next.js not fully ready yet, waiting...`);
            await new Promise(resolve => setTimeout(resolve, 5000));
            continue;
          }
        } else if (containerStatus === 'exited' || containerStatus === 'dead') {
          // Get exit code and error details
          const { stdout: exitCode } = await execAsync(`docker inspect ${containerId} --format='{{.State.ExitCode}}'`);
          const { stdout: error } = await execAsync(`docker inspect ${containerId} --format='{{.State.Error}}'`);
          
          throw new Error(`Container ${containerId} exited with status: ${containerStatus}, exit code: ${exitCode.trim()}, error: ${error.trim()}`);
        } else if (containerStatus === 'restarting') {
          console.log(`🔄 Container is restarting, waiting...`);
          await new Promise(resolve => setTimeout(resolve, 3000));
          continue;
        }
        
        // Wait before next check
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (error) {
        console.error(`❌ Error checking container status:`, error);
        consecutiveFailures++;
        
        if (consecutiveFailures >= 5) {
          throw new Error(`Too many consecutive failures (${consecutiveFailures}). Container may be in a bad state.`);
        }
        
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    // Timeout reached
    const logs = await this.getContainerLogs(containerId || '');
    console.error(`⏰ Timeout reached. Container logs:`, logs);
    
    // Check if Next.js is actually ready despite timeout
    const logText = logs.join('\n');
    if (logText.includes('✓ Ready in')) {
      console.log(`✅ Next.js is ready despite timeout. Considering container ready.`);
      return;
    }
    
    // Get detailed container info for debugging
    let detailedInfo = '';
    if (containerId) {
      try {
        detailedInfo = await this.getDetailedContainerInfo(containerId);
        console.error(`🔍 Detailed container info:`, detailedInfo);
      } catch (error) {
        console.error(`Failed to get detailed container info:`, error);
      }
    }
    
    throw new Error(`Container failed to start within ${timeout/1000}s timeout. Logs: ${logs.join('\n')}${detailedInfo ? '\n\nDetailed Info:\n' + detailedInfo : ''}`);
  }

  async getSandboxStatus(sandboxId: string): Promise<SandboxStatus | null> {
    try {
      const sandbox = await db.sandbox.findUnique({
        where: { id: sandboxId },
        include: { project: true }
      });

      if (!sandbox) return null;

      // Check if container is still running
      let containerStatus = 'STOPPED';
      if (sandbox.e2bId) {
        try {
          const { stdout } = await execAsync(`docker inspect ${sandbox.e2bId} --format='{{.State.Status}}'`);
          containerStatus = stdout.trim();
        } catch {
          containerStatus = 'STOPPED';
        }
      }

      const status: SandboxStatus = {
        id: sandbox.id,
        status: containerStatus === 'running' ? 'RUNNING' : 'STOPPED',
        url: sandbox.url,
        port: sandbox.port,
        containerId: sandbox.e2bId,
        logs: await this.getContainerLogs(sandbox.e2bId || ''),
        createdAt: sandbox.createdAt,
        updatedAt: sandbox.updatedAt
      };

      return status;
    } catch (error) {
      console.error(`❌ Failed to get sandbox status:`, error);
      return null;
    }
  }

  private async getContainerPort(containerId: string): Promise<number> {
    try {
      const { stdout } = await execAsync(`docker port ${containerId} 3000`);
      const portMatch = stdout.match(/:(\d+)/);
      return portMatch ? parseInt(portMatch[1]) : 3000;
    } catch {
      return 3000; // Default fallback
    }
  }

  async getContainerLogs(containerId: string): Promise<string[]> {
    try {
      const { stdout } = await execAsync(`docker logs ${containerId}`, {
        encoding: 'utf8',
        maxBuffer: 1024 * 1024 // 1MB buffer
      });
      return stdout.split('\n').filter(line => line.trim());
    } catch (error) {
      console.error(`Failed to get container logs:`, error);
      return [`Error getting logs: ${error}`];
    }
  }

  async getContainerInspect(containerId: string): Promise<unknown> {
    try {
      const { stdout } = await execAsync(`docker inspect ${containerId}`, {
        encoding: 'utf8',
        maxBuffer: 1024 * 1024
      });
      return JSON.parse(stdout);
    } catch (error) {
      console.error(`Failed to inspect container:`, error);
      return null;
    }
  }

  async getDetailedContainerInfo(containerId: string): Promise<string> {
    try {
      // Get container logs with timestamps
      const { stdout: logs } = await execAsync(`docker logs --timestamps ${containerId}`, {
        encoding: 'utf8',
        maxBuffer: 1024 * 1024
      });

      // Get container inspect info
      const { stdout: inspect } = await execAsync(`docker inspect ${containerId}`, {
        encoding: 'utf8',
        maxBuffer: 1024 * 1024
      });

      // Get container stats
      const { stdout: stats } = await execAsync(`docker stats --no-stream ${containerId}`, {
        encoding: 'utf8',
        maxBuffer: 1024 * 1024
      });

      return `
=== CONTAINER LOGS ===
${logs}

=== CONTAINER INSPECT ===
${inspect}

=== CONTAINER STATS ===
${stats}
      `.trim();
    } catch (error) {
      return `Error getting detailed container info: ${error}`;
    }
  }

  // Public method to manually check container logs
  async debugContainer(containerId: string): Promise<string> {
    return this.getDetailedContainerInfo(containerId);
  }

  // Get latest container ID for debugging
  async getLatestContainerId(): Promise<string | null> {
    try {
      const { stdout } = await execAsync('docker ps -a --filter "name=sandbox-" --format "{{.Names}}" --latest');
      const containerName = stdout.trim();
      if (containerName) {
        return containerName;
      }
      return null;
    } catch (error) {
      console.error('Failed to get latest container ID:', error);
      return null;
    }
  }

  async stopSandbox(sandboxId: string): Promise<boolean> {
    try {
      const sandbox = await db.sandbox.findUnique({
        where: { id: sandboxId }
      });

      if (!sandbox || !sandbox.e2bId) return false;

      // Stop container
      await execAsync(`docker stop ${sandbox.e2bId}`);
      
      // Remove container
      await execAsync(`docker rm ${sandbox.e2bId}`);

      // Release port
      if (sandbox.port) {
        await this.releasePort(sandbox.port);
      }

      // Update database
      await db.sandbox.update({
        where: { id: sandboxId },
        data: {
          status: 'STOPPED',
          updatedAt: new Date()
        }
      });

      console.log(`✅ Sandbox stopped: ${sandboxId}`);
      return true;
    } catch {
      console.error(`❌ Failed to stop sandbox`);
      return false;
    }
  }

  async restartSandbox(sandboxId: string): Promise<boolean> {
    try {
      const sandbox = await db.sandbox.findUnique({
        where: { id: sandboxId }
      });

      if (!sandbox || !sandbox.e2bId) return false;

      // Restart container
      await execAsync(`docker restart ${sandbox.e2bId}`);

      // Update database
      await db.sandbox.update({
        where: { id: sandboxId },
        data: {
          status: 'RUNNING',
          updatedAt: new Date()
        }
      });

      console.log(`✅ Sandbox restarted: ${sandboxId}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to restart sandbox:`, error);
      return false;
    }
  }

  async listSandboxes(): Promise<SandboxStatus[]> {
    try {
      const sandboxes = await db.sandbox.findMany({
        include: { project: true }
      });

      return await Promise.all(
        sandboxes.map(async (sandbox) => {
          const status = await this.getSandboxStatus(sandbox.id);
          return status || {
            id: sandbox.id,
            status: 'ERROR',
            url: sandbox.url,
            port: sandbox.port,
            containerId: sandbox.e2bId,
            logs: [],
            createdAt: sandbox.createdAt,
            updatedAt: sandbox.updatedAt
          };
        })
      );
    } catch (error) {
      console.error(`❌ Failed to list sandboxes:`, error);
      return [];
    }
  }

  async cleanup(): Promise<void> {
    console.log('🧹 Starting cleanup of sandboxes...');
    
    try {
      // Get all running containers with our naming pattern
      const { stdout } = await execAsync('docker ps -a --format "{{.ID}} {{.Names}}"');
      const containers = stdout.split('\n').filter(line => line.trim());
      
      for (const container of containers) {
        const [containerId, containerName] = container.split(' ');
        
        if (containerName && containerName.includes('sandbox-')) {
          console.log(`🧹 Cleaning up container: ${containerName} (${containerId})`);
          
          try {
            // Stop the container
            await execAsync(`docker stop ${containerId}`);
            console.log(`✅ Stopped container: ${containerId}`);
            
            // Remove the container
            await execAsync(`docker rm ${containerId}`);
            console.log(`✅ Removed container: ${containerId}`);
          } catch (error) {
            console.error(`❌ Failed to cleanup container ${containerId}:`, error);
          }
        }
      }
      
      // Clean up unused images
      try {
        await execAsync('docker image prune -f');
        console.log('✅ Cleaned up unused images');
      } catch (error) {
        console.error('❌ Failed to cleanup images:', error);
      }
      
      console.log('✅ Cleanup completed');
    } catch (error) {
      console.error('❌ Error during cleanup:', error);
    }
  }

  async cleanupAndRebuild(sandboxId: string): Promise<boolean> {
    console.log(`🔄 Cleaning up and rebuilding sandbox: ${sandboxId}`);
    
    try {
      // Get sandbox info
      const sandbox = await db.sandbox.findUnique({
        where: { id: sandboxId }
      });
      
      if (!sandbox) {
        console.error(`❌ Sandbox ${sandboxId} not found`);
        return false;
      }
      
      // Stop and remove the container if it exists
      if (sandbox.e2bId) {
        try {
          await execAsync(`docker stop ${sandbox.e2bId}`);
          await execAsync(`docker rm ${sandbox.e2bId}`);
          console.log(`✅ Stopped and removed container: ${sandbox.e2bId}`);
        } catch {
          console.log(`⚠️ Container ${sandbox.e2bId} already stopped or doesn't exist`);
        }
      }
      
      // Remove the sandbox directory
      const projectDir = join(this.sandboxDir, sandboxId);
      try {
        await rmdir(projectDir, { recursive: true });
        console.log(`✅ Removed project directory: ${projectDir}`);
      } catch {
        console.log(`⚠️ Project directory ${projectDir} already removed or doesn't exist`);
      }
      
      // Delete the sandbox record
      await db.sandbox.delete({
        where: { id: sandboxId }
      });
      
      console.log(`✅ Successfully cleaned up sandbox: ${sandboxId}`);
      return true;
    } catch (error) {
      console.error(`❌ Error cleaning up sandbox ${sandboxId}:`, error);
      return false;
    }
  }

  private async ensurePackageJsonDependencies(content: string, framework: string): Promise<string> {
    try {
      // Parse the existing package.json
      const packageJson = JSON.parse(content);
      
      // Get the template with required dependencies
      const template = this.getPackageJsonTemplate(framework);
      
      // Ensure all required dependencies are present
      if (template.dependencies) {
        packageJson.dependencies = {
          ...template.dependencies,
          ...packageJson.dependencies
        };
      }
      
      if (template.devDependencies) {
        packageJson.devDependencies = {
          ...template.devDependencies,
          ...packageJson.devDependencies
        };
      }
      
      // Ensure scripts are present
      if (template.scripts) {
        packageJson.scripts = {
          ...template.scripts,
          ...packageJson.scripts
        };
      }
      
      console.log(`🔧 Ensured package.json has all required dependencies for ${framework}`);
      return JSON.stringify(packageJson, null, 2);
    } catch (error) {
      console.warn(`⚠️ Failed to ensure package.json dependencies, using template:`, error);
      return JSON.stringify(this.getPackageJsonTemplate(framework), null, 2);
    }
  }

  private getFallbackFileContent(filename: string, projectId: string): string {
    console.log(`🔧 Creating fallback template for ${filename}`);
    
    // Handle specific file types
    if (filename === 'tailwind.config.js') {
      return `/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
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
}`;
    }
    
    if (filename === 'package.json') {
      return `{
  "name": "nextjs-app",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev --hostname 0.0.0.0 --port 3000",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "next": "14.2.30",
    "react": "^18",
    "react-dom": "^18"
  },
  "devDependencies": {
    "typescript": "^5",
    "@types/node": "^20",
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "tailwindcss": "^3.3.0",
    "autoprefixer": "^10.0.1",
    "postcss": "^8"
  }
}`;
    }
    
    if (filename === 'next.config.js') {
      return `/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
}

module.exports = nextConfig`;
    }
    
    if (filename === 'tsconfig.json') {
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
}`;
    }
    
    if (filename === 'postcss.config.js') {
      return `module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}`;
    }
    
    if (filename.endsWith('.css')) {
      return `@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --foreground-rgb: 0, 0, 0;
  --background-start-rgb: 214, 219, 220;
  --background-end-rgb: 255, 255, 255;
}

@media (prefers-color-scheme: dark) {
  :root {
    --foreground-rgb: 255, 255, 255;
    --background-start-rgb: 0, 0, 0;
    --background-end-rgb: 0, 0, 0;
  }
}

body {
  color: rgb(var(--foreground-rgb));
  background: linear-gradient(
      to bottom,
      transparent,
      rgb(var(--background-end-rgb))
    )
    rgb(var(--background-start-rgb));
}`;
    }
    
    // Default fallback for TypeScript/JavaScript files
    if (filename.endsWith('.ts') || filename.endsWith('.tsx') || filename.endsWith('.js') || filename.endsWith('.jsx')) {
      return `export default function Page() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Welcome to ${projectId}</h1>
        <p className="text-xl text-gray-600">Your application is ready!</p>
      </div>
    </div>
  );
}`;
    }
    
    return `// Fallback content for ${filename}`;
  }
}

// Export singleton instance
export const customSandboxService = new CustomSandboxService();