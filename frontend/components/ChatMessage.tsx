'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Message, MCP_DATABASE } from '@/lib/mock';

interface ChatMessageProps {
  message: Message;
  onFeedback?: (messageId: string, mcpSource: string, feedback: 'thumbs-up' | 'thumbs-down') => void;
}

export function ChatMessage({ message, onFeedback }: ChatMessageProps) {
  const isUser = message.sender === 'user';

  return (
    <div
      className={`flex gap-3 mb-4 animate-in fade-in slide-in-from-bottom-2 duration-300 ${
        isUser ? 'flex-row-reverse' : 'flex-row'
      }`}
    >
      {!isUser && (
        <Avatar className="w-10 h-10 flex-shrink-0 mt-1">
          <AvatarFallback className="text-base">SC</AvatarFallback>
        </Avatar>
      )}

      <div className={`flex-1 max-w-2xl ${isUser ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
        {isUser ? (
          <div className="bg-zinc-800 rounded-3xl px-4 py-2 transition-none">
            <p className="text-base leading-relaxed break-words text-zinc-50">{message.content}</p>
          </div>
        ) : (
          <>
            <p className="text-base leading-relaxed break-words text-zinc-50">{message.content}</p>

            {/* MCP sources with feedback buttons */}
            {message.mcpSources && message.mcpSources.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {message.mcpSources.map((source) => (
                  <div
                    key={source}
                    className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 hover:border-zinc-700 transition-colors"
                  >
                    <span className="text-xs font-medium text-zinc-300">
                      {MCP_DATABASE[source as keyof typeof MCP_DATABASE]?.name || source}
                    </span>
                    {!message.isStreaming && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => onFeedback?.(message.id, source, 'thumbs-up')}
                          className={`inline-flex items-center justify-center w-6 h-6 rounded transition-all ${
                            message.mcpFeedback?.[source] === 'thumbs-up'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
                          }`}
                          title="Helpful"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </button>
                        <button
                          onClick={() => onFeedback?.(message.id, source, 'thumbs-down')}
                          className={`inline-flex items-center justify-center w-6 h-6 rounded transition-all ${
                            message.mcpFeedback?.[source] === 'thumbs-down'
                              ? 'bg-rose-500/20 text-rose-400'
                              : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
                          }`}
                          title="Not helpful"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
