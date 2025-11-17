# ===========================
# Aurelia Studio v2 - Complete Working Version with Enhanced PSD Processing
# Optimized for Coolify Deployment
# ===========================
#
# Environment variables (configure via Coolify dashboard):
# - REPLICATE_API_TOKEN (required for AI generation)
# - ANTHROPIC_API_KEY (optional for enhanced listings)
# - PORT (default: 3000)
# - DATA_DIR (default: /data)
# - NODE_ENV (default: production)
#
# See COOLIFY.md for detailed deployment instructions
# ===========================

FROM node:18-alpine AS frontend-builder
WORKDIR /app/frontend

# Copy frontend files
COPY frontend/package.json ./
RUN npm install

COPY frontend/public ./public
COPY frontend/src ./src

# Build frontend
RUN npm run build

# ===========================
# Production Stage
# ===========================
FROM node:18-alpine

# Install system dependencies
RUN apk add --no-cache \
    python3 python3-dev py3-pip \
    build-base jpeg-dev zlib-dev libffi-dev \
    vips-dev curl

# Create Python virtual environment
ENV VIRTUAL_ENV=/opt/venv
RUN python3 -m venv "$VIRTUAL_ENV"
ENV PATH="$VIRTUAL_ENV/bin:$PATH"

# Install Python packages
RUN pip install --no-cache-dir --upgrade pip wheel && \
    pip install --no-cache-dir flask pillow numpy && \
    pip install --no-cache-dir psd-tools || echo "psd-tools fallback mode"

# Set up Node.js app
WORKDIR /app
ENV NODE_ENV=production

# Copy backend files
COPY backend/package.json ./
RUN npm install

COPY backend/server.js ./

# Copy frontend build from builder stage
COPY --from=frontend-builder /app/frontend/build /app/build

# Create data directory with proper permissions
RUN mkdir -p /data/uploads /data/mockups /data/output /data/temp && \
    addgroup -g 1001 -S nodejs && \
    adduser -S aurelia -u 1001 -G nodejs && \
    chown -R aurelia:nodejs /app /data

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# Switch to non-root user
USER aurelia

# Environment defaults
ENV NODE_ENV=production
ENV PORT=3000
ENV DATA_DIR=/data

# Expose port
EXPOSE 3000

# Start command
CMD ["node", "server.js"]
