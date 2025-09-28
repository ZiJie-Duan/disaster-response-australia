FROM node:18-alpine

WORKDIR /app

# Copy built app and install only production dependencies
COPY . /app
RUN npm install --production

# Expose port 3000 for Next.js app
EXPOSE 3000

# Start the Next.js app
CMD ["pnpm", "start"]