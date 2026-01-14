# Table Tennis Tournament Application

A web application for managing table tennis tournaments and tracking player MMR ratings.

## Technology Stack

### Frontend (`/client`)

- **React 18** with TypeScript
- **Vite** - Build tool and dev server
- **Tailwind CSS** + **shadcn/ui** - Styling and UI components
- **React Router v6** - Client-side routing
- **Zustand** - State management
- **TanStack Query** - Server state and data fetching
- **React Hook Form** + **Zod** - Form handling and validation
- **Axios** - HTTP client

### Backend (`/server`)

- **Express.js** with TypeScript
- **Prisma ORM** - Database access
- **SQLite** - Database
- **JWT** - Authentication tokens
- **bcrypt** - Password hashing

### Development Tools

- **Vitest** - Unit testing
- **Playwright** - E2E testing
- **ESLint** + **Prettier** - Code quality
- **Docker** - Production deployment

## Development Workflow

For each work item (feature, bug fix, documentation), follow these steps:

1. **Implement** - Write the functionality, fix the bug, or update documentation
2. **Format** - Run code formatter: `npm run format`
3. **Lint** - Run style checker: `cd client && npm run lint` and `cd server && npm run lint`
4. **Unit tests** - Write unit tests if needed, run with: `npm test`
5. **E2E tests** - Write E2E tests if needed, run with: `npm run test:e2e`
6. **Iterate** - Fix any issues with implementation, tests, style, or formatting until all checks pass
7. **Commit** - Commit your work to git with a descriptive message

## Project Structure

```
vibe-table-tennis/
├── client/                     # React frontend
│   ├── src/
│   │   ├── components/         # Reusable UI components
│   │   │   └── ui/             # shadcn/ui components
│   │   ├── pages/              # Page components (Home, Matches, Tournaments, Leaderboard)
│   │   ├── hooks/              # Custom React hooks
│   │   ├── services/           # API service layer
│   │   ├── store/              # Zustand stores
│   │   ├── types/              # TypeScript types
│   │   └── lib/                # Utilities
│   ├── package.json
│   └── vite.config.ts
├── server/                     # Express backend
│   ├── src/
│   │   ├── routes/             # API route handlers
│   │   ├── services/           # Business logic (MMR, tournaments)
│   │   ├── middleware/         # Auth, error handling
│   │   └── utils/              # Utility functions
│   ├── prisma/
│   │   └── schema.prisma       # Database schema
│   ├── package.json
│   └── tsconfig.json
├── e2e/                        # Playwright E2E tests
│   ├── fixtures/
│   │   └── test-utils.ts       # Test helper functions
│   ├── standalone-match.spec.ts
│   ├── swiss-tournament.spec.ts
│   ├── group-elimination.spec.ts
│   └── leaderboard.spec.ts
├── playwright.config.ts        # Playwright configuration
├── docker-compose.yml
├── Dockerfile
├── CLAUDE.md                   # This file
└── package.json                # Root workspace scripts
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Installation

```bash
# Install all dependencies
npm install
cd client && npm install
cd ../server && npm install

# Set up environment variables
cd server
cp .env.example .env

# Set up the database
npx prisma generate
npx prisma db push
```

### Database Setup

The application uses SQLite stored at `server/prisma/dev.db`. The database file is created automatically when you run `npx prisma db push`.

**Environment variables** (in `server/.env`):

- `DATABASE_URL` - SQLite database path (default: `file:./dev.db`)
- `JWT_SECRET` - Secret key for JWT tokens (change in production)
- `PORT` - Server port (default: 3001)

```bash
# Create/update database schema (run from server directory)
cd server
npx prisma db push

# Reset database (deletes all data)
npx prisma db push --force-reset

# View database in browser
npx prisma studio
```

The database persists between server restarts. To start fresh, delete `server/prisma/dev.db` and run `npx prisma db push` again.

### Development

```bash
# Run both client and server in development mode
npm run dev

# Or run separately:
npm run dev:client  # Frontend on http://localhost:5173
npm run dev:server  # Backend on http://localhost:3001
```

### Testing

```bash
# Run all unit tests
npm test

# Run client tests only
npm run test:client

# Run server tests only
npm run test:server
```

### E2E Testing

End-to-end tests use Playwright and test complete user workflows.

```bash
# Install Playwright browsers (required once)
npx playwright install

# Run all E2E tests
npm run test:e2e

# Run specific test file
npm run test:e2e -- e2e/standalone-match.spec.ts
npm run test:e2e -- e2e/swiss-tournament.spec.ts
npm run test:e2e -- e2e/group-elimination.spec.ts

# Run tests by name pattern
npm run test:e2e -- -g "Swiss tournament"

# Run with UI (interactive mode)
npm run test:e2e:ui

# Run headed (see browser)
npm run test:e2e:headed

# Debug a test
npm run test:e2e -- --debug
```

E2E tests automatically start both client and server before running. Test files are in `/e2e`:

- `standalone-match.spec.ts` - Two users play a match with score confirmation and MMR changes
- `swiss-tournament.spec.ts` - 8 players complete a Swiss tournament through all rounds
- `group-elimination.spec.ts` - 8 players complete a group stage + elimination tournament
- `leaderboard.spec.ts` - Leaderboard display, user ranking, and MMR updates

### Code Formatting

```bash
# Format all code
npm run format

# Lint code
npm run lint
```

### Production Build

```bash
# Build both client and server
npm run build
```

## Docker Deployment

### Quick Start (Simple)

```bash
# Build and run with Docker Compose (app only, port 3001)
docker-compose -f docker-compose.simple.yml up --build

