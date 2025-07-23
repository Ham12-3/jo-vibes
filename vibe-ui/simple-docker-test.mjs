import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 Simple Docker Test...\n');

const testDir = path.join(__dirname, 'simple-test');
const dockerfilePath = path.join(testDir, 'Dockerfile');
const packageJsonPath = path.join(testDir, 'package.json');
const serverPath = path.join(testDir, 'server.js');

try {
  // Create test directory
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }

  // Create simple package.json
  const packageJson = {
    name: "simple-test",
    version: "0.1.0",
    private: true,
    scripts: {
      start: "node server.js"
    },
    dependencies: {}
  };
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));

  // Create simple HTTP server
  const serverContent = `
const http = require('http');

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end('<h1>Hello from Docker!</h1>');
});

server.listen(3000, '0.0.0.0', () => {
  console.log('Server running at http://0.0.0.0:3000/');
});
`;
  fs.writeFileSync(serverPath, serverContent);

  // Create simple Dockerfile
  const dockerfile = `
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
`;
  fs.writeFileSync(dockerfilePath, dockerfile);

  console.log('📁 Created simple test files');

  // Build Docker image
  console.log('🔨 Building Docker image...');
  execSync(`docker build -t simple-test ${testDir}`, { 
    encoding: 'utf8',
    stdio: 'inherit'
  });

  // Run container
  console.log('🐳 Running container...');
  const containerId = execSync(`docker run -d --name simple-test-container -p 4002:3000 simple-test`, { 
    encoding: 'utf8' 
  }).trim();
  console.log(`✅ Container started with ID: ${containerId}`);

  // Wait for container to be ready
  console.log('⏳ Waiting for container to be ready...');
  let attempts = 0;
  const maxAttempts = 30;
  
  while (attempts < maxAttempts) {
    try {
      const status = execSync(`docker inspect simple-test-container --format='{{.State.Status}}'`, { 
        encoding: 'utf8' 
      }).trim();
      
      console.log(`📊 Container status (attempt ${attempts + 1}/${maxAttempts}): ${status}`);
      
      if (status === 'running') {
        console.log('✅ Container is running');
        
        // Check if the application is responding
        console.log('🌐 Checking if application is responding...');
        try {
          const response = await fetch('http://localhost:4002', { 
            method: 'GET'
          });
          if (response.ok) {
            const text = await response.text();
            console.log('✅ Application is responding!');
            console.log('📄 Response:', text);
            break;
          } else {
            console.log(`⏳ Application not responding yet (status: ${response.status})`);
          }
        } catch {
          console.log('⏳ Application not responding yet, continuing to wait...');
        }
      } else if (status === 'exited') {
        const logs = execSync(`docker logs simple-test-container`, { encoding: 'utf8' });
        console.log('❌ Container exited. Logs:', logs);
        throw new Error('Container exited unexpectedly');
      }
    } catch {
      console.log(`⏳ Container not ready yet... (attempt ${attempts + 1}/${maxAttempts})`);
    }
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    attempts++;
  }

  if (attempts >= maxAttempts) {
    console.log('❌ Container failed to start within timeout');
    
    // Get container logs
    try {
      const logs = execSync(`docker logs simple-test-container`, { encoding: 'utf8' });
      console.log('📝 Container logs:', logs);
    } catch {
      console.log('⚠️ Could not get container logs');
    }
  } else {
    console.log('🎉 Simple test is ready at: http://localhost:4002');
  }

  // Cleanup
  console.log('\n🧹 Cleaning up...');
  try {
    execSync('docker stop simple-test-container');
    execSync('docker rm simple-test-container');
    execSync('docker rmi simple-test');
    console.log('✅ Cleanup completed');
  } catch {
    console.log('⚠️ Cleanup failed');
  }

} catch (error) {
  console.log('❌ Test failed:', error.message);
} finally {
  // Clean up test directory
  if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true, force: true });
  }
}

console.log('\n🏁 Simple Docker test completed!'); 