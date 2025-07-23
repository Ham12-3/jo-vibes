import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 Debugging Sandbox Creation...\n');

// Find the most recent sandbox directory
const sandboxesDir = path.join(__dirname, 'sandboxes');
if (!fs.existsSync(sandboxesDir)) {
  console.log('❌ No sandboxes directory found');
  process.exit(1);
}

const sandboxDirs = fs.readdirSync(sandboxesDir)
  .filter(dir => fs.statSync(path.join(sandboxesDir, dir)).isDirectory())
  .sort((a, b) => {
    const aTime = fs.statSync(path.join(sandboxesDir, a)).mtime.getTime();
    const bTime = fs.statSync(path.join(sandboxesDir, b)).mtime.getTime();
    return bTime - aTime;
  });

if (sandboxDirs.length === 0) {
  console.log('❌ No sandbox directories found');
  process.exit(1);
}

const latestSandbox = sandboxDirs[0];
const sandboxPath = path.join(sandboxesDir, latestSandbox);

console.log(`📁 Inspecting latest sandbox: ${latestSandbox}\n`);

// List all files in the sandbox
console.log('📋 Files in sandbox:');
const listFiles = (dir, prefix = '') => {
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    const relativePath = path.relative(sandboxPath, fullPath);
    
    if (stat.isDirectory()) {
      console.log(`${prefix}📁 ${relativePath}/`);
      listFiles(fullPath, prefix + '  ');
    } else {
      console.log(`${prefix}📄 ${relativePath}`);
    }
  }
};

listFiles(sandboxPath);

// Check key files
console.log('\n🔍 Inspecting key files:');

// Check package.json
const packageJsonPath = path.join(sandboxPath, 'package.json');
if (fs.existsSync(packageJsonPath)) {
  console.log('\n📦 package.json:');
  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    console.log(JSON.stringify(packageJson, null, 2));
  } catch (error) {
    console.log('❌ Invalid JSON:', error.message);
  }
} else {
  console.log('❌ package.json not found');
}

// Check Dockerfile
const dockerfilePath = path.join(sandboxPath, 'Dockerfile');
if (fs.existsSync(dockerfilePath)) {
  console.log('\n🐳 Dockerfile:');
  console.log(fs.readFileSync(dockerfilePath, 'utf8'));
} else {
  console.log('❌ Dockerfile not found');
}

// Check if there are any error logs
console.log('\n🔍 Checking for any error logs...');
try {
  const containers = execSync('docker ps -a --format "table {{.Names}}\t{{.Status}}"', { encoding: 'utf8' });
  console.log('📋 Recent containers:');
  console.log(containers);
  
  // Get logs from the most recent container
  const recentContainer = execSync('docker ps -a --format "{{.Names}}" | head -1', { encoding: 'utf8' }).trim();
  if (recentContainer) {
    console.log(`\n📝 Logs from ${recentContainer}:`);
    try {
      const logs = execSync(`docker logs ${recentContainer}`, { encoding: 'utf8' });
      console.log(logs);
    } catch (error) {
      console.log('❌ Could not get logs:', error.message);
    }
  }
} catch (error) {
  console.log('❌ Could not check containers:', error.message);
}

console.log('\n�� Debug complete!'); 