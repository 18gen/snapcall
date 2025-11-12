'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Message } from '@/lib/mock';
import { getServers } from '@/lib/api';

interface DashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DashboardModal({ isOpen, onClose }: DashboardModalProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [servers, setServers] = useState<any[]>([]);
  const [loadingServers, setLoadingServers] = useState(false);
  const [stats, setStats] = useState({
    totalMessages: 0,
    userMessages: 0,
    assistantMessages: 0,
  });

  useEffect(() => {
    if (isOpen) {
      // Load messages
      const saved = localStorage.getItem('chat-messages');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          const messagesData = parsed.map((m: any) => ({
            ...m,
            timestamp: new Date(m.timestamp),
          }));
          setMessages(messagesData);

          const userMsgs = messagesData.filter((m: Message) => m.sender === 'user');
          const assistantMsgs = messagesData.filter((m: Message) => m.sender === 'assistant');

          setStats({
            totalMessages: messagesData.length,
            userMessages: userMsgs.length,
            assistantMessages: assistantMsgs.length,
          });
        } catch (e) {
          console.error('Failed to parse saved messages:', e);
        }
      }

      // Load servers
      setLoadingServers(true);
      getServers()
        .then(setServers)
        .catch((err) => {
          console.error('Failed to load servers:', err);
          setServers([]);
        })
        .finally(() => setLoadingServers(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 flex items-center justify-center p-4">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl w-full max-w-xl max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="border-b border-zinc-800 p-4 flex items-center justify-between flex-shrink-0">
          <h1 className="text-lg font-bold text-zinc-50">Dashboard</h1>
          <Button
            onClick={onClose}
            className="bg-zinc-800 border-zinc-700 hover:bg-zinc-700 text-zinc-50 h-8"
            variant="outline"
            size="sm"
          >
            Close
          </Button>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1 overflow-hidden">
          <div className="p-4 space-y-4">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-zinc-900 border border-zinc-800 p-3 rounded-lg">
                <div className="text-xs text-zinc-400 mb-1">Total</div>
                <div className="text-2xl font-bold text-zinc-50">{stats.totalMessages}</div>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 p-3 rounded-lg">
                <div className="text-xs text-zinc-400 mb-1">You</div>
                <div className="text-2xl font-bold text-blue-100">{stats.userMessages}</div>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 p-3 rounded-lg">
                <div className="text-xs text-zinc-400 mb-1">AI</div>
                <div className="text-2xl font-bold text-purple-100">{stats.assistantMessages}</div>
              </div>
            </div>

            {/* MCP Servers */}
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-zinc-50">MCP Servers</h2>
              {loadingServers ? (
                <div className="text-xs text-zinc-400">Loading servers...</div>
              ) : servers.length > 0 ? (
                <div className="space-y-2">
                  {servers.map((server) => (
                    <div
                      key={server.id}
                      className="bg-zinc-900 border border-zinc-800 p-3 rounded-lg"
                    >
                      <div className="flex items-start justify-between mb-1">
                        <div className="text-sm font-semibold text-zinc-50">{server.name}</div>
                        <div
                          className={`text-xs px-2 py-0.5 rounded ${
                            server.connected
                              ? 'bg-green-900 text-green-100'
                              : 'bg-zinc-800 text-zinc-400'
                          }`}
                        >
                          {server.connected ? 'Connected' : 'Disconnected'}
                        </div>
                      </div>
                      <div className="text-xs text-zinc-400 mb-2">{server.description}</div>
                      {server.capabilities && server.capabilities.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {server.capabilities.map((cap: string) => (
                            <span
                              key={cap}
                              className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-300"
                            >
                              {cap}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-zinc-400">No servers available. Make sure the backend is running.</div>
              )}
            </div>

            {/* Chat History */}
            {messages.length > 0 && (
              <div className="space-y-2">
                <h2 className="text-sm font-semibold text-zinc-50">Recent Messages</h2>
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {messages.slice(-10).map((msg) => (
                    <div
                      key={msg.id}
                      className={`p-2 rounded text-xs ${
                        msg.sender === 'user'
                          ? 'bg-blue-950 border border-blue-800 text-blue-50'
                          : 'bg-zinc-800 border border-zinc-700 text-zinc-50'
                      }`}
                    >
                      <p className="line-clamp-2 break-words">{msg.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1 bg-zinc-800 border-zinc-700 hover:bg-zinc-700 text-zinc-50 h-8 text-xs"
                onClick={() => {
                  localStorage.removeItem('chat-messages');
                  window.location.reload();
                }}
              >
                Clear
              </Button>
              <Button
                variant="outline"
                className="flex-1 bg-zinc-800 border-zinc-700 hover:bg-zinc-700 text-zinc-50 h-8 text-xs"
                onClick={() => {
                  const data = JSON.stringify(messages, null, 2);
                  const blob = new Blob([data], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `chat-${new Date().toISOString().split('T')[0]}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
              >
                Export
              </Button>
            </div>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
