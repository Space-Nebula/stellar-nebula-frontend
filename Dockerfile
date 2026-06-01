# Development Dockerfile
FROM node:18-alpine

WORKDIR /app

# Install dependencies first (for caching)
COPY package*.json ./
RUN npm install

# Copy the rest of the application
COPY . .

# Expose the port Vite runs on
EXPOSE 5173

# Run the development server with host mapping
CMD ["npm", "run", "dev", "--", "--host"]
