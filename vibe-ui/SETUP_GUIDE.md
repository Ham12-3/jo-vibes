# Jo-Vibes Setup Guide

## Quick Start

### 1. Required Environment Variables

Create a `.env.local` file in the `vibe-ui` directory with these **essential** variables:

```env
# Database (Required - get from Neon, Supabase, or local PostgreSQL)
DATABASE_URL="postgresql://username:password@localhost:5432/jo-vibes"

# Authentication (Required - get from clerk.com)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."

# AI Features (Required - get from platform.openai.com)
OPENAI_API_KEY="sk-..."

# App URL
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# E2B Integration (Required for live sandboxes)
NEXT_PUBLIC_E2B_ENABLED="true"
E2B_API_KEY="your_e2b_api_key_here"

# Docker Sandbox (Alternative to E2B for local development)
ENABLE_DOCKER_SANDBOX="true"
```

### 2. Database Setup

```bash
# Install Prisma CLI globally
npm install -g prisma

# Generate Prisma client
cd vibe-ui
npx prisma generate

# Run database migrations
npx prisma db push

# (Optional) Seed the database
npx prisma db seed
```

### 3. Start Development Server

```bash
cd vibe-ui
npm run dev
```

## Features Status

✅ **Working Now:**
- User authentication (Clerk)
- AI project generation (OpenAI)
- File editing with Monaco Editor
- Real-time chat with AI
- Project management
- Mock live previews

🔄 **Available Later:**
- Vercel deployments (add `VERCEL_TOKEN`)

## Getting API Keys

### Clerk Authentication
1. Go to [clerk.com](https://clerk.com)
2. Create a free account
3. Create a new application
4. Copy your publishable and secret keys

### OpenAI API
1. Go to [platform.openai.com](https://platform.openai.com)
2. Create an account
3. Go to API Keys section
4. Create a new API key

### Database (Recommended: Neon)
1. Go to [neon.tech](https://neon.tech)
2. Create a free PostgreSQL database
3. Copy the connection string

### E2B API Key
1. Go to [e2b.dev](https://e2b.dev)
2. Create an account
3. Go to API Keys section
4. Create a new API key
5. Add it to your environment variables as `E2B_API_KEY`

### Docker Setup (Alternative to E2B)
1. Install [Docker Desktop](https://docs.docker.com/desktop/install/)
2. Start Docker Desktop
3. Run the setup script: `chmod +x docker/setup.sh && ./docker/setup.sh`
4. Update the environment variables in `.env`
5. Start everything: `docker-compose -f docker/docker-compose.yml up -d`

## Troubleshooting

### "Unknown at rule @apply" error
- This is fixed! Tailwind v4 configuration is updated.

### "Clerk middleware not found" error  
- This is fixed! Middleware moved to `src/middleware.ts`.

### "E2B sandbox error"
- Make sure you have a valid E2B API key configured in your environment variables.
- Get your API key from [e2b.dev](https://e2b.dev)
- Alternatively, enable Docker sandbox by setting `ENABLE_DOCKER_SANDBOX="true"`

### "Docker sandbox error"
- Make sure Docker Desktop is installed and running
- Check that Docker has permission to access the Docker socket
- On Linux, run: `sudo chmod 666 /var/run/docker.sock`
- On Windows/Mac, ensure Docker Desktop is running
- Check logs: `docker-compose -f docker/docker-compose.yml logs nextjs-app`

### "Prisma client not generated"
```bash
cd vibe-ui
npx prisma generate
```

## Next Steps

1. Set up the essential environment variables above
2. Run the database setup commands
3. Start the dev server
4. Create your first AI-generated project!
5. Later: Add Vercel integration when ready

Your complete AI-powered development platform is ready! 🚀 