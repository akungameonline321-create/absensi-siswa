import { useState, useEffect } from 'react';
import { Clock, X, Save, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { updateBatasWaktuHadir } from '../services/api';

const SetTimeModal = ({ isOpen, onClose, classId, classData, onSuccess }) => {
  const [time, setTime] = useState('07:00');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && classData) {
      // Setup the initial time if the class has batas_waktu_hadir
      setTime(classData.batas_waktu_hadir || '07:00');
    }
  }, [isOpen, classData]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!classId) return;

    try {
      setIsSubmitting(true);
      await updateBatasWaktuHadir(classId, time);
      toast.success(`Batas waktu berhasil diatur ke ${time}`);
      onSuccess(time);
      onClose();
    } catch (error) {
      const msg = error.response?.data?.message || 'Gagal menyimpan batas waktu';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#111827] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-slideUp">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/5 bg-white/5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <Clock size={18} />
            </div>
            <h2 className="text-white font-semibold">Atur Batas Waktu</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-5">
          <div className="mb-4 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex gap-3 text-sm text-amber-300">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p>
              Siswa yang melakukan scan wajah setelah batas waktu ini akan otomatis dicatat sebagai <strong>Terlambat</strong>.
            </p>
          </div>

          <div className="mb-6">
            <label className="block text-sm text-gray-400 mb-2 font-medium">Batas Waktu Hadir (HH:MM)</label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 [color-scheme:dark] text-lg font-mono text-center tracking-widest"
              required
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
              disabled={isSubmitting}
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-lg shadow-indigo-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save size={16} />
              {isSubmitting ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SetTimeModal;
