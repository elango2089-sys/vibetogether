import React from 'react';
import { Crown, User, UserX, Lock, Unlock, Wifi, Volume2, QrCode } from 'lucide-react';
import { Room, Device, SpeakerPosition } from '../types/room';

interface DeviceListProps {
  room: Room;
  currentDeviceId: string;
  isHost: boolean;
  onRemoveDevice: (targetDeviceId: string) => void;
  onTransferHost: (targetDeviceId: string) => void;
  onToggleLock: (isLocked: boolean) => void;
  onToggleParticipantControl: (allow: boolean) => void;
  onOpenQR: () => void;
  onSpeakerPositionChange: (targetDeviceId: string, pos: SpeakerPosition) => void;
}

export const DeviceList: React.FC<DeviceListProps> = ({
  room,
  currentDeviceId,
  isHost,
  onRemoveDevice,
  onTransferHost,
  onToggleLock,
  onToggleParticipantControl,
  onOpenQR,
  onSpeakerPositionChange
}) => {
  const devices = Object.values(room.devices);
  const connectedDevices = devices.filter(d => d.connected);
  const isFull = connectedDevices.length >= room.maxDevices;

  const positionsList: SpeakerPosition[] = [
    'CENTER',
    'FRONT_LEFT',
    'FRONT_RIGHT',
    'LEFT',
    'RIGHT',
    'REAR_LEFT',
    'REAR_RIGHT',
    'SUB_REAR'
  ];

  return (
    <div className="space-y-5 max-w-xl mx-auto">
      
      {/* Room Header Card */}
      <div className="bg-[#11141c] border border-[#1f2433] rounded-2xl p-5 shadow-xl">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-[10px] font-mono tracking-widest text-[#d4af37] font-semibold uppercase">
              ROOM CODE
            </div>
            <div className="font-mono text-2xl font-bold text-slate-100 flex items-center gap-2">
              {room.code}
              <button
                onClick={onOpenQR}
                className="p-1 rounded-lg bg-[#161a25] border border-[#222736] text-slate-400 hover:text-slate-200 transition"
              >
                <QrCode className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="text-right">
            <div className="text-[10px] uppercase font-semibold text-slate-500 mb-0.5">CAPACITY</div>
            <div className={`text-sm font-bold font-mono ${isFull ? 'text-rose-400' : 'text-slate-200'}`}>
              {connectedDevices.length} / {room.maxDevices} Devices
            </div>
          </div>
        </div>

        {/* Capacity Bar */}
        <div className="w-full bg-[#0a0c10] h-1.5 rounded-full overflow-hidden border border-[#1c212d]">
          <div
            className={`h-full transition-all duration-300 rounded-full ${
              isFull ? 'bg-rose-500' : 'bg-[#d4af37]'
            }`}
            style={{ width: `${(connectedDevices.length / room.maxDevices) * 100}%` }}
          />
        </div>
      </div>

      {/* Connected Devices */}
      <div className="bg-[#11141c] border border-[#1f2433] rounded-2xl p-5 space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
          Connected Devices ({connectedDevices.length})
        </h3>

        <div className="space-y-2">
          {devices.map((device) => {
            const isMe = device.id === currentDeviceId;

            return (
              <div
                key={device.id}
                className={`p-3.5 rounded-xl border transition ${
                  device.isHost
                    ? 'bg-[#151924] border-[#293145]'
                    : isMe
                    ? 'bg-[#121621] border-[#1f2638]'
                    : 'bg-[#0a0c10] border-[#1a1f2c]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#181d29] border border-[#252c3e] flex items-center justify-center">
                      {device.isHost ? <Crown className="w-4 h-4 text-[#d4af37]" /> : <User className="w-4 h-4 text-slate-400" />}
                    </div>

                    <div>
                      <div className="font-bold text-xs text-slate-100 flex items-center gap-1.5">
                        {device.name}
                        {isMe && <span className="text-[9px] font-mono text-[#d4af37] font-semibold">(YOU)</span>}
                        {device.isHost && <span className="text-[9px] font-mono text-amber-400 font-semibold">(HOST)</span>}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                        {device.drift > 0 ? `+${device.drift}` : device.drift}ms latency
                      </div>
                    </div>
                  </div>

                  <select
                    value={device.speakerPosition}
                    disabled={!isHost && !isMe}
                    onChange={(e) => onSpeakerPositionChange(device.id, e.target.value as SpeakerPosition)}
                    className="bg-[#0a0c10] border border-[#202636] text-slate-300 text-xs rounded-lg px-2 py-1 focus:outline-none font-medium cursor-pointer disabled:opacity-50"
                  >
                    {positionsList.map(pos => (
                      <option key={pos} value={pos}>
                        {pos.replace('_', ' ')}
                      </option>
                    ))}
                  </select>
                </div>

                {isHost && !device.isHost && (
                  <div className="mt-2.5 pt-2 border-t border-[#1c212d] flex justify-end gap-2 text-xs">
                    <button
                      onClick={() => onTransferHost(device.id)}
                      className="px-2.5 py-1 rounded-lg bg-[#181d28] hover:bg-[#202738] border border-[#282f42] text-slate-300 text-[11px] font-medium"
                    >
                      Make Host
                    </button>
                    <button
                      onClick={() => onRemoveDevice(device.id)}
                      className="px-2.5 py-1 rounded-lg bg-rose-950/40 hover:bg-rose-950/60 border border-rose-500/30 text-rose-300 text-[11px] font-medium"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Host Settings */}
      {isHost && (
        <div className="bg-[#11141c] border border-[#1f2433] rounded-2xl p-5 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Host Controls
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={() => onToggleLock(!room.isLocked)}
              className="p-3.5 rounded-xl bg-[#0a0c10] border border-[#1c212d] hover:border-[#2a3245] text-left flex items-center justify-between transition"
            >
              <div>
                <div className="font-bold text-xs text-slate-200 flex items-center gap-1.5">
                  {room.isLocked ? <Lock className="w-3.5 h-3.5 text-rose-400" /> : <Unlock className="w-3.5 h-3.5 text-emerald-400" />}
                  Room Lock
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  {room.isLocked ? 'Locked' : 'Open'}
                </div>
              </div>
              <span className="text-[10px] font-mono text-slate-400 font-bold">
                {room.isLocked ? 'ON' : 'OFF'}
              </span>
            </button>

            <button
              onClick={() => onToggleParticipantControl(!room.allowParticipantControl)}
              className="p-3.5 rounded-xl bg-[#0a0c10] border border-[#1c212d] hover:border-[#2a3245] text-left flex items-center justify-between transition"
            >
              <div>
                <div className="font-bold text-xs text-slate-200 flex items-center gap-1.5">
                  <Volume2 className="w-3.5 h-3.5 text-[#d4af37]" />
                  Guest Control
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  {room.allowParticipantControl ? 'Allowed' : 'Host Only'}
                </div>
              </div>
              <span className="text-[10px] font-mono text-slate-400 font-bold">
                {room.allowParticipantControl ? 'ON' : 'OFF'}
              </span>
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
