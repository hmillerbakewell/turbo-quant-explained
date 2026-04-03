interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  labelOn: string;
  labelOff: string;
}

export function Toggle({ checked, onChange, labelOn, labelOff }: ToggleProps) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center gap-2 text-sm cursor-pointer"
    >
      <div
        className={`relative w-10 h-5 rounded-full transition-colors ${
          checked ? 'bg-indigo-500' : 'bg-gray-300'
        }`}
      >
        <div
          className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
            checked ? 'translate-x-5' : 'translate-x-0.5'
          }`}
        />
      </div>
      <span className="text-gray-700">{checked ? labelOn : labelOff}</span>
    </button>
  );
}
