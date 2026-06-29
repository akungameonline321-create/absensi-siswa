// ============================================
// DashboardGuru.jsx — Guru Face Scanning Dashboard
// Real-time attendance via Socket.io + ML Engine
// ============================================

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Camera, CameraOff, Wifi, WifiOff, Users, UserCheck,
  Activity, Eye, ChevronDown, RefreshCw, Loader2, Settings,
  FileSpreadsheet, ShieldAlert, Stethoscope
} from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import useAuthStore from '../store/useAuthStore';
import { getClasses, getAttendanceToday, getStudents, deleteAttendance } from '../services/api';
import { getSocket, connectSocket } from '../services/socket';
import ScannerOverlay from '../components/ScannerOverlay';
import AttendanceCard from '../components/AttendanceCard';
import Navbar from '../components/Navbar';
import ManualAttendanceModal from '../components/ManualAttendanceModal';
import SetTimeModal from '../components/SetTimeModal';
import { ClipboardEdit, ClipboardList } from 'lucide-react';

const toastStyle = {
  style: { background: '#1f2937', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' },
};

export default function DashboardGuru() {
  const { user, token } = useAuthStore();

  // ── State ──
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [attendanceList, setAttendanceList] = useState([]);
  const [facesDetected, setFacesDetected] = useState(0);
  const [totalStudents, setTotalStudents] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [isTimeModalOpen, setIsTimeModalOpen] = useState(false);

  // ── Frame flow control: ML Engine selesai proses? ──
  const [readyForNextFrame, setReadyForNextFrame] = useState(true);

  // ── Liveness state ──
  const [liveness, setLiveness] = useState({
    student_id: null,
    nama: '',
    ear: null,
    blink_count: 0,
    liveness_passed: false,
    frame_count: 0,
  });

  const prevClassRef = useRef('');

  // ── Fetch classes on mount ──
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await getClasses();
        const data = res.data || [];
        setClasses(data);
        if (data.length > 0) {
          setSelectedClass(String(data[0].id));
        }
      } catch (err) {
        toast.error('Gagal memuat daftar kelas.', toastStyle);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // ── Fetch today's attendance + student count when class changes ──
  useEffect(() => {
    if (!selectedClass) return;

    const fetchAttendance = async () => {
      try {
        const [attRes, studRes] = await Promise.all([
          getAttendanceToday(selectedClass),
          getStudents(selectedClass),
        ]);
        setAttendanceList(attRes.data?.logs || []);
        setTotalStudents(studRes.data.total || 0);
      } catch {
        // Silently fail, data will populate via socket
      }
    };
    fetchAttendance();
  }, [selectedClass]);

  // ── Socket.io setup ──
  useEffect(() => {
    const socket = getSocket() || connectSocket(token);
    if (!socket) return;

    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);

    const handleAttendanceUpdate = (data) => {
      setAttendanceList((prev) => {
        const exists = prev.some((a) => a.student_id === data.student_id);
        if (exists) return prev;
        return [data, ...prev];
      });
      // Show different toast based on status
      if (data.status === 'terlambat') {
        toast.error(`⚠️ ${data.nama} — Terlambat!`, toastStyle);
      } else {
        toast.success(`✅ ${data.nama} — Hadir!`, toastStyle);
      }
    };

    const handleDuplicate = (data) => {
      toast(data.message, { icon: 'ℹ️', ...toastStyle });
    };

    const handleLiveness = (data) => {
      setLiveness(data);
    };

    const handleFrameProcessed = (data) => {
      setFacesDetected(data.faces_detected || 0);
      setReadyForNextFrame(true); // ML selesai proses → boleh kirim frame baru
    };

    const handleFrameError = (data) => {
      // Jika scanning dijeda oleh backend (terlalu banyak error), jangan langsung kirim lagi
      if (data.paused) {
        setReadyForNextFrame(false);
        // Auto-resume setelah 5 detik (sesuai backend ERROR_BACKOFF_MS)
        setTimeout(() => setReadyForNextFrame(true), 5000);
      } else {
        setReadyForNextFrame(true); // Error tapi boleh coba lagi
      }
      if (!data.retrying) {
        toast.error(data.message || 'Error memproses frame.', toastStyle);
      }
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('attendance:update', handleAttendanceUpdate);
    socket.on('attendance:duplicate', handleDuplicate);
    socket.on('liveness:progress', handleLiveness);
    socket.on('frame:processed', handleFrameProcessed);
    socket.on('frame:error', handleFrameError);

    if (socket.connected) setIsConnected(true);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('attendance:update', handleAttendanceUpdate);
      socket.off('attendance:duplicate', handleDuplicate);
      socket.off('liveness:progress', handleLiveness);
      socket.off('frame:processed', handleFrameProcessed);
      socket.off('frame:error', handleFrameError);
    };
  }, [token]);

  // ── Room management on class change ──
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !selectedClass) return;

    if (prevClassRef.current) {
      socket.emit('room:leave', { classId: prevClassRef.current });
    }

    socket.emit('room:join', {
      classId: selectedClass,
      teacherName: user?.nama || 'Guru',
    });

    prevClassRef.current = selectedClass;
  }, [selectedClass, user]);

  // ── Start / Stop scanning ──
  const handleToggleScan = useCallback(() => {
    const socket = getSocket();
    if (!socket || !selectedClass) {
      toast.error('Pilih kelas terlebih dahulu.', toastStyle);
      return;
    }

    if (isScanning) {
      // Stop scanning
      socket.emit('scan:stop');
      setIsScanning(false);
      setFacesDetected(0);
      setReadyForNextFrame(true);
      setLiveness({ student_id: null, nama: '', ear: null, blink_count: 0, liveness_passed: false, frame_count: 0 });
    } else {
      // Start scanning
      socket.emit('scan:start', { classId: selectedClass });
      setIsScanning(true);
    }
  }, [isScanning, selectedClass]);

  const handleDeleteAttendance = async (id, nama) => {
    if (!window.confirm(`Yakin ingin menghapus absensi ${nama}?`)) return;
    try {
      await deleteAttendance(id);
      setAttendanceList((prev) => prev.filter((a) => a._id !== id));
      toast.success(`Absensi ${nama} berhasil dihapus.`, toastStyle);
    } catch (error) {
      toast.error('Gagal menghapus absensi.', toastStyle);
    }
  };

  // ── Cleanup on unmount ──
  useEffect(() => {
    return () => {
      const socket = getSocket();
      if (socket) {
        socket.emit('scan:stop');
      }
    };
  }, []);

  // ── EAR percentage for display ──
  const earPercent = liveness.ear !== null ? Math.min(100, Math.max(0, (liveness.ear / 0.35) * 100)) : 0;
  
  const currentClassData = classes.find((c) => String(c.id) === selectedClass);

  // ── Hitung Rekap ──
  const totalHadir = attendanceList.filter(a => a.status === 'hadir' || a.status === 'terlambat').length;
  const totalIzin = attendanceList.filter(a => a.status === 'izin').length;
  const totalSakit = attendanceList.filter(a => a.status === 'sakit').length;
  const totalAlfa = Math.max(0, totalStudents - attendanceList.length);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0e1a] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0e1a] font-['Inter',sans-serif]">
      <Navbar title="Dashboard Pemindaian Wajah" />
      <main className="p-4 md:p-6">
      {/* ── Top Control Bar ── */}
      <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center gap-4 flex-wrap">
        {/* Class Selector */}
        <div className="relative flex-1 w-full sm:max-w-xs flex items-center gap-2">
          <div className="relative flex-1">
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              disabled={isScanning}
              className="w-full appearance-none px-4 py-3 pr-10 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all duration-300 disabled:opacity-50"
            >
              <option value="" className="bg-gray-900">— Pilih Kelas —</option>
              {classes.map((c) => (
                <option key={c.id} value={String(c.id)} className="bg-gray-900">
                  {c.nama_kelas}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
          </div>
          
          {/* Settings Button */}
          <button
            onClick={() => setIsTimeModalOpen(true)}
            disabled={!selectedClass || isScanning}
            className="p-3 bg-white/5 border border-white/10 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed group relative"
            aria-label="Atur Batas Waktu"
          >
            <Settings className="w-5 h-5 transition-transform group-hover:rotate-90" />
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2 py-1 bg-gray-900 text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10 border border-white/10 shadow-xl">
              Batas: {currentClassData?.batas_waktu_hadir || '07:00'}
            </div>
          </button>
        </div>

        {/* Start/Stop Button */}
        <button
          onClick={handleToggleScan}
          disabled={!selectedClass}
          className={`px-6 py-3 rounded-xl font-semibold flex items-center gap-2 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed ${
            isScanning
              ? 'bg-rose-500/20 border border-rose-500/30 text-rose-400 hover:bg-rose-500/30'
              : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40'
          } ${isScanning ? 'animate-pulse' : ''}`}
        >
          {isScanning ? (
            <>
              <CameraOff className="w-5 h-5" />
              Hentikan Scan
            </>
          ) : (
            <>
              <Camera className="w-5 h-5" />
              Mulai Scan
            </>
          )}
        </button>

        {/* Manual Attendance Button */}
        <button
          onClick={() => setIsManualModalOpen(true)}
          disabled={!selectedClass}
          className="px-6 py-3 rounded-xl font-semibold flex items-center gap-2 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed bg-white/10 text-white hover:bg-white/20 border border-white/10 shadow-lg"
        >
          <ClipboardEdit className="w-5 h-5" />
          Absen Manual
        </button>

        {/* Laporan Absensi Button */}
        <Link
          to="/guru/laporan"
          className="px-6 py-3 rounded-xl font-semibold flex items-center gap-2 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 border border-indigo-500/20 shadow-lg"
        >
          <ClipboardList className="w-5 h-5" />
          Laporan Absensi
        </Link>

        {/* Status Indicator */}
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 ml-auto">
          {isConnected ? (
            <>
              <Wifi className="w-4 h-4 text-emerald-400" />
              <span className="text-emerald-400 text-sm font-medium">Terhubung</span>
            </>
          ) : (
            <>
              <WifiOff className="w-4 h-4 text-rose-400" />
              <span className="text-rose-400 text-sm font-medium">Terputus</span>
            </>
          )}
        </div>
      </div>

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <StatCard icon={<Users className="w-5 h-5" />} label="Total Siswa" value={totalStudents} color="blue" />
        <StatCard icon={<UserCheck className="w-5 h-5" />} label="Hadir/Telat" value={totalHadir} color="emerald" />
        <StatCard icon={<FileSpreadsheet className="w-5 h-5" />} label="Izin" value={totalIzin} color="sky" />
        <StatCard icon={<Stethoscope className="w-5 h-5" />} label="Sakit" value={totalSakit} color="violet" />
        <StatCard icon={<ShieldAlert className="w-5 h-5" />} label="Alpa" value={totalAlfa} color="rose" />
        <StatCard icon={<Eye className="w-5 h-5" />} label="Terdeteksi" value={facesDetected} color="purple" />
      </div>

      {/* ── Main Content Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Camera Feed */}
        <div className="lg:col-span-2">
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-xl shadow-purple-500/10 overflow-hidden">
            <ScannerOverlay
              isScanning={isScanning}
              facesDetected={facesDetected}
              readyForNextFrame={readyForNextFrame}
              onFrame={(frame) => {
                const socket = getSocket();
                if (socket && isScanning) {
                  setReadyForNextFrame(false); // Jangan kirim frame baru sampai ML selesai
                  socket.emit('frame:send', {
                    frame,
                    classId: selectedClass,
                    guruId: user?.id,
                    guruNama: user?.nama,
                  });
                }
              }}
            />
          </div>

          {/* ── Liveness Status Bar ── */}
          {liveness.student_id && (
            <div className="mt-4 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4 transition-all duration-500 animate-fadeIn">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-indigo-400" />
                  <span className="text-white font-medium text-sm">{liveness.nama}</span>
                </div>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  liveness.liveness_passed
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-amber-500/20 text-amber-400'
                }`}>
                  {liveness.liveness_passed ? 'Liveness Terverifikasi ✓' : 'Menunggu kedipan mata...'}
                </span>
              </div>

              {/* EAR Progress Bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-gray-400">
                  <span>EAR Value: {liveness.ear !== null ? liveness.ear.toFixed(3) : '—'}</span>
                  <span>Blinks: {liveness.blink_count}</span>
                </div>
                <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      liveness.liveness_passed
                        ? 'bg-gradient-to-r from-emerald-500 to-emerald-400'
                        : 'bg-gradient-to-r from-indigo-500 to-purple-500'
                    }`}
                    style={{ width: `${earPercent}%` }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Attendance Panel ── */}
        <div className="lg:col-span-1">
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-xl shadow-purple-500/10 h-full flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-white font-semibold">Kehadiran Hari Ini</h2>
                <span className="text-xs font-bold bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-full">
                  {attendanceList.length}
                </span>
              </div>
              <button
                onClick={async () => {
                  if (!selectedClass) return;
                  try {
                    const res = await getAttendanceToday(selectedClass);
                    setAttendanceList(res.data?.logs || []);
                  } catch {
                    // silent
                  }
                }}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[600px] scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
              {attendanceList.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-gray-500">
                  <Users className="w-12 h-12 mb-3 opacity-30" />
                  <p className="text-sm font-medium">Belum ada siswa yang dipindai</p>
                  <p className="text-xs mt-1 text-gray-600">Mulai scan untuk mencatat kehadiran</p>
                </div>
              ) : (
                attendanceList.map((att, idx) => (
                  <AttendanceCard 
                    key={att._id || att.student_id || idx} 
                    data={att} 
                    {...att}
                    onDelete={handleDeleteAttendance}
                    index={idx} 
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </div>
      </main>

      <ManualAttendanceModal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        onSuccess={async () => {
          if (!selectedClass) return;
          try {
            const res = await getAttendanceToday(selectedClass);
            setAttendanceList(res.data?.logs || []);
          } catch (e) {
            // silent
          }
        }}
        classId={selectedClass}
        classData={currentClassData}
        attendanceList={attendanceList}
      />

      <SetTimeModal
        isOpen={isTimeModalOpen}
        onClose={() => setIsTimeModalOpen(false)}
        classId={selectedClass}
        classData={currentClassData}
        onSuccess={(newTime) => {
          // Update local state classes array
          setClasses(prev => prev.map(c => 
            String(c.id) === selectedClass ? { ...c, batas_waktu_hadir: newTime } : c
          ));
        }}
      />
    </div>
  );
}

// ── Stat Card Component ──
function StatCard({ icon, label, value, color }) {
  const colorMap = {
    emerald: 'from-emerald-500/20 to-emerald-500/5 text-emerald-400 border-emerald-500/20',
    blue: 'from-blue-500/20 to-blue-500/5 text-blue-400 border-blue-500/20',
    purple: 'from-purple-500/20 to-purple-500/5 text-purple-400 border-purple-500/20',
    amber: 'from-amber-500/20 to-amber-500/5 text-amber-400 border-amber-500/20',
    sky: 'from-sky-500/20 to-sky-500/5 text-sky-400 border-sky-500/20',
    violet: 'from-violet-500/20 to-violet-500/5 text-violet-400 border-violet-500/20',
    rose: 'from-rose-500/20 to-rose-500/5 text-rose-400 border-rose-500/20',
  };

  return (
    <div className={`bg-gradient-to-br ${colorMap[color] || colorMap.blue} border rounded-2xl p-4 transition-all duration-300 hover:scale-[1.02]`}>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-xs font-medium opacity-80">{label}</span>
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
    </div>
  );
}
