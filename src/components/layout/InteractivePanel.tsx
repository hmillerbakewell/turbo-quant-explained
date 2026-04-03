import type { ReactNode } from 'react';

interface InteractivePanelProps {
  caption?: string;
  children: ReactNode;
}

export function InteractivePanel({ caption, children }: InteractivePanelProps) {
  return (
    <div className="relative border border-gray-200 rounded-lg bg-gray-50 p-4 my-4">
      {children}
      {caption && (
        <p className="text-xs text-gray-400 mt-3 text-center">{caption}</p>
      )}
    </div>
  );
}
