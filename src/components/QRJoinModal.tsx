import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { QrCode, Copy, Check, X } from 'lucide-react';

interface QRJoinModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomCode: string;
}

export const QRJoinModal: React.FC<QRJoinModalProps> = ({ isOpen, onClose, roomCode }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [copied, setCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      fetch('/api/network-info')
        .then(res => res.json())
        .then(data => {
          const host = (data.localIp && data.localIp !== 'localhost') 
            ? `${data.localIp}:${data.port || 3001}` 
            : window.location.host;
          setShareUrl(`${window.location.protocol}//${host}/join/${roomCode}`);
        })
        .catch(() => {
          setShareUrl(`${window.location.origin}/join/${roomCode}`);
        });
    }
  }, [isOpen, roomCode]);

  useEffect(() => {
    if (isOpen && canvasRef.current && shareUrl) {
      QRCode.toCanvas(canvasRef.current, shareUrl, {
        width: 220,
        margin: 2,
        color: {
          dark: '#f8fafc',
          light: '#0a0c10'
        }
      }, (err) => {
        if (err) console.error('QR code render error:', err);
      });
    }
  }, [isOpen, shareUrl]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#090b0e]/80 backdrop-blur-md animate-fadeIn">
      <div className="max-w-sm w-full bg-[#11141c] border border-[#1f2433] rounded-2xl p-6 shadow-2xl text-center relative space-y-4">
        
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-slate-200 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#161a25] text-slate-300 text-xs font-semibold border border-[#222736]">
            <QrCode className="w-3.5 h-3.5 text-[#d4af37]" /> SCAN TO JOIN ROOM
          </div>
          <h3 className="text-xl font-extrabold text-slate-100">Room Code</h3>
          <div className="font-mono text-3xl font-extrabold text-[#d4af37] tracking-widest py-1">
            {roomCode}
          </div>
        </div>

        {/* QR Code Canvas */}
        <div className="p-3 bg-[#0a0c10] rounded-xl border border-[#1c212d] inline-block mx-auto">
          <canvas ref={canvasRef} />
        </div>

        <p className="text-xs text-slate-400">
          Scan with your phone camera on the same Wi-Fi network to join instantly.
        </p>

        {/* Copy Share Link */}
        <div className="space-y-2">
          <button
            onClick={handleCopyLink}
            className="w-full py-3 px-4 rounded-xl bg-slate-100 hover:bg-white text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition active:scale-98 shadow-md"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-700" />}
            {copied ? 'LINK COPIED TO CLIPBOARD!' : 'COPY MOBILE SHARE LINK'}
          </button>
        </div>

      </div>
    </div>
  );
};
