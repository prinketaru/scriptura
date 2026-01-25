# Use official Node.js LTS image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm ci --omit=dev

# Copy the rest of the bot source code
COPY . .

# Set environment variable if needed (optional)
# ENV DISCORD_TOKEN=your_token_here

# Start the bot
CMD ["node", "index.js"]
