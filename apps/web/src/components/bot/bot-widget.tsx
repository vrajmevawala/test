'use client';
import React from 'react';
import { useBotStore } from '@/stores/bot.store';
import { ChatMessages } from './chat-messages';
import { ChatInput } from './chat-input';
import { Bot, X, Maximize2, RotateCcw } from 'lucide-react';
import { clsx } from 'clsx';

export function BotWidget() {
  const { isOpen, toggleOpen, resetConversation } = useBotStore();

  return (
    <div 
      className="fixed bottom-6 right-6 z-[100] flex flex-col items-end gap-4 pointer-events-none"
      style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 100 }}
    >
      {/* Chat Window */}
      <div className={clsx(
        'w-96 h-[520px] bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-all duration-300 origin-bottom-right pointer-events-auto',
        isOpen ? 'scale-100 opacity-100 translate-y-0' : 'scale-75 opacity-0 translate-y-12 pointer-events-none'
      )}>
        {/* Header */}
        <div className="h-14 px-4 flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface-2)]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[var(--accent)] flex items-center justify-center shadow-lg shadow-[var(--accent)]/20">
              <Bot size={18} className="text-[#0d1117]" />
            </div>
            <div>
              <div className="text-[13px] font-bold text-[var(--text)] tracking-tight">CodeSage Assistant</div>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--green)] animate-pulse" />
                <span className="text-[10px] text-[var(--text-dim)] font-medium">Ready to review</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            <button 
              onClick={resetConversation}
              className="p-1.5 text-[var(--text-dim)] hover:text-[var(--text)] hover:bg-[var(--surface-3)] rounded-md transition-colors"
              title="Reset Conversation"
            >
              <RotateCcw size={14} />
            </button>
            <button className="p-1.5 text-[var(--text-dim)] hover:text-[var(--text)] hover:bg-[var(--surface-3)] rounded-md transition-colors">
              <Maximize2 size={14} />
            </button>
            <button 
              onClick={toggleOpen}
              className="p-1.5 text-[var(--text-dim)] hover:text-[var(--red)] hover:bg-[var(--surface-3)] rounded-md transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Content */}
        <ChatMessages />

        {/* Input */}
        <ChatInput />
      </div>

      {/* Toggle Button */}
      {!isOpen && (
        <button
          onClick={toggleOpen}
          className="w-14 h-14 rounded-2xl bg-[var(--accent)] text-[#0d1117] flex items-center justify-center shadow-xl shadow-[var(--accent)]/30 hover:scale-105 active:scale-95 transition-all pointer-events-auto group relative"
        >
          <Bot size={28} className="transition-transform group-hover:rotate-12" />
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-[var(--red)] rounded-full border-2 border-[var(--bg)] animate-bounce" />
          
          <div className="absolute right-16 px-3 py-1.5 bg-[var(--surface-3)] border border-[var(--border)] text-[var(--text)] text-[11px] font-semibold rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all pointer-events-none shadow-md">
            Need help explaining this file?
          </div>
        </button>
      )}
    </div>
  );
}
