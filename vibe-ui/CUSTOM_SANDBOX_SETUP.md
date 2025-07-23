# 🐳 Custom Docker Sandbox System

A complete Docker-based sandbox solution that runs locally without any third-party dependencies. This system provides isolated development environments for your projects using Docker containers.

## ✨ Features

- **🔒 Isolated Environments**: Each project runs in its own Docker container
- **🚀 Multiple Frameworks**: Support for Next.js, React, Vue.js, and Vanilla JS
- **📁 File Management**: Custom file injection and project file synchronization
- **🔍 Real-time Monitoring**: Live status updates and container logs
- **⚡ Fast Startup**: Optimized Docker images for quick container creation
- **🛠️ Full Control**: No external dependencies or API keys required

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Next.js App   │    │  Custom Sandbox │    │  Docker Engine  │
│                 │◄──►│     Service     │◄──►│                 │
│  - UI Manager   │    │                 │    │  - Containers   │
│  - API Routes   │    │  - Container    │    │  - Images       │
│  - Database     │    │  Management     │    │  - Networks     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🚀 Quick Start

### 1. Prerequisites

- **Docker Desktop** installed and running
- **Node.js** 18+ 
- **npm** or **yarn**

### 2. Setup

```bash
# Navigate to your project
cd vibe-ui

# Run the setup script
node scripts/setup-custom-sandbox.js

# Install dependencies
npm install

# Start the application
npm run dev
```

### 3. Create Your First Sandbox

1. Open your application in the browser
2. Navigate to the Custom Sandbox Manager
3. Select a project and framework
4. Optionally add custom files
5. Click "Create Sandbox"

## 📁 File Structure

```
vibe-ui/
├── docker/
│   ├── Dockerfile              # Base sandbox image
│   └── docker-compose.yml      # Development setup
├── sandboxes/                  # Generated sandbox files
│   └── sample-project/         # Example project
├── src/
│   ├── lib/
│   │   └── custom-sandbox.ts   # Core sandbox service
│   ├── app/api/sandbox/
│   │   ├── create/route.ts     # Create sandbox API
│   │   ├── list/route.ts       # List sandboxes API
│   │   ├── status/[id]/route.ts # Status API
│   │   ├── stop/[id]/route.ts  # Stop sandbox API
│   │   └── restart/[id]/route.ts # Restart API
│   └── components/
│       └── custom-sandbox-manager.tsx # UI Manager
└── scripts/
    └── setup-custom-sandbox.js # Setup script
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file in your project root:

```env
# Database
DATABASE_URL="file:./dev.db"

# Docker Configuration
DOCKER_HOST=localhost
SANDBOX_BASE_PORT=4000
SANDBOX_MAX_CONTAINERS=10

# Redis (optional)
REDIS_URL=redis://localhost:6379
```

### Port Management

- **Base Port**: 4000 (configurable)
- **Port Range**: 4000-4010 (for multiple sandboxes)
- **Automatic Assignment**: Ports are assigned automatically

## 🛠️ API Endpoints

### Create Sandbox
```http
POST /api/sandbox/create
Content-Type: application/json

{
  "projectId": "project-123",
  "framework": "nextjs",
  "files": {
    "src/App.js": "function App() { return <div>Hello World</div> }"
  }
}
```

### List Sandboxes
```http
GET /api/sandbox/list
```

### Get Sandbox Status
```http
GET /api/sandbox/status/{sandboxId}
```

### Stop Sandbox
```http
POST /api/sandbox/stop/{sandboxId}
```

### Restart Sandbox
```http
POST /api/sandbox/restart/{sandboxId}
```

## 🐳 Docker Commands

### Useful Commands

```bash
# List running sandbox containers
docker ps --filter "name=sandbox-"

# View container logs
docker logs sandbox-{project-id}

# Stop a specific sandbox
docker stop sandbox-{project-id}

# Remove a sandbox container
docker rm sandbox-{project-id}

# Clean up all sandboxes
docker stop $(docker ps -q --filter "name=sandbox-")
docker rm $(docker ps -aq --filter "name=sandbox-")

# Clean up images
docker rmi $(docker images --filter "reference=sandbox-*" -q)

