import React from 'react';
import { Wifi, CheckCircle2, RefreshCw, AlertTriangle, Sliders } from 'lucide-react';

interface SyncIndicatorProps {
  rtt: number;
  clockOffset: number;
  drift: number;
  calibrationOffsetMs: number;
  onOpenCalibration: () => void;
}

export const SyncIndicator: React.FC<SyncIndicatorProps> = ({
  rtt,
  clockOffset,
  drift,
  calibrationOffsetMs,
  onOpenCalibration
}) => {
  const absDrift = Math.abs(drift);

  let statusText = 'SYNCHRONIZED';
  let statusColor = 'emerald';

  if (absDrift > 250) {
    statusText = 'RESYNCING';
    statusColor = 'rose';
  } else if (absDrift > 30) {
    statusText = 'SYNCING';
    statusColor = 'amber';
  }

  return (
    <div className="bg-[#11141c] border border-[#1f2433] rounded-2xl p-4 shadow-md max-w-xl mx-auto flex items-center justify-between">
      
      <div className="flex items-center gap-2.5">
        <span className={`w-2 h-2 rounded-full ${
          statusColor === 'emerald' ? 'bg-emerald-400' :
          statusColor === 'amber' ? 'bg-amber-400 animate-pulse' :
          'bg-rose-400'
        }`} />
        <div>
          <div className="text-xs font-bold text-slate-200 tracking-wider font-mono">
            {statusText}
          </div>
          <div className="text-[10px] text-slate-500 font-mono">
            Drift: {drift > 0 ? `+${drift}` : drift}ms
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 text-xs font-mono text-slate-400">
        <div className="flex items-center gap-1">
          <Wifi className="w-3 h-3 text-slate-400" />
          <span>{rtt}ms</span>
        </div>

        <button
          onClick={onOpenCalibration}
          className="p-1.5 rounded-lg bg-[#181d29] hover:bg-[#202738] border border-[#262c3f] text-slate-300 transition"
          title="Latency Calibration"
        >
          <Sliders className="w-3.5 h-3.5 text-[#d4af37]" />
        </button>
      </div>

    </div>
  );
};
