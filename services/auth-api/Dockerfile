# Single-stage build — dist/ is pre-compiled and committed to git.
# This avoids Render Docker layer cache issues with tsc.
FROM node:18-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# Copy pre-compiled JS directly from git (no tsc needed)
COPY dist/ ./dist/

ENV PORT=8787
EXPOSE ${PORT}

CMD ["node", "dist/index.js"]
