# ===========================================
# XandAI Frontend - Multi-stage Docker Build
# ===========================================

# Stage 1: Build the React application
FROM node:20-alpine AS builder

WORKDIR /app

# Accept build arguments for environment variables
ARG REACT_APP_API_URL=http://192.168.0.5:3001
ENV REACT_APP_API_URL=$REACT_APP_API_URL

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --legacy-peer-deps

# Copy source code
COPY public/ ./public/
COPY src/ ./src/

# Build the application with environment variables baked in
RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:alpine AS production

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets from builder stage
COPY --from=builder /app/build /usr/share/nginx/html

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]

