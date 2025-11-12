import express, { Request, Response } from 'express';
import cors from 'cors';
import { Config } from './types.js';
import { VectorStore } from './vectorStore.js';
import { LLMClient } from './llmClient.js';
import { MCPClient } from './mcpClient.js';

export class HTTPServer {
  private app: express.Application;
  private vectorStore: VectorStore;
  private llmClient: LLMClient;
  private mcpClient: MCPClient;
  private config: Config;
  private port: number;

  constructor(config: Config, port: number = 3001) {
    this.config = config;
    this.port = port;
    this.vectorStore = new VectorStore(config);
    this.llmClient = new LLMClient(config);
    this.mcpClient = new MCPClient();
    this.app = express();

    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    // Enable CORS for frontend
    this.app.use(cors({
      origin: ['http://localhost:3000', 'http://localhost:3001'],
      credentials: true,
    }));

    // Parse JSON bodies
    this.app.use(express.json());
  }

  private setupRoutes(): void {
    // Health check
    this.app.get('/health', (req: Request, res: Response) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });

    // List available MCP servers
    this.app.get('/api/servers', async (req: Request, res: Response) => {
      try {
        const servers = this.config.mcpServers.map(server => ({
          id: server.id,
          name: server.name,
          description: server.description,
          capabilities: server.capabilities,
          connected: this.mcpClient.isConnected(server.id),
        }));

        res.json({ servers });
      } catch (error) {
        console.error('Error listing servers:', error);
        res.status(500).json({
          error: 'Failed to list servers',
          message: error instanceof Error ? error.message : String(error)
        });
      }
    });

    // Chat endpoint with streaming
    this.app.post('/api/chat', async (req: Request, res: Response) => {
      try {
        const { message, context } = req.body;

        if (!message || typeof message !== 'string') {
          return res.status(400).json({ error: 'Message is required' });
        }

        // Set headers for streaming
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        // Send initial event
        res.write(`data: ${JSON.stringify({ type: 'start', timestamp: new Date().toISOString() })}\n\n`);

        // Step 1: Vector search
        res.write(`data: ${JSON.stringify({ type: 'status', message: 'Searching for appropriate MCP server...' })}\n\n`);
        const searchResults = await this.vectorStore.search(message, 5);

        // Step 2: LLM selection
        res.write(`data: ${JSON.stringify({ type: 'status', message: 'Selecting best server...' })}\n\n`);
        const routeResponse = await this.llmClient.selectBestServer(
          message,
          searchResults,
          context
        );

        // Send MCP source info
        res.write(`data: ${JSON.stringify({
          type: 'mcp_source',
          source: {
            id: routeResponse.selectedServer.id,
            name: routeResponse.selectedServer.name,
            reasoning: routeResponse.reasoning,
            confidence: routeResponse.confidence,
          }
        })}\n\n`);

        // Step 3: Connect to selected server
        res.write(`data: ${JSON.stringify({ type: 'status', message: `Connecting to ${routeResponse.selectedServer.name}...` })}\n\n`);
        await this.mcpClient.connectToServer(routeResponse.selectedServer);

        // Step 4: Get available tools
        const tools = await this.mcpClient.getTools(routeResponse.selectedServer.id);

        // Step 5: Generate tool call
        res.write(`data: ${JSON.stringify({ type: 'status', message: 'Generating response...' })}\n\n`);
        const toolCall = await this.llmClient.generateToolCall(
          message,
          routeResponse.selectedServer,
          tools
        );

        // Step 6: Execute tool call
        let result;
        if (toolCall.toolName) {
          res.write(`data: ${JSON.stringify({ type: 'status', message: `Executing ${toolCall.toolName}...` })}\n\n`);
          result = await this.mcpClient.callTool(
            routeResponse.selectedServer.id,
            toolCall.toolName,
            toolCall.arguments
          );
        }

        // Format the response text
        const responseText = this.formatResponse(routeResponse, toolCall, result);

        // Stream the response text character by character
        for (let i = 0; i < responseText.length; i++) {
          const chunk = responseText.slice(i, i + 10); // Send 10 chars at a time
          res.write(`data: ${JSON.stringify({ type: 'content', content: chunk })}\n\n`);
          await new Promise(resolve => setTimeout(resolve, 20)); // Small delay for streaming effect
        }

        // Send completion event
        res.write(`data: ${JSON.stringify({
          type: 'done',
          metadata: {
            serverId: routeResponse.selectedServer.id,
            serverName: routeResponse.selectedServer.name,
            toolCalled: toolCall.toolName || 'none',
            confidence: routeResponse.confidence,
          }
        })}\n\n`);

        res.end();
      } catch (error) {
        console.error('Error in chat endpoint:', error);
        res.write(`data: ${JSON.stringify({
          type: 'error',
          error: 'An error occurred processing your request',
          message: error instanceof Error ? error.message : String(error)
        })}\n\n`);
        res.end();
      }
    });

