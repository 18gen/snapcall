import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  CallToolRequest,
  ReadResourceRequest,
} from "@modelcontextprotocol/sdk/types.js";
import { VectorStore } from "./vectorStore.js";
import { LLMClient } from "./llmClient.js";
import { MCPClient } from "./mcpClient.js";
import { Config } from "./types.js";

export class MCPRouterServer {
  private server: Server;
  private vectorStore: VectorStore;
  private llmClient: LLMClient;
  private mcpClient: MCPClient;
  private config: Config;

  constructor(config: Config) {
    this.config = config;
    this.vectorStore = new VectorStore(config);
    this.llmClient = new LLMClient(config);
    this.mcpClient = new MCPClient();

    this.server = new Server(
      {
        name: "mcp-router-server",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
          resources: {},
        },
      }
    );

    this.setupHandlers();
  }

  private setupHandlers(): void {
    // List tools - aggregate from all servers
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const allTools: Array<{
        name: string;
        description: string;
        inputSchema: unknown;
      }> = [];

      // Add router-specific tools
      allTools.push({
        name: "route_query",
        description:
          "Route a query to the most appropriate MCP server using RAG and LLM selection",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "The query to route to an appropriate MCP server",
            },
            context: {
              type: "string",
              description: "Optional additional context for routing decision",
            },
          },
          required: ["query"],
        },
      });

      allTools.push({
        name: "execute_on_server",
        description: "Execute a tool on a specific MCP server directly",
        inputSchema: {
          type: "object",
          properties: {
            serverId: {
              type: "string",
              description: "The ID of the target MCP server",
            },
            toolName: {
              type: "string",
              description: "The name of the tool to execute",
            },
            arguments: {
              type: "object",
              description: "Arguments to pass to the tool",
            },
          },
          required: ["serverId", "toolName", "arguments"],
        },
      });

      allTools.push({
        name: "list_servers",
        description: "List all available MCP servers and their capabilities",
        inputSchema: {
          type: "object",
          properties: {},
        },
      });

      allTools.push({
        name: "search_servers",
        description:
          "Search for appropriate MCP servers based on a query using vector similarity",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "The search query",
            },
            topK: {
              type: "number",
              description: "Number of results to return (default: 5)",
            },
          },
          required: ["query"],
        },
      });

      return { tools: allTools };
    });

    // Call tool handler
    this.server.setRequestHandler(
      CallToolRequestSchema,
      async (request: CallToolRequest) => {
        const { name, arguments: args } = request.params;

        try {
          switch (name) {
            case "route_query":
              return await this.handleRouteQuery(
                args as { query: string; context?: string }
              );

            case "execute_on_server":
              return await this.handleExecuteOnServer(
                args as {
                  serverId: string;
                  toolName: string;
                  arguments: Record<string, unknown>;
                }
              );

            case "list_servers":
              return await this.handleListServers();

            case "search_servers":
              return await this.handleSearchServers(
                args as { query: string; topK?: number }
              );

            default:
              throw new Error(`Unknown tool: ${name}`);
          }
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          return {
            content: [
              {
                type: "text",
                text: `Error: ${errorMessage}`,
              },
            ],
            isError: true,
          };
        }
      }
    );

    // List resources
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      // Return information about available servers as resources
      const resources = this.config.mcpServers.map((server) => ({
        uri: `server://${server.id}`,
        name: server.name,
        description: server.description,
        mimeType: "application/json",
      }));

      return { resources };
    });

    // Read resource
    this.server.setRequestHandler(
      ReadResourceRequestSchema,
      async (request: ReadResourceRequest) => {
        const { uri } = request.params;

        // Parse server ID from URI
        const match = uri.match(/^server:\/\/(.+)$/);
        if (!match) {
          throw new Error("Invalid resource URI");
        }

        const serverId = match[1];
        const server = this.config.mcpServers.find((s) => s.id === serverId);

        if (!server) {
          throw new Error(`Server not found: ${serverId}`);
        }

        return {
          contents: [
            {
              uri,
              mimeType: "application/json",
              text: JSON.stringify(server, null, 2),
            },
          ],
        };
      }
    );
  }

  private async handleRouteQuery(args: { query: string; context?: string }) {
    const { query, context } = args;

    // Step 1: Vector search
    const searchResults = await this.vectorStore.search(query, 5);

    // Step 2: LLM selection
    const routeResponse = await this.llmClient.selectBestServer(
      query,
      searchResults,
      context
    );

    // Step 3: Connect to selected server
    await this.mcpClient.connectToServer(routeResponse.selectedServer);

    // Step 4: Get available tools
    const tools = await this.mcpClient.getTools(
      routeResponse.selectedServer.id
    );

    // Step 5: Generate tool call
    const toolCall = await this.llmClient.generateToolCall(
      query,
      routeResponse.selectedServer,
      tools
    );

    // Step 6: Execute tool call
    let result;
    if (toolCall.toolName) {
      result = await this.mcpClient.callTool(
        routeResponse.selectedServer.id,
        toolCall.toolName,
        toolCall.arguments
      );
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              selectedServer: {
                id: routeResponse.selectedServer.id,
                name: routeResponse.selectedServer.name,
              },
              reasoning: routeResponse.reasoning,
              confidence: routeResponse.confidence,
              toolCalled: toolCall.toolName || "none",
              toolArguments: toolCall.arguments,
              result,
            },
            null,
            2
          ),
        },
      ],
    };
  }

  private async handleExecuteOnServer(args: {
    serverId: string;
    toolName: string;
    arguments: Record<string, unknown>;
  }) {
    const { serverId, toolName, arguments: toolArgs } = args;

    const serverConfig = this.config.mcpServers.find((s) => s.id === serverId);
    if (!serverConfig) {
      throw new Error(`Server not found: ${serverId}`);
    }

    // Connect if not already connected
    if (!this.mcpClient.isConnected(serverId)) {
      await this.mcpClient.connectToServer(serverConfig);
    }

    // Execute tool
    const result = await this.mcpClient.callTool(serverId, toolName, toolArgs);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              serverId,
              toolName,
              result,
            },
            null,
            2
          ),
        },
      ],
    };
  }

  private async handleListServers() {
    const servers = this.config.mcpServers.map((server) => ({
      id: server.id,
      name: server.name,
      description: server.description,
      capabilities: server.capabilities,
      connected: this.mcpClient.isConnected(server.id),
    }));

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ servers }, null, 2),
        },
      ],
    };
  }

  private async handleSearchServers(args: { query: string; topK?: number }) {
    const { query, topK = 5 } = args;

    const searchResults = await this.vectorStore.search(query, topK);

    // Group by server
    const serverResults = new Map<
      string,
      {
        serverId: string;
        serverName: string;
        avgScore: number;
        matches: string[];
      }
    >();

    for (const result of searchResults) {
      const existing = serverResults.get(result.serverId);
      if (existing) {
        existing.avgScore = (existing.avgScore + result.score) / 2;
        existing.matches.push(result.matchedText);
      } else {
        serverResults.set(result.serverId, {
          serverId: result.serverId,
          serverName: result.serverName,
          avgScore: result.score,
          matches: [result.matchedText],
        });
      }
    }

    const results = Array.from(serverResults.values()).sort(
      (a, b) => b.avgScore - a.avgScore
    );

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ results }, null, 2),
        },
      ],
    };
  }

  async initialize(): Promise<void> {
    await this.vectorStore.initialize();
    console.log("MCP Router Server initialized");
  }

  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.log("MCP Router Server started on stdio");
  }

  async shutdown(): Promise<void> {
    await this.mcpClient.disconnectAll();
    await this.server.close();
    console.log("MCP Router Server shut down");
  }
}
