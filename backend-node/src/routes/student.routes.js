// ============================================
// student.routes.js — Route CRUD Siswa
// ============================================

const express = require("express");
const router = express.Router();
const multer = require("multer");
const XLSX = require("xlsx");
const Student = require("../models/Student");
const { pool } = require("../config/db.mysql");
const verifyToken = require("../middlewares/verifyToken");
const roleCheck = require("../middlewares/roleCheck");

// Multer setup — simpan di memory (tidak perlu file di disk)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // max 5MB
  fileFilter: (req, file, cb) => {
    const allowed = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Hanya file Excel (.xlsx / .xls) yang diizinkan."));
    }
  },
});

// Semua route di bawah memerlukan autentikasi
router.use(verifyToken);

// ============================================
// GET /api/students/template — Download template Excel
// ============================================
router.get("/template", roleCheck("admin"), (req, res) => {
  try {
    const wb = XLSX.utils.book_new();

    // Header columns
    const headers = ["NIS", "NISN", "Nama Lengkap", "Nama Kelas", "Jenis Kelamin (L/P)", "Alamat", "No. Telp Orang Tua"];

    // Example rows
    const exampleData = [
      headers,
      ["10001", "0012345678", "Ahmad Rizky", "X IPA 1", "L", "Jl. Merdeka No. 10", "081234567890"],
      ["10002", "0012345679", "Siti Nurhaliza", "X IPA 1", "P", "Jl. Sudirman No. 5", "082345678901"],
    ];

    const ws = XLSX.utils.aoa_to_sheet(exampleData);

    // Set column widths
    ws["!cols"] = [
      { wch: 12 }, // NIS
      { wch: 16 }, // NISN
      { wch: 25 }, // Nama Lengkap
      { wch: 15 }, // Nama Kelas
      { wch: 20 }, // Jenis Kelamin
      { wch: 30 }, // Alamat
      { wch: 18 }, // No Telp
    ];

    XLSX.utils.book_append_sheet(wb, ws, "Data Siswa");

    // Instruction sheet
    const instruksi = [
      ["PETUNJUK PENGISIAN TEMPLATE IMPORT SISWA"],
      [""],
      ["1. Isi data siswa mulai dari baris ke-2 (baris pertama adalah header, JANGAN dihapus)"],
      ["2. Kolom NIS wajib diisi dan harus unik (angka saja)"],
      ["3. Kolom NISN opsional (angka saja, 10 digit)"],
      ["4. Kolom Nama Lengkap wajib diisi"],
      ["5. Kolom Nama Kelas harus sesuai dengan kelas yang sudah terdaftar di sistem"],
      ["   Contoh: X IPA 1, X IPS 2, XI IPA 1, dst"],
      ["6. Kolom Jenis Kelamin diisi L (Laki-laki) atau P (Perempuan)"],
      ["7. Kolom Alamat dan No. Telp Orang Tua bersifat opsional"],
      ["8. Hapus baris contoh (baris 2 & 3) sebelum mengisi data Anda"],
      [""],
      ["CATATAN:"],
      ["- Pastikan nama kelas sudah terdaftar di menu Kelola Kelas"],
      ["- NIS yang sudah ada di database akan dilewati (tidak di-overwrite)"],
      ["- Maksimal ukuran file: 5MB"],
    ];
    const wsInstruksi = XLSX.utils.aoa_to_sheet(instruksi);
    wsInstruksi["!cols"] = [{ wch: 70 }];
    XLSX.utils.book_append_sheet(wb, wsInstruksi, "Petunjuk");

    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    res.setHeader("Content-Disposition", "attachment; filename=template_import_siswa.xlsx");
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.send(buffer);
  } catch (error) {
    console.error("❌ Student: Gagal generate template —", error.message);
    res.status(500).json({ success: false, message: "Gagal generate template." });
  }
});

