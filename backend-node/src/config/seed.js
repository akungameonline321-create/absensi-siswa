// ============================================
// seed.js — Seeder: Buat Akun Admin Awal
// Jalankan sekali: node src/config/seed.js
// ============================================

require("dotenv").config({ path: require("path").join(__dirname, "../../.env") });

const bcrypt = require("bcryptjs");
const { pool, connectMySQL } = require("./db.mysql");
const { initializeDatabase } = require("./db.init");

const ADMIN_DEFAULT = {
  nip: "ADMIN001",
  nama: "Administrator",
  email: "admin@absensi.local",
  password: "admin123",  // Ganti setelah login pertama!
  role: "admin",
};

async function seed() {
  try {
    // 1. Koneksi ke MySQL
    await connectMySQL();

    // 2. Pastikan tabel sudah dibuat
    await initializeDatabase();

    // 3. Cek apakah admin sudah ada
    const [existing] = await pool.query(
      "SELECT id FROM users WHERE email = ?",
      [ADMIN_DEFAULT.email]
    );

    if (existing.length > 0) {
      console.log("⚠️  Admin sudah ada, skip seeding.");
      process.exit(0);
    }

    // 4. Hash password dan simpan
    const hashedPassword = await bcrypt.hash(ADMIN_DEFAULT.password, 10);

    await pool.query(
      "INSERT INTO users (nip, nama, email, password, role) VALUES (?, ?, ?, ?, ?)",
      [ADMIN_DEFAULT.nip, ADMIN_DEFAULT.nama, ADMIN_DEFAULT.email, hashedPassword, ADMIN_DEFAULT.role]
    );

    console.log("\n✅ Seeder berhasil!");
    console.log("   Akun admin telah dibuat:");
    console.log(`   Email    : ${ADMIN_DEFAULT.email}`);
    console.log(`   Password : ${ADMIN_DEFAULT.password}`);
    console.log("   ⚠️  Segera ganti password setelah login pertama!\n");

    process.exit(0);
  } catch (error) {
    console.error("❌ Seeder gagal:", error.message);
    process.exit(1);
  }
}

seed();
