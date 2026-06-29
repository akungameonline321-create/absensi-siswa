// ============================================
// auth.controller.js — Logika Autentikasi
// Register & Login untuk Admin dan Guru
// ============================================

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Jumlah salt rounds untuk bcrypt (10–12 adalah standar yang aman)
const SALT_ROUNDS = 10;

// Durasi token JWT (24 jam)
const TOKEN_EXPIRY = "24h";

const AuthController = {
  /**
   * POST /api/auth/register
   * Mendaftarkan user baru (Admin atau Guru).
   * Hanya bisa dilakukan oleh Admin yang sudah login.
   */
  async register(req, res) {
    try {
      const { nip, nama, email, password, role, student_id } = req.body;

      // --- Validasi input ---
      if (!nama || !email || !password) {
        return res.status(400).json({
          success: false,
          message: "Field 'nama', 'email', dan 'password' wajib diisi.",
        });
      }

      // Cek apakah email sudah digunakan
      const existingEmail = await User.findByEmail(email);
      if (existingEmail) {
        return res.status(409).json({
          success: false,
          message: "Email sudah terdaftar.",
        });
      }

      // Cek apakah NIP sudah digunakan (jika dikirim)
      if (nip) {
        const existingNip = await User.findByNip(nip);
        if (existingNip) {
          return res.status(409).json({
            success: false,
            message: "NIP sudah terdaftar.",
          });
        }
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

      // Simpan ke database
      const result = await User.create({
        nip: nip || null,
        nama,
        email,
        password: hashedPassword,
        role: role || "guru",
        student_id: student_id || null,
      });

      console.log(`✅ Auth   : User baru terdaftar — ${nama} (${role || "guru"})`);

      res.status(201).json({
        success: true,
        message: "User berhasil didaftarkan.",
        data: {
          id: result.insertId,
          nama,
          email,
          role: role || "guru",
          student_id: student_id || null,
        },
      });
    } catch (error) {
      console.error("❌ Auth   : Gagal register —", error.message);
      res.status(500).json({
        success: false,
        message: "Terjadi kesalahan server.",
      });
    }
  },

  /**
   * POST /api/auth/login
   * Login user dan mengembalikan JWT token.
   */
  async login(req, res) {
    try {
      const { email, password } = req.body;

      // --- Validasi input ---
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: "Email dan password wajib diisi.",
        });
      }

      // Cari user berdasarkan email
      const user = await User.findByEmail(email);
      if (!user) {
        return res.status(401).json({
          success: false,
          message: "Email atau password salah.",
        });
      }

      // Cek apakah akun aktif
      if (!user.is_active) {
        return res.status(403).json({
          success: false,
          message: "Akun Anda telah dinonaktifkan. Hubungi administrator.",
        });
      }

      // Verifikasi password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: "Email atau password salah.",
        });
      }

      // Generate JWT token
      const token = jwt.sign(
        {
          id: user.id,
          email: user.email,
          role: user.role,
          nama: user.nama,
          student_id: user.student_id,
        },
        process.env.JWT_SECRET,
        { expiresIn: TOKEN_EXPIRY }
      );

      console.log(`✅ Auth   : Login berhasil — ${user.nama} (${user.role})`);

      res.status(200).json({
        success: true,
        message: "Login berhasil.",
        data: {
          token,
          user: {
            id: user.id,
            nip: user.nip,
            nama: user.nama,
            email: user.email,
            role: user.role,
            student_id: user.student_id,
          },
        },
      });
    } catch (error) {
      console.error("❌ Auth   : Gagal login —", error.message);
      res.status(500).json({
        success: false,
        message: "Terjadi kesalahan server.",
      });
    }
  },

  /**
   * GET /api/auth/me
   * Mendapatkan profil user yang sedang login (dari token).
   */
  async getProfile(req, res) {
    try {
      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User tidak ditemukan.",
        });
      }

      res.status(200).json({
        success: true,
        data: user,
      });
    } catch (error) {
      console.error("❌ Auth   : Gagal ambil profil —", error.message);
      res.status(500).json({
        success: false,
        message: "Terjadi kesalahan server.",
      });
    }
  },
};

module.exports = AuthController;
