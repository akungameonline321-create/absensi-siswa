// ============================================
// class.routes.js — Route CRUD Kelas
// ============================================

const express = require("express");
const router = express.Router();
const ClassRoom = require("../models/ClassRoom");
const verifyToken = require("../middlewares/verifyToken");
const roleCheck = require("../middlewares/roleCheck");

// Semua route memerlukan autentikasi
router.use(verifyToken);

// ============================================
// GET /api/classes — Daftar semua kelas
// Query params: ?tahun_ajaran=2025/2026
// ============================================
router.get("/", async (req, res) => {
  try {
    const { tahun_ajaran } = req.query;
    const classes = await ClassRoom.findAll(tahun_ajaran || null);

    res.status(200).json({
      success: true,
      data: classes,
      total: classes.length,
    });
  } catch (error) {
    console.error("❌ Class  : Gagal ambil daftar —", error.message);
    res.status(500).json({ success: false, message: "Terjadi kesalahan server." });
  }
});

// ============================================
// GET /api/classes/my — Kelas yang diampu guru (berdasarkan token)
// ============================================
router.get("/my", async (req, res) => {
  try {
    const classes = await ClassRoom.findByGuru(req.user.id);

    res.status(200).json({
      success: true,
      data: classes,
      total: classes.length,
    });
  } catch (error) {
    console.error("❌ Class  : Gagal ambil kelas guru —", error.message);
    res.status(500).json({ success: false, message: "Terjadi kesalahan server." });
  }
});

// ============================================
// GET /api/classes/:id — Detail kelas
// ============================================
router.get("/:id", async (req, res) => {
  try {
    const kelas = await ClassRoom.findById(req.params.id);
    if (!kelas) {
      return res.status(404).json({ success: false, message: "Kelas tidak ditemukan." });
    }

    res.status(200).json({ success: true, data: kelas });
  } catch (error) {
    console.error("❌ Class  : Gagal ambil detail —", error.message);
    res.status(500).json({ success: false, message: "Terjadi kesalahan server." });
  }
});

// ============================================
// POST /api/classes — Tambah kelas baru (admin only)
// ============================================
router.post("/", roleCheck("admin"), async (req, res) => {
  try {
    const { nama_kelas, tingkat, jurusan, tahun_ajaran, wali_kelas_id } = req.body;

    if (!nama_kelas || !tingkat || !tahun_ajaran) {
      return res.status(400).json({
        success: false,
        message: "Field 'nama_kelas', 'tingkat', dan 'tahun_ajaran' wajib diisi.",
      });
    }

    const result = await ClassRoom.create({
      nama_kelas, tingkat, jurusan, tahun_ajaran, wali_kelas_id,
    });

    res.status(201).json({
      success: true,
      message: "Kelas berhasil ditambahkan.",
      data: { id: result.insertId, nama_kelas },
    });
  } catch (error) {
    // Cek apakah error karena duplikat (unique constraint)
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        success: false,
        message: "Kelas dengan nama dan tahun ajaran yang sama sudah ada.",
      });
    }
    console.error("❌ Class  : Gagal tambah —", error.message);
    res.status(500).json({ success: false, message: "Terjadi kesalahan server." });
  }
});

// ============================================
// PUT /api/classes/:id — Update kelas (admin only)
// ============================================
router.put("/:id", roleCheck("admin"), async (req, res) => {
  try {
    const kelas = await ClassRoom.findById(req.params.id);
    if (!kelas) {
      return res.status(404).json({ success: false, message: "Kelas tidak ditemukan." });
    }

    const result = await ClassRoom.update(req.params.id, req.body);

    res.status(200).json({
      success: true,
      message: "Data kelas berhasil diperbarui.",
      affectedRows: result.affectedRows,
    });
  } catch (error) {
    console.error("❌ Class  : Gagal update —", error.message);
    res.status(500).json({ success: false, message: "Terjadi kesalahan server." });
  }
});

// ============================================
// PUT /api/classes/:id/batas-waktu — Update batas waktu hadir (admin & guru)
// ============================================
router.put("/:id/batas-waktu", roleCheck("admin", "guru"), async (req, res) => {
  try {
    const { batas_waktu_hadir } = req.body;
    if (!batas_waktu_hadir) {
      return res.status(400).json({ success: false, message: "Batas waktu wajib diisi." });
    }

    const kelas = await ClassRoom.findById(req.params.id);
    if (!kelas) {
      return res.status(404).json({ success: false, message: "Kelas tidak ditemukan." });
    }

    // Jika yang login guru, pastikan dia wali kelasnya
    if (req.user.role === "guru" && kelas.wali_kelas_id !== req.user.id) {
      return res.status(403).json({ success: false, message: "Hanya wali kelas yang dapat mengubah batas waktu kelas ini." });
    }

    const result = await ClassRoom.update(req.params.id, { batas_waktu_hadir });

    res.status(200).json({
      success: true,
      message: "Batas waktu kehadiran berhasil diperbarui.",
      affectedRows: result.affectedRows,
    });
  } catch (error) {
    console.error("❌ Class  : Gagal update batas waktu —", error.message);
    res.status(500).json({ success: false, message: "Terjadi kesalahan server." });
  }
});

// ============================================
// DELETE /api/classes/:id — Hapus kelas (admin only)
// ============================================
router.delete("/:id", roleCheck("admin"), async (req, res) => {
  try {
    const kelas = await ClassRoom.findById(req.params.id);
    if (!kelas) {
      return res.status(404).json({ success: false, message: "Kelas tidak ditemukan." });
    }

    await ClassRoom.delete(req.params.id);

    res.status(200).json({
      success: true,
      message: `Kelas '${kelas.nama_kelas}' berhasil dihapus.`,
    });
  } catch (error) {
    // Cek apakah gagal karena masih ada siswa (FK constraint)
    if (error.code === "ER_ROW_IS_REFERENCED_2") {
      return res.status(409).json({
        success: false,
        message: "Tidak bisa menghapus kelas yang masih memiliki siswa.",
      });
    }
    console.error("❌ Class  : Gagal hapus —", error.message);
    res.status(500).json({ success: false, message: "Terjadi kesalahan server." });
  }
});

module.exports = router;
