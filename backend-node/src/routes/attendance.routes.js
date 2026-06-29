// ============================================
// attendance.routes.js — Route Absensi
// ============================================

const express = require("express");
const router = express.Router();
const AttendanceController = require("../controllers/attendance.controller");
const AttendanceLog = require("../models/AttendanceLog");
const Student = require("../models/Student");
const verifyToken = require("../middlewares/verifyToken");
const roleCheck = require("../middlewares/roleCheck");

// Semua route memerlukan autentikasi
router.use(verifyToken);

// ============================================
// GET /api/attendance/report — Laporan absensi harian
// Query: ?tanggal=YYYY-MM-DD&kelas_id=1
// ============================================
router.get("/report", async (req, res) => {
  try {
    const { tanggal, kelas_id } = req.query;
    const reportDate = tanggal || new Date().toISOString().split("T")[0];

    // Ambil semua siswa (opsional filter per kelas)
    const students = await Student.findAll(kelas_id || null);

    // Ambil semua log absensi pada tanggal tersebut
    const query = { tanggal: reportDate };
    if (kelas_id) {
      query.kelas_id = parseInt(kelas_id);
    }
    const logs = await AttendanceLog.find(query).lean();

    // Buat map student_id -> log
    const logMap = {};
    logs.forEach((log) => {
      logMap[log.student_id] = log;
    });

    // Gabungkan: setiap siswa + statusnya
    const report = students.map((s) => {
      const log = logMap[s.id];
      return {
        student_id: s.id,
        nis: s.nis,
        nama: s.nama,
        nama_kelas: s.nama_kelas,
        kelas_id: s.kelas_id,
        jenis_kelamin: s.jenis_kelamin,
        status: log ? log.status : "alpa", // Jika tidak ada log = alfa
        waktu: log ? log.scanned_at : null,
        log_id: log ? log._id : null,
      };
    });

    // Hitung rekap
    const rekap = {
      total: report.length,
      hadir: report.filter((r) => r.status === "hadir").length,
      terlambat: report.filter((r) => r.status === "terlambat").length,
      izin: report.filter((r) => r.status === "izin").length,
      sakit: report.filter((r) => r.status === "sakit").length,
      alpa: report.filter((r) => r.status === "alpa").length,
    };

    res.status(200).json({
      success: true,
      data: {
        tanggal: reportDate,
        rekap,
        siswa: report,
      },
    });
  } catch (error) {
    console.error("❌ Absensi: Gagal generate laporan —", error.message);
    res.status(500).json({ success: false, message: "Terjadi kesalahan server." });
  }
});

