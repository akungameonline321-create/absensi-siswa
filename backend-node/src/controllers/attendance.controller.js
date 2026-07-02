// ============================================
// attendance.controller.js — Logika Absensi
// Menangani pencatatan dan query data kehadiran
// ============================================

const AttendanceLog = require("../models/AttendanceLog");

const AttendanceController = {
  /**
   * GET /api/attendance/today/:classId
   * Mendapatkan daftar kehadiran hari ini untuk kelas tertentu.
   * Digunakan di dashboard guru untuk melihat siapa saja yang sudah hadir.
   */
  async getTodayByClass(req, res) {
    try {
      const { classId } = req.params;
      const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

      const logs = await AttendanceLog.findTodayByClass(parseInt(classId), today);

      res.status(200).json({
        success: true,
        data: {
          tanggal: today,
          kelas_id: parseInt(classId),
          total_hadir: logs.length,
          logs,
        },
      });
    } catch (error) {
      console.error("❌ Absensi: Gagal ambil data hari ini —", error.message);
      res.status(500).json({
        success: false,
        message: "Terjadi kesalahan server.",
      });
    }
  },

  /**
   * GET /api/attendance/history/:classId?tanggal=YYYY-MM-DD
   * Mendapatkan riwayat kehadiran kelas pada tanggal tertentu.
   */
  async getHistory(req, res) {
    try {
      const { classId } = req.params;
      const { tanggal } = req.query;

      if (!tanggal) {
        return res.status(400).json({
          success: false,
          message: "Parameter 'tanggal' (YYYY-MM-DD) wajib diisi.",
        });
      }

      const logs = await AttendanceLog.findHistoryByClass(parseInt(classId), tanggal);

      res.status(200).json({
        success: true,
        data: {
          tanggal,
          kelas_id: parseInt(classId),
          total_hadir: logs.length,
          logs,
        },
      });
    } catch (error) {
      console.error("❌ Absensi: Gagal ambil riwayat —", error.message);
      res.status(500).json({
        success: false,
        message: "Terjadi kesalahan server.",
      });
    }
  },

  /**
   * GET /api/attendance/student/:studentId
   * Mendapatkan riwayat kehadiran seorang siswa (semua tanggal).
   */
  async getByStudent(req, res) {
    try {
      const { studentId } = req.params;
      const { limit = 30 } = req.query;

      const logs = await AttendanceLog.findByStudent(parseInt(studentId), parseInt(limit));

      res.status(200).json({
        success: true,
        data: {
          student_id: parseInt(studentId),
          total_records: logs.length,
          logs,
        },
      });
    } catch (error) {
      console.error("❌ Absensi: Gagal ambil data siswa —", error.message);
      res.status(500).json({
        success: false,
        message: "Terjadi kesalahan server.",
      });
    }
  },

  /**
   * Memeriksa apakah siswa sudah dipindai dalam periode cooldown.
   * Digunakan secara internal oleh sistem (bukan endpoint publik).
   *
   * @param {number} studentId - ID siswa
   * @param {number} cooldownMinutes - Jeda waktu dalam menit (default: 60)
   * @returns {boolean} true jika masih dalam cooldown
   */
  async isInCooldown(studentId, cooldownMinutes = 60) {
    const cutoffTime = new Date(Date.now() - cooldownMinutes * 60 * 1000);

    const recentLog = await AttendanceLog.findRecentByStudent(studentId, cutoffTime);

    return !!recentLog;
  },

  /**
   * DELETE /api/attendance/:id
   * Menghapus catatan absensi (misalnya jika ada kecurangan)
   */
  async deleteAttendance(req, res) {
    try {
      const { id } = req.params;
      const deletedLog = await AttendanceLog.delete(id);

      if (!deletedLog) {
        return res.status(404).json({
          success: false,
          message: "Data absensi tidak ditemukan.",
        });
      }

      res.status(200).json({
        success: true,
        message: "Data absensi berhasil dihapus.",
        data: deletedLog,
      });
    } catch (error) {
      console.error("❌ Absensi: Gagal menghapus data —", error.message);
      res.status(500).json({
        success: false,
        message: "Terjadi kesalahan server.",
      });
    }
  },
  /**
   * POST /api/attendance/manual
   * Menambahkan log absensi secara manual (Sakit, Izin, Alpa, Hadir)
   */
  async createManualAttendance(req, res) {
    try {
      let { student_id, nis, nama_siswa, kelas_id, nama_kelas, status } = req.body;
      const role = req.user?.role || "guru";
      let guru_id = req.user?.id || 0;
      let nama_guru = req.user?.nama || "Guru";

      // Jika yang login adalah siswa
      if (role === "siswa") {
        // Siswa hanya boleh absen untuk dirinya sendiri
        if (req.user.student_id && req.user.student_id !== parseInt(student_id)) {
          return res.status(403).json({
            success: false,
            message: "Siswa hanya dapat mengajukan izin untuk dirinya sendiri.",
          });
        }
        // Siswa hanya boleh memilih status izin atau sakit
        if (status !== "izin" && status !== "sakit") {
          return res.status(400).json({
            success: false,
            message: "Siswa hanya dapat mengajukan status 'izin' atau 'sakit'.",
          });
        }
        nama_guru = `Pengajuan Mandiri (${req.user.nama})`;
      }

      if (!student_id || !kelas_id || !status) {
        return res.status(400).json({
          success: false,
          message: "Data tidak lengkap (student_id, kelas_id, status wajib diisi).",
        });
      }

      const today = new Date().toISOString().split("T")[0];

      // Cek apakah sudah absen hari ini
      const existingLog = await AttendanceLog.findTodayByStudent(parseInt(student_id), today);

      if (existingLog) {
        return res.status(400).json({
          success: false,
          message: `${nama_siswa} sudah tercatat absensinya hari ini.`,
        });
      }

      const newLog = await AttendanceLog.create({
        student_id: parseInt(student_id),
        nis: nis || "-",
        nama_siswa: nama_siswa || "Unknown",
        kelas_id: parseInt(kelas_id),
        nama_kelas: nama_kelas || "-",
        guru_id,
        nama_guru,
        status,
        confidence: 1, // 100% confidence karena diinput manual oleh guru
        liveness_passed: true,
        tanggal: today,
      });

      // Emit socket event to the class room so all dashboards update
      const io = req.app.get("io");
      if (io) {
        io.to(`class:${kelas_id}`).emit("attendance:update", {
          _id: newLog._id,
          student_id: newLog.student_id,
          nis: newLog.nis,
          nama: newLog.nama_siswa,
          nama_kelas: newLog.nama_kelas,
          confidence: newLog.confidence,
          status: newLog.status,
          scanned_at: newLog.scanned_at,
        });
      }

      // --- 8. Kirim Notifikasi WhatsApp ---
      try {
        const Student = require("../models/Student");
        const studentData = await Student.findById(parseInt(student_id));
        if (studentData && studentData.no_telp_ortu) {
          const { sendMessage } = require("../services/whatsapp.service");
          const waktu = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
          let msg = `*NOTIFIKASI ABSENSI SMA*\n\nHalo Bapak/Ibu,\nAnak Anda *${nama_siswa}* (NIS: ${nis}) telah dicatat absen secara manual oleh *${nama_guru}*.\n\n`;
          msg += `Waktu: *${waktu} WIB*\n`;
          msg += `Status: *${status.toUpperCase()}*\n\n`;
          msg += `Terima kasih.`;
          
          sendMessage(studentData.no_telp_ortu, msg).catch(e => console.error(e));
        }
      } catch (waError) {
        console.error("❌ Gagal mengirim WA manual:", waError.message);
      }

      res.status(201).json({
        success: true,
        message: `Absensi manual berhasil: ${nama_siswa} (${status})`,
        data: newLog,
      });
    } catch (error) {
      console.error("❌ Absensi: Gagal mencatat absensi manual —", error.message);
      res.status(500).json({
        success: false,
        message: "Terjadi kesalahan server saat mencatat absensi manual.",
      });
    }
  },
};

module.exports = AttendanceController;
