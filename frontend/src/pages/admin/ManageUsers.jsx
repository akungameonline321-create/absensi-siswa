import { useState, useEffect } from 'react';
import { Plus, Pencil, X, Users, Shield, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { getUsers, registerUser } from '../../services/api';

export default function ManageUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ nip: '', nama: '', email: '', password: '', role: 'guru' });

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const res = await getUsers();
      setUsers(res.data);
    } catch (err) { toast.error('Gagal memuat data user'); }
    setLoading(false);
  }

  function openCreate() {
    setForm({ nip: '', nama: '', email: '', password: '', role: 'guru' });
    setShowModal(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.nama || !form.email || !form.password) { toast.error('Nama, Email, dan Password wajib diisi'); return; }
    if (form.password.length < 6) { toast.error('Password minimal 6 karakter'); return; }
    setSubmitting(true);
    try {
      await registerUser(form);
      toast.success(`User ${form.nama} berhasil didaftarkan`);
      setShowModal(false);
      fetchData();
    } catch (err) { toast.error(err.response?.data?.message || 'Gagal mendaftarkan user'); }
    setSubmitting(false);
  }

  const roleBadge = (role) => {
    if (role === 'admin') return <span className="text-xs px-2.5 py-1 rounded-full bg-purple-500/20 text-purple-400 font-medium">Admin</span>;
    if (role === 'siswa') return <span className="text-xs px-2.5 py-1 rounded-full bg-sky-500/20 text-sky-400 font-medium">Siswa</span>;
    return <span className="text-xs px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-400 font-medium">Guru</span>;
  };

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Kelola Users</h1>
          <p className="text-gray-400 text-sm mt-1">{users.length} user terdaftar</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium hover:scale-105 transition-all duration-300 shadow-lg shadow-purple-500/25">
          <Plus size={18} /> Tambah User
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        <div className="glass-card p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center"><Users className="text-indigo-400" size={22} /></div>
          <div><p className="text-sm text-gray-400">Total</p><p className="text-xl font-bold text-white">{users.length}</p></div>
        </div>
        <div className="glass-card p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center"><Shield className="text-purple-400" size={22} /></div>
          <div><p className="text-sm text-gray-400">Admin</p><p className="text-xl font-bold text-white">{users.filter(u => u.role === 'admin').length}</p></div>
        </div>
        <div className="glass-card p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center"><Users className="text-blue-400" size={22} /></div>
          <div><p className="text-sm text-gray-400">Guru</p><p className="text-xl font-bold text-white">{users.filter(u => u.role === 'guru').length}</p></div>
        </div>
        <div className="glass-card p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-sky-500/20 flex items-center justify-center"><Users className="text-sky-400" size={22} /></div>
          <div><p className="text-sm text-gray-400">Siswa</p><p className="text-xl font-bold text-white">{users.filter(u => u.role === 'siswa').length}</p></div>
        </div>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="animate-spin text-indigo-400" size={32} /></div>
        ) : users.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <Users size={48} className="mx-auto mb-3 opacity-50" />
            <p>Belum ada data user</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-5 py-4">No</th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-5 py-4">NIP</th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-5 py-4">Nama</th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-5 py-4 hidden md:table-cell">Email</th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-5 py-4">Role</th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-5 py-4 hidden sm:table-cell">Status</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u, i) => (
                  <tr key={u.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="px-5 py-3.5 text-gray-400 text-sm">{i + 1}</td>
                    <td className="px-5 py-3.5 text-white text-sm font-mono">{u.nip || '—'}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                          {u.nama?.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
                        </div>
                        <span className="text-white text-sm font-medium">{u.nama}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-gray-400 text-sm hidden md:table-cell">{u.email}</td>
                    <td className="px-5 py-3.5">{roleBadge(u.role)}</td>
                    <td className="px-5 py-3.5 hidden sm:table-cell">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${u.is_active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-500/20 text-gray-400'}`}>
                        {u.is_active ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setShowModal(false)}>
          <div className="glass-card p-6 w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold text-white">Tambah User Baru</h2>
              <button onClick={() => setShowModal(false)} className="p-1 rounded-lg hover:bg-white/10 text-gray-400"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div><label className="block text-sm text-gray-400 mb-1">NIP</label><input value={form.nip} onChange={e => setForm({...form, nip: e.target.value})} placeholder="Nomor Induk Pegawai" className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50" /></div>
              <div><label className="block text-sm text-gray-400 mb-1">Nama Lengkap *</label><input value={form.nama} onChange={e => setForm({...form, nama: e.target.value})} className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50" required /></div>
              <div><label className="block text-sm text-gray-400 mb-1">Email *</label><input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50" required /></div>
              <div><label className="block text-sm text-gray-400 mb-1">Password *</label><input type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} placeholder="Minimal 6 karakter" className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50" required /></div>
              <div><label className="block text-sm text-gray-400 mb-1">Role *</label>
                <select value={form.role} onChange={e => setForm({...form, role: e.target.value})} className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50">
                  <option value="guru" className="bg-dark-card">Guru</option>
                  <option value="siswa" className="bg-dark-card">Siswa</option>
                  <option value="admin" className="bg-dark-card">Admin</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2.5 border border-white/10 rounded-xl text-gray-400 hover:bg-white/5 transition-all">Batal</button>
                <button type="submit" disabled={submitting} className="flex-1 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium hover:scale-[1.02] transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                  {submitting && <Loader2 size={16} className="animate-spin" />} Daftarkan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