// ============================================
// GET /api/attendance/export — Export Laporan ke Excel
// Query: ?tanggal=YYYY-MM-DD&kelas_id=1
// ============================================
router.get("/export", roleCheck("admin", "guru"), async (req, res) => {
  try {
    const { tanggal, kelas_id } = req.query;
    const reportDate = tanggal || new Date().toISOString().split("T")[0];

    // Sama seperti logika report
    const students = await Student.findAll(kelas_id || null);
    const query = { tanggal: reportDate };
    if (kelas_id) {
      query.kelas_id = parseInt(kelas_id);
    }
    const logs = await AttendanceLog.find(query).lean();
    const logMap = {};
    logs.forEach((log) => {
      logMap[log.student_id] = log;
    });

    const report = students.map((s) => {
      const log = logMap[s.id];
      return {
        nis: s.nis,
        nama: s.nama,
        nama_kelas: s.nama_kelas,
        status: log ? log.status : "alpa",
        waktu: log ? new Date(log.scanned_at).toLocaleString("id-ID") : "-",
      };
    });

    // Buat Excel menggunakan SheetJS (XLSX)
    const XLSX = require("xlsx");
    const wb = XLSX.utils.book_new();

    const headers = ["NIS", "Nama Lengkap", "Kelas", "Status", "Waktu Pindai"];
    const rows = report.map((r) => [r.nis, r.nama, r.nama_kelas, r.status, r.waktu]);

    // Data final untuk sheet
    const wsData = [
      [`Laporan Absensi Harian - ${reportDate}`], // Judul Laporan
      [], // Baris kosong
      headers,
      ...rows,
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Merge cell judul
    ws["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 4 } }];

    // Atur lebar kolom
    ws["!cols"] = [
      { wch: 15 }, // NIS
      { wch: 30 }, // Nama
      { wch: 15 }, // Kelas
      { wch: 15 }, // Status
      { wch: 25 }, // Waktu
    ];

    XLSX.utils.book_append_sheet(wb, ws, "Laporan Absensi");

    // Kirim sebagai buffer
    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="Laporan_Absensi_${reportDate}.xlsx"`
    );
    res.send(buffer);
  } catch (error) {
    console.error("❌ Absensi: Gagal export excel —", error.message);
    res.status(500).json({ success: false, message: "Gagal membuat file export." });
  }
});

// ============================================
// GET /api/attendance/rekap-semester — Rekap selama 1 semester
// Query: ?kelas_id=1
// ============================================
router.get("/rekap-semester", roleCheck("admin", "guru"), async (req, res) => {
  try {
    const { kelas_id } = req.query;
    if (!kelas_id) return res.status(400).json({ success: false, message: "kelas_id dibutuhkan" });

    // 1. Ambil semua siswa di kelas tersebut
    const students = await Student.findAll(kelas_id);

    // 2. Ambil semua log absensi untuk kelas tersebut
    const logs = await AttendanceLog.find({ kelas_id: parseInt(kelas_id) }).lean();

    // 3. Hitung total hari efektif (jumlah tanggal unik di logs)
    const uniqueDates = new Set(logs.map(l => l.tanggal));
    const totalHari = uniqueDates.size;

    // 4. Hitung agregat per siswa
    const report = students.map(s => {
      const studentLogs = logs.filter(l => l.student_id === s.id);
      
      const hadir = studentLogs.filter(l => l.status === "hadir").length;
      const terlambat = studentLogs.filter(l => l.status === "terlambat").length;
      const izin = studentLogs.filter(l => l.status === "izin").length;
      const sakit = studentLogs.filter(l => l.status === "sakit").length;
      
      const alpa = Math.max(0, totalHari - (hadir + terlambat + izin + sakit));
      const persen = totalHari > 0 ? Math.round(((hadir + terlambat) / totalHari) * 100) : 0;

      return {
        student_id: s.id,
        nis: s.nis,
        nama: s.nama,
        jenis_kelamin: s.jenis_kelamin,
        hadir,
        terlambat,
        izin,
        sakit,
        alpa,
        persen
      };
    });

    res.status(200).json({
      success: true,
      data: {
        total_hari: totalHari,
        siswa: report
      }
    });
  } catch (error) {
    console.error("❌ Absensi: Gagal rekap semester —", error.message);
    res.status(500).json({ success: false, message: "Terjadi kesalahan server." });
  }
});

// ============================================
// GET /api/attendance/export-semester — Export Excel Rekap Semester
// Query: ?kelas_id=1
// ============================================
router.get("/export-semester", roleCheck("admin", "guru"), async (req, res) => {
  try {
    const { kelas_id } = req.query;
    if (!kelas_id) return res.status(400).json({ success: false, message: "kelas_id dibutuhkan" });

    const students = await Student.findAll(kelas_id);
    const logs = await AttendanceLog.find({ kelas_id: parseInt(kelas_id) }).lean();
    const uniqueDates = new Set(logs.map(l => l.tanggal));
    const totalHari = uniqueDates.size;

    let namaKelasStr = "Kelas";
    if (students.length > 0) namaKelasStr = students[0].nama_kelas;

    const report = students.map(s => {
      const studentLogs = logs.filter(l => l.student_id === s.id);
      const hadir = studentLogs.filter(l => l.status === "hadir").length;
      const terlambat = studentLogs.filter(l => l.status === "terlambat").length;
      const izin = studentLogs.filter(l => l.status === "izin").length;
      const sakit = studentLogs.filter(l => l.status === "sakit").length;
      const alpa = Math.max(0, totalHari - (hadir + terlambat + izin + sakit));
      const persen = totalHari > 0 ? Math.round(((hadir + terlambat) / totalHari) * 100) : 0;

      return [s.nis, s.nama, s.jenis_kelamin, hadir, terlambat, izin, sakit, alpa, `${persen}%`];
    });

    const XLSX = require("xlsx");
    const wb = XLSX.utils.book_new();

    const headers = ["NIS", "Nama Lengkap", "L/P", "Hadir", "Terlambat", "Izin", "Sakit", "Alpa", "Persentase"];
    const wsData = [
      [`Rekap Absensi Semester - ${namaKelasStr}`],
      [`Total Hari Efektif: ${totalHari} Hari`],
      [],
      headers,
      ...report,
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws["!merges"] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 8 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 8 } }
    ];
    ws["!cols"] = [
      { wch: 15 }, // NIS
      { wch: 30 }, // Nama
      { wch: 5 },  // L/P
      { wch: 10 }, // Hadir
      { wch: 12 }, // Terlambat
      { wch: 10 }, // Izin
      { wch: 10 }, // Sakit
      { wch: 10 }, // Alpa
      { wch: 12 }, // Persentase
    ];

    XLSX.utils.book_append_sheet(wb, ws, "Rekap Semester");
    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="Rekap_Semester_${namaKelasStr}.xlsx"`);
    res.send(buffer);
  } catch (error) {
    console.error("❌ Absensi: Gagal export rekap semester —", error.message);
    res.status(500).json({ success: false, message: "Gagal membuat file export." });
  }
});

// POST /api/attendance/manual — Tambah absensi manual
router.post("/manual", AttendanceController.createManualAttendance);

// GET /api/attendance/today/:classId — Kehadiran hari ini per kelas
router.get("/today/:classId", AttendanceController.getTodayByClass);

// GET /api/attendance/history/:classId?tanggal=YYYY-MM-DD — Riwayat per tanggal
router.get("/history/:classId", AttendanceController.getHistory);

// GET /api/attendance/student/:studentId — Riwayat per siswa
router.get("/student/:studentId", AttendanceController.getByStudent);

// DELETE /api/attendance/:id — Hapus absensi
router.delete("/:id", AttendanceController.deleteAttendance);

module.exports = router;
