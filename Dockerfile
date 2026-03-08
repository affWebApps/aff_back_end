# Use a slim image to avoid alpine/openssl issues with Prisma binaries
FROM node:22-bookworm-slim AS build
WORKDIR /app

# Install deps first for better caching
COPY package*.json prisma ./ 
RUN npm install

# Copy the rest of the source
COPY . .

# Generate Prisma client and build the app
RUN npx prisma generate \
    && npm run build

# Remove devDependencies for a smaller runtime image
RUN npm prune --omit=dev

# Expose Nest default port
EXPOSE 3000

# Run migrations then start the prod server
CMD [ "sh", "-c", "npx prisma migrate deploy && npm run start:prod" ]
