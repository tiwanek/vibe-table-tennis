# Build stage for client
FROM node:20-alpine AS client-builder

WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# Build stage for server
FROM node:20-alpine AS server-builder

WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci
COPY server/ ./
RUN npx prisma generate
RUN npm run build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Install production dependencies for server
COPY server/package*.json ./server/
RUN cd server && npm ci --only=production

# Copy Prisma schema and generate client
COPY server/prisma ./server/prisma
RUN cd server && npx prisma generate

# Copy built server
COPY --from=server-builder /app/server/dist ./server/dist

# Copy built client to serve as static files
COPY --from=client-builder /app/client/dist ./client/dist

# Create data directory for SQLite
RUN mkdir -p /app/data

# Set environment variables
ENV NODE_ENV=production
ENV DATABASE_URL="file:/app/data/prod.db"
ENV PORT=3001

# Expose port
EXPOSE 3001

# Start server
WORKDIR /app/server
CMD ["node", "dist/index.js"]
