#!/usr/bin/env node

import dotenv from 'dotenv';
import { MCPRouterServer } from './server.js';
import { loadConfig } from './config.js';

// Load environment variables from .env file
dotenv.config();

async function main() {
  try {
    // Load configuration
    const config = await loadConfig();

    // Create and initialize server
    const server = new MCPRouterServer(config);
    await server.initialize();

    // Handle shutdown
    process.on('SIGINT', async () => {
      console.error('\nShutting down...');
      await server.shutdown();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.error('\nShutting down...');
      await server.shutdown();
      process.exit(0);
    });

    // Start server
    await server.start();
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

main();
