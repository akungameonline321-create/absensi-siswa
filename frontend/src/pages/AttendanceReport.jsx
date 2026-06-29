// ============================================
// AttendanceReport.jsx — Laporan Absensi Harian
// Menampilkan rekap kehadiran siswa per hari
// ============================================

import { useState, useEffect } from 'react';
import {
  CalendarDays, Users, UserCheck, UserX, Clock, AlertTriangle,
  Loader2, Search, FileSpreadsheet, Download, ChevronLeft, ChevronRight,
  Stethoscope, ShieldAlert, ListTodo
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getAttendanceReport, getClasses, exportAttendanceReport, getRekapSemester, exportRekapSemester } from '../services/api';

export default function AttendanceReport() {
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState([]);
  const [selectedKelas, setSelectedKelas] = useState('');
  
  // Tab State
  const [activeTab, setActiveTab] = useState('harian'); // 'harian' | 'semester'
  
  // Harian State
  const [tanggal, setTanggal] = useState(new Date().toISOString().split('T')[0]);
  const [report, setReport] = useState(null);
  
  // Semester State
  const [semesterReport, setSemesterReport] = useState(null);

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  useEffect(() => {
    async function fetchClasses() {
      try {
        const res = await getClasses();
        setClasses(res.data || []);
      } catch { /* silent */ }
    }
    fetchClasses();
  }, []);

  useEffect(() => {
    if (activeTab === 'harian') {
      fetchReport();
    } else {
      fetchSemester();
    }
  }, [tanggal, selectedKelas, activeTab]);

  async function fetchReport() {
    setLoading(true);
    try {
      const res = await getAttendanceReport(tanggal, selectedKelas || null);
      setReport(res.data);
    } catch (err) {
      toast.error('Gagal memuat laporan harian');
    }
    setLoading(false);
  }

  async function fetchSemester() {
    if (!selectedKelas) {
      setSemesterReport(null);
      return;
    }
    setLoading(true);
    try {
      const res = await getRekapSemester(selectedKelas);
      setSemesterReport(res.data);
    } catch (err) {
      toast.error('Gagal memuat rekap semester');
    }
    setLoading(false);
  }

  const handleExport = async () => {
    try {
      const toastId = toast.loading('Menyiapkan file export...');
      let blob;
      let filename;

      if (activeTab === 'harian') {
        blob = await exportAttendanceReport(tanggal, selectedKelas || null);
        filename = `Laporan_Absensi_${tanggal}.xlsx`;
      } else {
        if (!selectedKelas) {
          toast.error('Pilih kelas terlebih dahulu', { id: toastId });
          return;
        }
        blob = await exportRekapSemester(selectedKelas);
        filename = `Rekap_Semester_Kelas.xlsx`;
      }
      
      // Create object URL and trigger download
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success('Laporan berhasil diexport', { id: toastId });
    } catch (error) {
      toast.error('Gagal mengekspor laporan');
    }
  };

  // Navigate date
  function changeDate(days) {
    const d = new Date(tanggal);
    d.setDate(d.getDate() + days);
    setTanggal(d.toISOString().split('T')[0]);
  }

  function goToToday() {
    setTanggal(new Date().toISOString().split('T')[0]);
  }

  // Format tanggal Indonesia
  function formatTanggal(dateStr) {
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    const d = new Date(dateStr + 'T00:00:00');
    return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  }

  function formatWaktu(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  }

  // Filter siswa
  const filteredSiswa = report?.siswa?.filter(s => {
    const matchSearch = s.nama.toLowerCase().includes(search.toLowerCase()) || s.nis.includes(search);
    const matchStatus = !filterStatus || s.status === filterStatus;
    return matchSearch && matchStatus;
  }) || [];

  const statusConfig = {
    hadir: { label: 'Hadir', color: 'emerald', icon: UserCheck, bg: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' },
    terlambat: { label: 'Terlambat', color: 'amber', icon: Clock, bg: 'bg-amber-500/15 text-amber-400 border-amber-500/20' },
    izin: { label: 'Izin', color: 'sky', icon: FileSpreadsheet, bg: 'bg-sky-500/15 text-sky-400 border-sky-500/20' },
    sakit: { label: 'Sakit', color: 'violet', icon: Stethoscope, bg: 'bg-violet-500/15 text-violet-400 border-violet-500/20' },
    alpa: { label: 'Alpa', color: 'rose', icon: ShieldAlert, bg: 'bg-rose-500/15 text-rose-400 border-rose-500/20' },
  };

  const isToday = tanggal === new Date().toISOString().split('T')[0];

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Laporan Absensi</h1>
          <p className="text-gray-400 text-sm mt-1">Rekap kehadiran siswa harian</p>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl transition-all font-medium"
        >
          <Download size={18} />
          Export Excel
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-white/10 mb-6 pb-2">
        <button
          onClick={() => setActiveTab('harian')}
          className={`pb-2 px-1 text-sm font-medium transition-colors border-b-2 ${
            activeTab === 'harian' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          Laporan Harian
        </button>
        <button
          onClick={() => setActiveTab('semester')}
          className={`pb-2 px-1 text-sm font-medium transition-colors border-b-2 flex items-center gap-2 ${
            activeTab === 'semester' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          <ListTodo size={16} />
          Rekap Semester
        </button>
      </div>

      {/* Date Picker + Filter Kelas */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        {/* Date Navigation - Only show if Harian */}
        {activeTab === 'harian' && (
          <div className="flex items-center gap-2">
            <button onClick={() => changeDate(-1)} className="p-2.5 bg-white/5 border border-white/10 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-all">
              <ChevronLeft size={18} />
            </button>
            <div className="relative">
              <CalendarDays size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="date"
                value={tanggal}
                onChange={e => setTanggal(e.target.value)}
                className="pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all [color-scheme:dark]"
              />
            </div>
            <button onClick={() => changeDate(1)} className="p-2.5 bg-white/5 border border-white/10 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-all">
              <ChevronRight size={18} />
            </button>
            {!isToday && (
              <button onClick={goToToday} className="px-3 py-2.5 bg-indigo-500/20 border border-indigo-500/30 rounded-xl text-indigo-400 text-sm font-medium hover:bg-indigo-500/30 transition-all">
                Hari Ini
              </button>
            )}
          </div>
        )}

        {/* Class Filter */}
        <select
          value={selectedKelas}
          onChange={e => setSelectedKelas(e.target.value)}
          className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
        >
          <option value="" className="bg-dark-card">Semua Kelas</option>
          {classes.map(c => <option key={c.id} value={c.id} className="bg-dark-card">{c.nama_kelas}</option>)}
        </select>
        
        {activeTab === 'semester' && !selectedKelas && (
          <div className="flex items-center px-4 py-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400 text-sm">
            <AlertTriangle size={16} className="mr-2" />
            Pilih kelas untuk melihat rekap semester
          </div>
        )}
      </div>

      {/* Tanggal Display (Harian Only) */}
      {activeTab === 'harian' && (
        <div className="mb-6">
          <p className="text-lg font-semibold text-white">{formatTanggal(tanggal)}</p>
          {isToday && <span className="text-xs font-medium text-indigo-400 bg-indigo-500/20 px-2 py-0.5 rounded-full">Hari Ini</span>}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin text-indigo-400" size={32} />
        </div>
      ) : activeTab === 'harian' ? (
        report ? (
          <>
            {/* Rekap Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
              <RekapCard icon={<Users size={20} />} label="Total" value={report.rekap.total} color="slate" />
              <RekapCard icon={<UserCheck size={20} />} label="Hadir" value={report.rekap.hadir} color="emerald" />
              <RekapCard icon={<Clock size={20} />} label="Terlambat" value={report.rekap.terlambat} color="amber" />
              <RekapCard icon={<FileSpreadsheet size={20} />} label="Izin" value={report.rekap.izin} color="sky" />
              <RekapCard icon={<Stethoscope size={20} />} label="Sakit" value={report.rekap.sakit} color="violet" />
              <RekapCard icon={<ShieldAlert size={20} />} label="Alpa" value={report.rekap.alpa} color="rose" />
            </div>

            {/* Persentase Kehadiran */}
            {report.rekap.total > 0 && (
              <div className="glass-card p-4 mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-400">Tingkat Kehadiran</span>
                  <span className="text-sm font-bold text-white">
                    {Math.round(((report.rekap.hadir + report.rekap.terlambat) / report.rekap.total) * 100)}%
                  </span>
                </div>
                <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full rounded-full flex">
                    {report.rekap.hadir > 0 && (
                      <div
                        className="bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500"
                        style={{ width: `${(report.rekap.hadir / report.rekap.total) * 100}%` }}
                      />
                    )}
                    {report.rekap.terlambat > 0 && (
                      <div
                        className="bg-gradient-to-r from-amber-500 to-amber-400 transition-all duration-500"
                        style={{ width: `${(report.rekap.terlambat / report.rekap.total) * 100}%` }}
                      />
                    )}
                    {report.rekap.izin > 0 && (
                      <div
                        className="bg-gradient-to-r from-sky-500 to-sky-400 transition-all duration-500"
                        style={{ width: `${(report.rekap.izin / report.rekap.total) * 100}%` }}
                      />
                    )}
                    {report.rekap.sakit > 0 && (
                      <div
                        className="bg-gradient-to-r from-violet-500 to-violet-400 transition-all duration-500"
                        style={{ width: `${(report.rekap.sakit / report.rekap.total) * 100}%` }}
                      />
                    )}
                    {report.rekap.alpa > 0 && (
                      <div
                        className="bg-gradient-to-r from-rose-500 to-rose-400 transition-all duration-500"
                        style={{ width: `${(report.rekap.alpa / report.rekap.total) * 100}%` }}
                      />
                    )}
                  </div>
                </div>
                {/* Legend */}
                <div className="flex flex-wrap gap-4 mt-3">
                  {Object.entries(statusConfig).map(([key, cfg]) => (
                    <div key={key} className="flex items-center gap-1.5">
                      <div className={`w-2.5 h-2.5 rounded-full bg-${cfg.color}-500`} />
                      <span className="text-xs text-gray-400">{cfg.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Search + Filter Status */}
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <div className="relative flex-1">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  placeholder="Cari nama atau NIS..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                />
              </div>
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
              >
                <option value="" className="bg-dark-card">Semua Status</option>
                <option value="hadir" className="bg-dark-card">Hadir</option>
                <option value="terlambat" className="bg-dark-card">Terlambat</option>
                <option value="izin" className="bg-dark-card">Izin</option>
                <option value="sakit" className="bg-dark-card">Sakit</option>
                <option value="alpa" className="bg-dark-card">Alpa</option>
              </select>
            </div>

            {/* Table */}
            <div className="glass-card overflow-hidden">
              {filteredSiswa.length === 0 ? (
                <div className="text-center py-16 text-gray-500">
                  <UserX size={48} className="mx-auto mb-3 opacity-50" />
                  <p>Tidak ada data yang cocok</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-5 py-4">No</th>
                        <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-5 py-4">NIS</th>
                        <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-5 py-4">Nama</th>
                        <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-5 py-4 hidden md:table-cell">Kelas</th>
                        <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-5 py-4">Status</th>
                        <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-5 py-4 hidden sm:table-cell">Waktu</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSiswa.map((s, i) => {
                        const cfg = statusConfig[s.status] || statusConfig.alpa;
                        const StatusIcon = cfg.icon;
                        return (
                          <tr key={s.student_id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                            <td className="px-5 py-3.5 text-gray-400 text-sm">{i + 1}</td>
                            <td className="px-5 py-3.5 text-white text-sm font-mono">{s.nis}</td>
                            <td className="px-5 py-3.5 text-white text-sm font-medium">{s.nama}</td>
                            <td className="px-5 py-3.5 text-gray-300 text-sm hidden md:table-cell">{s.nama_kelas}</td>
                            <td className="px-5 py-3.5">
                              <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${cfg.bg}`}>
                                <StatusIcon size={12} />
                                {cfg.label}
                              </span>
                            </td>
                            <td className="px-5 py-3.5 text-gray-400 text-sm hidden sm:table-cell">{formatWaktu(s.waktu)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="text-center py-20 text-gray-500">
            <AlertTriangle size={48} className="mx-auto mb-3 opacity-50" />
            <p>Gagal memuat data laporan</p>
          </div>
        )
      ) : (
        /* ======================== SEMESTER TAB ======================== */
        semesterReport && selectedKelas ? (
          <>
            <div className="glass-card p-4 mb-6 flex items-center justify-between border-l-4 border-indigo-500">
              <div>
                <h3 className="text-white font-semibold text-lg">Ringkasan Semester</h3>
                <p className="text-gray-400 text-sm">Total hari efektif absensi tercatat: <span className="text-indigo-400 font-bold">{semesterReport.total_hari} Hari</span></p>
              </div>
            </div>

            <div className="glass-card overflow-hidden">
              {semesterReport.siswa.length === 0 ? (
                <div className="text-center py-16 text-gray-500">
                  <UserX size={48} className="mx-auto mb-3 opacity-50" />
                  <p>Tidak ada siswa di kelas ini</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/10 bg-white/5">
                        <th className="text-left font-semibold text-gray-400 px-4 py-3">No</th>
                        <th className="text-left font-semibold text-gray-400 px-4 py-3">NIS</th>
                        <th className="text-left font-semibold text-gray-400 px-4 py-3 min-w-[200px]">Nama</th>
                        <th className="text-center font-semibold text-gray-400 px-3 py-3">Hadir</th>
                        <th className="text-center font-semibold text-gray-400 px-3 py-3">Telat</th>
                        <th className="text-center font-semibold text-gray-400 px-3 py-3">Izin</th>
                        <th className="text-center font-semibold text-gray-400 px-3 py-3">Sakit</th>
                        <th className="text-center font-semibold text-gray-400 px-3 py-3">Alpa</th>
                        <th className="text-center font-semibold text-gray-400 px-4 py-3">% Hadir</th>
                      </tr>
                    </thead>
                    <tbody>
                      {semesterReport.siswa.map((s, i) => (
                        <tr key={s.student_id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                          <td className="px-4 py-3 text-gray-400">{i + 1}</td>
                          <td className="px-4 py-3 text-white font-mono">{s.nis}</td>
                          <td className="px-4 py-3 text-white font-medium">{s.nama}</td>
                          <td className="px-3 py-3 text-center text-emerald-400">{s.hadir}</td>
                          <td className="px-3 py-3 text-center text-amber-400">{s.terlambat}</td>
                          <td className="px-3 py-3 text-center text-sky-400">{s.izin}</td>
                          <td className="px-3 py-3 text-center text-violet-400">{s.sakit}</td>
                          <td className="px-3 py-3 text-center text-rose-400 font-bold">{s.alpa}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                              s.persen >= 80 ? 'bg-emerald-500/20 text-emerald-400' :
                              s.persen >= 60 ? 'bg-amber-500/20 text-amber-400' :
                              'bg-rose-500/20 text-rose-400'
                            }`}>
                              {s.persen}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="text-center py-20 text-gray-500">
            {selectedKelas ? (
              <>
                <Loader2 size={48} className="mx-auto mb-3 opacity-50 animate-spin" />
                <p>Memuat rekap semester...</p>
              </>
            ) : null}
          </div>
        )
      )}
    </div>
  );
}

// ── Rekap Card Component ──
function RekapCard({ icon, label, value, color }) {
  const colorMap = {
    slate: 'from-gray-500/20 to-gray-500/5 text-gray-400 border-gray-500/20',
    emerald: 'from-emerald-500/20 to-emerald-500/5 text-emerald-400 border-emerald-500/20',
    amber: 'from-amber-500/20 to-amber-500/5 text-amber-400 border-amber-500/20',
    sky: 'from-sky-500/20 to-sky-500/5 text-sky-400 border-sky-500/20',
    violet: 'from-violet-500/20 to-violet-500/5 text-violet-400 border-violet-500/20',
    rose: 'from-rose-500/20 to-rose-500/5 text-rose-400 border-rose-500/20',
  };

  return (
    <div className={`bg-gradient-to-br ${colorMap[color]} border rounded-2xl p-4 transition-all duration-300 hover:scale-[1.02]`}>
      <div className="flex items-center gap-2 mb-1.5">
        {icon}
        <span className="text-xs font-medium opacity-80">{label}</span>
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
    </div>
  );
}