// ============================================
// GET /api/students/export — Export data siswa ke Excel
// ============================================
router.get("/export", roleCheck("admin"), async (req, res) => {
  try {
    const students = await Student.findAll(null);

    const headers = ["No", "NIS", "NISN", "Nama Lengkap", "Kelas", "Jenis Kelamin", "Alamat", "No. Telp Orang Tua", "Wajah Terdaftar", "Status"];

    const data = [headers];
    students.forEach((s, i) => {
      data.push([
        i + 1,
        s.nis,
        s.nisn || "",
        s.nama,
        s.nama_kelas,
        s.jenis_kelamin === "L" ? "Laki-laki" : "Perempuan",
        s.alamat || "",
        s.no_telp_ortu || "",
        s.is_face_registered ? "Ya" : "Belum",
        s.is_active ? "Aktif" : "Nonaktif",
      ]);
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(data);

    // Set column widths
    ws["!cols"] = [
      { wch: 5 },  // No
      { wch: 12 }, // NIS
      { wch: 16 }, // NISN
      { wch: 25 }, // Nama
      { wch: 15 }, // Kelas
      { wch: 15 }, // JK
      { wch: 30 }, // Alamat
      { wch: 18 }, // No Telp
      { wch: 15 }, // Wajah
      { wch: 10 }, // Status
    ];

    XLSX.utils.book_append_sheet(wb, ws, "Data Siswa");

    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    const tanggal = new Date().toISOString().slice(0, 10);
    res.setHeader("Content-Disposition", `attachment; filename=data_siswa_${tanggal}.xlsx`);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.send(buffer);
  } catch (error) {
    console.error("❌ Student: Gagal export —", error.message);
    res.status(500).json({ success: false, message: "Gagal export data siswa." });
  }
});

// ============================================
// POST /api/students/import — Import data siswa dari Excel
// ============================================
router.post("/import", roleCheck("admin"), upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "File Excel wajib diunggah." });
    }

    const wb = XLSX.read(req.file.buffer, { type: "buffer" });
    const sheetName = wb.SheetNames[0];
    const ws = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

    if (rows.length < 2) {
      return res.status(400).json({ success: false, message: "File Excel kosong atau hanya berisi header." });
    }

    // Ambil daftar kelas dari database untuk mapping nama_kelas -> id
    const [classRows] = await pool.query("SELECT id, nama_kelas FROM classes");
    const classMap = {};
    classRows.forEach((c) => {
      classMap[c.nama_kelas.toLowerCase().trim()] = c.id;
    });

    const results = { berhasil: 0, gagal: 0, dilewati: 0, errors: [] };

    // Proses baris data (mulai baris ke-2, index 1)
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 1;

      // Skip baris kosong
      if (!row[0] && !row[2]) continue;

      const nis = String(row[0] || "").trim();
      const nisn = String(row[1] || "").trim();
      const nama = String(row[2] || "").trim();
      const namaKelas = String(row[3] || "").trim();
      const jk = String(row[4] || "").trim().toUpperCase();
      const alamat = String(row[5] || "").trim();
      const noTelp = String(row[6] || "").trim();

      // Validasi
      if (!nis) {
        results.errors.push(`Baris ${rowNum}: NIS kosong`);
        results.gagal++;
        continue;
      }
      if (!nama) {
        results.errors.push(`Baris ${rowNum}: Nama kosong`);
        results.gagal++;
        continue;
      }
      if (!namaKelas) {
        results.errors.push(`Baris ${rowNum}: Nama Kelas kosong`);
        results.gagal++;
        continue;
      }

      const kelasId = classMap[namaKelas.toLowerCase()];
      if (!kelasId) {
        results.errors.push(`Baris ${rowNum}: Kelas "${namaKelas}" tidak ditemukan di database`);
        results.gagal++;
        continue;
      }

      const jenisKelamin = jk === "L" || jk === "LAKI-LAKI" ? "L" : jk === "P" || jk === "PEREMPUAN" ? "P" : null;
      if (!jenisKelamin) {
        results.errors.push(`Baris ${rowNum}: Jenis kelamin tidak valid (harus L atau P)`);
        results.gagal++;
        continue;
      }

      // Cek duplikat NIS
      const existing = await Student.findByNis(nis);
      if (existing) {
        results.dilewati++;
        results.errors.push(`Baris ${rowNum}: NIS "${nis}" sudah terdaftar — dilewati`);
        continue;
      }

      // Insert
      try {
        await Student.create({
          nis,
          nisn: nisn || null,
          nama,
          kelas_id: kelasId,
          jenis_kelamin: jenisKelamin,
          alamat: alamat || null,
          no_telp_ortu: noTelp || null,
        });
        results.berhasil++;
      } catch (err) {
        results.errors.push(`Baris ${rowNum}: ${err.message}`);
        results.gagal++;
      }
    }

    res.status(200).json({
      success: true,
      message: `Import selesai: ${results.berhasil} berhasil, ${results.dilewati} dilewati, ${results.gagal} gagal.`,
      data: results,
    });
  } catch (error) {
    console.error("❌ Student: Gagal import —", error.message);
    res.status(500).json({ success: false, message: "Gagal import data siswa: " + error.message });
  }
});

