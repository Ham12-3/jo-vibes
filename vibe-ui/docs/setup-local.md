# Local Development Setup

Follow these steps to get your local environment running.

---

## Prerequisites

- **Node.js** (v18+ recommended)
- **npm** or **yarn**
- **PostgreSQL** (local or hosted, e.g. Supabase)
- **GitHub OAuth App** (for social login)
- **OpenAI API Key** (for AI features)

---

## 1. Clone the Repository

```bash
git clone https://github.com/your-org/vibe-ui.git
cd vibe-ui
```

---

## 2. Install Dependencies

```bash
npm install
# or
yarn install
```

---

## 3. Configure Environment Variables

Copy the example file and fill in required values:

```bash
cp env.example .env
```

### .env keys needed:

- `DATABASE_URL` (Postgres connection)
- `NEXTAUTH_SECRET` (random string)
- `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` (from GitHub OAuth app)
- `OPENAI_API_KEY` (from OpenAI dashboard)
- ...others as needed (see `env.example`)

---

## 4. Set Up the Database

If using Prisma:

```bash
npx prisma migrate dev
npx prisma generate
# Optionally seed: npx prisma db seed
```

If using Supabase, set up the project and link the `DATABASE_URL`.

---

## 5. Run the App

```bash
npm run dev
# or
yarn dev
```

The app should be running at [http://localhost:3000](http://localhost:3000).

---

## 6. Optional: Develop with Supabase

- Create a Supabase project at https://app.supabase.com.
- Use Supabase dashboard to manage users, storage, and DB.
- Update `.env` with Supabase connection strings as needed.

---

## 7. Running Tests

```bash
npm run test
# or
yarn test
```

---

## Troubleshooting

- Check `.env` for missing/incorrect values.
- Ensure local Postgres is running and accessible.
- Review terminal output for errors.