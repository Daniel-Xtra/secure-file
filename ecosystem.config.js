/* eslint-disable */
// Load NODE_ENV from .env file dynamically using the helper script
// The script outputs the NODE_ENV value from .env to stdout
const { execSync } = require('child_process');
let NODE_ENV;

try {
  // Execute the helper script to get NODE_ENV from .env
  NODE_ENV = execSync('./get-env.js', { encoding: 'utf8' }).trim();
  console.log('Using NODE_ENV from .env:', NODE_ENV);
} catch (error) {
  // Fallback to development if script fails
  NODE_ENV = 'development';
  console.error(
    'Error running get-env.js, using default environment:',
    error.message,
  );
}

module.exports = {
  apps: [
    {
      name: 'secure_file_service',
      script: 'dist/main.js',
      exec_mode: 'cluster',
      instances: 1,
      autorestart: true,
      watch: false,
      env_file: '.env',
      env: {
        NODE_ENV,
        IS_MAIN_API: 'true',
      },
    },
  ],
};
