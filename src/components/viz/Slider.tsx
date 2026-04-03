interface SliderProps {
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: (value: number) => void;
  label: string;
  valueLabel?: string;
}

export function Slider({ min, max, step = 1, value, onChange, label, valueLabel }: SliderProps) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <label className="text-gray-600 whitespace-nowrap">{label}</label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 accent-indigo-500"
      />
      <span className="font-mono text-gray-900 w-[7em] text-right">
        {valueLabel ?? value}
      </span>
    </div>
  );
}
