import React, { useState, useEffect } from 'react';
import { Plus, ArrowRight, Smartphone, AlertCircle } from 'lucide-react';

interface RoomCreationProps {
  onCreateRoom: (deviceName: string) => void;
  onJoinRoom: (roomCode: string, deviceName: string) => void;
  errorMessage: string | null;
  initialCode?: string;
}

export const RoomCreation: React.FC<RoomCreationProps> = ({
  onCreateRoom,
  onJoinRoom,
  errorMessage,
  initialCode = ''
}) => {
  const [mode, setMode] = useState<'selection' | 'create' | 'join'>(initialCode ? 'join' : 'selection');
  const [deviceName, setDeviceName] = useState<string>(() => {
    const ua = navigator.userAgent;
    if (/iPhone|iPad/i.test(ua)) return "iPhone";
    if (/Android/i.test(ua)) return "Android Phone";
    if (/Macintosh/i.test(ua)) return "MacBook";
    if (/Windows/i.test(ua)) return "Windows PC";
    return "My Phone";
  });

  const [codeDigits, setCodeDigits] = useState<string[]>(['', '', '', '', '', '']);

  useEffect(() => {
    if (initialCode && initialCode.length === 6) {
      setCodeDigits(initialCode.split(''));
      setMode('join');
    }
  }, [initialCode]);

  const handleDigitInput = (index: number, val: string) => {
    if (!/^\d*$/.test(val)) return;
    const newDigits = [...codeDigits];
    newDigits[index] = val.slice(-1);
    setCodeDigits(newDigits);

    if (val && index < 5) {
      const nextInput = document.getElementById(`digit-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !codeDigits[index] && index > 0) {
      const prevInput = document.getElementById(`digit-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const paste = e.clipboardData.getData('text').trim();
    if (/^\d{6}$/.test(paste)) {
      setCodeDigits(paste.split(''));
    }
  };

  const fullCode = codeDigits.join('');

  const submitJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (fullCode.length === 6) {
      onJoinRoom(fullCode, deviceName);
    }
  };

  const submitCreate = (e: React.FormEvent) => {
    e.preventDefault();
    onCreateRoom(deviceName);
  };

  return (
    <div className="min-h-[82vh] flex flex-col items-center justify-center p-4 max-w-md mx-auto">
      
      {/* Hero Header */}
      <div className="text-center mb-10">
        <img
          src="/logo.png"
          alt="VibeTogether Logo"
          className="w-20 h-20 rounded-2xl border border-[#282e40] shadow-2xl mx-auto mb-5 object-cover"
        />

        <h1 className="text-3xl font-extrabold tracking-wider text-slate-100 uppercase mb-2">
          VIBETOGETHER
        </h1>
        <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
          Synchronize up to 8 smartphones to play the exact same music simultaneously.
        </p>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="w-full mb-6 p-4 rounded-2xl bg-rose-950/60 border border-rose-500/30 text-rose-200 text-xs flex items-center gap-3 shadow-lg">
          <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
          <div>{errorMessage}</div>
        </div>
      )}

      {/* Selection Cards */}
      {mode === 'selection' && (
        <div className="w-full space-y-3.5">
          
          {/* Create Room Button */}
          <button
            onClick={() => setMode('create')}
            className="w-full p-5 rounded-2xl bg-[#11141c] hover:bg-[#161a25] border border-[#1e2333] hover:border-[#2d354c] text-left transition duration-200 group flex items-center justify-between shadow-lg"
          >
            <div>
              <div className="text-[10px] font-mono tracking-widest text-slate-400 font-semibold uppercase mb-1">
                HOST SESSION
              </div>
              <h2 className="text-base font-bold text-slate-100">Create Room</h2>
              <p className="text-xs text-slate-400 mt-0.5">Generate a 6-digit code for your room</p>
            </div>
            <div className="w-9 h-9 rounded-xl bg-[#181d29] border border-[#262c3e] flex items-center justify-center text-slate-300 group-hover:text-slate-100 group-hover:scale-105 transition">
              <Plus className="w-4 h-4 text-slate-200" />
            </div>
          </button>

          {/* Join Room Button */}
          <button
            onClick={() => setMode('join')}
            className="w-full p-5 rounded-2xl bg-[#11141c] hover:bg-[#161a25] border border-[#1e2333] hover:border-[#2d354c] text-left transition duration-200 group flex items-center justify-between shadow-lg"
          >
            <div>
              <div className="text-[10px] font-mono tracking-widest text-slate-400 font-semibold uppercase mb-1">
                ENTER CODE
              </div>
              <h2 className="text-base font-bold text-slate-100">Join Room</h2>
              <p className="text-xs text-slate-400 mt-0.5">Connect to an existing music session</p>
            </div>
            <div className="w-9 h-9 rounded-xl bg-[#181d29] border border-[#262c3e] flex items-center justify-center text-slate-300 group-hover:text-slate-100 group-hover:scale-105 transition">
              <ArrowRight className="w-4 h-4 text-slate-300" />
            </div>
          </button>

          <p className="text-[11px] text-slate-500 text-center pt-2">
            Maximum capacity: 8 devices per room
          </p>
        </div>
      )}

      {/* Create Room Form */}
      {mode === 'create' && (
        <form onSubmit={submitCreate} className="w-full bg-[#11141c] border border-[#1f2433] rounded-2xl p-6 space-y-5 shadow-xl">
          <div className="flex items-center justify-between border-b border-[#1c212d] pb-3">
            <h2 className="text-base font-bold text-slate-100">Create New Room</h2>
            <button
              type="button"
              onClick={() => setMode('selection')}
              className="text-xs text-slate-400 hover:text-slate-200"
            >
              Cancel
            </button>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2 flex items-center gap-1.5">
              <Smartphone className="w-3.5 h-3.5 text-slate-400" />
              Device Display Name
            </label>
            <input
              type="text"
              value={deviceName}
              onChange={(e) => setDeviceName(e.target.value)}
              placeholder="e.g. Elango's iPhone"
              maxLength={24}
              required
              className="w-full bg-[#0a0c10] border border-[#1e2333] rounded-xl px-4 py-3 text-xs text-slate-100 focus:outline-none focus:border-slate-400 transition"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3.5 rounded-xl bg-slate-100 hover:bg-white text-slate-950 font-bold text-xs tracking-wider uppercase transition active:scale-98 shadow-md"
          >
            CREATE ROOM & GENERATE CODE
          </button>
        </form>
      )}

      {/* Join Room Form */}
      {mode === 'join' && (
        <form onSubmit={submitJoin} className="w-full bg-[#11141c] border border-[#1f2433] rounded-2xl p-6 space-y-5 shadow-xl">
          <div className="flex items-center justify-between border-b border-[#1c212d] pb-3">
            <h2 className="text-base font-bold text-slate-100">Join Existing Room</h2>
            <button
              type="button"
              onClick={() => setMode('selection')}
              className="text-xs text-slate-400 hover:text-slate-200"
            >
              Cancel
            </button>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2.5 text-center">
              ENTER 6-DIGIT ROOM CODE
            </label>
            
            <div className="flex justify-between gap-1.5" onPaste={handlePaste}>
              {codeDigits.map((digit, idx) => (
                <input
                  key={idx}
                  id={`digit-${idx}`}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleDigitInput(idx, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(idx, e)}
                  className="w-10 h-13 bg-[#0a0c10] border border-[#202535] focus:border-slate-400 rounded-xl text-center text-lg font-mono font-bold text-slate-100 focus:outline-none transition"
                />
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2 flex items-center gap-1.5">
              <Smartphone className="w-3.5 h-3.5 text-slate-400" />
              Device Display Name
            </label>
            <input
              type="text"
              value={deviceName}
              onChange={(e) => setDeviceName(e.target.value)}
              placeholder="e.g. Arun's iPhone"
              maxLength={24}
              required
              className="w-full bg-[#0a0c10] border border-[#1e2333] rounded-xl px-4 py-3 text-xs text-slate-100 focus:outline-none focus:border-slate-400 transition"
            />
          </div>

          <button
            type="submit"
            disabled={fullCode.length !== 6}
            className={`w-full py-3.5 rounded-xl font-bold text-xs tracking-wider uppercase transition ${
              fullCode.length === 6
                ? 'bg-slate-100 hover:bg-white text-slate-950 cursor-pointer shadow-md'
                : 'bg-[#181c27] text-slate-600 cursor-not-allowed'
            }`}
          >
            JOIN ROOM NOW
          </button>
        </form>
      )}

    </div>
  );
};
