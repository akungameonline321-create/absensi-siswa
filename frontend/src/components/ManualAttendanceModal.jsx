import { useState, useEffect } from 'react';
import { X, CheckCircle, Clock, XCircle, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { getStudents, createManualAttendance } from '../services/api';

const ManualAttendanceModal = ({ isOpen, onClose, onSuccess, classId, classData, attendanceList }) => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [status, setStatus] = useState('hadir');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && classId) {
      fetchStudents();
    }
  }, [isOpen, classId]);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const res = await getStudents(classId);
      // Filter out students who are already marked in attendanceList
      const attendedIds = attendanceList.map((a) => String(a.student_id));
      const availableStudents = (res.data?.students || res.data || []).filter(
        (s) => !attendedIds.includes(String(s.id))
      );
      setStudents(availableStudents);
      if (availableStudents.length > 0) {
        setSelectedStudent(String(availableStudents[0].id));
      } else {
        setSelectedStudent('');
      }
    } catch (error) {
      toast.error('Gagal memuat daftar siswa.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedStudent || !status) return;

    setIsSubmitting(true);
    try {
      const studentObj = students.find((s) => String(s.id) === selectedStudent);
      if (!studentObj) return;

      const payload = {
        student_id: studentObj.id,
        nis: studentObj.nis,
        nama_siswa: studentObj.nama,
        kelas_id: classId,
        nama_kelas: classData?.nama_kelas || `Kelas ${classId}`,
        status,
      };

      await createManualAttendance(payload);
      toast.success(`Absensi manual ${studentObj.nama} berhasil dicatat.`);
      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Gagal mencatat absensi manual.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#111827] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-white/5">
          <h2 className="text-lg font-semibold text-white">Absensi Manual</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : students.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3 opacity-50" />
              <p className="text-gray-400 font-medium">Semua siswa sudah diabsen hari ini.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">
                  Pilih Siswa
                </label>
                <select
                  value={selectedStudent}
                  onChange={(e) => setSelectedStudent(e.target.value)}
                  className="w-full appearance-none px-4 py-2.5 bg-[#0a0e1a] border border-white/10 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                  required
                >
                  <option value="" disabled>Pilih siswa yang belum diabsen</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nis} - {s.nama}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">
                  Status Kehadiran
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <StatusRadio
                    label="Hadir"
                    value="hadir"
                    icon={<CheckCircle size={16} />}
                    color="emerald"
                    currentValue={status}
                    onChange={setStatus}
                  />
                  <StatusRadio
                    label="Izin"
                    value="izin"
                    icon={<Clock size={16} />}
                    color="sky"
                    currentValue={status}
                    onChange={setStatus}
                  />
                  <StatusRadio
                    label="Sakit"
                    value="sakit"
                    icon={<AlertCircle size={16} />}
                    color="purple"
                    currentValue={status}
                    onChange={setStatus}
                  />
                  <StatusRadio
                    label="Alpa"
                    value="alpa"
                    icon={<XCircle size={16} />}
                    color="rose"
                    currentValue={status}
                    onChange={setStatus}
                  />
                </div>
              </div>

              <div className="pt-4 mt-2 border-t border-white/5 flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl border border-white/10 text-gray-300 font-medium hover:bg-white/5 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !selectedStudent}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex justify-center items-center gap-2"
                >
                  {isSubmitting ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    'Simpan'
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

const StatusRadio = ({ label, value, icon, color, currentValue, onChange }) => {
  const isSelected = currentValue === value;
  
  const colors = {
    emerald: 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400',
    sky: 'border-sky-500/50 bg-sky-500/10 text-sky-400',
    purple: 'border-purple-500/50 bg-purple-500/10 text-purple-400',
    rose: 'border-rose-500/50 bg-rose-500/10 text-rose-400',
  };

  return (
    <label
      className={`
        flex flex-col items-center justify-center p-3 rounded-xl border cursor-pointer transition-all
        ${isSelected ? colors[color] : 'border-white/10 bg-[#0a0e1a] text-gray-500 hover:border-white/20'}
      `}
    >
      <input
        type="radio"
        name="status"
        value={value}
        checked={isSelected}
        onChange={(e) => onChange(e.target.value)}
        className="hidden"
      />
      <div className="mb-1">{icon}</div>
      <span className="text-sm font-medium">{label}</span>
    </label>
  );
};

export default ManualAttendanceModal;
