import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { MCPServerConfig } from './types.js';

export class MCPClient {
  private clients: Map<string, Client> = new Map();
  private transports: Map<string, StdioClientTransport> = new Map();

  async connectToServer(config: MCPServerConfig): Promise<Client> {
    // Check if already connected
    const existing = this.clients.get(config.id);
    if (existing) {
      return existing;
    }

    // Create transport
    const transport = new StdioClientTransport({
      command: config.command,
      args: config.args,
    });

    // Create client
    const client = new Client(
      {
        name: 'mcp-router-client',
        version: '1.0.0',
      },
      {
        capabilities: {},
      }
    );

    // Connect
    await client.connect(transport);

    // Store client and transport
    this.clients.set(config.id, client);
    this.transports.set(config.id, transport);

    console.log(`Connected to MCP server: ${config.name}`);

    return client;
  }

  async getTools(serverId: string): Promise<Array<{ name: string; description: string; inputSchema: unknown }>> {
    const client = this.clients.get(serverId);
    if (!client) {
      throw new Error(`Not connected to server: ${serverId}`);
    }

    const response = await client.listTools();
    return response.tools.map(tool => ({
      name: tool.name,
      description: tool.description || '',
      inputSchema: tool.inputSchema,
    }));
  }

  async callTool(
    serverId: string,
    toolName: string,
    args: Record<string, unknown>
  ): Promise<unknown> {
    const client = this.clients.get(serverId);
    if (!client) {
      throw new Error(`Not connected to server: ${serverId}`);
    }

    const response = await client.callTool({
      name: toolName,
      arguments: args,
    });

    return response.content;
  }

  async getResources(serverId: string): Promise<Array<{ uri: string; name: string; description?: string }>> {
    const client = this.clients.get(serverId);
    if (!client) {
      throw new Error(`Not connected to server: ${serverId}`);
    }

    const response = await client.listResources();
    return response.resources.map(resource => ({
      uri: resource.uri,
      name: resource.name,
      description: resource.description,
    }));
  }

  async readResource(serverId: string, uri: string): Promise<unknown> {
    const client = this.clients.get(serverId);
    if (!client) {
      throw new Error(`Not connected to server: ${serverId}`);
    }

    const response = await client.readResource({ uri });
    return response.contents;
  }

  async disconnectAll(): Promise<void> {
    for (const [serverId, client] of this.clients.entries()) {
      try {
        await client.close();
        const transport = this.transports.get(serverId);
        if (transport) {
          await transport.close();
        }
        console.log(`Disconnected from server: ${serverId}`);
      } catch (error) {
        console.error(`Error disconnecting from ${serverId}:`, error);
      }
    }

    this.clients.clear();
    this.transports.clear();
  }

  async disconnect(serverId: string): Promise<void> {
    const client = this.clients.get(serverId);
    if (client) {
      await client.close();
    }

    const transport = this.transports.get(serverId);
    if (transport) {
      await transport.close();
    }

    this.clients.delete(serverId);
    this.transports.delete(serverId);
  }

  isConnected(serverId: string): boolean {
    return this.clients.has(serverId);
  }
}
