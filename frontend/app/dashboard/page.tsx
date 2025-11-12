'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import Link from 'next/link';
import { Message } from '@/lib/mock';

export default function DashboardPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [stats, setStats] = useState({
    totalMessages: 0,
    userMessages: 0,
    assistantMessages: 0,
    destinations: new Set<string>(),
  });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('chat-messages');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const messagesData = parsed.map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp),
        }));
        setMessages(messagesData);

        // Calculate stats
        const destinations = new Set<string>();
        const userMsgs = messagesData.filter((m: Message) => m.sender === 'user');
        const assistantMsgs = messagesData.filter(
          (m: Message) => m.sender === 'assistant'
        );

        // Extract destinations from messages
        const destinationKeywords = ['東京', 'パリ', 'ニューヨーク', 'バリ', 'バンコク', '京都'];
        userMsgs.forEach((m: Message) => {
          destinationKeywords.forEach((dest) => {
            if (m.content.includes(dest)) {
              destinations.add(dest);
            }
          });
        });

        setStats({
          totalMessages: messagesData.length,
          userMessages: userMsgs.length,
          assistantMessages: assistantMsgs.length,
          destinations,
        });
      } catch (e) {
        console.error('Failed to parse saved messages:', e);
      }
    }
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <Card className="border-b border-zinc-800 bg-zinc-950 rounded-none sticky top-0 z-10">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📊</span>
            <h1 className="text-xl font-bold text-zinc-50">
              Dashboard
            </h1>
          </div>
          <Link href="/">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white">
              Back to chat
            </Button>
          </Link>
        </div>
      </Card>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-6 bg-zinc-900 border-zinc-800">
            <div className="text-sm text-zinc-400 mb-2">
              Total Messages
            </div>
            <div className="text-3xl font-bold text-zinc-50">
              {stats.totalMessages}
            </div>
          </Card>

          <Card className="p-6 bg-blue-950 border-blue-800">
            <div className="text-sm text-blue-400 mb-2">
              Your Messages
            </div>
            <div className="text-3xl font-bold text-blue-100">
              {stats.userMessages}
            </div>
          </Card>

          <Card className="p-6 bg-purple-950 border-purple-800">
            <div className="text-sm text-purple-400 mb-2">
              Assistant Replies
            </div>
            <div className="text-3xl font-bold text-purple-100">
              {stats.assistantMessages}
            </div>
          </Card>

          <Card className="p-6 bg-emerald-950 border-emerald-800">
            <div className="text-sm text-emerald-400 mb-2">
              Unique Topics
            </div>
            <div className="text-3xl font-bold text-emerald-100">
              {stats.destinations.size}
            </div>
          </Card>
        </div>

        {/* Topics */}
        {stats.destinations.size > 0 && (
          <Card className="p-6 border-zinc-800 bg-zinc-900">
            <h2 className="text-lg font-semibold text-zinc-50 mb-4">
              📌 Topics Discussed
            </h2>
            <div className="flex flex-wrap gap-2">
              {Array.from(stats.destinations).map((dest) => (
                <Badge
                  key={dest}
                  className="bg-blue-900 text-blue-100 border-blue-800"
                >
                  {dest}
                </Badge>
              ))}
            </div>
          </Card>
        )}

        {/* Chat History */}
        <Card className="p-6 border-zinc-800 bg-zinc-900">
          <h2 className="text-lg font-semibold text-zinc-50 mb-4">
            💬 Chat History
          </h2>
          {messages.length === 0 ? (
            <p className="text-center text-zinc-400 py-8">
              No messages yet
            </p>
          ) : (
            <ScrollArea className="h-96 w-full border border-zinc-800 rounded-lg p-4 bg-black">
              <div className="space-y-3">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`p-3 rounded-lg ${
                      msg.sender === 'user'
                        ? 'bg-blue-950 border border-blue-800'
                        : 'bg-zinc-800 border border-zinc-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <span className="text-xs font-semibold text-zinc-400">
                        {msg.sender === 'user' ? 'U - You' : 'A - Assistant'}
                      </span>
                      <span className="text-xs text-zinc-500">
                        {msg.timestamp.toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <p className="text-sm text-zinc-50 break-words">
                      {msg.content}
                    </p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </Card>

        {/* Actions */}
        <Card className="p-6 border-zinc-800 bg-zinc-900">
          <h2 className="text-lg font-semibold text-zinc-50 mb-4">
            ⚙️ Actions
          </h2>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="bg-zinc-800 border-zinc-700 hover:bg-zinc-700 text-zinc-50"
              onClick={() => {
                localStorage.removeItem('chat-messages');
                window.location.reload();
              }}
            >
              Delete all chats
            </Button>
            <Button
              variant="outline"
              className="bg-zinc-800 border-zinc-700 hover:bg-zinc-700 text-zinc-50"
              onClick={() => {
                const data = JSON.stringify(messages, null, 2);
                const blob = new Blob([data], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `chat-history-${new Date().toISOString().split('T')[0]}.json`;
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              Export chat history
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
