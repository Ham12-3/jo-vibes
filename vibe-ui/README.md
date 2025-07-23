# Vibe UI

A modern web application with AI-powered project generation and sandbox environments.

## 🚀 Quick Start

### Development

```bash
# Install dependencies
npm install

# Start the development server
npm run dev
```

The application will be available at:
- **Main Application**: http://localhost:3001
- **Sandbox Containers**: http://localhost:4000+ (dynamic ports)

### Port Configuration

- **Main App**: Port 3001 (to avoid conflicts with sandbox containers)
- **Sandbox Containers**: Ports 4000-5000 (dynamically assigned)
- **Database**: Default Prisma configuration

### Environment Setup

Create a `.env.local` file in the root directory:

```env
# Main application
PORT=3001
NEXT_PUBLIC_APP_URL=http://localhost:3001

# Sandbox configuration
SANDBOX_PORT_START=4000
SANDBOX_PORT_END=5000

# Development
NODE_ENV=development
NEXT_TELEMETRY_DISABLED=1
```

## 🛠️ Features

- AI-powered project generation
- Docker-based sandbox environments
- Real-time code editing
- Project deployment
- User authentication

## 📁 Project Structure

```
vibe-ui/
├── src/
│   ├── app/           # Next.js app router
│   ├── components/    # React components
│   ├── lib/          # Utility libraries
│   └── trpc/         # tRPC configuration
├── sandboxes/        # Generated sandbox projects
└── prisma/          # Database schema
```

## 🔧 Development

### Available Scripts

- `npm run dev` - Start development server on port 3001
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run setup:sandbox` - Setup custom sandbox environment

### Container Management

The application includes Docker-based sandbox containers for isolated development environments:

- Automatic port assignment (4000-5000 range)
- Signal handling for graceful shutdowns
- Health checks and monitoring
- Cleanup utilities

## 🐳 Docker Sandboxes

Sandbox containers are automatically managed and provide:

- Isolated development environments
- Hot reloading
- Port forwarding
- Resource monitoring
- Automatic cleanup

## 📝 License

This project is licensed under the MIT License.
