const { spawn } = require('child_process');
const { writeFileSync, mkdirSync, existsSync } = require('fs');
const { join, dirname } = require('path');
const { tmpdir } = require('os');

// Test the custom sandbox with a simple cold water website
async function testSandbox() {
  console.log('🧪 Testing Custom Sandbox with Cold Water Website...');
  
  const projectId = 'cold-water-test';
  const sandboxId = `custom_${projectId}_${Date.now()}`;
  const port = 3001;
  const tempDir = join(tmpdir(), `sandbox_${sandboxId}`);
  
  console.log(`📁 Temp directory: ${tempDir}`);
  console.log(`🌐 Port: ${port}`);
  
  // Create test files for a cold water website
  const testFiles = [
    {
      path: 'src/app/page.tsx',
      content: `import React from 'react'

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
}`
    },
    {
      path: 'src/app/layout.tsx',
      content: `import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Cold Water Website',
  description: 'A website about cold water experiences',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}`
    },
    {
      path: 'src/app/globals.css',
      content: `@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
}`
    },
    {
      path: 'package.json',
      content: JSON.stringify({
        name: 'cold-water-website',
        version: '0.1.0',
        private: true,
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
      }, null, 2)
    },
    {
      path: 'next.config.js',
      content: `/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
  swcMinify: true,
}

module.exports = nextConfig`
    },
    {
      path: 'tsconfig.json',
      content: `{
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
    },
    {
      path: 'tailwind.config.js',
      content: `/** @type {import('tailwindcss').Config} */
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
    },
    {
      path: 'postcss.config.js',
      content: `module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}`
    }
  ];
  
  try {
    // Create temporary directory
    if (!existsSync(tempDir)) {
      mkdirSync(tempDir, { recursive: true });
    }
    
    // Write all files
    console.log('📝 Writing test files...');
    for (const file of testFiles) {
      const filePath = join(tempDir, file.path);
      const dirPath = dirname(filePath);
      
      if (!existsSync(dirPath)) {
        mkdirSync(dirPath, { recursive: true });
      }
      
      writeFileSync(filePath, file.content);
      console.log(`  ✅ ${file.path}`);
    }
    
    // Install dependencies
    console.log('📦 Installing dependencies...');
    const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    console.log(`Using npm command: ${npmCommand}`);
    
    const installProcess = spawn(npmCommand, ['install'], {
      cwd: tempDir,
      stdio: 'pipe',
      shell: true
    });
    
    await new Promise((resolve, reject) => {
      installProcess.on('close', (code) => {
        if (code === 0) {
          console.log('✅ Dependencies installed successfully');
          resolve();
        } else {
          reject(new Error(`npm install failed with code ${code}`));
        }
      });
    });
    
    // Start the dev server
    console.log('🚀 Starting Next.js dev server...');
    const command = process.platform === 'win32' ? 'npx.cmd' : 'npx';
    const args = ['next', 'dev', '--port', port.toString(), '--hostname', '0.0.0.0'];
    console.log(`Using command: ${command} ${args.join(' ')}`);
    
    const devProcess = spawn(command, args, {
      cwd: tempDir,
      stdio: 'pipe',
      shell: true
    });
    
    let stdout = '';
    let stderr = '';
    
    devProcess.stdout?.on('data', (data) => {
      stdout += data.toString();
      console.log(`📤 stdout: ${data.toString().trim()}`);
    });
    
    devProcess.stderr?.on('data', (data) => {
      stderr += data.toString();
      console.log(`📤 stderr: ${data.toString().trim()}`);
    });
    
    devProcess.on('error', (error) => {
      console.error('❌ Dev server error:', error);
      console.error('stdout:', stdout);
      console.error('stderr:', stderr);
    });
    
    devProcess.on('close', (code) => {
      console.log(`🔚 Dev server closed with code ${code}`);
      console.log('Final stdout:', stdout);
      console.log('Final stderr:', stderr);
    });
    
    // Wait for server to start
    console.log('⏳ Waiting for server to start...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    // Test the server
    console.log(`🔍 Testing server at http://localhost:${port}`);
    try {
      const response = await fetch(`http://localhost:${port}`);
      const html = await response.text();
      console.log('✅ Server is responding!');
      console.log('📄 HTML preview (first 500 chars):');
      console.log(html.substring(0, 500));
    } catch (error) {
      console.error('❌ Failed to fetch from server:', error);
    }
    
    // Keep the server running for a bit
    console.log('⏳ Keeping server running for 30 seconds...');
    await new Promise(resolve => setTimeout(resolve, 30000));
    
    // Clean up
    devProcess.kill('SIGTERM');
    console.log('🧹 Cleanup complete');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testSandbox().catch(console.error); 