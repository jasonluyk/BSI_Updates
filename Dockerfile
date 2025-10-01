FROM node:20-alpine

# Create app directory
WORKDIR /usr/src/app

# Install dependencies
COPY package*.json ./
RUN npm install --production
RUN npm install --build-from-source sqlite3

# Bundle app source
COPY . .

# Expose port
EXPOSE 3000

# Start app
CMD ["npm", "start"]
