# Mobile Dockerfile for Doctor's App (React Native/Expo)
# Lightweight image for running Expo dev server

FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy application code  
COPY . .

# Expose port for Expo dev server
EXPOSE 19000 19001 19002 19006

# Default command: Start Expo dev server
CMD ["npm", "start"]
