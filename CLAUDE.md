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
- **Vitest** - Testing
- **ESLint** + **Prettier** - Code quality
- **Docker** - Production deployment

## Project Structure

```
vibe-table-tennis/
├── client/                     # React frontend
│   ├── src/
│   │   ├── components/         # Reusable UI components
│   │   │   └── ui/             # shadcn/ui components
│   │   ├── pages/              # Page components
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

# Set up the database
cd server
npx prisma generate
npx prisma db push
```

### Database Setup

The application uses SQLite stored at `server/prisma/dev.db`. The database file is created automatically when you run `npx prisma db push`.

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
# Run all tests
npm test

# Run client tests only
npm run test:client

# Run server tests only
npm run test:server
```

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
