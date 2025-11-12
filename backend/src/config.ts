import { readFile } from 'fs/promises';
import { Config } from './types.js';

export async function loadConfig(): Promise<Config> {
  const configContent = await readFile('./config.json', 'utf-8');
  const config: Config = JSON.parse(configContent);

  // Replace environment variables
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is required');
  }

  config.openai.apiKey = apiKey;

  return config;
}
