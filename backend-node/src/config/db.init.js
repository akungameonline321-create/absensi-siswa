// ============================================
// db.init.js — Inisialisasi Tabel MySQL
// Membuat tabel secara otomatis saat server pertama kali jalan
// ============================================

const { pool } = require("./db.mysql");

/**
 * Membuat semua tabel yang dibutuhkan jika belum ada.
 * Dipanggil sekali saat startup server.
 */
async function initializeDatabase() {
  try {
    console.log("📦 MySQL  : Memeriksa dan membuat tabel...");

    // ============================================
    // Tabel: users (Admin & Guru)
    // ============================================
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id          INT AUTO_INCREMENT PRIMARY KEY,
        nip         VARCHAR(30) UNIQUE COMMENT 'Nomor Induk Pegawai',
        nama        VARCHAR(100) NOT NULL,
        email       VARCHAR(100) NOT NULL UNIQUE,
        password    VARCHAR(255) NOT NULL COMMENT 'Bcrypt hashed',
        role        ENUM('admin', 'guru', 'siswa') NOT NULL DEFAULT 'guru',
        student_id  INT DEFAULT NULL,
        is_active   BOOLEAN DEFAULT TRUE,
        created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log("   ✔ Tabel 'users' siap");

    // ============================================
    // Tabel: classes (Kelas)
    // ============================================
    await pool.query(`
      CREATE TABLE IF NOT EXISTS classes (
        id              INT AUTO_INCREMENT PRIMARY KEY,
        nama_kelas      VARCHAR(30) NOT NULL COMMENT 'Contoh: XII IPA 1',
        tingkat         ENUM('10', '11', '12') NOT NULL,
        jurusan         VARCHAR(30) COMMENT 'Contoh: IPA, IPS, Bahasa',
        tahun_ajaran    VARCHAR(15) NOT NULL COMMENT 'Contoh: 2025/2026',
        wali_kelas_id   INT DEFAULT NULL,
        created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (wali_kelas_id) REFERENCES users(id) ON DELETE SET NULL,
        UNIQUE KEY unique_kelas (nama_kelas, tahun_ajaran)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log("   ✔ Tabel 'classes' siap");

    // ============================================
    // Tabel: students (Siswa)
    // ============================================
    await pool.query(`
      CREATE TABLE IF NOT EXISTS students (
        id                  INT AUTO_INCREMENT PRIMARY KEY,
        nis                 VARCHAR(20) NOT NULL UNIQUE COMMENT 'Nomor Induk Siswa',
        nisn                VARCHAR(20) UNIQUE COMMENT 'Nomor Induk Siswa Nasional',
        nama                VARCHAR(100) NOT NULL,
        kelas_id            INT NOT NULL,
        jenis_kelamin       ENUM('L', 'P') NOT NULL,
        alamat              TEXT,
        no_telp_ortu        VARCHAR(20),
        foto_path           VARCHAR(255) DEFAULT NULL COMMENT 'Path ke foto profil siswa',
        is_face_registered  BOOLEAN DEFAULT FALSE COMMENT 'True jika vektor wajah sudah tersimpan di MongoDB',
        is_active           BOOLEAN DEFAULT TRUE,
        created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (kelas_id) REFERENCES classes(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log("   ✔ Tabel 'students' siap");

    // Add foreign key to users table after students table exists
    try {
      await pool.query(`
        ALTER TABLE users 
        ADD CONSTRAINT fk_user_student 
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
      `);
    } catch (err) {
      // Ignore if constraint already exists
      if (err.code !== 'ER_DUP_KEYNAME') {
         // Some MySQL versions throw this if it exists, otherwise we're good
      }
    }

    console.log("✅ MySQL  : Semua tabel berhasil diinisialisasi\n");
  } catch (error) {
    console.error("❌ MySQL  : Gagal membuat tabel —", error.message);
    throw error;
  }
}

module.exports = { initializeDatabase };
