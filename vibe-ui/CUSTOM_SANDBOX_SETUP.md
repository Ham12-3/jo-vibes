# 🏗️ Custom Sandbox Setup Guide

## Overview

This guide shows you how to set up your own CodeSandbox-like service that runs locally on your server. This gives you:

- ✅ **No API rate limits**
- ✅ **No bot detection**
- ✅ **Full control over the environment**
- ✅ **Real Next.js/React development servers**
- ✅ **Local file system access**

## 🚀 Quick Setup

### 1. Enable Custom Sandbox

Add this to your `.env.local` file:

```bash
ENABLE_CUSTOM_SANDBOX=true
```

### 2. Requirements

Make sure you have these installed on your server:

- **Node.js** (v18 or higher)
- **npm** or **yarn**
- **Git** (for cloning projects)

### 3. How It Works

The custom sandbox service:

1. **Creates temporary directories** for each project
2. **Writes all generated files** to the temp directory
3. **Installs dependencies** automatically
4. **Starts a real dev server** (Next.js/React)
5. **Manages multiple sandboxes** on different ports
6. **Cleans up** when sandboxes are stopped

## 🔧 Configuration

### Environment Variables

```bash
# Enable custom sandbox
ENABLE_CUSTOM_SANDBOX=true

# Port range for sandboxes (optional)
CUSTOM_SANDBOX_START_PORT=3001
CUSTOM_SANDBOX_END_PORT=3010

# Timeout for server startup (optional)
CUSTOM_SANDBOX_TIMEOUT=30000
```

### Port Management

The service automatically assigns ports starting from 3001. Each sandbox gets its own port:

- Sandbox 1: `http://localhost:3001`
- Sandbox 2: `http://localhost:3002`
- etc.

## 🎯 Usage

### Creating a Sandbox

The system automatically tries the custom sandbox first when `ENABLE_CUSTOM_SANDBOX=true`:

```typescript
// This happens automatically in the E2B service
const sandbox = await customSandboxService.createSandbox({
  projectId: 'my-project',
  files: [
    { path: 'src/app/page.tsx', content: '...' },
    { path: 'package.json', content: '...' }
  ],
  framework: 'nextjs',
  port: 3001
})
```

### Managing Sandboxes

```typescript
// List all active sandboxes
const sandboxes = await customSandboxService.listActiveSandboxes()

// Stop a specific sandbox
await customSandboxService.stopSandbox('sandbox-id')

// Get sandbox info
const info = await customSandboxService.getSandboxInfo('sandbox-id')

// Clean up all sandboxes
await customSandboxService.cleanup()
```

## 🌐 API Endpoints

### List Sandboxes
```bash
GET /api/sandbox
```

### Create Sandbox
```bash
POST /api/sandbox
{
  "projectId": "my-project",
  "files": [...],
  "framework": "nextjs",
  "port": 3001
}
```

### Stop Sandbox
```bash
DELETE /api/sandbox?id=sandbox-id
```

## 🔒 Security Considerations

### File System Access
- Sandboxes run in temporary directories
- Files are automatically cleaned up when sandboxes stop
- Each sandbox is isolated

### Network Access
- Sandboxes bind to `0.0.0.0` for external access
- Consider using a reverse proxy for production
- Implement authentication if needed

### Resource Limits
- Monitor CPU and memory usage
- Implement sandbox timeouts
- Set maximum concurrent sandboxes

## 🚀 Production Deployment

### Docker Setup

```dockerfile
FROM node:18-alpine

# Install dependencies
RUN apk add --no-cache git

# Set up sandbox directories
RUN mkdir -p /tmp/sandboxes

# Copy your app
COPY . /app
WORKDIR /app

# Install dependencies
RUN npm install

# Expose ports
EXPOSE 3000 3001-3010

# Start the app
CMD ["npm", "start"]
```

### Reverse Proxy (Nginx)

```nginx
# Route sandbox requests to appropriate ports
location ~ ^/sandbox/(\d+)/(.*)$ {
    proxy_pass http://localhost:300$1/$2;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}
```

## 🐛 Troubleshooting

### Common Issues

1. **Port already in use**
   - The service automatically finds the next available port
   - Check if other services are using the port range

2. **Dependencies fail to install**
   - Ensure npm/yarn is available
   - Check network connectivity
   - Verify package.json is valid

3. **Server fails to start**
   - Check the generated code for syntax errors
   - Verify framework configuration
   - Check server logs

### Debug Mode

Enable debug logging:

```bash
DEBUG=custom-sandbox:* npm run dev
```

## 🔄 Fallback Strategy

The system uses this priority order:

1. **Custom Sandbox** (if enabled)
2. **CodeSandbox PIDA** (if configured)
3. **Public CodeSandbox API** (with retries)
4. **HTML Preview** (always works)

This ensures users always get a working preview!

## 📈 Scaling

For high-traffic applications:

- **Load balancing** across multiple servers
- **Container orchestration** (Kubernetes)
- **Database tracking** of sandbox usage
- **Automatic cleanup** of inactive sandboxes
- **Resource monitoring** and alerts

## 🎉 Benefits

✅ **No external dependencies** for sandbox creation
✅ **Real development environment** (not just previews)
✅ **Full Next.js/React support** with hot reloading
✅ **Customizable** to your needs
✅ **Cost-effective** (no API fees)
✅ **Reliable** (no rate limits or outages) 