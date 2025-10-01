FROM node:20-alpine

# Install build tools for sqlite3 compilation
RUN apk add --no-cache python3 make g++ bash

WORKDIR /usr/src/app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install --build-from-source sqlite3

# Copy all other files
COPY . .

# Expose port
EXPOSE 3000

# Run app
CMD ["npm", "start"]
