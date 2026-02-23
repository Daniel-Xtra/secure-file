#!/usr/bin/env node
/* eslint-disable */
/**
 * Helper script to extract NODE_ENV from .env file
 * This is used by ecosystem.config.js to set the environment dynamically
 */

const fs = require('fs');
const path = require('path');

function getNodeEnvFromDotEnv() {
	try {
		const envPath = path.resolve(process.cwd(), '.env');
		const envContents = fs.readFileSync(envPath, 'utf8');
		const nodeEnvMatch = envContents.match(/NODE_ENV=([^\r\n]+)/);
		return nodeEnvMatch ? nodeEnvMatch[1] : 'development';
	} catch (error) {
		console.error('Error reading .env file, using default environment:', error.message);
		return 'development';
	}
}

// Print the NODE_ENV value to stdout
console.log(getNodeEnvFromDotEnv());
