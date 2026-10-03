import React, { useEffect, useRef } from 'react';
import { Play, Pause, Square, SkipBack, SkipForward, Volume2, VolumeX, Disc } from 'lucide-react';
import { Room, TrackInfo } from '../types/room';
import { SongSearchEngine } from './SongSearchEngine';

interface MusicPlayerProps {
  room: Room;
  isPlaying: boolean;
  currentPosition: number;
  isHost: boolean;
  canControl: boolean;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onSeek: (position: number) => void;
  onTrackSelect: (track: TrackInfo) => void;
  onFileUpload: (file: File) => void;
  onVolumeChange: (volume: number, muted: boolean) => void;
  analyser: AnalyserNode | null;
  volume: number;
  muted: boolean;
}

export const MusicPlayer: React.FC<MusicPlayerProps> = ({
  room,
  isPlaying,
  currentPosition,
  isHost,
  canControl,
  onPlay,
  onPause,
  onStop,
  onSeek,
  onTrackSelect,
  onFileUpload,
  onVolumeChange,
  analyser,
  volume,
  muted
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const currentTrack = room.currentTrack || {
    id: 'demo_synthwave',
    title: 'Cyberpunk Synthwave Pulse',
    artist: 'VibeTogether Studio',
    album: 'Synchronized Waves',
    duration: 16.0,
    url: 'demo_synthwave',
    isLocalUpload: false
  };

  const duration = currentTrack.duration || 180;

  const formatTime = (secs: number) => {
    const s = Math.max(0, Math.floor(secs));
    const m = Math.floor(s / 60);
    const remainder = s % 60;
    return `${m.toString().padStart(2, '0')}:${remainder.toString().padStart(2, '0')}`;
  };

  // Canvas Spectrum Visualizer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    const bufferLength = analyser ? analyser.frequencyBinCount : 48;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animId = requestAnimationFrame(draw);
      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      if (analyser && isPlaying) {
        analyser.getByteFrequencyData(dataArray);
      } else {
        for (let i = 0; i < bufferLength; i++) {
          dataArray[i] = Math.sin(Date.now() * 0.002 + i * 0.3) * 8 + 12;
        }
      }

      const barWidth = (width / bufferLength) * 1.6;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * height;

        ctx.fillStyle = '#f8fafc';
        ctx.globalAlpha = 0.8;
        ctx.fillRect(x, height - barHeight, barWidth - 2, barHeight);

        x += barWidth;
      }
      ctx.globalAlpha = 1.0;
    };

    draw();

    return () => cancelAnimationFrame(animId);
  }, [analyser, isPlaying]);

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPos = parseFloat(e.target.value);
    onSeek(newPos);
  };

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      
      {/* Main Deck Container */}
      <div className="bg-[#11141c] border border-[#1f2433] rounded-2xl p-6 shadow-xl text-center">
        
        {/* Disc Artwork with App Logo */}
        <div className="relative w-44 h-44 mx-auto mb-6">
          <div className="w-full h-full rounded-full bg-[#0a0c10] border border-[#222736] p-3 flex items-center justify-center relative">
            <div className={`w-full h-full rounded-full border border-[#1a1f2d] flex items-center justify-center ${isPlaying ? 'animate-spin-slow' : ''}`}>
              <div className="w-16 h-16 rounded-full bg-[#161a25] border border-[#2b3347] flex flex-col items-center justify-center overflow-hidden p-0.5 shadow-md">
                <img src="/logo.png" alt="VibeTogether Logo" className="w-full h-full rounded-full object-cover" />
              </div>
            </div>
          </div>
        </div>

        {/* Track Title */}
        <div className="mb-4">
          <h2 className="text-xl font-bold text-slate-100 truncate">
            {currentTrack.title}
          </h2>
          <p className="text-xs font-medium text-slate-400 mt-0.5">
            {currentTrack.artist} • {currentTrack.album}
          </p>
        </div>

        {/* Spectrum Canvas */}
        <div className="w-full h-12 bg-[#090b0e] rounded-xl border border-[#1c212d] p-1 mb-5 overflow-hidden">
          <canvas ref={canvasRef} width={400} height={40} className="w-full h-full opacity-90" />
        </div>

        {/* Seek Slider */}
        <div className="space-y-1.5 mb-6">
          <input
            type="range"
            min={0}
            max={duration}
            step={0.1}
            value={currentPosition}
            disabled={!canControl}
            onChange={handleSeekChange}
            className="w-full h-1.5 bg-[#1a1f2c] rounded-full appearance-none cursor-pointer disabled:opacity-40"
          />
          <div className="flex justify-between text-[11px] font-mono text-slate-500">
            <span>{formatTime(currentPosition)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Playback Controls */}
        <div className="flex items-center justify-center gap-4 mb-6">
          <button
            onClick={() => onSeek(Math.max(0, currentPosition - 10))}
            disabled={!canControl}
            className="p-2.5 rounded-xl bg-[#161a25] hover:bg-[#1e2333] border border-[#222736] text-slate-300 transition active:scale-95 disabled:opacity-30"
          >
            <SkipBack className="w-4 h-4" />
          </button>

          {isPlaying ? (
            <button
              onClick={onPause}
              disabled={!canControl}
              className="p-4 rounded-full bg-slate-100 hover:bg-white text-slate-950 transition active:scale-95 disabled:opacity-40 shadow-md"
            >
              <Pause className="w-6 h-6 fill-current" />
            </button>
          ) : (
            <button
              onClick={onPlay}
              disabled={!canControl}
              className="p-4 rounded-full bg-slate-100 hover:bg-white text-slate-950 transition active:scale-95 disabled:opacity-40 shadow-md"
            >
              <Play className="w-6 h-6 fill-current ml-0.5" />
            </button>
          )}

          <button
            onClick={onStop}
            disabled={!canControl}
            className="p-2.5 rounded-xl bg-[#161a25] hover:bg-[#1e2333] border border-[#222736] text-slate-300 transition active:scale-95 disabled:opacity-30"
          >
            <Square className="w-4 h-4 fill-current" />
          </button>

          <button
            onClick={() => onSeek(Math.min(duration, currentPosition + 10))}
            disabled={!canControl}
            className="p-2.5 rounded-xl bg-[#161a25] hover:bg-[#1e2333] border border-[#222736] text-slate-300 transition active:scale-95 disabled:opacity-30"
          >
            <SkipForward className="w-4 h-4" />
          </button>
        </div>

        {/* Local Volume Bar */}
        <div className="flex items-center gap-3 bg-[#0a0c10] p-3 rounded-xl border border-[#1a1f2c]">
          <button
            onClick={() => onVolumeChange(volume, !muted)}
            className="text-slate-400 hover:text-slate-200"
          >
            {muted || volume === 0 ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-slate-300" />}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={muted ? 0 : volume}
            onChange={(e) => onVolumeChange(parseFloat(e.target.value), false)}
            className="w-full h-1.5 bg-[#1c212d] rounded-full appearance-none cursor-pointer"
          />
          <span className="text-[11px] font-mono text-slate-400 w-8 text-right">
            {muted ? '0%' : `${Math.round(volume * 100)}%`}
          </span>
        </div>

      </div>

      {/* Integrated Song Search Engine, Offline File Upload & Web Sources */}
      <SongSearchEngine
        onSelectTrack={onTrackSelect}
        onFileUpload={onFileUpload}
        canControl={canControl}
      />

    </div>
  );
};
