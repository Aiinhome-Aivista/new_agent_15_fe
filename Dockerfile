# ============================================
# Stage 1: Build React/Vite application
# ============================================
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
# COPY package.json package-lock.json ./
# RUN npm ci

COPY package.json ./
RUN npm install

# Copy application source
COPY . .

# API URL available during Vite build
ARG VITE_API_BASE_URL=
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

# Build production application
RUN npm run build


# ============================================
# Stage 2: Production Nginx server
# ============================================
FROM nginx:alpine AS runner

# Remove default Nginx content/config
RUN rm -rf /usr/share/nginx/html/*
RUN rm -f /etc/nginx/conf.d/default.conf

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy Vite production build
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:80/healthz || exit 1

CMD ["nginx", "-g", "daemon off;"]