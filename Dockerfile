# SIH Government Service Integration Platform — Production Dockerfile
# Lean Alpine Linux image with Node.js 20 LTS and zero external runtime dependencies

FROM node:20-alpine AS runner

# Set working directory
WORKDIR /app

# Set production environment variables
ENV NODE_ENV=production \
    PORT=3000 \
    HOST=0.0.0.0

# Copy application files
COPY package.json ./
COPY config ./config
COPY public ./public
COPY server ./server
COPY scripts ./scripts
COPY docs ./docs

# Run production build and integrity verification
RUN node scripts/build.js

# Switch to non-root user for container security
USER node

# Expose HTTP port
EXPOSE 3000

# Container Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD node -e "import('node:http').then(h => h.get('http://127.0.0.1:3000/api/v1/health', r => process.exit(r.statusCode === 200 ? 0 : 1)))"

# Start the unified web server and API Gateway
CMD ["node", "scripts/dev-server.js"]
