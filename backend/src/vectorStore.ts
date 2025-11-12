import faiss from "faiss-node";
const { IndexFlatL2 } = faiss;
import { readFile, writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import { dirname } from "path";
import OpenAI from "openai";
import { VectorMetadata, SearchResult, Config } from "./types.js";

export class VectorStore {
  private index: any | null = null;
  private metadata: VectorMetadata[] = [];
  private openai: OpenAI;
  private config: Config;

  constructor(config: Config) {
    this.config = config;
    this.openai = new OpenAI({
      apiKey: config.openai.apiKey,
    });
  }

  async initialize(): Promise<void> {
    const indexPath = this.config.faiss.indexPath;
    const metadataPath = this.config.faiss.metadataPath;

    // Create data directory if it doesn't exist
    await mkdir(dirname(indexPath), { recursive: true });

    if (existsSync(indexPath) && existsSync(metadataPath)) {
      // Load existing index
      await this.loadIndex();
    } else {
      // Create new index
      await this.createIndex();
    }
  }

  private async loadIndex(): Promise<void> {
    const indexPath = this.config.faiss.indexPath;
    const metadataPath = this.config.faiss.metadataPath;

    this.index = await IndexFlatL2.read(indexPath);
    const metadataContent = await readFile(metadataPath, "utf-8");
    this.metadata = JSON.parse(metadataContent);

    console.log(`Loaded FAISS index with ${this.metadata.length} vectors`);
  }

  private async createIndex(): Promise<void> {
    const dimension = this.config.faiss.dimension;
    this.index = new IndexFlatL2(dimension);

    // Build index from MCP server descriptions
    for (const server of this.config.mcpServers) {
      await this.addServer(
        server.id,
        server.name,
        server.description,
        server.capabilities
      );
    }

    await this.saveIndex();
    console.log(`Created new FAISS index with ${this.metadata.length} vectors`);
  }

  private async addServer(
    serverId: string,
    serverName: string,
    description: string,
    capabilities: string[]
  ): Promise<void> {
    // Create text representations for embedding
    const texts = [
      description,
      `${serverName}: ${description}`,
      `Capabilities: ${capabilities.join(", ")}`,
      ...capabilities.map((cap) => `${serverName} can handle ${cap} tasks`),
    ];

    for (const text of texts) {
      const embedding = await this.getEmbedding(text);

      if (this.index) {
        this.index.add(embedding);
        this.metadata.push({
          id: `${serverId}-${this.metadata.length}`,
          text,
          serverId,
          serverName,
        });
      }
    }
  }

  private async getEmbedding(text: string): Promise<number[]> {
    const response = await this.openai.embeddings.create({
      model: this.config.openai.embeddingModel,
      input: text,
    });

    return response.data[0].embedding;
  }

  async search(query: string, topK: number = 5): Promise<SearchResult[]> {
    if (!this.index) {
      throw new Error("Vector store not initialized");
    }

    const queryEmbedding = await this.getEmbedding(query);
    const result = this.index.search(queryEmbedding, topK);

    const searchResults: SearchResult[] = [];
    for (let i = 0; i < result.labels.length; i++) {
      const label = result.labels[i];
      const distance = result.distances[i];
      const meta = this.metadata[label];

      if (meta) {
        // Convert distance to similarity score (lower distance = higher similarity)
        const score = 1 / (1 + distance);

        searchResults.push({
          serverId: meta.serverId,
          serverName: meta.serverName,
          score,
          matchedText: meta.text,
        });
      }
    }

    return searchResults;
  }

  private async saveIndex(): Promise<void> {
    if (!this.index) {
      throw new Error("No index to save");
    }

    const indexPath = this.config.faiss.indexPath;
    const metadataPath = this.config.faiss.metadataPath;

    await this.index.write(indexPath);
    await writeFile(metadataPath, JSON.stringify(this.metadata, null, 2));
  }

  async rebuildIndex(): Promise<void> {
    this.metadata = [];
    this.index = new IndexFlatL2(this.config.faiss.dimension);
    await this.createIndex();
  }
}
