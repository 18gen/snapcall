// OpenAI integration for chat demo
import OpenAI from 'openai';

export interface Message {
  id: string;
  content: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
  isStreaming?: boolean;
  mcpSources?: string[];
  mcpFeedback?: Record<string, 'thumbs-up' | 'thumbs-down' | null>;
}

// Hardcoded MCP database
export const MCP_DATABASE = {
  'web-search': {
    name: 'Web Search',
    description: 'Search results from the internet',
  },
  'documentation': {
    name: 'Documentation',
    description: 'Technical documentation and guides',
  },
  'knowledge-base': {
    name: 'Knowledge Base',
    description: 'Internal knowledge base',
  },
  'code-examples': {
    name: 'Code Examples',
    description: 'Code samples and snippets',
  },
  'tutorials': {
    name: 'Tutorials',
    description: 'Step-by-step tutorials',
  },
};

// Mock responses for various queries
const mockResponses = [
  {
    id: 'resp1',
    content: 'That\'s an interesting question! Based on the information you provided, I\'d recommend exploring several approaches to solve this effectively.',
    mcpSources: ['web-search', 'documentation'],
  },
  {
    id: 'resp2',
    content: 'I understand what you\'re looking for. Let me break this down into a few key points that should help clarify the situation.',
    mcpSources: ['web-search'],
  },
  {
    id: 'resp3',
    content: 'Great question! There are multiple ways to approach this. The most common solution involves using a combination of strategies tailored to your specific needs.',
    mcpSources: ['documentation', 'knowledge-base'],
  },
  {
    id: 'resp4',
    content: 'That\'s a practical concern. From what you\'ve described, the best course of action would be to implement a systematic approach with clear steps.',
    mcpSources: ['web-search', 'code-examples'],
  },
  {
    id: 'resp5',
    content: 'I can definitely help with that. The key is to focus on the core aspects and build from there. Here are some actionable steps you can take right away.',
    mcpSources: ['documentation', 'tutorials'],
  },
  {
    id: 'resp6',
    content: 'Excellent observation. By understanding the underlying principles, you can adapt this solution to various scenarios and situations.',
    mcpSources: ['knowledge-base', 'web-search', 'code-examples'],
  },
];

export interface MockResponse {
  content: string;
  mcpSources: string[];
}

// Initialize OpenAI client
const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY;
const openai = apiKey
  ? new OpenAI({
      apiKey,
      dangerouslyAllowBrowser: true, // Required for frontend usage
    })
  : null;

// Fallback function for when API key is not available
function getFallbackResponse(userMessage: string): MockResponse {
  const messageContent = userMessage.toLowerCase();
  let response = mockResponses[Math.floor(Math.random() * mockResponses.length)];

  const keywords = [
    { word: 'how', index: 0 },
    { word: 'what', index: 1 },
    { word: 'why', index: 2 },
    { word: 'problem', index: 3 },
    { word: 'help', index: 4 },
    { word: 'suggestion', index: 5 },
  ];

  for (const { word, index } of keywords) {
    if (messageContent.includes(word)) {
      response = mockResponses[index];
      break;
    }
  }

  return {
    content: response.content,
    mcpSources: response.mcpSources,
  };
}

export async function getMockResponse(userMessage: string): Promise<MockResponse> {
  // If no API key, use fallback mock response
  if (!openai) {
    console.warn('OpenAI API key not found, using fallback mock response');
    return getFallbackResponse(userMessage);
  }

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'user',
          content: userMessage,
        },
      ],
      max_tokens: 1000,
      temperature: 0.7,
    });

    const content = completion.choices[0]?.message?.content || 'No response received';

    // Randomly assign MCP sources for demonstration
    const sources = Object.keys(MCP_DATABASE);
    const randomSources = sources
      .sort(() => Math.random() - 0.5)
      .slice(0, Math.floor(Math.random() * 3) + 1);

    return {
      content,
      mcpSources: randomSources,
    };
  } catch (error) {
    console.error('Error calling OpenAI API:', error);
    // Fallback to mock response on error
    return getFallbackResponse(userMessage);
  }
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
