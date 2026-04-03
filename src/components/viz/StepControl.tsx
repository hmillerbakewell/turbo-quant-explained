interface StepControlProps {
  currentStep: number;
  totalSteps: number;
  onStep: (step: number) => void;
  labels?: string[];
}

export function StepControl({ currentStep, totalSteps, onStep }: StepControlProps) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <button
        type="button"
        onClick={() => onStep(Math.max(0, currentStep - 1))}
        disabled={currentStep === 0}
        className="btn-primary"
      >
        Prev
      </button>
      <div className="flex gap-1.5">
        {Array.from({ length: totalSteps }, (_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onStep(i)}
            className={`w-2.5 h-2.5 rounded-full transition-colors cursor-pointer ${
              i === currentStep ? 'bg-indigo-500' : 'bg-gray-300'
            }`}
          />
        ))}
      </div>
      <button
        type="button"
        onClick={() => onStep(Math.min(totalSteps - 1, currentStep + 1))}
        disabled={currentStep === totalSteps - 1}
        className="btn-primary"
      >
        Next
      </button>
    </div>
  );
}
