# ─────────────────────────────────────────────────────────────────────────────
# Stage 1 – Build
# Installs ALL deps (including devDeps for tsc), compiles TypeScript → dist/
# ─────────────────────────────────────────────────────────────────────────────
FROM node:18-alpine AS builder

WORKDIR /app

# Copy manifests first so Docker can cache the npm install layer
COPY package.json package-lock.json* ./

# Install everything (including devDependencies needed for tsc)
RUN npm ci

# Copy source and compile
COPY tsconfig.json ./
COPY src/ ./src/

RUN npm run build

# ─────────────────────────────────────────────────────────────────────────────
# Stage 2 – Runtime
# Lean image: only production deps + compiled JS
# ─────────────────────────────────────────────────────────────────────────────
FROM node:18-alpine AS runtime

WORKDIR /app

# Only install production dependencies
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# Copy compiled output from build stage
COPY --from=builder /app/dist ./dist

# Railway injects $PORT at runtime; default to 8787 for local docker run
ENV PORT=8787
EXPOSE ${PORT}

CMD ["node", "dist/index.js"]
