import type { Metadata } from 'next';
import { Inter, Geist } from 'next/font/google';
import { QueryProvider } from '@/components/providers/query-provider';
import { CommandPaletteProvider } from '@/components/features/command-palette/command-palette-provider';
import './globals.css';
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Orbiter',
  description: 'Internal Project Management Platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cn("font-sans", geist.variable)} suppressHydrationWarning>
      <body className="bg-page text-primary antialiased">
        <QueryProvider>
          <CommandPaletteProvider>{children}</CommandPaletteProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
