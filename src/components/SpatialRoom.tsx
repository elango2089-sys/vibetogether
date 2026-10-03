import React from 'react';
import { MapPin, Headphones, Smartphone, Crown } from 'lucide-react';
import { Room, SpeakerPosition, Vector2D } from '../types/room';

interface SpatialRoomProps {
  room: Room;
  currentDeviceId: string;
  isHost: boolean;
  onPositionChange: (targetDeviceId: string, position: SpeakerPosition, vector2D?: Vector2D) => void;
}

export const SpatialRoom: React.FC<SpatialRoomProps> = ({
  room,
  currentDeviceId,
  isHost,
  onPositionChange
}) => {
  const devices = Object.values(room.devices).filter(d => d.connected);

  const positionCoords: Record<SpeakerPosition, { x: number; y: number; label: string }> = {
    FRONT_LEFT: { x: 22, y: 22, label: 'Front Left' },
    FRONT_RIGHT: { x: 78, y: 22, label: 'Front Right' },
    LEFT: { x: 18, y: 50, label: 'Left' },
    RIGHT: { x: 82, y: 50, label: 'Right' },
    REAR_LEFT: { x: 26, y: 78, label: 'Rear Left' },
    REAR_RIGHT: { x: 74, y: 78, label: 'Rear Right' },
    CENTER: { x: 50, y: 30, label: 'Center' },
    SUB_REAR: { x: 50, y: 86, label: 'Sub / Rear' }
  };

  const positionsList: SpeakerPosition[] = [
    'FRONT_LEFT',
    'CENTER',
    'FRONT_RIGHT',
    'LEFT',
    'RIGHT',
    'REAR_LEFT',
    'SUB_REAR',
    'REAR_RIGHT'
  ];

  return (
    <div className="bg-[#11141c] border border-[#1f2433] rounded-2xl p-5 space-y-5 max-w-xl mx-auto shadow-xl">
      
      <div className="border-b border-[#1c212d] pb-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-[#d4af37]" />
          Multi-Device Spatial Audio Placement
        </h3>
        <p className="text-[11px] text-slate-400 mt-0.5">
          Assign each phone to its physical speaker position around the listener.
        </p>
      </div>

      {/* 2D Room Grid Arena */}
      <div className="relative w-full aspect-square max-h-[340px] bg-[#090b0e] rounded-2xl border border-[#1c212d] p-4 flex items-center justify-center overflow-hidden">
        
        {/* Subtle grid lines */}
        <div className="absolute inset-10 rounded-full border border-[#181d29] pointer-events-none" />
        <div className="absolute inset-20 rounded-full border border-[#181d29] pointer-events-none" />

        <span className="absolute top-2.5 text-[9px] font-mono tracking-widest text-slate-500 uppercase">
          FRONT
        </span>
        <span className="absolute bottom-2.5 text-[9px] font-mono tracking-widest text-slate-500 uppercase">
          REAR
        </span>

        {/* Center Listener Headset */}
        <div className="absolute z-20 w-14 h-14 rounded-xl bg-[#141824] border border-[#262d3e] flex flex-col items-center justify-center text-slate-200">
          <Headphones className="w-5 h-5 text-[#d4af37]" />
          <span className="text-[8px] font-mono text-slate-400 mt-0.5 uppercase">CENTER</span>
        </div>

        {/* Devices */}
        {devices.map((device) => {
          const coords = positionCoords[device.speakerPosition] || positionCoords.CENTER;
          const isMe = device.id === currentDeviceId;

          return (
            <div
              key={device.id}
              style={{ left: `${coords.x}%`, top: `${coords.y}%` }}
              className="absolute -translate-x-1/2 -translate-y-1/2 z-30 transition-all duration-300"
            >
              <div
                className={`p-2 rounded-xl border flex items-center gap-1.5 shadow-md ${
                  device.isHost
                    ? 'bg-[#181d2a] border-[#313a52] text-slate-100'
                    : isMe
                    ? 'bg-[#151a26] border-[#d4af37]/60 text-slate-100'
                    : 'bg-[#10131b] border-[#1f2535] text-slate-300'
                }`}
              >
                {device.isHost ? <Crown className="w-3.5 h-3.5 text-[#d4af37]" /> : <Smartphone className="w-3.5 h-3.5 text-slate-400" />}
                <div className="text-[10px] font-bold tracking-tight">
                  {device.name} {isMe && '(YOU)'}
                </div>
              </div>
            </div>
          );
        })}

      </div>

      {/* Selectors */}
      <div className="space-y-2">
        {devices.map((device) => {
          const canEdit = isHost || device.id === currentDeviceId;
          return (
            <div key={device.id} className="p-3 rounded-xl bg-[#0a0c10] border border-[#1c212d] flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300">{device.name}</span>
              <select
                value={device.speakerPosition}
                disabled={!canEdit}
                onChange={(e) => onPositionChange(device.id, e.target.value as SpeakerPosition)}
                className="bg-[#12151f] border border-[#222838] text-slate-200 text-xs rounded-lg px-2.5 py-1 focus:outline-none font-medium cursor-pointer disabled:opacity-50"
              >
                {positionsList.map(pos => (
                  <option key={pos} value={pos}>
                    {positionCoords[pos].label}
                  </option>
                ))}
              </select>
            </div>
          );
        })}
      </div>

    </div>
  );
};
