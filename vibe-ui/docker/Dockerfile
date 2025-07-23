# Custom Sandbox Dockerfile for Next.js applications
FROM node:18-alpine

# Install essential tools
RUN apk add --no-cache \
    git \
    curl \
    wget \
    vim \
    nano \
    python3 \
    py3-pip \
    build-base \
    && rm -rf /var/cache/apk/*

# Create app directory
WORKDIR /app

# Install global packages for common frameworks
RUN npm install -g \
    create-next-app@latest \
    create-react-app@latest \
    @vue/cli@latest \
    @angular/cli@latest \
    vite@latest \
    typescript@latest \
    nodemon@latest \
    pm2@latest

# Create a non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# Copy package files (if they exist)
COPY package*.json ./

# Install dependencies (use npm install instead of npm ci)
RUN if [ -f package.json ]; then npm install --only=production; fi

# Copy application code
COPY . .

# Change ownership to nextjs user
RUN chown -R nextjs:nodejs /app

USER nextjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

# Default command
CMD ["npm", "start"] 