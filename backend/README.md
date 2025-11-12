# MCP Router Server

A Model Context Protocol (MCP) server that intelligently routes queries to appropriate MCP servers using FAISS-based RAG (Retrieval-Augmented Generation) and LLM-powered selection.

## Features

- **Intelligent Routing**: Uses FAISS vector search to find relevant MCP servers
- **LLM-Powered Selection**: Employs GPT models to make final routing decisions
- **Automatic Tool Calling**: Can automatically determine and call appropriate tools on target servers
- **Multiple Search Modes**: Supports both automatic routing and manual server selection
- **Resource Management**: Provides information about available servers and their capabilities

## Architecture

```
┌─────────────┐
│   Client    │
│  (Frontend) │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────┐
│   MCP Router Server             │
│  ┌─────────────────────────┐   │
│  │  1. Vector Search       │   │
│  │     (FAISS RAG)         │   │
│  └───────────┬─────────────┘   │
│              ▼                  │
│  ┌─────────────────────────┐   │
│  │  2. LLM Selection       │   │
│  │     (GPT-4o-mini)       │   │
│  └───────────┬─────────────┘   │
│              ▼                  │
│  ┌─────────────────────────┐   │
│  │  3. Tool Call Generation│   │
│  └───────────┬─────────────┘   │
└──────────────┼─────────────────┘
               ▼
    ┌──────────────────┐
    │  Target MCP      │
    │  Servers (5)     │
    └──────────────────┘
```

## Installation

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env and add your OpenAI API key

# Build the project
npm run build

# Prepare vector database (optional, will be created automatically on first run)
npm run prepare-vectors
```

## Configuration

Edit `config.json` to configure:

1. **OpenAI Settings**: API key, models for embedding and chat
2. **FAISS Settings**: Index paths and vector dimensions
3. **MCP Servers**: List of target MCP servers with their configurations

Example MCP server configuration:

```json
{
  "id": "server1",
  "name": "Weather MCP Server",
  "description": "Provides weather information, forecasts, and climate data",
  "command": "node",
  "args": ["/path/to/weather-server/index.js"],
  "capabilities": ["weather", "forecast", "temperature", "climate"]
}
```

## Usage

### Starting the Server

```bash
npm start
```

Or in development mode:

```bash
npm run dev
```

### Available Tools

The MCP Router Server exposes the following tools:

#### 1. `route_query`

Automatically routes a query to the most appropriate MCP server.

```json
{
  "query": "What's the weather in Tokyo?",
  "context": "User wants current weather conditions"
}
```

**Response:**
```json
{
  "selectedServer": {
    "id": "server1",
    "name": "Weather MCP Server"
  },
  "reasoning": "The query explicitly asks about weather in Tokyo, which matches the Weather MCP Server's capabilities",
  "confidence": 0.95,
  "toolCalled": "get_weather",
  "toolArguments": {
    "location": "Tokyo"
  },
  "result": { ... }
}
```

#### 2. `execute_on_server`

Directly execute a tool on a specific MCP server.

```json
{
  "serverId": "server1",
  "toolName": "get_weather",
  "arguments": {
    "location": "Tokyo"
  }
}
```

#### 3. `list_servers`

List all available MCP servers and their status.

```json
{}
```

**Response:**
```json
{
  "servers": [
    {
      "id": "server1",
      "name": "Weather MCP Server",
      "description": "Provides weather information...",
      "capabilities": ["weather", "forecast", ...],
      "connected": true
    },
    ...
  ]
}
```

#### 4. `search_servers`

Search for appropriate servers using vector similarity.

```json
{
  "query": "I need to analyze sales data",
  "topK": 5
}
```

**Response:**
```json
{
  "results": [
    {
      "serverId": "server5",
      "serverName": "Analytics MCP Server",
      "avgScore": 0.89,
      "matches": [
        "Provides data analytics, visualization...",
        "Analytics MCP Server can handle analytics tasks"
      ]
    },
    ...
  ]
}
```

## How It Works

### 1. Vector Search (FAISS RAG)

- Each MCP server's description and capabilities are embedded using OpenAI's embedding model
- Multiple text variations are created for better matching
- Vectors are stored in a FAISS index for fast similarity search
- User queries are embedded and compared against the index

### 2. LLM Selection

- Top candidates from vector search are passed to GPT-4o-mini
- The LLM analyzes the query context and candidate servers
- Makes a final decision on which server to use
- Provides reasoning and confidence score

### 3. Tool Execution

- Connects to the selected MCP server
- Retrieves available tools from the server
- Uses LLM to determine which tool to call and with what arguments
- Executes the tool and returns results

## Development

### Project Structure

```
.
├── config.json              # Server configuration
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts            # Entry point
│   ├── server.ts           # Main MCP router server
│   ├── config.ts           # Configuration loader
│   ├── types.ts            # TypeScript types
│   ├── vectorStore.ts      # FAISS vector database
│   ├── llmClient.ts        # OpenAI LLM client
│   ├── mcpClient.ts        # MCP client for target servers
│   └── scripts/
│       └── prepareVectors.ts  # Vector index preparation
└── data/                   # Vector index and metadata (created automatically)
```

### Rebuilding Vector Index

If you modify the MCP server configurations, rebuild the vector index:

```bash
npm run prepare-vectors
```

## Dependencies

- `@modelcontextprotocol/sdk`: MCP protocol implementation
- `faiss-node`: FAISS vector similarity search
- `openai`: OpenAI API client for embeddings and chat
- `zod`: Runtime type validation

## Environment Variables

- `OPENAI_API_KEY`: Your OpenAI API key (required)

## Troubleshooting

### FAISS Index Issues

If you encounter issues with the FAISS index:

1. Delete the `data/` directory
2. Run `npm run prepare-vectors`
3. Restart the server

### Connection Issues

If target MCP servers fail to connect:

1. Verify the command and args in `config.json`
2. Ensure the target servers are accessible
3. Check server logs for errors

## License

MIT
