'use client';
import React, { useEffect, useRef } from 'react';
import { useBotStore } from '@/stores/bot.store';
import { clsx } from 'clsx';
import { Bot, User } from 'lucide-react';
import { ToolResultCard } from './tool-result-card';

export function ChatMessages() {
  const { messages, isStreaming } = useBotStore();
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming]);

  return (
    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 scrollbar-hide">
      {messages.length === 0 && (
        <div className="flex flex-col items-center justify-center h-full text-center gap-3 opacity-60">
          <div className="w-10 h-10 rounded-full bg-[var(--surface-3)] flex items-center justify-center">
            <Bot size={20} className="text-[var(--accent)]" />
          </div>
          <div>
            <div className="text-[13px] font-semibold text-[var(--text)]">CodeSage Assistant</div>
            <p className="text-[11px] text-[var(--text-dim)] max-w-[180px]">
              Ask about your analysis, explain issues, or find code patterns.
            </p>
          </div>
        </div>
      )}

      {messages.map((msg) => (
        <div
          key={msg.id}
          className={clsx(
            'flex gap-3 max-w-[90%]',
            msg.role === 'user' ? 'self-end flex-row-reverse' : 'self-start'
          )}
        >
          <div className={clsx(
            'w-7 h-7 rounded-md flex items-center justify-center shrink-0 mt-1',
            msg.role === 'user' ? 'bg-[var(--surface-3)]' : 'bg-[var(--accent)]'
          )}>
            {msg.role === 'user' ? (
              <User size={14} className="text-[var(--text)]" />
            ) : (
              <Bot size={14} className="text-[#0d1117]" />
            )}
          </div>
          
          <div className="flex flex-col gap-2">
            <div className={clsx(
              'px-3 py-2 rounded-lg text-[13px] leading-relaxed break-words',
              msg.role === 'user' 
                ? 'bg-[var(--surface-3)] text-[var(--text)] rounded-tr-none' 
                : 'bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text)] rounded-tl-none shadow-sm'
            )}>
              {msg.content}
              {msg.role === 'assistant' && !msg.content && isStreaming && (
                <span className="inline-block w-1 h-4 ml-1 bg-[var(--accent)] animate-pulse" />
              )}
            </div>
            
            {msg.toolResults?.map((result, i) => (
              <ToolResultCard key={i} result={result} />
            ))}
          </div>
        </div>
      ))}
      <div ref={endRef} />
    </div>
  );
}
