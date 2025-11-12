'use client';

import { useEffect, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChatMessage } from './ChatMessage';
import { Message } from '@/lib/mock';

interface ChatListProps {
  messages: Message[];
}

export function ChatList({ messages }: ChatListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      const scrollElement = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        setTimeout(() => {
          scrollElement.scrollTop = scrollElement.scrollHeight;
        }, 50);
      }
    }
  }, [messages]);

  return (
    <ScrollArea ref={scrollRef} className="flex-1 w-full bg-black">
      <div className="mx-auto max-w-4xl p-4 space-y-4 pb-96">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-center py-20">
            <div className="max-w-xs">
              <div className="text-4xl mb-4">💬</div>
              <h2 className="text-lg font-semibold text-zinc-50 mb-2">
                Welcome to snapcall
              </h2>
              <p className="text-sm text-zinc-400">
                Ask me anything. I'm here to help with any question or task you have.
              </p>
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <ChatMessage key={message.id} message={message} />
          ))
        )}
      </div>
    </ScrollArea>
  );
}