// ============================================
// GET /api/students — Daftar semua siswa
// Query params: ?kelas_id=1
// ============================================
router.get("/", async (req, res) => {
  try {
    const { kelas_id } = req.query;
    const students = await Student.findAll(kelas_id || null);

    res.status(200).json({
      success: true,
      data: students,
      total: students.length,
    });
  } catch (error) {
    console.error("❌ Student: Gagal ambil daftar —", error.message);
    res.status(500).json({ success: false, message: "Terjadi kesalahan server." });
  }
});

// ============================================
// GET /api/students/count — Jumlah siswa per kelas
// ============================================
router.get("/count", async (req, res) => {
  try {
    const counts = await Student.countByClass();

    res.status(200).json({
      success: true,
      data: counts,
    });
  } catch (error) {
    console.error("❌ Student: Gagal hitung —", error.message);
    res.status(500).json({ success: false, message: "Terjadi kesalahan server." });
  }
});

// ============================================
// FITUR UPDATE WAJAH
// ============================================
const FaceUpdate = require("../models/FaceUpdate");
const fs = require("fs");
const path = require("path");
const FormData = require("form-data");
const axios = require("axios");

const uploadImage = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Hanya file gambar yang diizinkan."));
    }
  },
});

// POST /api/students/request-face-update
router.post("/request-face-update", uploadImage.single("photo"), async (req, res) => {
  try {
    const student_id = req.user.role === "siswa" ? req.user.student_id : req.body.student_id;
    if (!student_id) return res.status(400).json({ success: false, message: "Student ID required" });
    
    if (!req.file) return res.status(400).json({ success: false, message: "Foto wajib dilampirkan" });

    const student = await Student.findById(student_id);
    if (!student) return res.status(404).json({ success: false, message: "Siswa tidak ditemukan" });

    // Simpan foto sementara di folder uploads/faces
    const dir = path.join(__dirname, "../../uploads/faces");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const fileName = `update_req_${student_id}_${Date.now()}.jpg`;
    const filePath = path.join(dir, fileName);
    fs.writeFileSync(filePath, req.file.buffer);

    const faceUpdate = await FaceUpdate.create({
      student_id: student.id,
      nis: student.nis,
      nama_siswa: student.nama,
      kelas_id: student.kelas_id,
      nama_kelas: student.nama_kelas,
      photo_path: `/uploads/faces/${fileName}`
    });

    res.status(201).json({ success: true, message: "Request pembaruan wajah berhasil dikirim", data: faceUpdate });
  } catch (error) {
    console.error("❌ Gagal request update wajah:", error.message);
    res.status(500).json({ success: false, message: "Terjadi kesalahan server" });
  }
});

// GET /api/students/face-updates
router.get("/face-updates", roleCheck("admin"), async (req, res) => {
  try {
    const updates = await FaceUpdate.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: updates });
  } catch (error) {
    res.status(500).json({ success: false, message: "Terjadi kesalahan server" });
  }
});

