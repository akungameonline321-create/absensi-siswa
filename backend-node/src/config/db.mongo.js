// ============================================
// db.mongo.js — Koneksi MongoDB (Lokal / Atlas) via Mongoose
// Menyimpan: log absensi real-time, vektor wajah 128D
// ============================================

const mongoose = require("mongoose");

// ============================================
// Fungsi koneksi ke MongoDB Atlas
// ============================================
async function connectMongoDB() {
  try {
    const uri = process.env.MONGODB_URI;

    // Validasi URI sebelum mencoba koneksi
    if (!uri) {
      throw new Error("MONGODB_URI belum diset di file .env");
    }

    await mongoose.connect(uri);

    console.log("✅ MongoDB: Terhubung ke MongoDB");
    console.log(`           Database: ${mongoose.connection.db.databaseName}`);
  } catch (error) {
    console.error("❌ MongoDB: Gagal terhubung —", error.message);
    console.error("   Periksa MONGODB_URI di file .env dan pastikan MongoDB sudah berjalan.");
    throw error;
  }
}

// ============================================
// Event listener untuk monitoring koneksi
// ============================================
mongoose.connection.on("disconnected", () => {
  console.warn("⚠️  MongoDB: Koneksi terputus. Mencoba reconnect...");
});

mongoose.connection.on("reconnected", () => {
  console.log("✅ MongoDB: Berhasil reconnect");
});

mongoose.connection.on("error", (err) => {
  console.error("❌ MongoDB: Error koneksi —", err.message);
});

module.exports = { connectMongoDB, mongoose };
