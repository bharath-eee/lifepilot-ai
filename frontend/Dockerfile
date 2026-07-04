FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

# Install packages
RUN npm install

COPY . .

EXPOSE 5173

# Start Vite dev server exposing to network
CMD ["npm", "run", "dev", "--", "--host"]
