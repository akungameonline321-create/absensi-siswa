import { useState, useEffect } from 'react';
import { Camera, CheckCircle, XCircle, Trash2, ShieldAlert } from 'lucide-react';
import toast from 'react-hot-toast';
import { getFaceUpdates, approveFaceUpdate } from '../../services/api';

export default function ManageFaceUpdates() {
  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  const fetchUpdates = async () => {
    try {
      setLoading(true);
      const res = await getFaceUpdates();
      setUpdates(res.data || []);
    } catch (err) {
      toast.error('Gagal memuat antrean pembaruan wajah');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUpdates();
  }, []);

  const handleApprove = async (id, status) => {
    if (!window.confirm(`Yakin ingin ${status === 'approved' ? 'menyetujui' : 'menolak'} foto ini?`)) return;
    
    setProcessingId(id);
    try {
      await approveFaceUpdate(id, status);
      toast.success(`Request berhasil ${status === 'approved' ? 'disetujui dan dataset AI diperbarui!' : 'ditolak.'}`);
      fetchUpdates(); // Refresh data
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal memproses request');
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Camera className="text-indigo-400" />
            Persetujuan Dataset Wajah
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Validasi dan setujui foto terbaru dari siswa untuk memperbarui data pengenalan wajah AI.
          </p>
        </div>
      </div>

      <div className="bg-[#111827]/80 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-300">
            <thead className="bg-white/5 text-gray-400 uppercase text-[11px] tracking-wider border-b border-white/10">
              <tr>
                <th className="px-6 py-4 font-semibold">Siswa</th>
                <th className="px-6 py-4 font-semibold">Kelas</th>
                <th className="px-6 py-4 font-semibold">Waktu Request</th>
                <th className="px-6 py-4 font-semibold">Foto Baru</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {updates.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                    Tidak ada antrean pembaruan wajah saat ini.
                  </td>
                </tr>
              ) : (
                updates.map((update) => (
                  <tr key={update._id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-white">{update.nama_siswa}</div>
                      <div className="text-gray-500 text-xs font-mono">{update.nis}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">{update.nama_kelas}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {new Date(update.createdAt).toLocaleString('id-ID', {
                        day: 'numeric', month: 'short', year: 'numeric',
                        hour: '2-digit', minute: '2-digit'
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <a href={`http://localhost:5000${update.photo_path}`} target="_blank" rel="noreferrer" className="text-indigo-400 hover:text-indigo-300 flex items-center gap-2">
                        <EyeIcon /> Lihat Foto
                      </a>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {update.status === 'pending' && <span className="px-2 py-1 bg-amber-500/10 text-amber-400 rounded-lg text-xs border border-amber-500/20">Pending</span>}
                      {update.status === 'approved' && <span className="px-2 py-1 bg-emerald-500/10 text-emerald-400 rounded-lg text-xs border border-emerald-500/20">Approved</span>}
                      {update.status === 'rejected' && <span className="px-2 py-1 bg-rose-500/10 text-rose-400 rounded-lg text-xs border border-rose-500/20">Rejected</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right space-x-2">
                      {update.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleApprove(update._id, 'approved')}
                            disabled={processingId === update._id}
                            className="p-1.5 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 rounded-lg transition-colors disabled:opacity-50"
                            title="Setujui"
                          >
                            <CheckCircle size={18} />
                          </button>
                          <button
                            onClick={() => handleApprove(update._id, 'rejected')}
                            disabled={processingId === update._id}
                            className="p-1.5 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 rounded-lg transition-colors disabled:opacity-50"
                            title="Tolak"
                          >
                            <XCircle size={18} />
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function EyeIcon() {
  return <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
}
