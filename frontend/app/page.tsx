'use client';

import { useState, useEffect } from 'react';
import { ChatList } from '@/components/ChatList';
import { ChatInput } from '@/components/ChatInput';
import { DashboardModal } from '@/components/DashboardModal';
import { Button } from '@/components/ui/button';
import { Message, generateId } from '@/lib/mock';
import { sendChatMessageStreaming, MCPSource } from '@/lib/api';

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);

  // Load messages from localStorage on mount
  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('chat-messages');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setMessages(
          parsed.map((m: any) => ({
            ...m,
            timestamp: new Date(m.timestamp),
          }))
        );
      } catch (e) {
        console.error('Failed to parse saved messages:', e);
      }
    }
  }, []);

  // Save messages to localStorage whenever they change
  useEffect(() => {
    if (mounted && messages.length > 0) {
      localStorage.setItem('chat-messages', JSON.stringify(messages));
    }
  }, [messages, mounted]);

  const handleSendMessage = async (userMessage: string) => {
    // Add user message with optimistic update
    const userMsg: Message = {
      id: generateId(),
      content: userMessage,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    // Create assistant message
    const assistantMsg: Message = {
      id: generateId(),
      content: '',
      sender: 'assistant',
      timestamp: new Date(),
      isStreaming: true,
    };

    setMessages((prev) => [...prev, assistantMsg]);

    try {
      // Use the real streaming API
      await sendChatMessageStreaming(userMessage, (event) => {
        switch (event.type) {
          case 'start':
            // Stream started
            break;

          case 'status':
            // Status update (optional: could show this in UI)
            console.log('Status:', event.message);
            break;

          case 'mcp_source':
            // Update with MCP source info
            if (event.source) {
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantMsg.id
                    ? {
                        ...msg,
                        mcpSources: [{
                          id: event.source!.id,
                          name: event.source!.name,
                          reasoning: event.source!.reasoning,
                          confidence: event.source!.confidence,
                        }],
                      }
                    : msg
                )
              );
            }
            break;

          case 'content':
            // Append content to the message
            if (event.content) {
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantMsg.id
                    ? { ...msg, content: msg.content + event.content }
                    : msg
                )
              );
            }
            break;

          case 'done':
            // Mark streaming as complete
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMsg.id
                  ? { ...msg, isStreaming: false }
                  : msg
              )
            );
            break;

          case 'error':
            // Handle error
            console.error('Stream error:', event.error);
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMsg.id
                  ? {
                      ...msg,
                      content: event.error || 'An error occurred. Please try again.',
                      isStreaming: false,
                    }
                  : msg
              )
            );
            break;
        }
      });
    } catch (error) {
      console.error('Error getting response:', error);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMsg.id
            ? {
                ...msg,
                content: 'An error occurred. Please try again.',
                isStreaming: false,
              }
            : msg
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = () => {
    setMessages([]);
    localStorage.removeItem('chat-messages');
  };

  const handleFeedback = (messageId: string, mcpSource: string, feedback: 'thumbs-up' | 'thumbs-down') => {
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId
          ? {
              ...msg,
              mcpFeedback: {
                ...msg.mcpFeedback,
                [mcpSource]: feedback,
              },
            }
          : msg
      )
    );
  };

  if (!mounted) {
    return null;
  }

  return (
    <div className="flex h-screen flex-col bg-black">
      {/* Header */}
      <div className="border-b border-zinc-800 bg-black px-6 py-4">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-white tracking-tight">
            snapcall
          </h1>
          <div className="flex gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearChat}
              className="bg-zinc-900 border-zinc-700 hover:bg-zinc-800 text-zinc-50 text-xs"
            >
              Clear chat
            </Button>
            <Button
              size="sm"
              onClick={() => setShowDashboard(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs"
            >
              Dashboard
            </Button>
          </div>
        </div>
      </div>

      {/* Chat area */}
      <ChatList messages={messages} onFeedback={handleFeedback} />

      {/* Input area */}
      <ChatInput onSend={handleSendMessage} isLoading={isLoading} />

      {/* Dashboard Modal */}
      <DashboardModal isOpen={showDashboard} onClose={() => setShowDashboard(false)} />
    </div>
  );
}
