#!/usr/bin/env node

import dotenv from 'dotenv';
import { HTTPServer } from './httpServer.js';
import { loadConfig } from './config.js';

// Load environment variables from .env file
dotenv.config();

async function main() {
  try {
    // Load configuration
    const config = await loadConfig();

    // Get port from environment or use default
    const port = parseInt(process.env.PORT || '3001', 10);

    // Create and initialize HTTP server
    const server = new HTTPServer(config, port);
    await server.initialize();

    // Handle shutdown
    process.on('SIGINT', async () => {
      console.log('\nShutting down HTTP server...');
      await server.shutdown();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.log('\nShutting down HTTP server...');
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
