import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 Testing Docker Sandbox Setup...\n');

// Test 1: Check if Docker is running
console.log('1. Checking Docker status...');
try {
  const dockerVersion = execSync('docker --version', { encoding: 'utf8' });
  console.log('✅ Docker is installed:', dockerVersion.trim());
} catch {
  console.log('❌ Docker is not installed or not in PATH');
  process.exit(1);
}

// Test 2: Check if Docker daemon is running
console.log('\n2. Checking Docker daemon...');
try {
  execSync('docker ps', { encoding: 'utf8' });
  console.log('✅ Docker daemon is running');
} catch {
  console.log('❌ Docker daemon is not running. Please start Docker Desktop or Docker daemon.');
  process.exit(1);
}

// Test 3: Test Docker build with a simple project
console.log('\n3. Testing Docker build with simple Next.js project...');

const testDir = path.join(__dirname, 'test-sandbox');
const dockerfilePath = path.join(testDir, 'Dockerfile');
const packageJsonPath = path.join(testDir, 'package.json');
const indexPath = path.join(testDir, 'src', 'app', 'page.tsx');

try {
  // Create test directory
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }
  if (!fs.existsSync(path.dirname(indexPath))) {
    fs.mkdirSync(path.dirname(indexPath), { recursive: true });
  }

  // Create simple package.json
  const packageJson = {
    name: "test-sandbox",
    version: "0.1.0",
    private: true,
    scripts: {
      dev: "next dev",
      build: "next build",
      start: "next start"
    },
    dependencies: {
      next: "14.0.0",
      react: "18.2.0",
      "react-dom": "18.2.0"
    }
  };
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));

  // Create simple page
  const pageContent = `
export default function Home() {
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial' }}>
      <h1>Hello from Docker Sandbox!</h1>
      <p>If you can see this, the sandbox is working correctly.</p>
    </div>
  );
}
`;
  fs.writeFileSync(indexPath, pageContent);

  // Create Dockerfile with better configuration
  const dockerfile = `
FROM node:18-alpine
WORKDIR /app

# Install dependencies first (better caching)
COPY package*.json ./
RUN npm install --production=false

# Copy all project files
COPY . .

# Expose port
EXPOSE 3000

# Start the development server with host binding
CMD ["npm", "run", "dev", "--", "--hostname", "0.0.0.0"]
`;
  fs.writeFileSync(dockerfilePath, dockerfile);

  console.log('📁 Created test project files');

  // Build Docker image
  console.log('🔨 Building test Docker image...');
  const buildStart = Date.now();
  execSync(`docker build -t test-sandbox ${testDir}`, { 
    encoding: 'utf8',
    stdio: 'inherit'
  });
  const buildTime = Date.now() - buildStart;
  console.log(`✅ Docker build completed in ${buildTime}ms`);

  // Run container
  console.log('🐳 Running test container...');
  const containerId = execSync(`docker run -d --name test-sandbox-container -p 4001:3000 test-sandbox`, { 
    encoding: 'utf8' 
  }).trim();
  console.log(`✅ Container started with ID: ${containerId}`);

  // Wait for container to be ready with better debugging
  console.log('⏳ Waiting for container to be ready...');
  let attempts = 0;
  const maxAttempts = 60; // Increased from 30 to 60 (2 minutes)
  
  while (attempts < maxAttempts) {
    try {
      const status = execSync(`docker inspect test-sandbox-container --format='{{.State.Status}}'`, { 
        encoding: 'utf8' 
      }).trim();
      
      console.log(`📊 Container status (attempt ${attempts + 1}/${maxAttempts}): ${status}`);
      
      if (status === 'running') {
        console.log('✅ Container is running');
        
        // Check container logs for Next.js ready message
        try {
          const logs = execSync(`docker logs test-sandbox-container`, { encoding: 'utf8' });
          if (logs.includes('✓ Ready') || logs.includes('Ready in')) {
            console.log('✅ Next.js is ready!');
            
            // Give it a moment to fully start
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Check if the application is responding
            console.log('🌐 Checking if application is responding...');
            try {
              const response = await fetch('http://localhost:4001', { 
                method: 'GET'
              });
              if (response.ok) {
                console.log('✅ Application is responding!');
                break;
              } else {
                console.log(`⏳ Application not responding yet (status: ${response.status})`);
              }
            } catch {
              console.log('⏳ Application not responding yet, continuing to wait...');
            }
          } else {
            console.log('⏳ Next.js not ready yet, continuing to wait...');
          }
        } catch {
          console.log('⏳ Could not check logs, continuing to wait...');
        }
      } else if (status === 'exited') {
        const logs = execSync(`docker logs test-sandbox-container`, { encoding: 'utf8' });
        console.log('❌ Container exited. Logs:', logs);
        throw new Error('Container exited unexpectedly');
      } else if (status === 'created') {
        console.log('⏳ Container is created but not running yet...');
      }
    } catch {
      console.log(`⏳ Container not ready yet... (attempt ${attempts + 1}/${maxAttempts})`);
    }
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    attempts++;
  }

  if (attempts >= maxAttempts) {
    console.log('❌ Container failed to start within timeout');
    
    // Get detailed container information
    console.log('\n🔍 Debugging container failure...');
    try {
      const containerInfo = execSync(`docker inspect test-sandbox-container`, { encoding: 'utf8' });
      console.log('📋 Container info:', containerInfo);
      
      const logs = execSync(`docker logs test-sandbox-container`, { encoding: 'utf8' });
      console.log('📝 Container logs:', logs);
    } catch {
      console.log('⚠️ Could not get container debug info');
    }
  } else {
    console.log('🎉 Test sandbox is ready at: http://localhost:4001');
  }

  // Cleanup
  console.log('\n🧹 Cleaning up test container...');
  try {
    execSync('docker stop test-sandbox-container');
    execSync('docker rm test-sandbox-container');
    execSync('docker rmi test-sandbox');
    console.log('✅ Cleanup completed');
  } catch {
    console.log('⚠️ Cleanup failed');
  }

} catch {
  console.log('❌ Test failed');
} finally {
  // Clean up test directory
  if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true, force: true });
  }
}

console.log('\n🏁 Docker sandbox test completed!'); 