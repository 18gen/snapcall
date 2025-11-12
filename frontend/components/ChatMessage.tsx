'use client';

import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Message } from '@/lib/mock';

interface ChatMessageProps {
  message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.sender === 'user';

  return (
    <div
      className={`flex gap-3 mb-4 animate-in fade-in slide-in-from-bottom-2 duration-300 ${
        isUser ? 'flex-row-reverse' : 'flex-row'
      }`}
    >
      {!isUser && (
        <Avatar className="w-8 h-8 flex-shrink-0">
          <AvatarFallback className="text-xs">A</AvatarFallback>
        </Avatar>
      )}

      <div className={`flex-1 max-w-2xl ${isUser ? 'items-end' : 'items-start'} flex flex-col gap-0`}>
        {isUser ? (
          <div className="bg-zinc-800 rounded-3xl px-4 py-2 transition-none">
            <p className="text-base leading-relaxed break-words text-zinc-50">{message.content}</p>
          </div>
        ) : (
          <p className="text-base leading-relaxed break-words text-zinc-50">{message.content}</p>
        )}
      </div>
    </div>
  );
}
