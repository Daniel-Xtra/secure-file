#!/bin/bash

# Start the application with PM2
echo "Starting secure-file-service..."
pm2-runtime start ecosystem.config.js
