'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Message, MCP_DATABASE } from '@/lib/mock';

interface DashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface MCPStats {
  name: string;
  calls: number;
  thumbsUp: number;
  thumbsDown: number;
  neutrals: number;
}

export function DashboardModal({ isOpen, onClose }: DashboardModalProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [stats, setStats] = useState({
    totalMessages: 0,
    userMessages: 0,
    assistantMessages: 0,
  });
  const [mcpStats, setMcpStats] = useState<MCPStats[]>([]);

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

          // Calculate MCP statistics
          const mcpMap = new Map<string, MCPStats>();

          assistantMsgs.forEach((msg: Message) => {
            msg.mcpSources?.forEach((source) => {
              if (!mcpMap.has(source)) {
                mcpMap.set(source, {
                  name: MCP_DATABASE[source as keyof typeof MCP_DATABASE]?.name || source,
                  calls: 0,
                  thumbsUp: 0,
                  thumbsDown: 0,
                  neutrals: 0,
                });
              }

              const stat = mcpMap.get(source)!;
              stat.calls += 1;

              const feedback = msg.mcpFeedback?.[source];
              if (feedback === 'thumbs-up') {
                stat.thumbsUp += 1;
              } else if (feedback === 'thumbs-down') {
                stat.thumbsDown += 1;
              } else {
                stat.neutrals += 1;
              }
            });
          });

          // Sort by calls (descending)
          const sortedStats = Array.from(mcpMap.values()).sort((a, b) => b.calls - a.calls);
          setMcpStats(sortedStats);
        } catch (e) {
          console.error('Failed to parse saved messages:', e);
        }
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 pointer-events-none">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col pointer-events-auto">
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
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          <div className="p-6 space-y-6">
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

            {/* MCP Analytics */}
            {mcpStats.length > 0 && (
              <div className="space-y-3 border-t border-zinc-800 pt-4">
                <h2 className="text-sm font-semibold text-zinc-50">MCP Performance</h2>
                <div className="space-y-3">
                  {mcpStats.map((mcp) => {
                    const total = mcp.thumbsUp + mcp.thumbsDown + mcp.neutrals;
                    const upPercent = total > 0 ? (mcp.thumbsUp / total) * 100 : 0;
                    const downPercent = total > 0 ? (mcp.thumbsDown / total) * 100 : 0;

                    return (
                      <div key={mcp.name} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-zinc-300">{mcp.name}</span>
                          <span className="text-xs text-zinc-500">{mcp.calls} calls</span>
                        </div>

                        {/* Feedback bar chart */}
                        <div className="flex gap-1 h-6 bg-zinc-900 rounded overflow-hidden border border-zinc-800">
                          {mcp.thumbsUp > 0 && (
                            <div
                              className="bg-emerald-500/70 hover:bg-emerald-500 transition-colors flex items-center justify-center text-xs text-white font-medium"
                              style={{ width: `${upPercent}%` }}
                              title={`Helpful: ${mcp.thumbsUp}`}
                            >
                              {upPercent > 15 && `${mcp.thumbsUp}`}
                            </div>
                          )}
                          {mcp.neutrals > 0 && (
                            <div
                              className="bg-zinc-700/50 hover:bg-zinc-700 transition-colors flex items-center justify-center text-xs text-zinc-400"
                              style={{ width: `${100 - upPercent - downPercent}%` }}
                              title={`No feedback: ${mcp.neutrals}`}
                            />
                          )}
                          {mcp.thumbsDown > 0 && (
                            <div
                              className="bg-rose-500/70 hover:bg-rose-500 transition-colors flex items-center justify-center text-xs text-white font-medium"
                              style={{ width: `${downPercent}%` }}
                              title={`Not helpful: ${mcp.thumbsDown}`}
                            >
                              {downPercent > 15 && `${mcp.thumbsDown}`}
                            </div>
                          )}
                        </div>

                        {/* Stats summary */}
                        <div className="flex gap-3 text-xs">
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-emerald-500" />
                            <span className="text-zinc-400">
                              {mcp.thumbsUp} helpful
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-zinc-700" />
                            <span className="text-zinc-400">
                              {mcp.neutrals} neutral
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-rose-500" />
                            <span className="text-zinc-400">
                              {mcp.thumbsDown} unhelpful
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Chat History */}
            {messages.length > 0 && (
              <div className="space-y-2 border-t border-zinc-800 pt-6">
                <h2 className="text-sm font-semibold text-zinc-50">Recent Messages</h2>
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
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
            <div className="flex gap-2 pt-4 border-t border-zinc-800">
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
        </div>
      </div>
    </div>
  );
}
