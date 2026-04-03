import type { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import './globals.css';

export const metadata: Metadata = {
  title: 'CodeSage — AI Code Optimizer',
  description: 'AI-powered code analysis, refactoring, and optimization platform for developer teams.',
};

import { BotWidget } from '@/components/bot/bot-widget';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">
        <ClerkProvider>
          {children}
          <BotWidget />
        </ClerkProvider>
      </body>
    </html>
  );
}
