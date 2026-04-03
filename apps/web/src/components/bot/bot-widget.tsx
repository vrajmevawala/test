'use client';
import React, { useEffect } from 'react';
import { useBotStore } from '@/stores/bot.store';
import { ChatMessages } from './chat-messages';
import { ChatInput } from './chat-input';
import { Bot, X, RotateCcw } from 'lucide-react';
import { clsx } from 'clsx';
import { motion, useDragControls } from 'framer-motion';

export function BotWidget() {
  const { isOpen, toggleOpen, resetConversation, position, setPosition } = useBotStore();
  const dragControls = useDragControls();

  useEffect(() => {
    console.log("🤖 BotWidget mounted and rendering at bottom-right");
  }, []);

  return (
    <>
      {/* Chat Window */}
      <motion.div
        drag="x"
        dragControls={dragControls}
        dragListener={false}
        dragMomentum={false}
        onDragEnd={(_, info) => {
          setPosition(position.x + info.offset.x, 0);
        }}
        initial={{ x: position.x, y: 0 }}
        animate={isOpen 
          ? { x: position.x, scale: 1, opacity: 1, display: 'flex' } 
          : { x: position.x, scale: 0.75, opacity: 0, transitionEnd: { display: 'none' } }
        }
        style={{ 
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          width: '412px', 
          height: '915px', 
          maxWidth: '95vw', 
          maxHeight: 'calc(100vh - 48px)', 
          zIndex: 9999,
          display: isOpen ? 'flex' : 'none'
        }}
        className={clsx(
          'bg-[var(--surface)] border border-[var(--border)] rounded-[32px] shadow-2xl flex flex-col overflow-hidden pointer-events-auto',
        )}
      >
        {/* Header - Drag Handle */}
        <div 
          onPointerDown={(e) => dragControls.start(e)}
          className="h-16 px-6 flex items-center justify-between border-b border-[var(--border)] bg-gradient-to-b from-[var(--surface-2)] to-[var(--surface)]/95 backdrop-blur-md rounded-t-[32px] cursor-grab active:cursor-grabbing shrink-0 select-none"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[14px] bg-[var(--accent)] flex items-center justify-center shadow-lg shadow-[var(--accent)]/20">
              <Bot size={20} className="text-[#0d1117]" />
            </div>
            <div>
              <div className="text-[14px] font-bold text-[var(--text)] tracking-tight">CodeSage Assistant</div>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--green)] shadow-[0_0_8px_var(--green)]" />
                <span className="text-[10px] text-[var(--text-mid)] font-semibold uppercase tracking-wider">Online</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-1.5">
            <button 
              onClick={resetConversation}
              onPointerDown={(e) => e.stopPropagation()}
              className="p-2.5 text-[var(--text-dim)] hover:text-[var(--text)] hover:bg-[var(--surface-3)] rounded-2xl transition-all"
              title="Reset Conversation"
            >
              <RotateCcw size={16} />
            </button>
            <button 
              onClick={toggleOpen}
              onPointerDown={(e) => e.stopPropagation()}
              className="p-2.5 text-[var(--text-dim)] hover:text-[var(--red)] hover:bg-[var(--surface-3)] rounded-2xl transition-all"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <ChatMessages />
        <ChatInput />
      </motion.div>

      {/* Toggle Button */}
      {!isOpen && (
        <button
          onClick={toggleOpen}
          style={{ 
            position: 'fixed', 
            bottom: '24px', 
            right: '24px', 
            zIndex: 9999,
            display: 'flex'
          }}
          className="w-14 h-14 rounded-2xl bg-[var(--accent)] text-[#0d1117] items-center justify-center shadow-xl shadow-[var(--accent)]/30 hover:scale-105 active:scale-95 transition-all group"
        >
          <Bot size={28} className="transition-transform group-hover:rotate-12" />
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-[var(--red)] rounded-full border-2 border-[var(--bg)] animate-bounce" />
          
          <div className="absolute right-16 px-3 py-1.5 bg-[var(--surface-3)] border border-[var(--border)] text-[var(--text)] text-[11px] font-semibold rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all pointer-events-none shadow-md">
            Need help explaining this file?
          </div>
        </button>
      )}
    </>
  );
}
