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

# E2B Integration (Optional - set to false for now)
NEXT_PUBLIC_E2B_ENABLED="false"
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
- Live E2B sandboxes (set `NEXT_PUBLIC_E2B_ENABLED="true"`)
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

## Troubleshooting

### "Unknown at rule @apply" error
- This is fixed! Tailwind v4 configuration is updated.

### "Clerk middleware not found" error  
- This is fixed! Middleware moved to `src/middleware.ts`.

### "E2B sandbox 400 error"
- This is fixed! Set `NEXT_PUBLIC_E2B_ENABLED="false"` to use mock previews.

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
5. Later: Add E2B and Vercel integrations when ready

Your complete AI-powered development platform is ready! 🚀 