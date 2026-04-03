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
  
  // Actions
  addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => void;
  updateLastMessage: (content: string) => void;
  setStreaming: (status: boolean) => void;
  toggleOpen: () => void;
  setOpen: (isOpen: boolean) => void;
  resetConversation: () => void;
}

export const useBotStore = create<BotState>((set) => ({
  conversationId: typeof window !== 'undefined' ? (localStorage.getItem('codesage_conv_id') || uuidv4()) : uuidv4(),
  messages: [],
  isStreaming: false,
  isOpen: false,

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
