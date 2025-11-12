# Snapcall Setup Guide

This guide will help you run both the frontend chat application and the backend MCP router server.

## Architecture

- **Frontend**: Next.js chat application (port 3000)
- **Backend**: Express.js HTTP API + MCP Router with RAG-based server selection (port 3001)

The backend uses:
- OpenAI GPT-4o-mini for LLM routing decisions
- FAISS vector store for semantic search
- Multiple MCP servers for different capabilities

## Prerequisites

- Node.js 18+ installed
- OpenAI API key

## Setup Instructions

### 1. Backend Setup

```bash
cd backend

# Install dependencies (if not already done)
npm install

# Configure environment variables
# Edit .env and add your OpenAI API key
# The file should contain:
# OPENAI_API_KEY=your_key_here

# Build the TypeScript code
npm run build

# Start the HTTP server (development mode)
npm run dev:http

# OR start the HTTP server (production mode)
npm run start:http
```

The backend will start on `http://localhost:3001`

**Available endpoints:**
- `GET /health` - Health check
- `GET /api/servers` - List all MCP servers
- `POST /api/chat` - Chat endpoint with streaming (SSE)
- `POST /api/chat/simple` - Chat endpoint without streaming (JSON)

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies (if not already done)
npm install

# The API URL is already configured in .env.local:
# NEXT_PUBLIC_API_URL=http://localhost:3001

# Start the development server
npm run dev

# OR build and start production
npm run build
npm run start
```

The frontend will start on `http://localhost:3000`

## Testing the Integration

1. **Start the backend first:**
   ```bash
   cd backend && npm run dev:http
   ```

2. **In a new terminal, start the frontend:**
   ```bash
   cd frontend && npm run dev
   ```

3. **Open your browser to http://localhost:3000**

4. **Try sending a message** like:
   - "What's the weather in Tokyo?"
   - "Query the database for user records"
   - "Show me analytics for sales data"

5. **Click the Dashboard button** to see:
   - Chat statistics
   - Available MCP servers and their status
   - Recent message history

## How It Works

1. **User sends a message** in the frontend chat
2. **Frontend sends HTTP POST** to backend `/api/chat`
3. **Backend processes the request:**
   - Uses FAISS vector search to find relevant MCP servers
   - Uses GPT-4o-mini to select the best server
   - Connects to the selected MCP server
   - Executes the appropriate tool on that server
   - Streams the response back to frontend
4. **Frontend displays streaming response** with MCP source attribution

## MCP Servers Configuration

The backend is configured with 5 example MCP servers in `backend/config.json`:

1. Weather MCP Server
2. Database MCP Server
3. File System MCP Server
4. API Integration MCP Server
5. Analytics MCP Server

To add your own MCP servers, edit `backend/config.json` and update the server configurations with actual command paths.

## Troubleshooting

**Backend won't start:**
- Check that your OpenAI API key is set in `backend/.env`
- Ensure port 3001 is not already in use
- Check that the FAISS index was created (`backend/data/faiss_index.bin`)

**Frontend can't connect to backend:**
- Verify the backend is running on port 3001
- Check the browser console for CORS errors
- Ensure `NEXT_PUBLIC_API_URL` is set correctly in `frontend/.env.local`

**No servers showing in Dashboard:**
- Backend might not be running
- Check browser network tab for failed requests to `/api/servers`

## Development Scripts

**Backend:**
- `npm run dev` - Start MCP stdio server (for AI assistants)
- `npm run dev:http` - Start HTTP API server (for frontend)
- `npm run build` - Build TypeScript
- `npm run prepare-vectors` - Generate FAISS vectors

**Frontend:**
- `npm run dev` - Start Next.js dev server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## API Examples

**Test health endpoint:**
```bash
curl http://localhost:3001/health
```

**Get server list:**
```bash
curl http://localhost:3001/api/servers
```

**Send a chat message (simple):**
```bash
curl -X POST http://localhost:3001/api/chat/simple \
  -H "Content-Type: application/json" \
  -d '{"message": "What is the weather like?"}'
```

**Send a chat message (streaming):**
```bash
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What is the weather like?"}'
```
