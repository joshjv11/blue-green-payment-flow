FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

COPY dist/ ./dist/
COPY db/ ./db/

ENV NODE_ENV=production
ENV PORT=8787
EXPOSE 8787

CMD ["sh", "-c", "node db/apply.mjs && node dist/index.js"]
