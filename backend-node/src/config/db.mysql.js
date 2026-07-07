// ============================================
// db.mysql.js — Koneksi MySQL menggunakan mysql2 (Pool)
// Database dijalankan via Laragon
// ============================================

const mysql = require("mysql2/promise");

// ============================================
// Buat Connection Pool
// Pool mengelola beberapa koneksi sekaligus, lebih efisien
// daripada membuat koneksi baru setiap kali query.
// ============================================
const poolConfig = {
  host: process.env.MYSQL_HOST || "localhost",
  port: parseInt(process.env.MYSQL_PORT, 10) || 3306,
  user: process.env.MYSQL_USER || "root",
  password: process.env.MYSQL_PASSWORD || "",
  database: process.env.MYSQL_DATABASE || "absensi_sma",

  // --- Konfigurasi Pool ---
  waitForConnections: true,   // Antri jika semua koneksi terpakai
  connectionLimit: 10,        // Maksimum koneksi bersamaan
  queueLimit: 0,              // 0 = tidak ada batas antrian
  connectTimeout: 10000,      // Timeout koneksi 10 detik
};

// Add SSL for Aiven or other cloud providers requiring SSL
if (process.env.MYSQL_HOST && process.env.MYSQL_HOST.includes('aivencloud.com')) {
  poolConfig.ssl = {
    rejectUnauthorized: false
  };
}

const pool = mysql.createPool(poolConfig);

// ============================================
// Fungsi untuk menguji koneksi saat startup
// ============================================
async function connectMySQL() {
  try {
    const connection = await pool.getConnection();

    console.log("✅ MySQL  : Terhubung ke database", `"${process.env.MYSQL_DATABASE || "absensi_sma"}"`);
    console.log(`           Host: ${process.env.MYSQL_HOST || "localhost"}:${process.env.MYSQL_PORT || 3306}`);

    // Lepaskan koneksi kembali ke pool setelah tes
    connection.release();
  } catch (error) {
    console.error("❌ MySQL  : Gagal terhubung —", error.message);
    console.error("   Pastikan Laragon MySQL sudah berjalan dan database 'absensi_sma' sudah dibuat.");
    throw error;
  }
}

module.exports = { pool, connectMySQL };
