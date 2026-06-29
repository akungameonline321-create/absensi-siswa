import { useState, useEffect, useRef } from 'react';
import { Search, Upload, CheckCircle2, XCircle, ScanFace, Loader2, ImagePlus, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { getStudents, registerFace, getFaceStatus } from '../../services/api';

export default function RegisterFace() {
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [faceStatus, setFaceStatus] = useState(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef(null);
  const dropZoneRef = useRef(null);

  useEffect(() => {
    async function fetch() {
      try { const res = await getStudents(); setStudents(res.data); } catch (e) { toast.error('Gagal memuat data siswa'); }
      setLoading(false);
    }
    fetch();
  }, []);

  async function selectStudent(student) {
    setSelectedStudent(student);
    setFile(null);
    setPreview(null);
    try {
      const res = await getFaceStatus(student.id);
      setFaceStatus(res.data);
    } catch (e) { setFaceStatus(null); }
  }

  function handleFileChange(e) {
    const f = e.target.files[0];
    if (!f) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(f.type)) { toast.error('Format file harus JPEG, PNG, atau WebP'); return; }
    if (f.size > 5 * 1024 * 1024) { toast.error('Ukuran file maksimal 5MB'); return; }
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    dropZoneRef.current?.classList.remove('border-indigo-500');
    const f = e.dataTransfer.files[0];
    if (f) {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(f.type)) { toast.error('Format file harus JPEG, PNG, atau WebP'); return; }
      setFile(f);
      setPreview(URL.createObjectURL(f));
    }
  }

  function handleDragOver(e) { e.preventDefault(); dropZoneRef.current?.classList.add('border-indigo-500'); }
  function handleDragLeave(e) { e.preventDefault(); dropZoneRef.current?.classList.remove('border-indigo-500'); }

  async function handleRegister() {
    if (!selectedStudent || !file) { toast.error('Pilih siswa dan upload foto terlebih dahulu'); return; }
    setUploading(true);
    try {
      await registerFace(selectedStudent.id, file);
      toast.success(`Wajah ${selectedStudent.nama} berhasil didaftarkan!`);
      setFaceStatus({ ...faceStatus, is_face_registered: true });
      setFile(null);
      setPreview(null);
    } catch (err) { toast.error(err.response?.data?.message || 'Gagal mendaftarkan wajah'); }
    setUploading(false);
  }

  const filteredStudents = students.filter(s =>
    s.nama.toLowerCase().includes(search.toLowerCase()) || s.nis.includes(search)
  ).slice(0, 10);

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Registrasi Wajah</h1>
        <p className="text-gray-400 text-sm mt-1">Daftarkan foto wajah siswa untuk sistem pengenalan</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Search & Select Student */}
        <div className="space-y-4">
          <div className="glass-card p-5">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2"><Search size={18} className="text-indigo-400" /> Cari Siswa</h2>
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input type="text" placeholder="Cari berdasarkan nama atau NIS..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all" />
            </div>
            {search && (
              <div className="mt-3 space-y-1 max-h-60 overflow-y-auto">
                {filteredStudents.length === 0 ? (
                  <p className="text-gray-500 text-sm py-3 text-center">Siswa tidak ditemukan</p>
                ) : (
                  filteredStudents.map(s => (
                    <button key={s.id} onClick={() => { selectStudent(s); setSearch(''); }} className={`w-full text-left px-4 py-3 rounded-xl transition-all flex items-center justify-between ${selectedStudent?.id === s.id ? 'bg-indigo-500/20 border border-indigo-500/30' : 'hover:bg-white/5'}`}>
                      <div>
                        <p className="text-white text-sm font-medium">{s.nama}</p>
                        <p className="text-gray-400 text-xs">{s.nis} · {s.nama_kelas}</p>
                      </div>
                      {s.is_face_registered ? <CheckCircle2 size={16} className="text-emerald-400" /> : <XCircle size={16} className="text-gray-500" />}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Selected Student Info */}
          {selectedStudent && (
            <div className="glass-card p-5 animate-slide-up">
              <h3 className="text-sm text-gray-400 mb-3">Siswa Terpilih</h3>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-xl font-bold">
                  {selectedStudent.nama.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="text-white font-semibold text-lg">{selectedStudent.nama}</p>
                  <p className="text-gray-400 text-sm">NIS: {selectedStudent.nis} · {selectedStudent.nama_kelas}</p>
                  <div className="mt-2">
                    {faceStatus?.is_face_registered ? (
                      <span className="inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400"><CheckCircle2 size={13} /> Wajah Terdaftar</span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full bg-amber-500/20 text-amber-400"><XCircle size={13} /> Belum Terdaftar</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right: Upload Zone */}
        <div className="glass-card p-5">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2"><ScanFace size={18} className="text-indigo-400" /> Upload Foto Wajah</h2>

          {!selectedStudent ? (
            <div className="border-2 border-dashed border-white/10 rounded-2xl py-16 text-center">
              <ScanFace size={48} className="mx-auto mb-3 text-gray-600" />
              <p className="text-gray-500">Pilih siswa terlebih dahulu</p>
            </div>
          ) : preview ? (
            <div className="space-y-4">
              <div className="relative rounded-2xl overflow-hidden border border-white/10">
                <img src={preview} alt="Preview" className="w-full h-64 object-cover" />
                <button onClick={() => { setFile(null); setPreview(null); }} className="absolute top-3 right-3 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/80 transition-all"><X size={16} /></button>
              </div>
              <p className="text-sm text-gray-400 text-center">{file.name} · {(file.size / 1024).toFixed(0)} KB</p>
              <button onClick={handleRegister} disabled={uploading} className="w-full px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium hover:scale-[1.02] transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-purple-500/25">
                {uploading ? <><Loader2 size={18} className="animate-spin" /> Mendaftarkan...</> : <><Upload size={18} /> Daftarkan Wajah</>}
              </button>
            </div>
          ) : (
            <div ref={dropZoneRef} onDrop={handleDrop} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-white/10 rounded-2xl py-16 text-center cursor-pointer hover:border-indigo-500/50 hover:bg-white/[0.02] transition-all duration-300">
              <ImagePlus size={48} className="mx-auto mb-4 text-gray-500" />
              <p className="text-white font-medium mb-1">Klik atau seret foto ke sini</p>
              <p className="text-gray-500 text-sm">Format: JPEG, PNG, WebP · Maks: 5MB</p>
              <p className="text-gray-600 text-xs mt-3">Pastikan foto wajah jelas, 1 orang, posisi menghadap depan</p>
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileChange} className="hidden" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
