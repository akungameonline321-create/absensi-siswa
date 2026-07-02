// ============================================
// server.js — Entry Point Backend Node.js
// Inisialisasi Express, Socket.io, MySQL, MongoDB
// ============================================

require("dotenv").config();

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const morgan = require("morgan");

// --- Import konfigurasi database ---
const { connectMySQL, pool } = require("./src/config/db.mysql");
const { initializeDatabase } = require("./src/config/db.init");

// --- Import Socket.io handler ---
const registerSocketHandlers = require("./src/sockets/streamHandler");

// ============================================
// Inisialisasi Express App
// ============================================
const app = express();
const server = http.createServer(app);

// ============================================
// Inisialisasi Socket.io
// Izinkan koneksi dari frontend (CORS)
// ============================================
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:3000", "http://localhost:5173"],
    methods: ["GET", "POST"],
  },
});
app.set("io", io); // expose io to controllers

// ============================================
// Middleware
// ============================================
app.use(cors());                    // Izinkan cross-origin requests
app.use(express.json({ limit: "10mb" }));  // Parse JSON body (limit besar untuk frame gambar base64)
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));            // Log HTTP requests di terminal

// Serve static files untuk uploads (foto profil, snapshot wajah)
const path = require("path");
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ============================================
// Health Check Endpoint
// ============================================
app.get("/api/health", async (req, res) => {
  try {
    // Cek koneksi MySQL
    const [rows] = await pool.query("SELECT 1 AS mysql_status");
    const mysqlOk = rows[0].mysql_status === 1;

    res.status(200).json({
      status: "ok",
      timestamp: new Date().toISOString(),
      services: {
        express: true,
        mysql: mysqlOk,
        socketio: io.engine.clientsCount >= 0, // Socket.io aktif
      },
    });
  } catch (error) {
    res.status(503).json({
      status: "error",
      message: "Salah satu service tidak tersedia",
      error: error.message,
    });
  }
});

// ============================================
// API Routes
// ============================================
const apiRoutes = require("./src/routes/api");
app.use("/api", apiRoutes);

// ============================================
// Registrasi Socket.io Event Handlers
// ============================================
io.on("connection", (socket) => {
  registerSocketHandlers(io, socket);
});

// ============================================
// Jalankan Server
// ============================================
const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    // 1. Koneksi ke MySQL (Laragon)
    await connectMySQL();

    // 2. Inisialisasi tabel MySQL (auto-create jika belum ada)
    await initializeDatabase();

    // 4. Inisialisasi WhatsApp Bot
    const { initializeWhatsApp } = require("./src/services/whatsapp.service");
    initializeWhatsApp();

    // 5. Jalankan HTTP + WebSocket server
    server.listen(PORT, () => {
      console.log(`\n🚀 ============================================`);
      console.log(`   Server berjalan di: http://localhost:${PORT}`);
      console.log(`   Health check:       http://localhost:${PORT}/api/health`);
      console.log(`   Socket.io:          Aktif`);
      console.log(`   Environment:        ${process.env.NODE_ENV || "development"}`);
      console.log(`============================================\n`);
    });
  } catch (error) {
    console.error("❌ Gagal menjalankan server:", error.message);
    process.exit(1);
  }
}

startServer();
