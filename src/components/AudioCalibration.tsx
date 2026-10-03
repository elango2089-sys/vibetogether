import React from 'react';
import { Sliders, Volume2, X, Plus, Minus, Info } from 'lucide-react';

interface AudioCalibrationProps {
  isOpen: boolean;
  onClose: () => void;
  calibrationOffsetMs: number;
  onChangeOffset: (ms: number) => void;
  onTestClick: () => void;
}

export const AudioCalibration: React.FC<AudioCalibrationProps> = ({
  isOpen,
  onClose,
  calibrationOffsetMs,
  onChangeOffset,
  onTestClick
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="max-w-md w-full bg-[#0c101d] border border-cyan-500/40 rounded-3xl p-6 shadow-2xl relative space-y-5">
        
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Sliders className="w-5 h-5 text-cyan-400" />
            Audio Latency Calibration
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-3.5 rounded-2xl bg-cyan-950/40 border border-cyan-800/40 text-xs text-cyan-200 space-y-1">
          <div className="font-semibold flex items-center gap-1.5 text-cyan-300">
            <Info className="w-4 h-4 text-cyan-400" /> Speaker & Bluetooth Latency Alignment
          </div>
          <p className="text-[11px] text-cyan-400/80 leading-relaxed">
            Different phone speakers and Bluetooth accessories introduce hardware output latency. Use this slider to shift this device's playback start offset by milliseconds.
          </p>
        </div>

        {/* Delay Offset Control */}
        <div className="space-y-3 bg-slate-950/80 p-4 rounded-2xl border border-slate-800">
          <div className="flex justify-between items-center text-xs font-semibold">
            <span className="text-slate-300">Speaker Delay Offset</span>
            <span className="font-mono text-cyan-300 text-sm font-bold">
              {calibrationOffsetMs > 0 ? `+${calibrationOffsetMs}` : calibrationOffsetMs} ms
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => onChangeOffset(Math.max(-300, calibrationOffsetMs - 5))}
              className="p-3 rounded-xl bg-slate-900 border border-slate-700 hover:border-cyan-500 text-slate-200 transition active:scale-95"
            >
              <Minus className="w-4 h-4" />
            </button>

            <input
              type="range"
              min={-300}
              max={500}
              step={1}
              value={calibrationOffsetMs}
              onChange={(e) => onChangeOffset(parseInt(e.target.value))}
              className="w-full h-2 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />

            <button
              onClick={() => onChangeOffset(Math.min(500, calibrationOffsetMs + 5))}
              className="p-3 rounded-xl bg-slate-900 border border-slate-700 hover:border-cyan-500 text-slate-200 transition active:scale-95"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Test Sync Sound Button */}
        <button
          onClick={onTestClick}
          className="w-full py-3.5 px-4 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-cyan-500/40 text-cyan-300 font-bold text-xs shadow-md flex items-center justify-center gap-2 transition active:scale-98"
        >
          <Volume2 className="w-4 h-4 text-cyan-400" />
          PLAY TEST SYNC PULSE SOUND
        </button>

        <button
          onClick={onClose}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-bold text-xs shadow-lg transition active:scale-98"
        >
          SAVE & CLOSE
        </button>

      </div>
    </div>
  );
};
