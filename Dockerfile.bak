FROM node:20-alpine AS base

RUN apk add --no-cache libc6-compat

FROM base AS deps

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --only=production && npm cache clean --force

FROM base AS builder

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
RUN npm run build

FROM base AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

RUN mkdir -p /app/public/uploads && chown nextjs:nodejs /app/public/uploads

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["node", "server.js"]
