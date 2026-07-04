FROM node:20-alpine AS builder

WORKDIR /app

COPY services/api/package.json services/api/package-lock.json ./
RUN npm ci

COPY services/api/tsconfig.json ./
COPY services/api/src ./src
RUN npm run build

FROM node:20-alpine

WORKDIR /app

COPY services/api/package.json services/api/package-lock.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY db/schema.sql db/apply.mjs ./db/

ENV NODE_ENV=production
ENV PORT=8787
EXPOSE 8787

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- http://127.0.0.1:${PORT}/health || exit 1

CMD ["sh", "-c", "node db/apply.mjs && node dist/index.js"]
