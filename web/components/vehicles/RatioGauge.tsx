import { THRESHOLDS, type RatioBand } from "@oiltrack/types";
import { RATIO_BAND_COLORS } from "@/lib/formatters";

interface RatioGaugeProps {
  value: number;
  band: RatioBand;
}

const MAX_SCALE = 4.5;

export default function RatioGauge({ value, band }: RatioGaugeProps) {
  const pct = Math.max(0, Math.min(1, value / MAX_SCALE));
  const cautionPct = (THRESHOLDS.ratio.caution / MAX_SCALE) * 100;
  const warningPct = (THRESHOLDS.ratio.warning / MAX_SCALE) * 100;
  const criticalPct = (THRESHOLDS.ratio.critical / MAX_SCALE) * 100;

  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="text-xs text-slate-400 uppercase tracking-wide">Speed / Weight Ratio</span>
        <span className="text-lg font-bold transition-colors duration-500" style={{ color: RATIO_BAND_COLORS[band] }}>
          {value.toFixed(2)}
        </span>
      </div>
      <div className="relative h-2.5 rounded-full overflow-hidden bg-slate-700">
        <div
          className="absolute inset-y-0 left-0"
          style={{
            width: `${cautionPct}%`,
            backgroundColor: RATIO_BAND_COLORS.normal,
          }}
        />
        <div
          className="absolute inset-y-0"
          style={{
            left: `${cautionPct}%`,
            width: `${warningPct - cautionPct}%`,
            backgroundColor: RATIO_BAND_COLORS.caution,
          }}
        />
        <div
          className="absolute inset-y-0"
          style={{
            left: `${warningPct}%`,
            width: `${criticalPct - warningPct}%`,
            backgroundColor: RATIO_BAND_COLORS.warning,
          }}
        />
        <div
          className="absolute inset-y-0"
          style={{
            left: `${criticalPct}%`,
            width: `${100 - criticalPct}%`,
            backgroundColor: RATIO_BAND_COLORS.critical,
          }}
        />
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-white transition-all duration-500"
          style={{ left: `${pct * 100}%` }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-slate-500 mt-1">
        <span>0</span>
        <span>{THRESHOLDS.ratio.caution}</span>
        <span>{THRESHOLDS.ratio.warning}</span>
        <span>{THRESHOLDS.ratio.critical}</span>
        <span>{MAX_SCALE}</span>
      </div>
    </div>
  );
}
