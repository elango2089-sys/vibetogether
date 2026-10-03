import React from 'react';
import { Sliders, RotateCcw, Volume2, Flame, Waves, RotateCw } from 'lucide-react';
import { AudioEffectsConfig } from '../types/room';

interface AudioEffectsProps {
  config: AudioEffectsConfig;
  onChange: (newConfig: Partial<AudioEffectsConfig>) => void;
}

export const AudioEffects: React.FC<AudioEffectsProps> = ({ config, onChange }) => {

  const handleReset = () => {
    onChange({
      spatial8D: false,
      rotationSpeed: 0.25,
      spatialWidth: 50,
      bassBoost: 0,
      treble: 0,
      reverb: 0,
      delay: 0,
      lowPass: 20000,
      highPass: 20
    });
  };

  return (
    <div className="bg-[#11141c] border border-[#1f2433] rounded-2xl p-5 max-w-xl mx-auto space-y-5 shadow-xl">
      
      <div className="flex items-center justify-between border-b border-[#1c212d] pb-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
          <Sliders className="w-3.5 h-3.5 text-[#d4af37]" />
          Web Audio DSP Effects
        </h3>

        <button
          onClick={handleReset}
          className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1 transition"
        >
          <RotateCcw className="w-3 h-3" />
          Reset
        </button>
      </div>

      {/* 8D Rotation Switch */}
      <div className="bg-[#0a0c10] p-3.5 rounded-xl border border-[#1c212d] flex items-center justify-between">
        <div>
          <div className="font-bold text-xs text-slate-200">8D Audio Circular Pan</div>
          <div className="text-[10px] text-slate-500">Automated 360° stereo movement</div>
        </div>

        <button
          onClick={() => onChange({ spatial8D: !config.spatial8D })}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
            config.spatial8D
              ? 'bg-[#d4af37] text-slate-950 font-bold'
              : 'bg-[#181c28] text-slate-400'
          }`}
        >
          {config.spatial8D ? 'ON' : 'OFF'}
        </button>
      </div>

      {/* Sliders Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs font-medium text-slate-300">
            <span>Bass Boost</span>
            <span className="font-mono text-slate-400">{config.bassBoost}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={config.bassBoost}
            onChange={(e) => onChange({ bassBoost: parseInt(e.target.value) })}
            className="w-full h-1.5 bg-[#1c212d] rounded-full appearance-none cursor-pointer"
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between text-xs font-medium text-slate-300">
            <span>Treble</span>
            <span className="font-mono text-slate-400">{config.treble}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={config.treble}
            onChange={(e) => onChange({ treble: parseInt(e.target.value) })}
            className="w-full h-1.5 bg-[#1c212d] rounded-full appearance-none cursor-pointer"
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between text-xs font-medium text-slate-300">
            <span>Reverb</span>
            <span className="font-mono text-slate-400">{config.reverb}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={config.reverb}
            onChange={(e) => onChange({ reverb: parseInt(e.target.value) })}
            className="w-full h-1.5 bg-[#1c212d] rounded-full appearance-none cursor-pointer"
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between text-xs font-medium text-slate-300">
            <span>Spatial Width</span>
            <span className="font-mono text-slate-400">{config.spatialWidth}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={config.spatialWidth}
            onChange={(e) => onChange({ spatialWidth: parseInt(e.target.value) })}
            className="w-full h-1.5 bg-[#1c212d] rounded-full appearance-none cursor-pointer"
          />
        </div>
      </div>

    </div>
  );
};
