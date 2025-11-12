export interface MCPServerConfig {
  id: string;
  name: string;
  description: string;
  command: string;
  args: string[];
  capabilities: string[];
}

export interface Config {
  openai: {
    apiKey: string;
    embeddingModel: string;
    chatModel: string;
  };
  faiss: {
    indexPath: string;
    metadataPath: string;
    dimension: number;
  };
  mcpServers: MCPServerConfig[];
}

export interface VectorMetadata {
  id: string;
  text: string;
  serverId: string;
  serverName: string;
}

export interface SearchResult {
  serverId: string;
  serverName: string;
  score: number;
  matchedText: string;
}

export interface MCPToolCall {
  toolName: string;
  arguments: Record<string, unknown>;
}

export interface RouteRequest {
  query: string;
  context?: string;
}

export interface RouteResponse {
  selectedServer: MCPServerConfig;
  reasoning: string;
  confidence: number;
}
