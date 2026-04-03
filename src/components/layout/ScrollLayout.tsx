import type { ReactNode } from 'react';

interface ScrollLayoutProps {
  children: ReactNode;
}

export function ScrollLayout({ children }: ScrollLayoutProps) {
  return (
    <div className="max-w-3xl mx-auto px-4 py-16 space-y-0">
      {children}
    </div>
  );
}
