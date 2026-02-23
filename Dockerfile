# Use Node.js LTS version

FROM node:20

# Set working directory

WORKDIR /app

# Copy package.json and install dependencies

COPY package*.json ./

RUN npm install -g pm2 && npm install

# Copy all files

COPY . .

# Build the NestJS application

RUN npm run build



# Copy the ecosystem file and startup script

COPY ecosystem.config.js .

COPY start.sh .

# Make start.sh executable
RUN chmod +x start.sh

# Expose the application port

EXPOSE 3200

# Run the startup script
CMD ["sh", "./start.sh"]

