import * as React from 'react'

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: string;
  storageKey?: string;
  [key: string]: unknown;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  return <>{children}</>;
}
