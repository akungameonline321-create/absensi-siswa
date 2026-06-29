import { useState, useEffect, useRef } from 'react';
import { UserCircle, Calendar, FileText, CheckCircle, Clock, AlertCircle, XCircle, Send, Camera, UploadCloud } from 'lucide-react';
import toast from 'react-hot-toast';
import useAuthStore from '../store/useAuthStore';
import { getStudent, getAttendanceByStudent, createManualAttendance, requestFaceUpdate } from '../services/api';
import Navbar from '../components/Navbar';
import AttendanceCard from '../components/AttendanceCard';

export default function DashboardSiswa() {
  const { user } = useAuthStore();
  const [profile, setProfile] = useState(null);
  const [attendanceList, setAttendanceList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form izin
  const [status, setStatus] = useState('izin');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form Update Wajah
  const [photoFile, setPhotoFile] = useState(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const fileInputRef = useRef(null);

  const handlePhotoUpload = async (e) => {
    e.preventDefault();
    if (!photoFile) return toast.error("Pilih foto terlebih dahulu");

    setIsUploadingPhoto(true);
    try {
      await requestFaceUpdate(photoFile);
      toast.success("Permintaan pembaruan wajah berhasil dikirim. Menunggu persetujuan admin.");
      setPhotoFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      toast.error(err.response?.data?.message || "Gagal mengirim foto");
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.student_id) {
        toast.error('Gagal memuat profil. Anda tidak tertaut dengan data siswa.');
        setLoading(false);
        return;
      }

      try {
        const [profRes, attRes] = await Promise.all([
          getStudent(user.student_id),
          getAttendanceByStudent(user.student_id)
        ]);
        setProfile(profRes.data?.data || profRes.data);
        setAttendanceList(attRes.data?.logs || []);
      } catch (error) {
        toast.error('Gagal memuat data dari server.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  const handleSubmitIzin = async (e) => {
    e.preventDefault();
    if (!profile) return;

    if (!window.confirm(`Anda yakin ingin mengajukan status ${status.toUpperCase()} untuk hari ini?`)) {
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        student_id: profile.id,
        nis: profile.nis,
        nama_siswa: profile.nama,
        kelas_id: profile.kelas_id,
        nama_kelas: profile.nama_kelas,
        status,
      };

      const res = await createManualAttendance(payload);
      toast.success(`Pengajuan ${status} berhasil dicatat.`);
      
      // Update local list
      if (res.data?.data) {
        setAttendanceList(prev => [res.data.data, ...prev]);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Gagal mengajukan izin.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0e1a] flex flex-col items-center justify-center text-white">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-gray-400">Memuat data profil...</p>
      </div>
    );
  }

  // Menghitung statistik absensi
  const stats = attendanceList.reduce((acc, curr) => {
    acc[curr.status] = (acc[curr.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-[#0a0e1a] font-['Inter',sans-serif]">
      <Navbar title="Dashboard Siswa" />
      
      <main className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
        
        {/* Welcome & Profile Header */}
        <div className="bg-gradient-to-br from-indigo-900/40 to-purple-900/40 border border-white/10 rounded-2xl p-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-3xl rounded-full" />
          <div className="relative z-10 flex flex-col sm:flex-row items-center gap-6">
            <div className="w-24 h-24 rounded-full bg-white/10 border-2 border-indigo-400 flex items-center justify-center shrink-0">
              <UserCircle className="w-16 h-16 text-indigo-300" />
            </div>
            <div className="text-center sm:text-left">
              <h1 className="text-2xl font-bold text-white mb-1">{profile?.nama || user?.nama}</h1>
              <p className="text-gray-300 mb-2">NIS: {profile?.nis || '-'} | Kelas: {profile?.nama_kelas || '-'}</p>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-sm font-medium border border-emerald-500/20">
                <CheckCircle size={14} /> Status Aktif
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Hadir" value={stats.hadir || 0} icon={<CheckCircle />} color="emerald" />
          <StatCard label="Izin" value={stats.izin || 0} icon={<FileText />} color="sky" />
          <StatCard label="Sakit" value={stats.sakit || 0} icon={<AlertCircle />} color="purple" />
          <StatCard label="Alpa" value={stats.alpa || 0} icon={<XCircle />} color="rose" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Riwayat Absensi */}
          <div className="lg:col-span-2 bg-white/5 border border-white/10 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-6">
              <Calendar className="text-indigo-400" />
              <h2 className="text-lg font-semibold text-white">Riwayat Kehadiran</h2>
            </div>
            
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
              {attendanceList.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>Belum ada riwayat kehadiran.</p>
                </div>
              ) : (
                attendanceList.map((att, idx) => (
                  <AttendanceCard 
                    key={att._id || idx} 
                    nama={att.nama_siswa}
                    nis={att.nis}
                    namaKelas={att.nama_kelas}
                    scannedAt={att.scanned_at}
                    confidence={att.confidence}
                    status={att.status}
                    _id={att._id}
                    snapshotPath={att.snapshot_path}
                    processingTimeMs={att.processing_time_ms}
                    attributes={att.attributes}
                  />
                ))
              )}
            </div>
          </div>

          {/* Form Pengajuan Izin */}
          <div className="lg:col-span-1 bg-white/5 border border-white/10 rounded-2xl p-6 h-fit sticky top-6">
            <h2 className="text-lg font-semibold text-white mb-6">Pengajuan Izin Hari Ini</h2>
            
            <form onSubmit={handleSubmitIzin} className="space-y-5">
              <div className="grid grid-cols-2 gap-3">
                <label className={`
                  flex flex-col items-center justify-center p-4 rounded-xl border cursor-pointer transition-all
                  ${status === 'izin' ? 'border-sky-500/50 bg-sky-500/10 text-sky-400' : 'border-white/10 bg-[#0a0e1a] text-gray-400 hover:border-white/20'}
                `}>
                  <input type="radio" name="status" value="izin" className="hidden" checked={status === 'izin'} onChange={() => setStatus('izin')} />
                  <FileText className="mb-2" size={24} />
                  <span className="font-medium">Izin</span>
                </label>
                
                <label className={`
                  flex flex-col items-center justify-center p-4 rounded-xl border cursor-pointer transition-all
                  ${status === 'sakit' ? 'border-purple-500/50 bg-purple-500/10 text-purple-400' : 'border-white/10 bg-[#0a0e1a] text-gray-400 hover:border-white/20'}
                `}>
                  <input type="radio" name="status" value="sakit" className="hidden" checked={status === 'sakit'} onChange={() => setStatus('sakit')} />
                  <AlertCircle className="mb-2" size={24} />
                  <span className="font-medium">Sakit</span>
                </label>
              </div>
              
              <button
                type="submit"
                disabled={isSubmitting || !profile}
                className="w-full py-3 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-500 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                   <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Send size={18} /> Ajukan
                  </>
                )}
              </button>
              
              <p className="text-xs text-gray-500 text-center mt-4">
                Pengajuan hanya berlaku untuk hari ini.
              </p>
            </form>
          </div>
          
          {/* Form Pembaruan Wajah */}
          <div className="lg:col-span-1 bg-gradient-to-br from-indigo-500/10 to-purple-500/5 border border-indigo-500/20 rounded-2xl p-6 h-fit mt-6 lg:mt-0">
            <h2 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
              <Camera className="text-indigo-400" size={20} />
              Perbarui Data Wajah
            </h2>
            <p className="text-xs text-gray-400 mb-6">
              AI tidak mengenali wajahmu dengan baik? Unggah foto selfie terbarumu di sini.
            </p>
            
            <form onSubmit={handlePhotoUpload} className="space-y-4">
              <div className="relative group">
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-indigo-500/30 rounded-xl cursor-pointer bg-black/20 hover:bg-indigo-500/10 transition-colors">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <UploadCloud className="w-8 h-8 text-indigo-400 mb-2 group-hover:scale-110 transition-transform" />
                    <p className="text-sm text-gray-300">
                      {photoFile ? photoFile.name : "Pilih foto wajah (Max 10MB)"}
                    </p>
                  </div>
                  <input 
                    ref={fileInputRef}
                    type="file" 
                    className="hidden" 
                    accept="image/jpeg, image/png, image/webp"
                    onChange={(e) => setPhotoFile(e.target.files[0])}
                  />
                </label>
              </div>

              <button
                type="submit"
                disabled={isUploadingPhoto || !photoFile}
                className="w-full py-2.5 rounded-xl bg-indigo-600/80 text-white text-sm font-medium hover:bg-indigo-500 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUploadingPhoto ? (
                   <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  "Kirim Pengajuan"
                )}
              </button>
            </form>
          </div>

        </div>
      </main>
    </div>
  );
}

function StatCard({ label, value, icon, color }) {
  const colors = {
    emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    sky: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
    purple: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
    rose: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
  };

  return (
    <div className={`p-4 rounded-2xl border ${colors[color]} flex flex-col items-center justify-center text-center`}>
      <div className="mb-2 opacity-80">{icon}</div>
      <div className="text-2xl font-bold mb-1">{value}</div>
      <div className="text-xs font-medium uppercase tracking-wider opacity-80">{label}</div>
    </div>
  );
}
