'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';

interface ChatInputProps {
  onSend: (message: string) => void;
  isLoading?: boolean;
}

export function ChatInput({ onSend, isLoading = false }: ChatInputProps) {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    if (input.trim() && !isLoading) {
      onSend(input);
      setInput('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  // Cmd/Ctrl + Enter to send, Shift+Enter for new line
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const sendKey = isMac ? e.metaKey : e.ctrlKey;

    if (sendKey && e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    // Auto-resize textarea
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
  };

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  return (
    <div className="fixed bottom-0 left-0 right-0 pt-8 pb-8 px-4 z-50">
      <div className="bg-zinc-900 rounded-4xl mx-auto max-w-2xl">
        <div className="flex gap-2 items-center px-5 py-3">
          <textarea
            ref={textareaRef}
            placeholder="Ask me anything..."
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            rows={1}
            className="flex-1 border-0 outline-none bg-transparent text-zinc-50 placeholder:text-zinc-500 focus:outline-none focus:ring-0 resize-none overflow-y-auto max-h-[120px]"
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="rounded-full w-8 h-8 p-0 bg-white hover:bg-gray-100 text-black shadow-lg hover:shadow-xl transition-all disabled:opacity-50 flex-shrink-0"
          >
            {isLoading ? (
              <span className="text-sm">⏳</span>
            ) : (
              <span className="text-sm">↑</span>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
