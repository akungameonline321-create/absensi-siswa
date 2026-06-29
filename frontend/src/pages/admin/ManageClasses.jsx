import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, X, School, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { getClasses, createClass, updateClass, deleteClass, getUsers } from '../../services/api';

export default function ManageClasses() {
  const [classes, setClasses] = useState([]);
  const [guruList, setGuruList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  const [deletingClass, setDeletingClass] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ nama_kelas: '', tingkat: '10', jurusan: '', tahun_ajaran: '2025/2026', wali_kelas_id: '' });

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [classesRes, guruRes] = await Promise.all([getClasses(), getUsers('guru')]);
      setClasses(classesRes.data);
      setGuruList(guruRes.data);
    } catch (err) { toast.error('Gagal memuat data kelas'); }
    setLoading(false);
  }

  function openCreate() {
    setEditingClass(null);
    setForm({ nama_kelas: '', tingkat: '10', jurusan: '', tahun_ajaran: '2025/2026', wali_kelas_id: '' });
    setShowModal(true);
  }

  function openEdit(kelas) {
    setEditingClass(kelas);
    setForm({ nama_kelas: kelas.nama_kelas, tingkat: kelas.tingkat, jurusan: kelas.jurusan || '', tahun_ajaran: kelas.tahun_ajaran, wali_kelas_id: kelas.wali_kelas_id || '' });
    setShowModal(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.nama_kelas || !form.tingkat || !form.tahun_ajaran) { toast.error('Nama Kelas, Tingkat, dan Tahun Ajaran wajib diisi'); return; }
    setSubmitting(true);
    try {
      if (editingClass) {
        await updateClass(editingClass.id, form);
        toast.success(`Kelas ${form.nama_kelas} berhasil diperbarui`);
      } else {
        await createClass(form);
        toast.success(`Kelas ${form.nama_kelas} berhasil ditambahkan`);
      }
      setShowModal(false);
      fetchData();
    } catch (err) { toast.error(err.response?.data?.message || 'Gagal menyimpan data'); }
    setSubmitting(false);
  }

  async function handleDelete() {
    setSubmitting(true);
    try {
      await deleteClass(deletingClass.id);
      toast.success(`Kelas ${deletingClass.nama_kelas} berhasil dihapus`);
      setShowDeleteModal(false);
      setDeletingClass(null);
      fetchData();
    } catch (err) { toast.error(err.response?.data?.message || 'Gagal menghapus kelas'); }
    setSubmitting(false);
  }

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Kelola Kelas</h1>
          <p className="text-gray-400 text-sm mt-1">{classes.length} kelas terdaftar</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium hover:scale-105 transition-all duration-300 shadow-lg shadow-purple-500/25">
          <Plus size={18} /> Tambah Kelas
        </button>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="animate-spin text-indigo-400" size={32} /></div>
        ) : classes.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <School size={48} className="mx-auto mb-3 opacity-50" />
            <p>Belum ada data kelas</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-5 py-4">No</th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-5 py-4">Nama Kelas</th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-5 py-4 hidden sm:table-cell">Tingkat</th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-5 py-4 hidden md:table-cell">Jurusan</th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-5 py-4 hidden md:table-cell">Tahun Ajaran</th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-5 py-4 hidden lg:table-cell">Wali Kelas</th>
                  <th className="text-right text-xs font-semibold text-gray-400 uppercase tracking-wider px-5 py-4">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {classes.map((c, i) => (
                  <tr key={c.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="px-5 py-3.5 text-gray-400 text-sm">{i + 1}</td>
                    <td className="px-5 py-3.5 text-white text-sm font-medium">{c.nama_kelas}</td>
                    <td className="px-5 py-3.5 hidden sm:table-cell"><span className="text-xs px-2.5 py-1 rounded-full bg-indigo-500/20 text-indigo-400">Kelas {c.tingkat}</span></td>
                    <td className="px-5 py-3.5 text-gray-300 text-sm hidden md:table-cell">{c.jurusan || '—'}</td>
                    <td className="px-5 py-3.5 text-gray-300 text-sm hidden md:table-cell">{c.tahun_ajaran}</td>
                    <td className="px-5 py-3.5 text-gray-300 text-sm hidden lg:table-cell">{c.wali_kelas_nama || '—'}</td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(c)} className="p-2 rounded-lg hover:bg-blue-500/20 text-blue-400 transition-colors"><Pencil size={15} /></button>
                        <button onClick={() => { setDeletingClass(c); setShowDeleteModal(true); }} className="p-2 rounded-lg hover:bg-rose-500/20 text-rose-400 transition-colors"><Trash2 size={15} /></button>
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
          <div className="glass-card p-6 w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold text-white">{editingClass ? 'Edit Kelas' : 'Tambah Kelas Baru'}</h2>
              <button onClick={() => setShowModal(false)} className="p-1 rounded-lg hover:bg-white/10 text-gray-400"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div><label className="block text-sm text-gray-400 mb-1">Nama Kelas *</label><input value={form.nama_kelas} onChange={e => setForm({...form, nama_kelas: e.target.value})} placeholder="Contoh: XII IPA 1" className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50" required /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm text-gray-400 mb-1">Tingkat *</label>
                  <select value={form.tingkat} onChange={e => setForm({...form, tingkat: e.target.value})} className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50" required>
                    <option value="10" className="bg-dark-card">Kelas 10</option>
                    <option value="11" className="bg-dark-card">Kelas 11</option>
                    <option value="12" className="bg-dark-card">Kelas 12</option>
                  </select>
                </div>
                <div><label className="block text-sm text-gray-400 mb-1">Jurusan</label>
                  <select value={form.jurusan} onChange={e => setForm({...form, jurusan: e.target.value})} className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50">
                    <option value="" className="bg-dark-card">Pilih Jurusan</option>
                    <option value="IPA" className="bg-dark-card">IPA</option>
                    <option value="IPS" className="bg-dark-card">IPS</option>
                    <option value="Bahasa" className="bg-dark-card">Bahasa</option>
                    <option value="Agama" className="bg-dark-card">Agama</option>
                    <option value="Teknik" className="bg-dark-card">Teknik</option>
                    <option value="Umum" className="bg-dark-card">Umum</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm text-gray-400 mb-1">Tahun Ajaran *</label><input value={form.tahun_ajaran} onChange={e => setForm({...form, tahun_ajaran: e.target.value})} placeholder="2025/2026" className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50" required /></div>
                <div><label className="block text-sm text-gray-400 mb-1">Wali Kelas</label>
                  <select value={form.wali_kelas_id} onChange={e => setForm({...form, wali_kelas_id: e.target.value})} className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50">
                    <option value="" className="bg-dark-card">Belum ditentukan</option>
                    {guruList.map(g => <option key={g.id} value={g.id} className="bg-dark-card">{g.nama}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2.5 border border-white/10 rounded-xl text-gray-400 hover:bg-white/5 transition-all">Batal</button>
                <button type="submit" disabled={submitting} className="flex-1 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium hover:scale-[1.02] transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                  {submitting && <Loader2 size={16} className="animate-spin" />} {editingClass ? 'Simpan' : 'Tambah'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && deletingClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setShowDeleteModal(false)}>
          <div className="glass-card p-6 w-full max-w-sm text-center" onClick={e => e.stopPropagation()}>
            <div className="w-14 h-14 rounded-full bg-rose-500/20 flex items-center justify-center mx-auto mb-4"><Trash2 className="text-rose-400" size={24} /></div>
            <h3 className="text-lg font-bold text-white mb-2">Hapus Kelas?</h3>
            <p className="text-gray-400 text-sm mb-6">Yakin ingin menghapus <span className="text-white font-medium">{deletingClass.nama_kelas}</span>? Pastikan tidak ada siswa di kelas ini.</p>
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
