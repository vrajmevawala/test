'use client';
import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  toolResults?: any[];
}

interface BotState {
  conversationId: string;
  messages: Message[];
  isStreaming: boolean;
  isOpen: boolean;
  context: Record<string, any>;
  position: { x: number; y: number };
  
  // Actions
  addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => void;
  updateLastMessage: (content: string) => void;
  setStreaming: (status: boolean) => void;
  toggleOpen: () => void;
  setOpen: (isOpen: boolean) => void;
  setContext: (context: Record<string, any>) => void;
  setConversationId: (id: string) => void;
  setPosition: (x: number, y: number) => void;
  loadHistory: (id: string) => Promise<void>;
  resetConversation: () => void;
}

export const useBotStore = create<BotState>((set) => ({
  conversationId: typeof window !== 'undefined' ? (localStorage.getItem('codesage_conv_id') || uuidv4()) : uuidv4(),
  messages: [],
  isStreaming: false,
  isOpen: false,
  context: {},
  position: { x: 0, y: 0 },

  addMessage: (msg) => set((state) => ({
    messages: [...state.messages, { ...msg, id: uuidv4(), timestamp: Date.now() }]
  })),

  updateLastMessage: (content) => set((state) => {
    const newMessages = [...state.messages];
    if (newMessages.length > 0) {
      newMessages[newMessages.length - 1].content += content;
    }
    return { messages: newMessages };
  }),

  setStreaming: (status) => set({ isStreaming: status }),
  
  toggleOpen: () => set((state) => ({ isOpen: !state.isOpen })),

  setOpen: (isOpen) => set({ isOpen }),

  setContext: (context) => set({ context }),
  
  setConversationId: (id) => set({ conversationId: id }),

  setPosition: (x, y) => {
    set({ position: { x, y } });
  },

  loadHistory: async (id) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/bot/history/${id}`);
      if (!response.ok) throw new Error('Failed to load history');
      const history = await response.json();
      
      const messages = history.map((m: any) => ({
        ...m,
        id: uuidv4(),
        timestamp: Date.now(),
      }));
      
      set({ conversationId: id, messages });
    } catch (e) {
      console.error("Failed to load history:", e);
      set({ conversationId: id, messages: [] });
    }
  },

  resetConversation: () => {
    const newId = uuidv4();
    if (typeof window !== 'undefined') localStorage.setItem('codesage_conv_id', newId);
    set({ conversationId: newId, messages: [], isStreaming: false });
  },
}));

// Initialize storage
if (typeof window !== 'undefined' && !localStorage.getItem('codesage_conv_id')) {
  localStorage.setItem('codesage_conv_id', uuidv4());
}
