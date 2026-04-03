'use client';
import React, { useEffect, useRef } from 'react';
import { useBotStore } from '@/stores/bot.store';
import { clsx } from 'clsx';
import { Bot, User } from 'lucide-react';
import { ToolResultCard } from './tool-result-card';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export function ChatMessages() {
  const { messages, isStreaming } = useBotStore();
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming]);

  return (
    <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-8 scrollbar-hide">
      {messages.length === 0 && (
        <div className="flex flex-col items-center justify-center h-full text-center gap-4 opacity-60">
          <div className="w-12 h-12 rounded-2xl bg-[var(--surface-3)] flex items-center justify-center shadow-inner">
            <Bot size={24} className="text-[var(--accent)]" />
          </div>
          <div>
            <div className="text-[14px] font-bold text-[var(--text)]">CodeSage Assistant</div>
            <p className="text-[11px] text-[var(--text-dim)] max-w-[200px] leading-relaxed">
              Ask about your analysis, explain issues, or find code patterns in your active file.
            </p>
          </div>
        </div>
      )}

      {messages.map((msg) => (
        <div
          key={msg.id}
          className={clsx(
            'flex gap-4 max-w-[100%]',
            msg.role === 'user' ? 'self-end flex-row-reverse' : 'self-start'
          )}
        >
          <div className={clsx(
            'w-9 h-9 rounded-[14px] flex items-center justify-center shrink-0 mt-0.5 shadow-md',
            msg.role === 'user' ? 'bg-[var(--surface-3)]' : 'bg-[var(--accent)]'
          )}>
            {msg.role === 'user' ? (
              <User size={16} className="text-[var(--text)]" />
            ) : (
              <Bot size={16} className="text-[#0d1117]" />
            )}
          </div>
          
          <div className="flex flex-col gap-2 w-full min-w-0">
            <div className={clsx(
              'px-5 py-4 rounded-[24px] text-[13.5px] leading-relaxed break-words w-full shadow-lg border border-transparent',
              msg.role === 'user' 
                ? 'bg-[var(--surface-3)] text-[var(--text)]' 
                : 'bg-[var(--surface-2)] border-[var(--border)] text-[var(--text)]'
            )}>
              {msg.role === 'assistant' ? (
                <div className="chatbot-markdown">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {msg.content}
                  </ReactMarkdown>
                </div>
              ) : (
                msg.content
              )}
              {msg.role === 'assistant' && !msg.content && isStreaming && (
                <span className="inline-block w-1.5 h-4 ml-1 bg-[var(--accent)] animate-pulse rounded-full" />
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
