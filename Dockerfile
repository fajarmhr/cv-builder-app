# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app

# Install dependencies for native modules
RUN apk add --no-cache python3 make g++ cairo-dev pango-dev jpeg-dev giflib-dev

COPY package*.json ./
RUN npm ci

COPY . .
RUN npx prisma generate
RUN npm run build

# Stage 2: Run
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Install runtime deps for canvas + tesseract
RUN apk add --no-cache cairo pango jpeg giflib tesseract-ocr tesseract-ocr-data-eng tesseract-ocr-data-ind

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/generated ./generated
COPY --from=builder /app/node_modules/pdfjs-dist ./node_modules/pdfjs-dist
COPY --from=builder /app/node_modules/pdf-to-img ./node_modules/pdf-to-img
COPY --from=builder /app/node_modules/canvas ./node_modules/canvas

# Create storage directories
RUN mkdir -p storage/uploads storage/exports storage/.tmp

# Set Tesseract path for Alpine
ENV TESSERACT_PATH=/usr/bin/tesseract

EXPOSE 3000
CMD ["node", "server.js"]
