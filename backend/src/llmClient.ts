import OpenAI from 'openai';
import { Config, MCPServerConfig, SearchResult, RouteResponse } from './types.js';

export class LLMClient {
  private openai: OpenAI;
  private config: Config;

  constructor(config: Config) {
    this.config = config;
    this.openai = new OpenAI({
      apiKey: config.openai.apiKey,
    });
  }

  async selectBestServer(
    query: string,
    searchResults: SearchResult[],
    context?: string
  ): Promise<RouteResponse> {
    // Group search results by server
    const serverScores = new Map<string, { total: number; count: number; matches: string[] }>();

    for (const result of searchResults) {
      const existing = serverScores.get(result.serverId) || { total: 0, count: 0, matches: [] };
      existing.total += result.score;
      existing.count += 1;
      existing.matches.push(result.matchedText);
      serverScores.set(result.serverId, existing);
    }

    // Create candidate servers info
    const candidates = Array.from(serverScores.entries()).map(([serverId, data]) => {
      const server = this.config.mcpServers.find(s => s.id === serverId);
      return {
        serverId,
        serverName: server?.name || 'Unknown',
        avgScore: data.total / data.count,
        description: server?.description || '',
        capabilities: server?.capabilities || [],
        matches: data.matches,
      };
    });

    // Sort by average score
    candidates.sort((a, b) => b.avgScore - a.avgScore);

    // Use LLM to make final decision
    const prompt = this.buildSelectionPrompt(query, candidates, context);

    const response = await this.openai.chat.completions.create({
      model: this.config.openai.chatModel,
      messages: [
        {
          role: 'system',
          content: 'You are an expert at routing requests to the appropriate MCP server. Analyze the user query and candidate servers, then select the best server to handle the request.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');

    const selectedServer = this.config.mcpServers.find(s => s.id === result.serverId);

    if (!selectedServer) {
      // Fallback to highest scoring server
      const fallbackServerId = candidates[0]?.serverId;
      const fallbackServer = this.config.mcpServers.find(s => s.id === fallbackServerId);

      if (!fallbackServer) {
        throw new Error('No suitable server found');
      }

      return {
        selectedServer: fallbackServer,
        reasoning: 'Fallback to highest scoring server from vector search',
        confidence: candidates[0]?.avgScore || 0,
      };
    }

    return {
      selectedServer,
      reasoning: result.reasoning || 'Selected by LLM',
      confidence: result.confidence || 0.5,
    };
  }

  private buildSelectionPrompt(
    query: string,
    candidates: Array<{
      serverId: string;
      serverName: string;
      avgScore: number;
      description: string;
      capabilities: string[];
      matches: string[];
    }>,
    context?: string
  ): string {
    let prompt = `User Query: "${query}"\n\n`;

    if (context) {
      prompt += `Additional Context: ${context}\n\n`;
    }

    prompt += `Candidate Servers (ranked by similarity score):\n\n`;

    for (const candidate of candidates) {
      prompt += `Server ID: ${candidate.serverId}\n`;
      prompt += `Name: ${candidate.serverName}\n`;
      prompt += `Description: ${candidate.description}\n`;
      prompt += `Capabilities: ${candidate.capabilities.join(', ')}\n`;
      prompt += `Similarity Score: ${candidate.avgScore.toFixed(4)}\n`;
      prompt += `Matched Descriptions:\n`;
      for (const match of candidate.matches.slice(0, 2)) {
        prompt += `  - ${match}\n`;
      }
      prompt += `\n`;
    }

    prompt += `\nBased on the user query and candidate servers, select the most appropriate server.\n`;
    prompt += `Respond with a JSON object containing:\n`;
    prompt += `- serverId: The ID of the selected server\n`;
    prompt += `- reasoning: A brief explanation of why this server was selected (1-2 sentences)\n`;
    prompt += `- confidence: A number between 0 and 1 indicating your confidence in this selection\n`;

    return prompt;
  }

  async generateToolCall(
    query: string,
    selectedServer: MCPServerConfig,
    availableTools: Array<{ name: string; description: string; inputSchema: unknown }>
  ): Promise<{ toolName: string; arguments: Record<string, unknown> }> {
    const toolsInfo = availableTools.map(tool => ({
      name: tool.name,
      description: tool.description,
      schema: tool.inputSchema,
    }));

    const prompt = `Server: ${selectedServer.name}
User Query: "${query}"

Available Tools:
${JSON.stringify(toolsInfo, null, 2)}

Based on the user query, determine which tool to call and what arguments to provide.
Respond with a JSON object containing:
- toolName: The name of the tool to call
- arguments: An object with the tool arguments

If no tool is suitable, respond with { "toolName": null, "arguments": {} }`;

    const response = await this.openai.chat.completions.create({
      model: this.config.openai.chatModel,
      messages: [
        {
          role: 'system',
          content: 'You are an expert at mapping user queries to appropriate tool calls.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.2,
      response_format: { type: 'json_object' },
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');

    return {
      toolName: result.toolName || '',
      arguments: result.arguments || {},
    };
  }
}
