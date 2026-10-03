import React from 'react';
import { Volume2, Play } from 'lucide-react';

interface AudioUnlockModalProps {
  isOpen: boolean;
  onUnlock: () => void;
}

export const AudioUnlockModal: React.FC<AudioUnlockModalProps> = ({ isOpen, onUnlock }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="max-w-md w-full bg-[#0c101d] border border-cyan-500/40 rounded-3xl p-6 text-center shadow-[0_0_50px_rgba(0,240,255,0.25)] relative overflow-hidden">
        
        {/* Glow backdrop decorative circle */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-pink-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="w-16 h-16 rounded-2xl bg-cyan-950/80 border border-cyan-500/50 flex items-center justify-center mx-auto mb-4 shadow-[0_0_20px_rgba(0,240,255,0.3)] animate-bounce">
          <Volume2 className="w-8 h-8 text-cyan-400" />
        </div>

        <h3 className="text-xl font-bold text-slate-100 mb-2">Enable Audio Playback</h3>
        <p className="text-xs text-slate-300 mb-6 leading-relaxed">
          Mobile browsers require a user tap to activate low-latency Web Audio API synchronization.
        </p>

        <button
          onClick={onUnlock}
          className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-cyan-500 via-indigo-600 to-pink-500 hover:from-cyan-400 hover:to-pink-400 text-white font-bold text-base shadow-[0_0_25px_rgba(0,240,255,0.4)] flex items-center justify-center gap-2 transform active:scale-95 transition"
        >
          <Play className="w-5 h-5 fill-current" />
          <span>TAP TO ENABLE AUDIO</span>
        </button>
      </div>
    </div>
  );
};
