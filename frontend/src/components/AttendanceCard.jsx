import { CheckCircle, Clock, Trash2, Camera, Zap } from 'lucide-react';

const statusConfig = {
  hadir: {
    label: 'Hadir',
    icon: CheckCircle,
    badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25',
    border: 'border-l-emerald-500',
    glow: 'shadow-emerald-500/5',
  },
  terlambat: {
    label: 'Terlambat',
    icon: Clock,
    badge: 'bg-amber-500/15 text-amber-300 border-amber-500/25',
    border: 'border-l-amber-500',
    glow: 'shadow-amber-500/5',
  },
  izin: {
    label: 'Izin',
    icon: Clock,
    badge: 'bg-sky-500/15 text-sky-300 border-sky-500/25',
    border: 'border-l-sky-500',
    glow: 'shadow-sky-500/5',
  },
  sakit: {
    label: 'Sakit',
    icon: Clock,
    badge: 'bg-purple-500/15 text-purple-300 border-purple-500/25',
    border: 'border-l-purple-500',
    glow: 'shadow-purple-500/5',
  },
  alpa: {
    label: 'Alpa',
    icon: Clock,
    badge: 'bg-rose-500/15 text-rose-300 border-rose-500/25',
    border: 'border-l-rose-500',
    glow: 'shadow-rose-500/5',
  },
};

const confidenceColor = (value) => {
  if (value >= 90) return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25';
  if (value >= 75) return 'bg-sky-500/15 text-sky-300 border-sky-500/25';
  if (value >= 60) return 'bg-amber-500/15 text-amber-300 border-amber-500/25';
  return 'bg-rose-500/15 text-rose-300 border-rose-500/25';
};

const formatTime = (iso) => {
  if (!iso) return '--:--';
  const d = new Date(iso);
  return d.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
};

const formatDate = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const AttendanceCard = ({
  nama = 'Nama Siswa',
  nis = '-',
  namaKelas = '-',
  confidence = 0,
  status = 'hadir',
  scannedAt,
  snapshotPath = null,
  processingTimeMs = 0,
  attributes = null,
  isNew = false,
  _id,
  onDelete,
}) => {
  const cfg = statusConfig[status] || statusConfig.hadir;
  const StatusIcon = cfg.icon;
  const confPercent = Math.round(confidence * 100) / 100;

  const initials = nama
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  return (
    <div
      className={`
        group relative
        bg-[#111827]/80 backdrop-blur-xl
        border border-white/10 border-l-4 ${cfg.border}
        rounded-2xl overflow-hidden
        shadow-xl ${cfg.glow}
        transition-all duration-500
        hover:shadow-2xl hover:scale-[1.02] hover:border-white/15
        ${isNew ? 'animate-slide-up' : ''}
      `}
    >
      {/* Subtle top highlight */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      <div className="flex items-center gap-4 p-4">
        {/* Avatar */}
        <div className="flex-shrink-0">
          {snapshotPath ? (
            <img 
              src={`http://localhost:5000${snapshotPath}`} 
              alt={`Foto ${nama}`}
              className="w-12 h-12 rounded-xl object-cover shadow-lg shadow-purple-500/20 transition-transform duration-300 group-hover:scale-110 border border-white/10"
              onError={(e) => {
                e.target.onerror = null;
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
          ) : null}
          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-base font-bold shadow-lg shadow-purple-500/20 transition-transform duration-300 group-hover:scale-110 ${snapshotPath ? 'hidden' : ''}`}>
            {initials}
          </div>
        </div>

        {/* Student info */}
        <div className="flex-1 min-w-0">
          <h3 className="text-white font-semibold text-sm truncate leading-tight">
            {nama}
          </h3>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-gray-500 text-xs font-mono">{nis}</span>
            <span className="text-gray-700 text-xs">•</span>
            <span className="text-gray-400 text-xs">{namaKelas}</span>
          </div>
        </div>

        {/* Right side — badges + time */}
        <div className="flex-shrink-0 flex flex-col items-end gap-2">
          {/* Status badge */}
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold rounded-lg border ${cfg.badge}`}
          >
            <StatusIcon size={12} />
            {cfg.label}
          </span>

          {/* Confidence badge */}
          <span
            className={`inline-flex items-center px-2 py-0.5 text-[11px] font-mono font-semibold rounded-lg border ${confidenceColor(confPercent)}`}
          >
            {confPercent.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Footer — timestamp & metrics */}
      <div className="px-4 py-2.5 border-t border-white/5 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-gray-600 text-[11px]">{formatDate(scannedAt)}</span>
            {onDelete && _id && (
              <button
                onClick={() => onDelete(_id, nama)}
                className="text-gray-500 hover:text-rose-400 transition-colors"
                title="Hapus absensi (kecurangan)"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
          <span className="text-gray-400 text-xs font-mono font-medium tracking-wide">
            {formatTime(scannedAt)}
          </span>
        </div>
        
        {/* Fitur Lanjutan: Snapshot & Metrics */}
        {(processingTimeMs > 0 || snapshotPath || (attributes && (attributes.has_mask || attributes.has_glasses))) && (
          <div className="flex items-center justify-between pt-2 border-t border-white/5 text-[10px] text-gray-500">
            <div className="flex items-center gap-3">
              {processingTimeMs > 0 && (
                <span className="flex items-center gap-1" title="Kecepatan Scan AI">
                  <Zap size={10} className="text-amber-400" />
                  {(processingTimeMs / 1000).toFixed(2)}s
                </span>
              )}
              {attributes?.has_glasses && (
                <span className="flex items-center gap-1 text-sky-400" title="Memakai Kacamata">
                  Kacamata
                </span>
              )}
              {attributes?.has_mask && (
                <span className="flex items-center gap-1 text-emerald-400" title="Memakai Masker">
                  Masker
                </span>
              )}
            </div>
            
            {snapshotPath && (
              <div className="relative group/snap cursor-pointer flex items-center gap-1 text-indigo-400 hover:text-indigo-300 transition-colors">
                <Camera size={12} />
                <span>Foto Wajah</span>
                
                {/* Popup Snapshot */}
                <div className="absolute bottom-full right-0 mb-2 w-32 p-1 bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl shadow-2xl opacity-0 invisible group-hover/snap:opacity-100 group-hover/snap:visible transition-all z-50 origin-bottom-right transform scale-95 group-hover/snap:scale-100">
                  <img 
                    src={`http://localhost:5000${snapshotPath}`} 
                    alt="Snapshot Scan" 
                    className="w-full h-auto rounded-lg object-cover"
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Slide-up keyframes */}
      <style>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.97);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        .animate-slide-up {
          animation: slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  );
};

export default AttendanceCard;
