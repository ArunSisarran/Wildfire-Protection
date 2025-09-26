### Builder: install deps and build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --include=dev
COPY . .
RUN npm run build

### Runner: production, minimal
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Copy only the necessary build artifacts and minimal files
COPY --from=builder /app/package*.json ./
RUN npm ci --omit=dev --ignore-scripts
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.mjs ./next.config.mjs

EXPOSE 3000
CMD ["npm", "run", "start"]


