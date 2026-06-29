// ============================================
// face.routes.js — Route Registrasi Wajah
// ============================================

const express = require("express");
const multer = require("multer");
const router = express.Router();
const FaceController = require("../controllers/face.controller");
const verifyToken = require("../middlewares/verifyToken");
const roleCheck = require("../middlewares/roleCheck");

// ============================================
// Konfigurasi Multer (upload foto ke memory buffer)
// Tidak disimpan ke disk — langsung forward ke ML Engine
// ============================================
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // Maksimum 5MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Tipe file tidak didukung. Gunakan JPEG, PNG, atau WebP."), false);
    }
  },
});

// Semua route memerlukan autentikasi
router.use(verifyToken);

// POST /api/face/register/:studentId — Daftarkan wajah siswa (admin only)
router.post(
  "/register/:studentId",
  roleCheck("admin"),
  upload.single("photo"),
  FaceController.registerFace
);

// GET /api/face/status/:studentId — Cek status registrasi wajah
router.get("/status/:studentId", FaceController.checkStatus);

module.exports = router;
