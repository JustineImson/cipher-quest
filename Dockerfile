# ── Stage 1: Build the React frontend ────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Build args are baked into the frontend bundle at build time
ARG VITE_FIREBASE_VAPID_KEY
ARG VITE_SERVER_URL
ARG VITE_GEMINI_API_KEY

RUN npm run build

# ── Stage 2: Run the Express server ──────────────────────────────────────────
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

# Copy server source and engine (server imports from src/engine)
COPY server/ ./server/
COPY src/engine/ ./src/engine/
COPY src/data/ ./src/data/

# Copy the built frontend so Express can serve it as static files
COPY --from=builder /app/dist ./dist

EXPOSE 3001

CMD ["node", "server/index.js"]
