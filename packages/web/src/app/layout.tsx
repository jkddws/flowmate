import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'FlowMate - Visual Workflow Builder',
  description: 'Build automations without code. Describe what you need in plain English.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
