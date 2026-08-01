FROM mcr.microsoft.com/playwright:v1.56.0-jammy
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY worker ./worker
CMD ["node", "worker/index.mjs"]
