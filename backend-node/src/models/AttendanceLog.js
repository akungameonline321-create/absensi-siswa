// ============================================
// AttendanceLog.js — Mongoose Schema
// Log absensi real-time di MongoDB Atlas
// ============================================

const { mongoose } = require("../config/db.mongo");

/**
 * Schema untuk mencatat setiap event absensi yang terdeteksi.
 * Disimpan di MongoDB karena:
 * 1. Volume data tinggi (real-time per frame)
 * 2. Struktur data fleksibel
 * 3. Performa write yang lebih baik untuk logging
 */
const attendanceLogSchema = new mongoose.Schema(
  {
    // --- Data Siswa (dari MySQL) ---
    student_id: {
      type: Number,
      required: true,
      index: true,
    },
    nis: {
      type: String,
      required: true,
    },
    nama_siswa: {
      type: String,
      required: true,
    },

    // --- Data Kelas ---
    kelas_id: {
      type: Number,
      required: true,
      index: true,
    },
    nama_kelas: {
      type: String,
      required: true,
    },

    // --- Data Guru yang Memindai ---
    guru_id: {
      type: Number,
      required: true,
    },
    nama_guru: {
      type: String,
      required: true,
    },

    // --- Hasil Pemindaian ---
    status: {
      type: String,
      enum: ["hadir", "terlambat", "izin", "sakit", "alpa"],
      default: "hadir",
    },
    confidence: {
      type: Number,
      min: 0,
      max: 1,
      required: true,
      comment: "Tingkat keyakinan pencocokan wajah (0.0 - 1.0)",
    },
    liveness_passed: {
      type: Boolean,
      default: false,
      comment: "Apakah deteksi kedipan mata (EAR) berhasil",
    },

    // --- Ekstra Fitur (Metrics & Visual) ---
    snapshot_path: {
      type: String,
      default: null,
      comment: "Path atau URL lokal untuk foto bukti absensi",
    },
    processing_time_ms: {
      type: Number,
      default: 0,
      comment: "Waktu yang dibutuhkan dari deteksi awal hingga berhasil",
    },
    attributes: {
      has_mask: { type: Boolean, default: false },
      has_glasses: { type: Boolean, default: false },
    },

    // --- Waktu ---
    scanned_at: {
      type: Date,
      default: Date.now,
      index: true,
    },
    // Tanggal saja (YYYY-MM-DD) untuk query harian yang efisien
    tanggal: {
      type: String,
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: "attendance_logs",
  }
);

// Compound index untuk query: "siapa saja yang hadir di kelas X pada tanggal Y"
attendanceLogSchema.index({ kelas_id: 1, tanggal: 1 });

// Compound index untuk cooldown check: "apakah siswa X sudah absen hari ini"
attendanceLogSchema.index({ student_id: 1, tanggal: 1 });

const AttendanceLog = mongoose.model("AttendanceLog", attendanceLogSchema);

module.exports = AttendanceLog;
