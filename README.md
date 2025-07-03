# Vibe UI

...

## Documentation

- [Architecture Overview](vibe-ui/docs/architecture.md)
- [Local Development Setup](vibe-ui/docs/setup-local.md)
- [Backend Migration to Go (plan)](vibe-ui/docs/migrate-backend-go.md)
- [Go Backend Scaffold](backend-go/README.md)
- [Go backend dev guide](vibe-ui/docs/go-dev.md)

## Quickstart

```bash
# Clone and enter repo
git clone https://github.com/your-org/vibe-ui.git
cd vibe-ui

# Install dependencies
npm install

# Set up environment (see docs/setup-local.md)
cp env.example .env

# Run migrations (if using Prisma)
npx prisma migrate dev

# Start dev server
npm run dev
```

See [docs/setup-local.md](vibe-ui/docs/setup-local.md) for full details.

...