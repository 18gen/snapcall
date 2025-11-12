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
        <Avatar className="w-8 h-8 flex-shrink-0 mt-1">
          <AvatarFallback className="text-xs">A</AvatarFallback>
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
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => onFeedback?.(message.id, source, 'thumbs-up')}
                          className={`inline-flex items-center justify-center w-5 h-5 rounded transition-all ${
                            message.mcpFeedback?.[source] === 'thumbs-up'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
                          }`}
                          title="Helpful"
                        >
                          <svg
                            className="w-3 h-3"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path d="M2 10.5a1.5 1.5 0 113 0v-7a1.5 1.5 0 00-3 0v7zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.256 8H6z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => onFeedback?.(message.id, source, 'thumbs-down')}
                          className={`inline-flex items-center justify-center w-5 h-5 rounded transition-all ${
                            message.mcpFeedback?.[source] === 'thumbs-down'
                              ? 'bg-rose-500/20 text-rose-400'
                              : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
                          }`}
                          title="Not helpful"
                        >
                          <svg
                            className="w-3 h-3"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path d="M18 9.5a1.5 1.5 0 11-3 0v-7a1.5 1.5 0 013 0v7zM14 9.667v-5.43a2 2 0 00-1.106-1.79l-.05-.025A4 4 0 0011.057 2H5.641a2 2 0 00-1.962 1.608l-1.2 6A2 2 0 004.44 12H8v4a2 2 0 002 2 1 1 0 001-1v-.667a4 4 0 01.8-2.4l1.744-2.266h.058z" />
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
