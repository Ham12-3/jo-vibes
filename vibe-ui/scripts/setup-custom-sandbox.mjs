#!/usr/bin/env node

import { execSync } from 'child_process';
import { writeFile, mkdir, access } from 'fs/promises';
import { join } from 'path';

console.log('🐳 Setting up Custom Docker Sandbox System...\n');

// Check if Docker is installed
try {
  execSync('docker --version', { stdio: 'pipe' });
  console.log('✅ Docker is installed');
} catch {
  console.error('❌ Docker is not installed or not running');
  console.log('Please install Docker Desktop from: https://www.docker.com/products/docker-desktop/');
  process.exit(1);
}

// Check if Docker daemon is running
try {
  execSync('docker ps', { stdio: 'pipe' });
  console.log('✅ Docker daemon is running');
} catch {
  console.error('❌ Docker daemon is not running');
  console.log('Please start Docker Desktop and try again');
  process.exit(1);
}

// Create sandboxes directory
const sandboxesDir = join(process.cwd(), 'sandboxes');
try {
  await access(sandboxesDir);
  console.log('✅ Sandboxes directory already exists');
} catch {
  await mkdir(sandboxesDir, { recursive: true });
  console.log('✅ Created sandboxes directory');
}

// Create .env file if it doesn't exist
const envFile = join(process.cwd(), '.env');
try {
  await access(envFile);
  console.log('✅ .env file already exists');
} catch {
  const envContent = `# Custom Sandbox Configuration
DATABASE_URL="file:./dev.db"
NODE_ENV=development

# Docker Configuration
DOCKER_HOST=localhost
SANDBOX_BASE_PORT=4000
SANDBOX_MAX_CONTAINERS=10

# Redis Configuration (optional)
REDIS_URL=redis://localhost:6379
`;
  await writeFile(envFile, envContent);
  console.log('✅ Created .env file with default configuration');
}

// Test Docker build
console.log('\n🔨 Testing Docker build...');
try {
  const dockerfilePath = join(process.cwd(), 'docker', 'Dockerfile');
  try {
    await access(dockerfilePath);
    execSync('docker build -t test-sandbox docker/', { 
      stdio: 'inherit',
      cwd: process.cwd()
    });
    console.log('✅ Docker build test successful');
    
    // Clean up test image
    execSync('docker rmi test-sandbox', { stdio: 'pipe' });
  } catch {
    console.log('⚠️  Dockerfile not found, skipping build test');
  }
} catch {
  console.error('❌ Docker build test failed');
  console.log('This is okay for initial setup, you can test later');
}

// Create sample project files
const sampleProjectDir = join(sandboxesDir, 'sample-project');
try {
  await access(sampleProjectDir);
  console.log('✅ Sample project files already exist');
} catch {
  await mkdir(sampleProjectDir, { recursive: true });
  
  // Create sample package.json
  const packageJson = {
    name: "sample-project",
    version: "0.1.0",
    private: true,
    scripts: {
      dev: "next dev",
      build: "next build",
      start: "next start"
    },
    dependencies: {
      next: "latest",
      react: "latest",
      "react-dom": "latest"
    }
  };
  
  await writeFile(
    join(sampleProjectDir, 'package.json'),
    JSON.stringify(packageJson, null, 2)
  );
  
  // Create sample Dockerfile
  const dockerfile = `FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]`;
  
  await writeFile(join(sampleProjectDir, 'Dockerfile'), dockerfile);
  
  // Create sample Next.js files
  const pagesDir = join(sampleProjectDir, 'pages');
  await mkdir(pagesDir, { recursive: true });
  
  const indexJs = `export default function Home() {
  return (
    <div>
      <h1>Hello from Custom Sandbox!</h1>
      <p>This is a sample Next.js project running in Docker.</p>
    </div>
  );
}`;
  
  await writeFile(join(pagesDir, 'index.js'), indexJs);
  
  console.log('✅ Created sample project files');
}

console.log('\n🎉 Custom Sandbox Setup Complete!');
console.log('\n📋 Next Steps:');
console.log('1. Start your Next.js application: npm run dev');
console.log('2. Navigate to the Custom Sandbox Manager in your app');
console.log('3. Create your first sandbox using the UI');
console.log('4. Your sandboxes will run on ports starting from 4000');
console.log('\n🔧 Useful Commands:');
console.log('- List running containers: docker ps');
console.log('- View container logs: docker logs <container-id>');
console.log('- Stop all sandboxes: docker stop $(docker ps -q --filter "name=sandbox-")');
console.log('- Clean up: docker system prune -f'); 