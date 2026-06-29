import { useState, useEffect, useRef } from 'react';
import { Search, Plus, Pencil, Trash2, X, UserCheck, UserX, Loader2, Upload, Download, FileSpreadsheet, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { getStudents, createStudent, updateStudent, deleteStudent, getClasses, importStudents, exportStudents, downloadStudentTemplate } from '../../services/api';

export default function ManageStudents() {
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterKelas, setFilterKelas] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [deletingStudent, setDeletingStudent] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importResult, setImportResult] = useState(null);
  const [form, setForm] = useState({ nis: '', nisn: '', nama: '', kelas_id: '', jenis_kelamin: 'L', alamat: '', no_telp_ortu: '' });
  const fileInputRef = useRef(null);

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [studentsRes, classesRes] = await Promise.all([getStudents(), getClasses()]);
      setStudents(studentsRes.data);
      setClasses(classesRes.data);
    } catch (err) { toast.error('Gagal memuat data siswa'); }
    setLoading(false);
  }

  function openCreate() {
    setEditingStudent(null);
    setForm({ nis: '', nisn: '', nama: '', kelas_id: classes[0]?.id || '', jenis_kelamin: 'L', alamat: '', no_telp_ortu: '' });
    setShowModal(true);
  }

  function openEdit(student) {
    setEditingStudent(student);
    setForm({ nis: student.nis, nisn: student.nisn || '', nama: student.nama, kelas_id: student.kelas_id, jenis_kelamin: student.jenis_kelamin, alamat: student.alamat || '', no_telp_ortu: student.no_telp_ortu || '' });
    setShowModal(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.nis || !form.nama || !form.kelas_id) { toast.error('NIS, Nama, dan Kelas wajib diisi'); return; }
    setSubmitting(true);
    try {
      if (editingStudent) {
        await updateStudent(editingStudent.id, form);
        toast.success(`Data ${form.nama} berhasil diperbarui`);
      } else {
        await createStudent(form);
        toast.success(`Siswa ${form.nama} berhasil ditambahkan`);
      }
      setShowModal(false);
      fetchData();
    } catch (err) { toast.error(err.response?.data?.message || 'Gagal menyimpan data'); }
    setSubmitting(false);
  }

  async function handleDelete() {
    setSubmitting(true);
    try {
      await deleteStudent(deletingStudent.id);
      toast.success(`Siswa ${deletingStudent.nama} berhasil dihapus`);
      setShowDeleteModal(false);
      setDeletingStudent(null);
      fetchData();
    } catch (err) { toast.error(err.response?.data?.message || 'Gagal menghapus siswa'); }
    setSubmitting(false);
  }

  // === Import Excel ===
  function openImportModal() {
    setImportFile(null);
    setImportResult(null);
    setShowImportModal(true);
  }

  function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
      const validTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
      ];
      if (!validTypes.includes(file.type)) {
        toast.error('Hanya file Excel (.xlsx / .xls) yang diizinkan');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Ukuran file maksimal 5MB');
        return;
      }
      setImportFile(file);
      setImportResult(null);
    }
  }

  async function handleImport() {
    if (!importFile) { toast.error('Pilih file Excel terlebih dahulu'); return; }
    setImporting(true);
    try {
      const result = await importStudents(importFile);
      setImportResult(result.data);
      if (result.data.berhasil > 0) {
        toast.success(`${result.data.berhasil} siswa berhasil diimport`);
        fetchData();
      } else if (result.data.gagal === 0 && result.data.dilewati > 0) {
        toast('Semua data sudah ada, tidak ada yang baru diimport', { icon: 'ℹ️' });
      } else {
        toast.error('Tidak ada data yang berhasil diimport');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal import data');
    }
    setImporting(false);
  }

  // === Export Excel ===
  async function handleExport() {
    setExporting(true);
    try {
      const blob = await exportStudents();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const tanggal = new Date().toISOString().slice(0, 10);
      a.download = `data_siswa_${tanggal}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Data siswa berhasil diexport');
    } catch (err) {
      toast.error('Gagal export data siswa');
    }
    setExporting(false);
  }

  // === Download Template ===
  async function handleDownloadTemplate() {
    try {
      const blob = await downloadStudentTemplate();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'template_import_siswa.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Template berhasil didownload');
    } catch (err) {
      toast.error('Gagal download template');
    }
  }

  const filtered = students.filter(s => {
    const matchSearch = s.nama.toLowerCase().includes(search.toLowerCase()) || s.nis.includes(search);
    const matchKelas = !filterKelas || s.kelas_id === parseInt(filterKelas);
    return matchSearch && matchKelas;
  });

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Kelola Siswa</h1>
          <p className="text-gray-400 text-sm mt-1">{students.length} siswa terdaftar</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={handleDownloadTemplate} className="flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 text-gray-300 rounded-xl font-medium hover:bg-white/10 hover:text-white transition-all duration-300" title="Download Template Excel">
            <FileSpreadsheet size={16} /> Template
          </button>
          <button onClick={openImportModal} className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 rounded-xl font-medium hover:bg-emerald-600/30 hover:text-emerald-300 transition-all duration-300" title="Import dari Excel">
            <Upload size={16} /> Import
          </button>
          <button onClick={handleExport} disabled={exporting || students.length === 0} className="flex items-center gap-2 px-4 py-2.5 bg-sky-600/20 border border-sky-500/30 text-sky-400 rounded-xl font-medium hover:bg-sky-600/30 hover:text-sky-300 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed" title="Export ke Excel">
            {exporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />} Export
          </button>
          <button onClick={openCreate} className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium hover:scale-105 transition-all duration-300 shadow-lg shadow-purple-500/25">
            <Plus size={18} /> Tambah Siswa
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input type="text" placeholder="Cari nama atau NIS..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all" />
        </div>
        <select value={filterKelas} onChange={e => setFilterKelas(e.target.value)} className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all">
          <option value="" className="bg-dark-card">Semua Kelas</option>
          {classes.map(c => <option key={c.id} value={c.id} className="bg-dark-card">{c.nama_kelas}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="animate-spin text-indigo-400" size={32} /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <UserX size={48} className="mx-auto mb-3 opacity-50" />
            <p>{search || filterKelas ? 'Tidak ada siswa yang cocok dengan filter' : 'Belum ada data siswa'}</p>
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
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-5 py-4 hidden sm:table-cell">L/P</th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-5 py-4">Wajah</th>
                  <th className="text-right text-xs font-semibold text-gray-400 uppercase tracking-wider px-5 py-4">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s, i) => (
                  <tr key={s.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="px-5 py-3.5 text-gray-400 text-sm">{i + 1}</td>
                    <td className="px-5 py-3.5 text-white text-sm font-mono">{s.nis}</td>
                    <td className="px-5 py-3.5 text-white text-sm font-medium">{s.nama}</td>
                    <td className="px-5 py-3.5 text-gray-300 text-sm hidden md:table-cell">{s.nama_kelas}</td>
                    <td className="px-5 py-3.5 hidden sm:table-cell"><span className={`text-xs px-2 py-0.5 rounded-full ${s.jenis_kelamin === 'L' ? 'bg-blue-500/20 text-blue-400' : 'bg-pink-500/20 text-pink-400'}`}>{s.jenis_kelamin}</span></td>
                    <td className="px-5 py-3.5">{s.is_face_registered ? <span className="flex items-center gap-1 text-xs text-emerald-400"><UserCheck size={14} /> Terdaftar</span> : <span className="text-xs text-gray-500">Belum</span>}</td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(s)} className="p-2 rounded-lg hover:bg-blue-500/20 text-blue-400 transition-colors"><Pencil size={15} /></button>
                        <button onClick={() => { setDeletingStudent(s); setShowDeleteModal(true); }} className="p-2 rounded-lg hover:bg-rose-500/20 text-rose-400 transition-colors"><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setShowModal(false)}>
          <div className="glass-card p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold text-white">{editingStudent ? 'Edit Siswa' : 'Tambah Siswa Baru'}</h2>
              <button onClick={() => setShowModal(false)} className="p-1 rounded-lg hover:bg-white/10 text-gray-400"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm text-gray-400 mb-1">NIS *</label><input value={form.nis} onChange={e => setForm({...form, nis: e.target.value.replace(/[^0-9]/g, '')})} inputMode="numeric" pattern="[0-9]*" className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50" required /></div>
                <div><label className="block text-sm text-gray-400 mb-1">NISN</label><input value={form.nisn} onChange={e => setForm({...form, nisn: e.target.value.replace(/[^0-9]/g, '')})} inputMode="numeric" pattern="[0-9]*" className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50" /></div>
              </div>
              <div><label className="block text-sm text-gray-400 mb-1">Nama Lengkap *</label><input value={form.nama} onChange={e => setForm({...form, nama: e.target.value})} className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50" required /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm text-gray-400 mb-1">Kelas *</label>
                  <select value={form.kelas_id} onChange={e => setForm({...form, kelas_id: e.target.value})} className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50" required>
                    <option value="" className="bg-dark-card">Pilih Kelas</option>
                    {classes.map(c => <option key={c.id} value={c.id} className="bg-dark-card">{c.nama_kelas}</option>)}
                  </select>
                </div>
                <div><label className="block text-sm text-gray-400 mb-1">Jenis Kelamin *</label>
                  <div className="flex gap-4 mt-2">
                    <label className="flex items-center gap-2 text-white cursor-pointer"><input type="radio" name="jk" value="L" checked={form.jenis_kelamin === 'L'} onChange={e => setForm({...form, jenis_kelamin: e.target.value})} className="accent-indigo-500" /> Laki-laki</label>
                    <label className="flex items-center gap-2 text-white cursor-pointer"><input type="radio" name="jk" value="P" checked={form.jenis_kelamin === 'P'} onChange={e => setForm({...form, jenis_kelamin: e.target.value})} className="accent-indigo-500" /> Perempuan</label>
                  </div>
                </div>
              </div>
              <div><label className="block text-sm text-gray-400 mb-1">Alamat</label><textarea value={form.alamat} onChange={e => setForm({...form, alamat: e.target.value})} rows={2} className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none" /></div>
              <div><label className="block text-sm text-gray-400 mb-1">No. Telp Orang Tua</label><input value={form.no_telp_ortu} onChange={e => setForm({...form, no_telp_ortu: e.target.value.replace(/[^0-9]/g, '')})} inputMode="numeric" pattern="[0-9]*" className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50" /></div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2.5 border border-white/10 rounded-xl text-gray-400 hover:bg-white/5 transition-all">Batal</button>
                <button type="submit" disabled={submitting} className="flex-1 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium hover:scale-[1.02] transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                  {submitting && <Loader2 size={16} className="animate-spin" />} {editingStudent ? 'Simpan' : 'Tambah'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setShowImportModal(false)}>
          <div className="glass-card p-6 w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold text-white">Import Data Siswa</h2>
              <button onClick={() => setShowImportModal(false)} className="p-1 rounded-lg hover:bg-white/10 text-gray-400"><X size={20} /></button>
            </div>

            {/* Step: Upload */}
            {!importResult ? (
              <div className="space-y-4">
                {/* Info box */}
                <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                  <div className="flex items-start gap-3">
                    <FileSpreadsheet size={20} className="text-indigo-400 mt-0.5 shrink-0" />
                    <div className="text-sm text-gray-300">
                      <p className="font-medium text-indigo-400 mb-1">Petunjuk Import</p>
                      <ul className="space-y-1 text-gray-400 text-xs">
                        <li>• Download template terlebih dahulu untuk format yang benar</li>
                        <li>• Isi data sesuai kolom yang tersedia</li>
                        <li>• Nama kelas harus sesuai dengan yang terdaftar di sistem</li>
                        <li>• NIS yang sudah ada akan dilewati (tidak ditimpa)</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Download template button */}
                <button onClick={handleDownloadTemplate} className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-emerald-500/30 rounded-xl text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500/50 transition-all">
                  <Download size={18} />
                  <span className="font-medium">Download Template Excel</span>
                </button>

                {/* File upload area */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={`relative flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
                    importFile
                      ? 'border-indigo-500/50 bg-indigo-500/10'
                      : 'border-white/10 hover:border-white/30 hover:bg-white/5'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  {importFile ? (
                    <>
                      <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                        <FileSpreadsheet size={24} className="text-indigo-400" />
                      </div>
                      <div className="text-center">
                        <p className="text-white font-medium text-sm">{importFile.name}</p>
                        <p className="text-gray-500 text-xs mt-1">{(importFile.size / 1024).toFixed(1)} KB</p>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); setImportFile(null); }}
                        className="text-xs text-gray-500 hover:text-rose-400 transition-colors"
                      >
                        Ganti file
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center">
                        <Upload size={24} className="text-gray-500" />
                      </div>
                      <div className="text-center">
                        <p className="text-gray-400 text-sm">Klik untuk pilih file Excel</p>
                        <p className="text-gray-600 text-xs mt-1">.xlsx atau .xls (maks 5MB)</p>
                      </div>
                    </>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowImportModal(false)} className="flex-1 px-4 py-2.5 border border-white/10 rounded-xl text-gray-400 hover:bg-white/5 transition-all">Batal</button>
                  <button
                    onClick={handleImport}
                    disabled={!importFile || importing}
                    className="flex-1 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl font-medium hover:scale-[1.02] transition-all disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2"
                  >
                    {importing ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                    {importing ? 'Mengimport...' : 'Import Data'}
                  </button>
                </div>
              </div>
            ) : (
              /* Step: Results */
              <div className="space-y-4">
                {/* Summary cards */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                    <CheckCircle2 size={20} className="text-emerald-400 mx-auto mb-1" />
                    <p className="text-xl font-bold text-emerald-400">{importResult.berhasil}</p>
                    <p className="text-xs text-gray-400">Berhasil</p>
                  </div>
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center">
                    <AlertTriangle size={20} className="text-amber-400 mx-auto mb-1" />
                    <p className="text-xl font-bold text-amber-400">{importResult.dilewati}</p>
                    <p className="text-xs text-gray-400">Dilewati</p>
                  </div>
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-center">
                    <XCircle size={20} className="text-rose-400 mx-auto mb-1" />
                    <p className="text-xl font-bold text-rose-400">{importResult.gagal}</p>
                    <p className="text-xs text-gray-400">Gagal</p>
                  </div>
                </div>

                {/* Error details */}
                {importResult.errors && importResult.errors.length > 0 && (
                  <div className="max-h-48 overflow-y-auto rounded-xl bg-white/5 border border-white/10 p-3">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Detail</p>
                    <div className="space-y-1">
                      {importResult.errors.map((err, i) => (
                        <p key={i} className={`text-xs ${err.includes('dilewati') ? 'text-amber-400/80' : 'text-rose-400/80'}`}>
                          {err}
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                {/* Close button */}
                <button
                  onClick={() => setShowImportModal(false)}
                  className="w-full px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium hover:scale-[1.02] transition-all"
                >
                  Tutup
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && deletingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setShowDeleteModal(false)}>
          <div className="glass-card p-6 w-full max-w-sm text-center" onClick={e => e.stopPropagation()}>
            <div className="w-14 h-14 rounded-full bg-rose-500/20 flex items-center justify-center mx-auto mb-4"><Trash2 className="text-rose-400" size={24} /></div>
            <h3 className="text-lg font-bold text-white mb-2">Hapus Siswa?</h3>
            <p className="text-gray-400 text-sm mb-6">Yakin ingin menghapus <span className="text-white font-medium">{deletingStudent.nama}</span>? Data tidak bisa dikembalikan.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteModal(false)} className="flex-1 px-4 py-2.5 border border-white/10 rounded-xl text-gray-400 hover:bg-white/5 transition-all">Batal</button>
              <button onClick={handleDelete} disabled={submitting} className="flex-1 px-4 py-2.5 bg-rose-600 text-white rounded-xl font-medium hover:bg-rose-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                {submitting && <Loader2 size={16} className="animate-spin" />} Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
