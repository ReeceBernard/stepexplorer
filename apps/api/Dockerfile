FROM node:23-alpine

WORKDIR /app

# Install system dependencies
RUN apk add --no-cache curl

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./
COPY drizzle.config.ts ./

# Use npm install instead of npm ci for flexibility
RUN npm install

# Copy source code
COPY src/ ./src/

# Build the TypeScript code
RUN npm run build

# Install drizzle-kit for migrations
RUN npm install drizzle-kit

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S stepexplorer -u 1001

# Change ownership of app directory
RUN chown -R stepexplorer:nodejs /app
USER stepexplorer

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

CMD ["npm", "start"]