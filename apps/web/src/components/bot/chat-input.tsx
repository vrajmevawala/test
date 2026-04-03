'use client';
import React, { useState, useRef, useEffect } from 'react';
import { useBotStore } from '@/stores/bot.store';
import { Send as SendIcon, Sparkles } from 'lucide-react';
import { clsx } from 'clsx';
import { useAuth } from '@clerk/nextjs';

export function ChatInput() {
  const { addMessage, updateLastMessage, isStreaming, context, conversationId, setStreaming } = useBotStore();
  const { getToken } = useAuth();
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize logic
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const newHeight = Math.min(textarea.scrollHeight, 160);
      textarea.style.height = `${newHeight}px`;
    }
  }, [message]);

  const handleSend = async () => {
    if (!message.trim() || isStreaming) return;

    const userMessage = message.trim();
    setMessage('');
    // Reset height after sending
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    
    addMessage({ role: 'user', content: userMessage });
    setStreaming(true);
    addMessage({ role: 'assistant', content: '' });

    try {
      const token = await getToken();
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/bot/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: userMessage,
          conversationId,
          context: {
            ...context,
            page: window.location.pathname,
          },
        }),
      });

      if (!response.ok) throw new Error('Chat failed');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          
          buffer = lines.pop() || '';
          
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith('data: ')) continue;
            
            try {
              const data = JSON.parse(trimmed.slice(6));
              if (data.type === 'token') {
                updateLastMessage(data.token);
              } else if (data.type === 'error') {
                updateLastMessage(`\n\n**Error**: ${data.message}`);
              }
            } catch (e) {
              console.warn("Malformed SSE line:", line);
            }
          }
        }
      }
    } catch (e: any) {
      console.error("Chat error:", e);
      const errorMessage = e instanceof Error ? e.message : String(e);
      updateLastMessage(`\n\n**Error**: ${errorMessage}. Please try again.`);
    } finally {
      setStreaming(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="p-6 bg-[var(--surface)] border-t border-[var(--border)]/60">
      <div className="relative group">
        <textarea
          ref={textareaRef}
          rows={1}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask a question..."
          className="w-full bg-[var(--surface-2)] text-[13px] text-[var(--text)] placeholder:text-[var(--text-dim)] border border-[var(--border)]/80 rounded-[28px] py-4 pl-6 pr-14 focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/10 transition-all resize-none overflow-y-auto scrollbar-hide min-h-[52px] shadow-sm"
        />
        <button
          onClick={handleSend}
          disabled={!message.trim() || isStreaming}
          className={clsx(
            'absolute right-3.5 bottom-3.5 p-2 rounded-[20px] transition-all duration-300',
            message.trim() && !isStreaming 
              ? 'bg-[var(--accent)] text-[#0d1117] shadow-lg shadow-[var(--accent)]/40 hover:scale-105 active:scale-95' 
              : 'text-[var(--text-dim)] cursor-not-allowed opacity-40'
          )}
        >
          {isStreaming ? (
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : (
            <SendIcon size={18} />
          )}
        </button>
      </div>
      <div className="flex items-center gap-2 mt-4 px-2 text-[10px] text-[var(--text-mid)] font-semibold uppercase tracking-widest opacity-80">
        <Sparkles size={11} className="text-[var(--accent)]" />
        <span>Context-aware: {context.filename || 'active file'}</span>
      </div>
    </div>
  );
}