# Full cleanup
docker system prune -f
```

## 🔍 Monitoring & Debugging

### Container Logs

Each sandbox provides real-time logs that you can view in the UI or via Docker:

```bash
# Follow logs in real-time
docker logs -f sandbox-{project-id}

# View last 50 lines
docker logs --tail 50 sandbox-{project-id}
```

### Health Checks

The system includes built-in health checks:

- **Container Status**: Monitored via Docker API
- **Application Health**: HTTP health checks on port 3000
- **Resource Usage**: CPU and memory monitoring

### Troubleshooting

#### Common Issues

1. **Port Already in Use**
   ```bash
   # Check what's using the port
   netstat -tulpn | grep :4000
   
   # Kill the process or change base port
   ```

2. **Container Won't Start**
   ```bash
   # Check container logs
   docker logs sandbox-{project-id}
   
   # Check Docker daemon
   docker system info
   ```

3. **Permission Issues**
   ```bash
   # Ensure Docker socket permissions
   sudo chmod 666 /var/run/docker.sock
   ```

## 🔒 Security

### Container Isolation

- **Network Isolation**: Each container runs in its own network namespace
- **File System**: Isolated file systems per container
- **Process Isolation**: Containerized processes
- **Resource Limits**: CPU and memory limits applied

### Best Practices

1. **Regular Updates**: Keep Docker and base images updated
2. **Resource Limits**: Set appropriate CPU and memory limits
3. **Cleanup**: Regularly clean up unused containers and images
4. **Monitoring**: Monitor container resource usage

## 🚀 Performance

### Optimization Tips

1. **Image Caching**: Base images are cached for faster builds
2. **Layer Optimization**: Minimize Docker layers
3. **Multi-stage Builds**: Use for production builds
4. **Volume Mounting**: Use volumes for persistent data

### Resource Usage

- **Memory**: ~200-500MB per container
- **CPU**: Minimal when idle, scales with usage
- **Disk**: ~100-300MB per container
- **Network**: Isolated per container

## 🔄 Migration from Third-party Services

### From Gitpod/GitHub Codespaces

1. **Remove Dependencies**: No API keys or external services needed
2. **Update Configuration**: Use local Docker setup
3. **Migrate Projects**: Projects run in local containers
4. **Update UI**: Use Custom Sandbox Manager

### Benefits

- **No External Dependencies**: Everything runs locally
- **Faster Startup**: No network latency
- **Better Control**: Full control over environment
- **Cost Effective**: No external service costs
- **Offline Capable**: Works without internet

## 📈 Scaling

### Horizontal Scaling

- **Multiple Containers**: Run multiple sandboxes simultaneously
- **Load Balancing**: Distribute load across containers
- **Resource Management**: Automatic resource allocation

### Vertical Scaling

- **Resource Limits**: Adjust CPU and memory per container
- **Storage**: Add persistent volumes for data
- **Networking**: Custom network configurations

## 🛡️ Backup & Recovery

### Data Persistence

- **Volume Mounts**: Persistent data storage
- **Backup Scripts**: Automated backup solutions
- **Recovery Procedures**: Quick recovery from backups

### Disaster Recovery

1. **Regular Backups**: Automated daily backups
2. **Configuration Backup**: Backup Docker configurations
3. **Recovery Testing**: Regular recovery drills

## 🤝 Contributing

### Development Setup

1. **Fork the Repository**
2. **Create Feature Branch**
3. **Make Changes**
4. **Test Thoroughly**
5. **Submit Pull Request**

### Testing

```bash
# Run tests
npm test

# Test sandbox creation
npm run test:sandbox

# Integration tests
npm run test:integration
```

## 📞 Support

### Getting Help

1. **Documentation**: Check this README first
2. **Issues**: Create GitHub issues for bugs
3. **Discussions**: Use GitHub discussions for questions
4. **Community**: Join our community channels

### Common Questions

**Q: Can I use this in production?**
A: Yes, with proper security and resource management.

**Q: How many sandboxes can I run?**
A: Limited by your system resources, typically 10-20 containers.

**Q: Is it secure?**
A: Yes, with proper Docker security practices.

**Q: Can I customize the base image?**
A: Yes, modify the Dockerfile in the docker/ directory.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

**Happy Sandboxing! 🎉** 