FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json package-lock.json* ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Firebase Configuration
ARG NEXT_PUBLIC_FIREBASE_API_KEY
ARG NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
ARG NEXT_PUBLIC_FIREBASE_PROJECT_ID
ARG NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
ARG NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
ARG NEXT_PUBLIC_FIREBASE_APP_ID
ARG NEXT_PUBLIC_YOUTUBE_API_KEY

# Youtube config
ARG YOUTUBE_CLIENT_ID
ARG YOUTUBE_CLIENT_SECRET
ARG YOUTUBE_REDIRECT_URI
ARG YOUTUBE_REFRESH_TOKEN
ARG GOOGLE_APPLICATION_CREDENTIALS

# Kakaotalk OAuth
ARG NEXT_PUBLIC_KAKAO_CLIENT_ID
ARG NEXT_PUBLIC_KAKAO_CLIENT_SECRET
ARG NEXT_PUBLIC_KAKAO_OAUTH_ENABLED

# Application Configuration
ARG NEXT_PUBLIC_BASE_URL
ARG MOUNTAIN_ID

# Set environment variables from build args
ENV NEXT_PUBLIC_FIREBASE_API_KEY=$NEXT_PUBLIC_FIREBASE_API_KEY
ENV NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=$NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
ENV NEXT_PUBLIC_FIREBASE_PROJECT_ID=$NEXT_PUBLIC_FIREBASE_PROJECT_ID
ENV NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=$NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
ENV NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=$NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
ENV NEXT_PUBLIC_FIREBASE_APP_ID=$NEXT_PUBLIC_FIREBASE_APP_ID
ENV NEXT_PUBLIC_YOUTUBE_API_KEY=$NEXT_PUBLIC_YOUTUBE_API_KEY

ENV YOUTUBE_CLIENT_ID=$YOUTUBE_CLIENT_ID
ENV YOUTUBE_CLIENT_SECRET=$YOUTUBE_CLIENT_SECRET
ENV YOUTUBE_REDIRECT_URI=$YOUTUBE_REDIRECT_URI
ENV YOUTUBE_REFRESH_TOKEN=$YOUTUBE_REFRESH_TOKEN
ENV GOOGLE_APPLICATION_CREDENTIALS=$GOOGLE_APPLICATION_CREDENTIALS

ENV NEXT_PUBLIC_KAKAO_CLIENT_ID=$NEXT_PUBLIC_KAKAO_CLIENT_ID
ENV NEXT_PUBLIC_KAKAO_CLIENT_SECRET=$NEXT_PUBLIC_KAKAO_CLIENT_SECRET
ENV NEXT_PUBLIC_KAKAO_OAUTH_ENABLED=$NEXT_PUBLIC_KAKAO_OAUTH_ENABLED

ENV NEXT_PUBLIC_BASE_URL=$NEXT_PUBLIC_BASE_URL
ENV MOUNTAIN_ID=$MOUNTAIN_ID

# Next.js compiles the source code.
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
# Uncomment the following line in case you want to disable telemetry during runtime.
# ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 8080

ENV PORT=8080
# HOSTNAME "0.0.0.0" is often required for Docker containers to be accessible from outside
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
