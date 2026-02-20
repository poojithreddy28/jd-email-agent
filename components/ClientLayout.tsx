'use client';

import Navigation from './Navigation';
import { ThemeProvider } from './ThemeProvider';
import { AuthProvider } from './AuthProvider';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ThemeProvider>
        <Navigation />
        {children}
      </ThemeProvider>
    </AuthProvider>
  );
}
