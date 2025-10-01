FROM node:20-alpine

# Install build tools
RUN apk add --no-cache \
    python3 \
    py3-distutils \
    make \
    g++ \
    bash \
    git

WORKDIR /usr/src/app

COPY package*.json ./

# Force sqlite3 to build for the correct architecture
RUN npm install --build-from-source sqlite3

COPY . .

EXPOSE 3000

CMD ["npm", "start"]
