# Orbiter

**Internal Project Management Platform**

Orbiter combines project tracking, sprint management, bug reporting, and AI-powered automation into a single platform. Built for internal teams managing multiple client projects.

## Tech Stack

- **Framework:** Next.js (App Router) + React 19 + TypeScript
- **Styling:** Tailwind CSS 4 + Shadcn/ui (customized)
- **Database:** MongoDB (Mongoose) via MongoDB Atlas
- **Auth:** Email/password + JWT (jose)
- **Storage:** Cloudflare R2
- **Icons:** Phosphor Icons
- **Testing:** Jest + Supertest + Playwright

## Getting Started

### Prerequisites

- Node.js 20+
- MongoDB (local or Atlas connection string)

### Setup

```bash
# Clone the repository
git clone <repo-url>
cd orbiter

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your values (see .env.example for descriptions)

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment Variables

See `.env.example` for all required variables. At minimum you need:
- `MONGODB_URI` — MongoDB connection string
- `JWT_ACCESS_SECRET` — Min 32 char secret for access tokens
- `JWT_REFRESH_SECRET` — Min 32 char secret for refresh tokens
- `ENCRYPTION_KEY` — 64 char hex string for AES-256-GCM encryption

## Project Structure

```
src/
├── app/              # Next.js App Router (pages + API routes)
│   ├── api/v1/       # REST API endpoints
│   ├── (auth)/       # Login, register pages
│   └── (dashboard)/  # Main application
├── modules/          # Domain business logic
│   ├── auth/         # Authentication service
│   ├── users/        # User management
│   └── projects/     # Project management
├── shared/           # Cross-cutting concerns
│   ├── middleware/    # Auth, validation, rate limiting
│   ├── database/     # MongoDB connection
│   ├── lib/          # JWT, email, storage utilities
│   └── types/        # Shared TypeScript types
├── components/       # UI components
│   ├── ui/           # Shadcn primitives
│   ├── layouts/      # Sidebar, topbar
│   └── providers/    # React Query, Auth providers
├── hooks/            # React hooks + query hooks
├── styles/           # Theme system
└── config/           # Environment validation
```

## Scripts

```bash
npm run dev          # Start development server
npm run build        # Production build
npm run start        # Start production server
npm run lint         # Run ESLint
npm run test         # Run all tests
npm run test:unit    # Run unit tests only
npm run test:integration  # Run integration tests only
```

## Architecture

- **Domain Modules:** Business logic in `src/modules/<domain>/` with model, service, validator, types per domain
- **Thin Route Handlers:** API routes validate → call service → respond
- **Middleware Stack:** Every route uses `apiHandler()` wrapper for auth, validation, error handling
- **Theme System:** Swappable color palette via `src/styles/themes/`

## API

All endpoints under `/api/v1/`. See `docs/api/openapi.yaml` for full specification.

Standard response format:
```json
{ "success": true, "data": { ... } }
{ "success": false, "error": { "code": "...", "message": "..." } }
```

## License

Proprietary — Internal use only.
