import { useEffect, useRef, useState, useCallback } from 'react';
import { Camera, CameraOff, SwitchCamera, AlertTriangle } from 'lucide-react';

// Resolusi capture yang dikirim ke ML Engine (lebih kecil = lebih cepat)
const CAPTURE_WIDTH = 320;
const CAPTURE_HEIGHT = 240;

const ScannerOverlay = ({
  isScanning = false,
  onFrame,
  facesDetected = 0,
  readyForNextFrame = true, // Sinyal dari parent: ML sudah selesai, boleh kirim frame baru
}) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const captureTimerRef = useRef(null);

  const [cameraReady, setCameraReady] = useState(false);
  const [error, setError] = useState(null);
  const [facingMode, setFacingMode] = useState('user'); // 'user' | 'environment'

  // ---------- camera start / stop ----------
  const stopCamera = useCallback(() => {
    if (captureTimerRef.current) {
      clearTimeout(captureTimerRef.current);
      captureTimerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraReady(false);
  }, []);

  const startCamera = useCallback(async () => {
    setError(null);
    setCameraReady(false);

    try {
      // Kamera tetap capture di resolusi tinggi untuk preview yang halus
      const constraints = {
        video: {
          facingMode,
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play();
          setCameraReady(true);
        };
      }
    } catch (err) {
      const messages = {
        NotAllowedError: 'Izin kamera ditolak. Silakan aktifkan izin kamera di pengaturan browser.',
        NotFoundError: 'Kamera tidak ditemukan pada perangkat ini.',
        NotReadableError: 'Kamera sedang digunakan oleh aplikasi lain.',
        OverconstrainedError: 'Kamera tidak mendukung konfigurasi yang diminta.',
      };
      setError(messages[err.name] || `Kamera tidak tersedia: ${err.message}`);
    }
  }, [facingMode]);

  // ---------- frame capture (resolusi kecil untuk ML) ----------
  const captureFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !cameraReady) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    // Capture di resolusi kecil (320x240) — bukan resolusi kamera asli
    canvas.width = CAPTURE_WIDTH;
    canvas.height = CAPTURE_HEIGHT;

    const ctx = canvas.getContext('2d');
    // drawImage akan otomatis scale dari resolusi kamera ke canvas kecil
    ctx.drawImage(video, 0, 0, CAPTURE_WIDTH, CAPTURE_HEIGHT);

    const base64 = canvas.toDataURL('image/jpeg', 0.6);
    onFrame?.(base64);
  }, [cameraReady, onFrame]);

  // ---------- lifecycle ----------
  useEffect(() => {
    if (isScanning) {
      startCamera();
    } else {
      stopCamera();
    }
    return stopCamera;
  }, [isScanning, startCamera, stopCamera]);

  // ---------- Pola "kirim → tunggu → kirim lagi" ----------
  // Capture frame hanya jika:
  //   1. Kamera siap
  //   2. Sedang scanning
  //   3. Parent bilang readyForNextFrame (ML sudah selesai proses frame sebelumnya)
  useEffect(() => {
    if (cameraReady && isScanning && readyForNextFrame) {
      // Tunggu sedikit (200ms) sebelum capture untuk memberi jeda minimal
      captureTimerRef.current = setTimeout(() => {
        captureFrame();
      }, 200);
    }

    return () => {
      if (captureTimerRef.current) {
        clearTimeout(captureTimerRef.current);
        captureTimerRef.current = null;
      }
    };
  }, [cameraReady, isScanning, readyForNextFrame, captureFrame]);

  // Cleanup on unmount
  useEffect(() => stopCamera, [stopCamera]);

  const toggleCamera = () => {
    stopCamera();
    setFacingMode((m) => (m === 'user' ? 'environment' : 'user'));
  };

  // Re-start camera when facingMode changes while scanning
  useEffect(() => {
    if (isScanning) startCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facingMode]);

  // ---------- render ----------
  return (
    <div className="relative w-full max-w-xl mx-auto aspect-[4/3] rounded-2xl overflow-hidden bg-[#111827] border border-white/10 shadow-2xl shadow-purple-500/10">
      {/* Gradient glow ring when scanning */}
      {isScanning && cameraReady && (
        <div className="absolute -inset-[2px] rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-60 blur-sm animate-pulse pointer-events-none z-0" />
      )}

      <div className="relative w-full h-full rounded-2xl overflow-hidden z-10 bg-[#0a0e1a]">
        {/* Video — tetap full resolution untuk preview halus */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover transition-opacity duration-500 ${
            cameraReady ? 'opacity-100' : 'opacity-0'
          }`}
          style={{ transform: 'scaleX(-1)' }}
        />

        {/* Hidden canvas untuk capture frame (resolusi kecil) */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Scan line animation */}
        {isScanning && cameraReady && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div
              className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_15px_rgba(16,185,129,0.6)]"
              style={{
                animation: 'scanLine 2.5s ease-in-out infinite',
              }}
            />
          </div>
        )}

        {/* Corner brackets overlay */}
        {isScanning && cameraReady && (
          <div className="absolute inset-0 pointer-events-none">
            {/* Top-left */}
            <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-emerald-400/70 rounded-tl-lg" />
            {/* Top-right */}
            <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-emerald-400/70 rounded-tr-lg" />
            {/* Bottom-left */}
            <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-emerald-400/70 rounded-bl-lg" />
            {/* Bottom-right */}
            <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-emerald-400/70 rounded-br-lg" />
          </div>
        )}

        {/* Face detected count badge */}
        {isScanning && cameraReady && (
          <div className="absolute top-3 left-3 z-20">
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold backdrop-blur-md border transition-all duration-300 ${
                facesDetected > 0
                  ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300'
                  : 'bg-white/10 border-white/10 text-gray-400'
              }`}
            >
              <div
                className={`w-2 h-2 rounded-full ${
                  facesDetected > 0
                    ? 'bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400/50'
                    : 'bg-gray-500'
                }`}
              />
              {facesDetected > 0
                ? `${facesDetected} wajah terdeteksi`
                : 'Memindai...'}
            </div>
          </div>
        )}

        {/* Camera toggle button */}
        {isScanning && cameraReady && (
          <button
            onClick={toggleCamera}
            className="absolute top-3 right-3 z-20 p-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/10 text-white hover:bg-white/20 transition-all duration-300 hover:scale-105"
            aria-label="Switch camera"
          >
            <SwitchCamera size={18} />
          </button>
        )}

        {/* Status overlay — idle */}
        {!isScanning && !error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0a0e1a]">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-600/20 to-purple-600/20 border border-white/10 flex items-center justify-center mb-4">
              <CameraOff size={32} className="text-gray-500" />
            </div>
            <p className="text-gray-400 text-sm font-medium">
              Kamera tidak aktif
            </p>
            <p className="text-gray-600 text-xs mt-1">
              Tekan tombol scan untuk memulai
            </p>
          </div>
        )}

        {/* Loading overlay */}
        {isScanning && !cameraReady && !error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0a0e1a]">
            <div className="relative w-16 h-16 mb-4">
              <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-indigo-500 animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Camera size={24} className="text-indigo-400" />
              </div>
            </div>
            <p className="text-gray-400 text-sm animate-pulse">
              Menghubungkan kamera...
            </p>
          </div>
        )}

        {/* Error overlay */}
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0a0e1a] px-6">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mb-4">
              <AlertTriangle size={28} className="text-rose-400" />
            </div>
            <p className="text-rose-300 text-sm font-semibold text-center">
              Kamera tidak tersedia
            </p>
            <p className="text-gray-500 text-xs text-center mt-2 max-w-xs leading-relaxed">
              {error}
            </p>
          </div>
        )}

        {/* Bottom gradient fade */}
        {isScanning && cameraReady && (
          <div className="absolute bottom-0 inset-x-0 h-16 bg-gradient-to-t from-[#0a0e1a]/70 to-transparent pointer-events-none" />
        )}
      </div>

      {/* Scan line keyframes — injected once */}
      <style>{`
        @keyframes scanLine {
          0%, 100% { top: 5%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          50% { top: 90%; }
        }
      `}</style>
    </div>
  );
};

export default ScannerOverlay;
