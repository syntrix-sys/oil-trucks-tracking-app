interface SemiCircleGaugeProps {
  label: string;
  value: number;
  max: number;
  unit: string;
  color: string;
  decimals?: number;
}

export default function SemiCircleGauge({ label, value, max, unit, color, decimals = 0 }: SemiCircleGaugeProps) {
  const pct = Math.max(0, Math.min(1, value / max));
  const angle = pct * 180;

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-32 h-16">
        <div
          className="absolute inset-0 rounded-t-full transition-[background] duration-500"
          style={{
            background: `conic-gradient(from 270deg at 50% 100%, ${color} 0deg ${angle}deg, #334155 ${angle}deg 180deg, transparent 180deg 360deg)`,
          }}
        />
        <div
          className="absolute bg-surface rounded-t-full"
          style={{ top: 14, left: 14, right: 14, bottom: 0 }}
        />
        <div className="absolute inset-x-0 bottom-0 flex flex-col items-center">
          <span className="text-lg font-bold text-text-primary leading-none transition-all duration-500">
            {value.toFixed(decimals)}
          </span>
          <span className="text-[10px] text-slate-500">{unit}</span>
        </div>
      </div>
      <span className="text-xs text-slate-400 mt-1 uppercase tracking-wide">{label}</span>
    </div>
  );
}
