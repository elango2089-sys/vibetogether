import React from 'react';
import { QrCode, Wifi, Sliders, MapPin, Radio, Users } from 'lucide-react';
import { Room, Device } from '../types/room';

interface HeaderProps {
  room: Room | null;
  currentDevice: Device | null;
  rtt: number;
  clockOffset: number;
  onOpenQR: () => void;
  onOpenCalibration: () => void;
  activeTab: 'player' | 'devices' | 'spatial' | 'effects';
  setActiveTab: (tab: 'player' | 'devices' | 'spatial' | 'effects') => void;
}

export const Header: React.FC<HeaderProps> = ({
  room,
  currentDevice,
  rtt,
  clockOffset,
  onOpenQR,
  onOpenCalibration,
  activeTab,
  setActiveTab
}) => {
  const connectedCount = room ? Object.values(room.devices).filter(d => d.connected).length : 0;

  return (
    <header className="sticky top-0 z-40 bg-[#090b0e]/90 backdrop-blur-xl border-b border-[#1c212d] px-4 py-3.5">
      <div className="max-w-3xl mx-auto flex items-center justify-between">
        
        {/* Brand Logo - VIBETOGETHER */}
        <div className="flex items-center gap-3">
          <img
            src="/logo.png"
            alt="VibeTogether Logo"
            className="w-8 h-8 rounded-lg border border-[#262c3e] shadow-md object-cover"
          />
          <div>
            <h1 className="font-extrabold text-base tracking-wider text-slate-100 uppercase">
              VIBETOGETHER
            </h1>
            <p className="text-[10px] text-slate-500 font-medium tracking-tight hidden sm:block">
              SYNCHRONIZED AUDIO SYSTEM
            </p>
          </div>
        </div>

        {/* Room Code Badge */}
        {room && (
          <div className="flex items-center gap-2">
            <button
              onClick={onOpenQR}
              className="flex items-center gap-2 bg-[#12151e] hover:bg-[#181d2a] border border-[#222736] text-slate-200 px-3 py-1.5 rounded-xl transition group"
            >
              <span className="text-[10px] font-mono tracking-widest text-slate-400 font-semibold uppercase">
                CODE
              </span>
              <span className="font-mono font-bold text-sm text-slate-100">
                {room.code}
              </span>
              <QrCode className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-200 transition" />
            </button>

            {/* Sync Latency Metric */}
            <button
              onClick={onOpenCalibration}
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#12151e] border border-[#222736] text-xs font-mono text-emerald-400 transition"
              title="Calibration Settings"
            >
              <Wifi className="w-3 h-3 text-emerald-400" />
              <span>{rtt}ms</span>
            </button>
          </div>
        )}
      </div>

      {/* Navigation Bar */}
      {room && (
        <div className="max-w-3xl mx-auto mt-3.5 flex items-center justify-between bg-[#11141c] p-1 rounded-xl border border-[#1f2433]">
          <button
            onClick={() => setActiveTab('player')}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold tracking-wide transition flex items-center justify-center gap-1.5 ${
              activeTab === 'player'
                ? 'bg-[#1e2333] text-slate-100 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Radio className="w-3.5 h-3.5 text-slate-300" />
            <span>PLAYER</span>
          </button>

          <button
            onClick={() => setActiveTab('devices')}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold tracking-wide transition flex items-center justify-center gap-1.5 ${
              activeTab === 'devices'
                ? 'bg-[#1e2333] text-slate-100 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-slate-300" />
            <span>DEVICES</span>
            <span className="text-[10px] font-mono text-slate-400 font-normal">
              ({connectedCount}/8)
            </span>
          </button>

          <button
            onClick={() => setActiveTab('spatial')}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold tracking-wide transition flex items-center justify-center gap-1.5 ${
              activeTab === 'spatial'
                ? 'bg-[#1e2333] text-slate-100 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <MapPin className="w-3.5 h-3.5 text-slate-300" />
            <span>ROOM</span>
          </button>

          <button
            onClick={() => setActiveTab('effects')}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold tracking-wide transition flex items-center justify-center gap-1.5 ${
              activeTab === 'effects'
                ? 'bg-[#1e2333] text-slate-100 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders className="w-3.5 h-3.5 text-slate-300" />
            <span>EFFECTS</span>
          </button>
        </div>
      )}
    </header>
  );
};
