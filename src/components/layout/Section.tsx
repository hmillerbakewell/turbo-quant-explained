import type { ReactNode } from 'react';
import type { SectionId } from '../../types';

interface SectionProps {
  id: SectionId;
  number: number;
  title: string;
  subtitle?: string;
  children?: ReactNode;
}

export function Section({ id, number, title, subtitle, children }: SectionProps) {
  return (
    <section id={id} className="py-20 border-t border-gray-200 first:border-t-0">
      <div className="flex items-baseline gap-3 mb-2">
        <span className="text-xs font-mono text-gray-400 bg-gray-100 rounded-full w-6 h-6 flex items-center justify-center shrink-0">
          {number}
        </span>
        <h2 className="text-2xl font-semibold text-gray-900">{title}</h2>
      </div>
      {subtitle && (
        <p className="text-gray-500 mb-8 ml-9">{subtitle}</p>
      )}
      <div className="mt-6">{children}</div>
    </section>
  );
}
