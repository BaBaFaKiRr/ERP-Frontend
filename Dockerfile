# --- Build Stage ---
FROM node:20-alpine AS builder
WORKDIR /app

# Install all dependencies
COPY package*.json ./
RUN npm ci

# Copy codebase
COPY . .

# Build arguments for Supabase URLs and Keys (with fallback demo defaults to ensure out-of-the-box build success)
ARG NEXT_PUBLIC_SUPABASE_URL=https://hixcjhqmoxqrbzsqujic.supabase.co
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_yVV9N1F-kfk_8CJ4okf9bQ_5glF6jW4

ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_TELEMETRY_DISABLED=1

# Build Next.js application
RUN npm run build

# --- Production Runner Stage ---
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Install only production dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy build artifacts and configs
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.mjs ./
COPY --from=builder /app/run-all-migrations.js ./
COPY --from=builder /app/setup-database.sql ./
COPY --from=builder /app/scripts ./scripts

EXPOSE 3000

ENV PORT=3000

CMD ["npm", "start"]