    // Non-streaming chat endpoint (simpler alternative)
    this.app.post('/api/chat/simple', async (req: Request, res: Response) => {
      try {
        const { message, context } = req.body;

        if (!message || typeof message !== 'string') {
          return res.status(400).json({ error: 'Message is required' });
        }

        // Step 1: Vector search
        const searchResults = await this.vectorStore.search(message, 5);

        // Step 2: LLM selection
        const routeResponse = await this.llmClient.selectBestServer(
          message,
          searchResults,
          context
        );

        // Step 3: Connect to selected server
        await this.mcpClient.connectToServer(routeResponse.selectedServer);

        // Step 4: Get available tools
        const tools = await this.mcpClient.getTools(routeResponse.selectedServer.id);

        // Step 5: Generate tool call
        const toolCall = await this.llmClient.generateToolCall(
          message,
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

        // Format response
        const responseText = this.formatResponse(routeResponse, toolCall, result);

        res.json({
          content: responseText,
          mcpSources: [{
            id: routeResponse.selectedServer.id,
            name: routeResponse.selectedServer.name,
            reasoning: routeResponse.reasoning,
            confidence: routeResponse.confidence,
          }],
          metadata: {
            serverId: routeResponse.selectedServer.id,
            serverName: routeResponse.selectedServer.name,
            toolCalled: toolCall.toolName || 'none',
            toolArguments: toolCall.arguments,
          }
        });
      } catch (error) {
        console.error('Error in simple chat endpoint:', error);
        res.status(500).json({
          error: 'Failed to process message',
          message: error instanceof Error ? error.message : String(error)
        });
      }
    });
  }

  private formatResponse(
    routeResponse: any,
    toolCall: { toolName: string; arguments: Record<string, unknown> },
    result: any
  ): string {
    let response = `I've routed your request to the **${routeResponse.selectedServer.name}**.\n\n`;
    response += `**Why this server?** ${routeResponse.reasoning}\n\n`;

    if (toolCall.toolName) {
      response += `**Tool used:** ${toolCall.toolName}\n\n`;

      if (result) {
        response += `**Result:**\n`;
        if (typeof result === 'string') {
          response += result;
        } else {
          response += '```json\n' + JSON.stringify(result, null, 2) + '\n```';
        }
      }
    } else {
      response += `No specific tool was needed for this query.`;
    }

    return response;
  }

  async initialize(): Promise<void> {
    await this.vectorStore.initialize();
    console.log('HTTP Server initialized');
  }

  async start(): Promise<void> {
    this.app.listen(this.port, () => {
      console.log(`HTTP Server running on http://localhost:${this.port}`);
      console.log(`Health check: http://localhost:${this.port}/health`);
      console.log(`API endpoints:`);
      console.log(`  - POST /api/chat (streaming)`);
      console.log(`  - POST /api/chat/simple (non-streaming)`);
      console.log(`  - GET /api/servers`);
    });
  }

  async shutdown(): Promise<void> {
    await this.mcpClient.disconnectAll();
    console.log('HTTP Server shut down');
  }
}
