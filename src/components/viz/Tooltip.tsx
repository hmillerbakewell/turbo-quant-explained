import type { TooltipState } from '../../hooks/useTooltip';

interface TooltipProps {
  tooltip: TooltipState;
}

export function Tooltip({ tooltip }: TooltipProps) {
  if (!tooltip.visible) return null;

  return (
    <div
      className="absolute z-10 pointer-events-none px-2 py-1 text-xs bg-gray-900 text-white rounded shadow-lg whitespace-pre max-w-xs"
      style={{
        left: tooltip.x,
        top: tooltip.y - 8,
        transform: 'translate(-50%, -100%)',
      }}
    >
      {tooltip.content}
    </div>
  );
}
