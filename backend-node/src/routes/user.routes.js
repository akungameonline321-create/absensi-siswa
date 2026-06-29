// ============================================
// user.routes.js — Route CRUD Users
// ============================================

const express = require("express");
const router = express.Router();
const User = require("../models/User");
const verifyToken = require("../middlewares/verifyToken");
const roleCheck = require("../middlewares/roleCheck");

// Semua route di bawah memerlukan autentikasi
router.use(verifyToken);

// ============================================
// GET /api/users — Daftar semua user
// Query params: ?role=guru
// ============================================
router.get("/", async (req, res) => {
  try {
    const { role } = req.query;
    const users = await User.findAll(role || null);

    // Hapus password dari response untuk keamanan
    const safeUsers = users.map(u => {
      const { password, ...safeUser } = u;
      return safeUser;
    });

    res.status(200).json({
      success: true,
      data: safeUsers,
      total: safeUsers.length,
    });
  } catch (error) {
    console.error("❌ User: Gagal ambil daftar —", error.message);
    res.status(500).json({ success: false, message: "Terjadi kesalahan server." });
  }
});

module.exports = router;