// POST /api/students/approve-face-update/:id
router.post("/approve-face-update/:id", roleCheck("admin"), async (req, res) => {
  try {
    const { status } = req.body; // "approved" atau "rejected"
    const updateReq = await FaceUpdate.findById(req.params.id);
    if (!updateReq) return res.status(404).json({ success: false, message: "Request tidak ditemukan" });

    if (status === "rejected") {
      updateReq.status = "rejected";
      updateReq.approved_by = req.user.id;
      await updateReq.save();
      return res.status(200).json({ success: true, message: "Request ditolak" });
    }

    if (status === "approved") {
      // Baca file
      const filePath = path.join(__dirname, "../..", updateReq.photo_path);
      const fileBuffer = fs.readFileSync(filePath);

      // Kirim ke ML Engine untuk update dataset
      const form = new FormData();
      form.append("file", fileBuffer, { filename: "face.jpg", contentType: "image/jpeg" });
      form.append("student_id", updateReq.student_id);
      form.append("nis", updateReq.nis);
      form.append("nama", updateReq.nama_siswa);

      const ML_ENGINE_URL = process.env.ML_ENGINE_URL || "http://localhost:8000";
      const mlRes = await axios.post(`${ML_ENGINE_URL}/api/v1/register`, form, {
        headers: form.getHeaders()
      });

      if (mlRes.data.success) {
        updateReq.status = "approved";
        updateReq.approved_by = req.user.id;
        await updateReq.save();
        return res.status(200).json({ success: true, message: "Dataset wajah berhasil diperbarui di AI" });
      } else {
        return res.status(400).json({ success: false, message: "Gagal diproses AI: " + mlRes.data.message });
      }
    }
  } catch (error) {
    console.error("❌ Gagal approve update wajah:", error?.response?.data || error.message);
    res.status(500).json({ success: false, message: error?.response?.data?.detail || "Terjadi kesalahan server" });
  }
});

// ============================================
// GET /api/students/:id — Detail siswa
// ============================================
router.get("/:id", async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ success: false, message: "Siswa tidak ditemukan." });
    }

    res.status(200).json({ success: true, data: student });
  } catch (error) {
    console.error("❌ Student: Gagal ambil detail —", error.message);
    res.status(500).json({ success: false, message: "Terjadi kesalahan server." });
  }
});

// ============================================
// POST /api/students — Tambah siswa baru (admin only)
// ============================================
router.post("/", roleCheck("admin"), async (req, res) => {
  try {
    const { nis, nisn, nama, kelas_id, jenis_kelamin, alamat, no_telp_ortu } = req.body;

    if (!nis || !nama || !kelas_id || !jenis_kelamin) {
      return res.status(400).json({
        success: false,
        message: "Field 'nis', 'nama', 'kelas_id', dan 'jenis_kelamin' wajib diisi.",
      });
    }

    // Cek apakah NIS sudah digunakan
    const existing = await Student.findByNis(nis);
    if (existing) {
      return res.status(409).json({ success: false, message: "NIS sudah terdaftar." });
    }

    const result = await Student.create({
      nis, nisn, nama, kelas_id, jenis_kelamin, alamat, no_telp_ortu,
    });

    res.status(201).json({
      success: true,
      message: "Siswa berhasil ditambahkan.",
      data: { id: result.insertId, nis, nama },
    });
  } catch (error) {
    console.error("❌ Student: Gagal tambah —", error.message);
    res.status(500).json({ success: false, message: "Terjadi kesalahan server." });
  }
});

// ============================================
// PUT /api/students/:id — Update data siswa (admin only)
// ============================================
router.put("/:id", roleCheck("admin"), async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ success: false, message: "Siswa tidak ditemukan." });
    }

    const result = await Student.update(req.params.id, req.body);

    res.status(200).json({
      success: true,
      message: "Data siswa berhasil diperbarui.",
      affectedRows: result.affectedRows,
    });
  } catch (error) {
    console.error("❌ Student: Gagal update —", error.message);
    res.status(500).json({ success: false, message: "Terjadi kesalahan server." });
  }
});

// ============================================
// DELETE /api/students/:id — Hapus siswa (admin only)
// ============================================
router.delete("/:id", roleCheck("admin"), async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ success: false, message: "Siswa tidak ditemukan." });
    }

    await Student.delete(req.params.id);

    res.status(200).json({
      success: true,
      message: `Siswa '${student.nama}' berhasil dihapus.`,
    });
  } catch (error) {
    console.error("❌ Student: Gagal hapus —", error.message);
    res.status(500).json({ success: false, message: "Terjadi kesalahan server." });
  }
});

module.exports = router;