# Access at http://localhost:3001
```

### Full Production Setup (with Nginx)

```bash
# Set your JWT secret
export JWT_SECRET="your-secure-secret-here"

# Build and run
docker-compose up --build

# Access at http://localhost (port 80)
```

### Docker Commands

```bash
# Build image only
docker build -t vibe-table-tennis .

# Run standalone container
docker run -p 3001:3001 -e JWT_SECRET=your-secret vibe-table-tennis

# View logs
docker-compose logs -f

# Stop containers
docker-compose down

# Remove data volume (reset database)
docker-compose down -v
```

## API Endpoints

### Authentication

- `POST /api/auth/signup` - Register new user
- `POST /api/auth/login` - Login, returns JWT
- `POST /api/auth/reset-password` - Request password reset
- `POST /api/auth/reset-password/:token` - Complete password reset

### Users

- `GET /api/users/me` - Get current user profile
- `GET /api/users` - List all users (for opponent selection)
- `GET /api/users/:id` - Get user by ID
- `GET /api/users/:id/matches` - Get user's match history

### Matches

- `GET /api/matches` - List current user's matches
- `POST /api/matches` - Create new standalone match
- `PATCH /api/matches/:id/score` - Submit match score
- `POST /api/matches/:id/confirm` - Confirm opponent's score

### Tournaments

- `GET /api/tournaments` - List all tournaments
- `POST /api/tournaments` - Create new tournament
- `GET /api/tournaments/:id` - Get tournament details
- `POST /api/tournaments/:id/register` - Register for tournament
- `DELETE /api/tournaments/:id/register` - Unregister from tournament
- `POST /api/tournaments/:id/start` - Start tournament (creator only)
- `GET /api/tournaments/:id/matches` - Get tournament matches
- `POST /api/tournaments/:id/advance` - Advance Swiss round (creator only)

## Database Schema

### User

- `id`, `username`, `email`, `password`, `mmr` (default: 1000)

### Match

- `id`, `player1Id`, `player2Id`, `player1Score`, `player2Score`
- `status`: PENDING | AWAITING_CONFIRM | CONFIRMED
- `tournamentId` (optional), `tournamentStage`, `groupName`

### Tournament

- `id`, `name`, `creatorId`
- `type`: SWISS | GROUP_ELIMINATION
- `status`: OPEN | LIVE | FINISHED
- `currentRound` (for Swiss)

### TournamentPlayer

- `id`, `tournamentId`, `userId`, `groupName`, `eliminated`, `seed`

## MMR System

Uses Elo rating system:

- Starting MMR: 1000
- K-factor: 32
- Rating tiers: Iron, Bronze, Silver, Gold, Platinum, Diamond, Master, Grandmaster

## Tournament Types

### Swiss

- Players paired by score and MMR each round
- No elimination, all players play all rounds
- Number of rounds = ceil(log2(players))

### Group + Elimination

- Players divided into groups (snake draft by MMR)
- Round-robin within groups
- Top players advance to single elimination bracket

## Leaderboard

The leaderboard displays all players ranked by their MMR rating:

- Shows player rank, username, MMR value, and tier badge
- Highlights the current user's row with distinct styling
- Displays current user's rank prominently in a summary card
- Updates in real-time as matches are completed and MMR changes

Rating tiers (based on MMR):
| Tier | MMR Range |
|------|-----------|
| Iron | < 800 |
| Bronze | 800-999 |
| Silver | 1000-1199 |
| Gold | 1200-1399 |
| Platinum | 1400-1599 |
| Diamond | 1600-1799 |
| Master | 1800-1999 |
| Grandmaster | 2000+ |

## Tournament Results Tab

The tournament detail page includes a "Results" tab with standings and bracket visualization.

### Swiss Tournament

- **Standings table** showing: Rank, Player, Matches Played (MP), Wins (W), Draws (D), Losses (L)
- Sorted by wins descending, then by point differential
- All 8 players displayed with their current standings

### Group+Elimination Tournament

- **Group standings tables** (one per group)
  - Top 2 players highlighted as qualifiers (green background)
  - Same columns as Swiss standings
- **Elimination bracket visualization**
  - Shows Quarterfinals, Semifinals, Final stages
  - Displays player names and scores for completed matches
  - Shows "TBD" for upcoming matches
  - Winner displayed with trophy icon after tournament finishes

## Error Handling

### Backend Errors

The backend uses a centralized error handling approach with the `AppError` class:

```typescript
// Throw operational errors with status code
throw new AppError('Error message', 400)

// Error response format
{ "error": "Error message" }
```

Location: `server/src/middleware/errorHandler.ts`

### Frontend Error Handling

Use the toast notification system for user-facing errors:

```typescript
import { useToast } from '@/hooks/use-toast'

function MyComponent() {
  const { toast } = useToast()

  const mutation = useMutation({
    mutationFn: api.someAction,
    onError: () => {
      toast({
        variant: 'destructive',
        title: 'Action failed',
        description: 'A user-friendly error message.',
      })
    },
  })
}
```

Toast variants:

- `default` - Neutral notifications
- `destructive` - Error messages (red styling)
- `success` - Success confirmations (green styling)

Guidelines:

- Always use toast notifications instead of browser `alert()`
- Provide clear, actionable error messages
- Refresh relevant data after errors to ensure UI consistency
- Use `destructive` variant for errors, `success` for confirmations

Location: `client/src/hooks/use-toast.ts`, `client/src/components/ui/toast.tsx`
