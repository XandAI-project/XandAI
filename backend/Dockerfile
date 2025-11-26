# ===========================================
# XandAI Backend - Multi-stage Docker Build
# ===========================================

# Stage 1: Build the NestJS application
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev for build)
RUN npm ci

# Copy source code and config
COPY tsconfig.json ./
COPY nest-cli.json ./
COPY src/ ./src/

# Build the application (tsc + tsc-alias to resolve path aliases)
RUN npm run build

# Stage 2: Production image
FROM node:20-alpine AS production

WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Copy public assets
COPY public/ ./public/

# Create data directory for SQLite (dev fallback) and ensure permissions
RUN mkdir -p data && chown -R nestjs:nodejs data public /app

# Switch to non-root user
USER nestjs

# Expose port
EXPOSE 3001

# Start the application
CMD ["node", "dist/main"]
