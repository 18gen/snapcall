// API client for backend MCP server

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface MCPSource {
  id: string;
  name: string;
  reasoning: string;
  confidence: number;
}

export interface StreamEvent {
  type: 'start' | 'status' | 'mcp_source' | 'content' | 'done' | 'error';
  message?: string;
  content?: string;
  source?: MCPSource;
  metadata?: any;
  error?: string;
}

export interface ChatResponse {
  content: string;
  mcpSources: MCPSource[];
  metadata?: any;
}

/**
 * Send a chat message with streaming response
 */
export async function sendChatMessageStreaming(
  message: string,
  onEvent: (event: StreamEvent) => void,
  context?: string
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message, context }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();

  if (!reader) {
    throw new Error('Response body is not readable');
  }

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          try {
            const event: StreamEvent = JSON.parse(data);
            onEvent(event);
          } catch (e) {
            console.error('Failed to parse event:', data, e);
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * Send a chat message (simple non-streaming version)
 */
export async function sendChatMessage(
  message: string,
  context?: string
): Promise<ChatResponse> {
  const response = await fetch(`${API_BASE_URL}/api/chat/simple`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message, context }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || 'Failed to send message');
  }

  return response.json();
}

/**
 * Get list of available MCP servers
 */
export async function getServers(): Promise<any[]> {
  const response = await fetch(`${API_BASE_URL}/api/servers`);

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  return data.servers || [];
}

/**
 * Health check
 */
export async function checkHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    return response.ok;
  } catch {
    return false;
  }
}
