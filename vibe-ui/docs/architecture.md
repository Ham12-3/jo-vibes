# Architecture Overview

## High-level System Diagram

```
+-----------------------------------------------------+
|                     Marketing Group                |
|      (Landing, Docs, Pricing, Blog, etc.)          |
|                                                    |
|  +-------------------+                             |
|  |   Dashboard App   |                             |
|  |-------------------|                             |
|  | Next.js + TRPC    |                             |
|  |                   |                             |
|  |   +-----------+   |                             |
|  |   | NextAuth  |<---------------------------+    |
|  |   +-----------+   |                       |    |
|  |       |           |                       |    |
|  |   +-----------+   |      +-------------+  |    |
|  |   |  TRPC     |<-------->|   Backend   |  |    |
|  |   +-----------+   |      | (API Route) |  |    |
|  +-------------------+      +-------------+  |    |
|           |                      |           |    |
|           |      +--------+      |           |    |
|           +----->| Prisma |<-----+           |    |
|                  +--------+                  |    |
|                      |                      |    |
|                  +---------+                |    |
|                  | Postgres|<----+          |    |
|                  +---------+     |          |    |
+--------------------------------------------------+|
                   |             |                 |
         +---------+      +------+-----+           |
         |                |   OpenAI   |           |
         |                +------------+           |
         |                                       +-+--+
         |           +---------+                 |Supabase|
         +---------->| GitHub  |                 +-------+
                     +---------+
```

**Legend:**
- **Marketing Group:** Static site.
- **Dashboard App:** Next.js app with TRPC API routes, authentication via NextAuth, and database access via Prisma.
- **Backend:** TRPC routers, business logic, Prisma ORM.
- **Database:** PostgreSQL (hosted, e.g., Supabase).
- **External Services:** OpenAI (AI features), GitHub (OAuth, repo data), Supabase (auth, storage).

---

## Folder Structure

```
vibe-ui/
├── docs/                # Documentation (architecture, setup, migration guides)
├── public/              # Static assets
├── src/
│   ├── pages/           # Next.js pages (marketing, dashboard)
│   ├── server/          # Backend logic (TRPC routers, Prisma, NextAuth)
│   ├── components/      # UI components
│   ├── lib/             # Shared utilities
│   └── ...              # Other source files
├── prisma/              # Prisma schema and migrations
├── .env.example         # Example environment variables
├── package.json         # Project dependencies and scripts
└── ...                  # Config files, etc.
```

### Key Directories

- **docs/**: All documentation (architecture, setup, migration).
- **src/pages/**: Next.js routes for both marketing and dashboard.
- **src/server/**: API/business logic (TRPC, auth, Prisma clients).
- **prisma/**: DB schema, seed scripts.
- **public/**: Images, favicon, etc.

---

## Data Flow Examples

### 1. User Login (with GitHub)

1. User visits `/login`, chooses "Sign in with GitHub".
2. NextAuth handles OAuth flow, exchanges code for tokens.
3. NextAuth creates/verifies user in PostgreSQL via Prisma.
4. User session stored (JWT or DB, depending on config).
5. Authenticated user can now access dashboard.

### 2. Fetching Projects

1. Frontend calls TRPC endpoint `project.list` via TRPC client.
2. TRPC router authenticates user (NextAuth session).
3. Router queries projects for user via Prisma.
4. Returns project data to frontend.

### 3. Chat with OpenAI

1. User types message in chat UI.
2. Frontend calls TRPC endpoint `chat.sendMessage`.
3. Backend validates, then calls OpenAI API with user's input.
4. Response streamed back to frontend via TRPC.

### 4. Syncing with GitHub

1. User connects GitHub account (via NextAuth).
2. Frontend requests repo sync via TRPC `repo.sync`.
3. Backend uses GitHub OAuth token to fetch repo data.
4. Stores repo data in PostgreSQL.

---