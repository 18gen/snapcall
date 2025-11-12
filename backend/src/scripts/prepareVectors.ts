#!/usr/bin/env node

import dotenv from 'dotenv';
import { VectorStore } from '../vectorStore.js';
import { loadConfig } from '../config.js';

// Load environment variables from .env file
dotenv.config();

async function main() {
  try {
    console.log('Loading configuration...');
    const config = await loadConfig();

    console.log('Initializing vector store...');
    const vectorStore = new VectorStore(config);

    console.log('Rebuilding vector index...');
    await vectorStore.rebuildIndex();

    console.log('Vector index created successfully!');
    console.log(`Index saved to: ${config.faiss.indexPath}`);
    console.log(`Metadata saved to: ${config.faiss.metadataPath}`);
  } catch (error) {
    console.error('Error preparing vectors:', error);
    process.exit(1);
  }
}

main();
