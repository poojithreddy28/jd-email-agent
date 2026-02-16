'use client';

import Navigation from './Navigation';
import { ThemeProvider } from './ThemeProvider';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <Navigation />
      {children}
    </ThemeProvider>
  );
}
