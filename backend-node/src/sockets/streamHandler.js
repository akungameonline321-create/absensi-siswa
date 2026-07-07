// ============================================
// streamHandler.js — Socket.io Real-Time Pipeline
// Alur: Frame → ML Engine → Cooldown Check → Attendance Log → Emit
// ============================================

const axios = require("axios");
const fs = require("fs");
const path = require("path");
const AttendanceLog = require("../models/AttendanceLog");
const AttendanceController = require("../controllers/attendance.controller");
const Student = require("../models/Student");

const ML_ENGINE_URL = process.env.ML_ENGINE_URL || "http://localhost:8000";

// ============================================
// In-memory EAR tracker per sesi scanning
// Key: `${socketId}:${studentId}` → BlinkState
// ============================================
const earTrackers = new Map();

// ============================================
// Per-socket error tracking untuk backoff
// ============================================
const socketErrorState = new Map();
const MAX_CONSECUTIVE_ERRORS = 5;
const ERROR_BACKOFF_MS = 5000; // Tunggu 5 detik setelah error sebelum retry

/**
 * State tracking kedipan mata per siswa per sesi.
 */
class BlinkState {
  constructor() {
    this.closedCount = 0;      // Frame berturut-turut mata tertutup
    this.blinkCount = 0;       // Total kedipan
    this.frameCount = 0;       // Total frame
    this.livenessPassed = false;
  }

  /**
   * Update dengan nilai EAR terbaru.
   * @param {number} ear - Rata-rata EAR kedua mata
   * @returns {boolean} true jika liveness sudah terverifikasi
   */
  update(ear) {
    const EAR_THRESHOLD = 0.23;
    const CONSEC_FRAMES = 1;

    this.frameCount++;

    if (ear < EAR_THRESHOLD) {
      this.closedCount++;
    } else {
      if (this.closedCount >= CONSEC_FRAMES) {
        this.blinkCount++;
        if (this.blinkCount >= 1) {
          this.livenessPassed = true;
        }
      }
      this.closedCount = 0;
    }

    return this.livenessPassed;
  }
}

/**
 * Registrasi event handler untuk setiap koneksi Socket.io.
 *
 * @param {import("socket.io").Server} io    - Instance Socket.io server
 * @param {import("socket.io").Socket} socket - Socket klien yang terhubung
 */
function registerSocketHandlers(io, socket) {
  console.log(`🔌 Socket : Klien terhubung — ID: ${socket.id}`);

  // ============================================
  // Event: Guru bergabung ke ruang kelas
  // ============================================
  socket.on("room:join", (data) => {
    const { classId, teacherName } = data;
    socket.join(`class:${classId}`);
    socket.classId = classId;
    socket.teacherName = teacherName || "Guru";
    console.log(`📚 Socket : ${socket.teacherName} bergabung ke ruang kelas ${classId}`);
  });

  // ============================================
  // Event: Frame video dikirim dari frontend
  // Alur penuh: Frame → ML → EAR track → Cooldown → Save → Emit
  // ============================================
  socket.on("frame:send", async (data) => {
    try {
      const t0 = Date.now();
      const { frame, classId, guruId, guruNama } = data;

      if (!frame || !classId) {
        socket.emit("frame:error", { message: "Data frame atau classId tidak lengkap." });
        return;
      }

      if (socket.isProcessingFrame) return;

      // --- Cek error backoff: jika terlalu banyak error, tunggu ---
      const errState = socketErrorState.get(socket.id);
      if (errState) {
        const now = Date.now();
        if (errState.consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
          if (now - errState.lastErrorTime < ERROR_BACKOFF_MS) {
            // Masih dalam periode backoff, skip frame ini
            socket.emit("frame:error", {
              message: "ML Engine masih dalam jeda. Menunggu...",
              paused: true,
            });
            return;
          }
          // Backoff selesai, reset counter dan coba lagi
          errState.consecutiveErrors = 0;
          socket.emit("frame:error", {
            message: "Mencoba menghubungi ML Engine kembali...",
            retrying: true,
          });
        }
      }

      socket.isProcessingFrame = true;

      // --- 1. Kirim frame ke ML Engine untuk pengenalan wajah ---
      const formData = new URLSearchParams();
      formData.append("frame_base64", frame);

      const mlResponse = await axios.post(
        `${ML_ENGINE_URL}/api/v1/recognize`,
        formData,
        {
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          timeout: 15000, // 15 detik timeout per frame
        }
      );

      const { results, faces_detected } = mlResponse.data.data;

      // ML Engine berhasil merespons — reset error counter
      if (socketErrorState.has(socket.id)) {
        socketErrorState.get(socket.id).consecutiveErrors = 0;
      }

      // Emit jumlah wajah terdeteksi ke frontend (untuk UI overlay)
      socket.emit("frame:processed", {
        faces_detected,
        timestamp: new Date().toISOString(),
      });

      if (!results || results.length === 0) return;

      // --- 2. Proses setiap wajah yang terdeteksi ---
      for (const face of results) {
        // Skip jika wajah tidak dikenali
        if (!face.match) continue;

        const { student_id, nis, nama, confidence } = face.match;
        const earValue = face.ear_value;

        // --- 3. Tracking EAR untuk Liveness Detection ---
        const trackKey = `${socket.id}:${student_id}`;

        if (!earTrackers.has(trackKey)) {
          earTrackers.set(trackKey, new BlinkState());
        }

        const blinkState = earTrackers.get(trackKey);
        const livenessPassed = earValue !== null
          ? blinkState.update(earValue)
          : false;

        // Emit progress liveness ke frontend
        socket.emit("liveness:progress", {
          student_id,
          nama,
          ear: earValue,
          blink_count: blinkState.blinkCount,
          liveness_passed: livenessPassed,
          frame_count: blinkState.frameCount,
        });

        // Skip jika liveness belum terverifikasi
        if (!livenessPassed) continue;

        // --- 4. Cek Cooldown (1 jam) ---
        const isInCooldown = await AttendanceController.isInCooldown(student_id, 60);

        if (isInCooldown) {
          socket.emit("attendance:duplicate", {
            student_id,
            nama,
            message: `${nama} sudah tercatat hadir dalam 1 jam terakhir.`,
          });
          // Bersihkan tracker karena sudah selesai
          earTrackers.delete(trackKey);
          continue;
        }

        // --- 5. Simpan Log Absensi ke MongoDB ---
        const today = new Date().toISOString().split("T")[0];

        // Ambil nama kelas & batas waktu dari MySQL
        let namaKelas = `Kelas ${classId}`;
        let batasWaktuHadir = '07:00';
        try {
          const ClassRoom = require("../models/ClassRoom");
          const kelas = await ClassRoom.findById(parseInt(classId));
          if (kelas) {
            namaKelas = kelas.nama_kelas;
            batasWaktuHadir = kelas.batas_waktu_hadir || '07:00';
          }
        } catch (e) {
          // Fallback
        }

        // --- 6. Tentukan Status Berdasarkan Waktu ---
        const scanTime = new Date();
        // Format "HH:mm" untuk jam saat ini di server (sesuaikan dengan timezone jika perlu)
        const currentHours = scanTime.getHours().toString().padStart(2, '0');
        const currentMinutes = scanTime.getMinutes().toString().padStart(2, '0');
        const currentTimeStr = `${currentHours}:${currentMinutes}`;
        
        const finalStatus = currentTimeStr > batasWaktuHadir ? "terlambat" : "hadir";

        // --- 6. Simpan Foto Snapshot Wajah ---
        let snapshotPath = null;
        try {
          if (frame && frame.includes("base64,")) {
            const base64Data = frame.split(";base64,").pop();
            const fileName = `snapshot_${student_id}_${Date.now()}.jpg`;
            const filePath = path.join(__dirname, "../../uploads/snapshots", fileName);
            fs.writeFileSync(filePath, base64Data, { encoding: "base64" });
            snapshotPath = `/uploads/snapshots/${fileName}`;
          }
        } catch (err) {
          console.error("Gagal menyimpan snapshot:", err.message);
        }

        const processingTimeMs = Date.now() - t0;
        const faceAttributes = face.attributes || { has_mask: false, has_glasses: false };

        const logEntry = await AttendanceLog.create({
          student_id,
          nis,
          nama_siswa: nama,
          kelas_id: parseInt(classId),
          nama_kelas: namaKelas,
          guru_id: guruId || 0,
          nama_guru: guruNama || socket.teacherName || "Guru",
          status: finalStatus,
          confidence,
          liveness_passed: true,
          snapshot_path: snapshotPath,
          processing_time_ms: processingTimeMs,
          attributes: faceAttributes,
          scanned_at: scanTime,
          tanggal: today,
        });

        console.log(`✅ Absensi: ${nama} (${nis}) — ${finalStatus.toUpperCase()} [confidence: ${confidence}, time: ${processingTimeMs}ms]`);

        // --- 7. Emit event ke seluruh room kelas (real-time update) ---
        const eventData = {
          _id: logEntry._id,
          student_id,
          nis,
          nama,
          nama_kelas: namaKelas,
          confidence,
          status: finalStatus,
          scanned_at: logEntry.scanned_at,
          snapshot_path: snapshotPath,
          processing_time_ms: processingTimeMs,
          attributes: logEntry.attributes
        };
        io.to(`class:${classId}`).emit("attendance:update", eventData);
        socket.emit("attendance:update", eventData);

        // --- 8. Kirim Notifikasi WhatsApp ---
        try {
          console.log(`[DEBUG WA] Mencari data siswa dengan ID: ${student_id} (tipe: ${typeof student_id})`);
          const studentData = await Student.findById(student_id);
          console.log(`[DEBUG WA] Hasil pencarian siswa:`, studentData ? `Ditemukan (no_telp: ${studentData.no_telp_ortu})` : 'TIDAK DITEMUKAN');
          
          if (studentData && studentData.no_telp_ortu) {
            const { sendMessage } = require("../services/whatsapp.service");
            const waktu = scanTime.toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit' });
            let msg = `*NOTIFIKASI ABSENSI SMA*\n\nHalo Bapak/Ibu,\nAnak Anda *${nama}* (NIS: ${nis}) telah melakukan absensi otomatis (Scan Wajah).\n\n`;
            msg += `Waktu: *${waktu} WIB*\n`;
            msg += `Status: *${finalStatus.toUpperCase()}*\n\n`;
            msg += `Terima kasih.`;
            
            console.log(`[DEBUG WA] Akan mengirim pesan ke: ${studentData.no_telp_ortu}`);
            // Background process kirim pesan (tidak perlu await agar tidak memblokir stream)
            sendMessage(studentData.no_telp_ortu, msg).catch(e => console.error(e));
          } else {
            console.log(`[DEBUG WA] Pesan WA dibatalkan. studentData: ${!!studentData}, no_telp_ortu: ${studentData ? studentData.no_telp_ortu : 'N/A'}`);
          }
        } catch (waError) {
          console.error("❌ Gagal mengirim WA otomatis:", waError.message);
        }

        // Bersihkan tracker setelah berhasil
        earTrackers.delete(trackKey);
      }
    } catch (error) {
      // --- Track consecutive errors untuk backoff ---
      if (!socketErrorState.has(socket.id)) {
        socketErrorState.set(socket.id, { consecutiveErrors: 0, lastErrorTime: 0, lastLogTime: 0 });
      }
      const errState = socketErrorState.get(socket.id);
      errState.consecutiveErrors++;
      errState.lastErrorTime = Date.now();

      // Throttle logging: hanya log setiap 10 detik untuk mencegah spam
      const now = Date.now();
      if (now - errState.lastLogTime > 10000) {
        console.error(`❌ Socket : Error proses frame — ${error.message} (${errState.consecutiveErrors}x berturut-turut)`);
        errState.lastLogTime = now;
      }

      // Jangan crash seluruh socket — log dan lanjutkan
      if (error.code === "ECONNREFUSED") {
        socket.emit("frame:error", {
          message: "ML Engine tidak tersedia. Pastikan service Python berjalan.",
          paused: errState.consecutiveErrors >= MAX_CONSECUTIVE_ERRORS,
        });
      } else if (error.code === "ECONNABORTED" || error.message.includes("timeout")) {
        // Timeout — ML Engine terlalu lambat
        socket.emit("frame:error", {
          message: `ML Engine lambat merespons (timeout). ${errState.consecutiveErrors >= MAX_CONSECUTIVE_ERRORS ? 'Scanning dijeda 5 detik...' : 'Mencoba lagi...'}`,
          paused: errState.consecutiveErrors >= MAX_CONSECUTIVE_ERRORS,
        });
      } else {
        socket.emit("frame:error", {
          message: `Backend Error: ${error.message}`,
          paused: errState.consecutiveErrors >= MAX_CONSECUTIVE_ERRORS,
        });
      }
    } finally {
      socket.isProcessingFrame = false;
    }
  });

  // ============================================
  // Event: Guru memulai sesi scanning
  // Reset semua EAR tracker untuk socket ini
  // ============================================
  socket.on("scan:start", (data) => {
    const { classId } = data;
    console.log(`📷 Socket : Sesi scanning dimulai — Kelas ${classId}`);

    // Bersihkan tracker lama untuk socket ini
    for (const key of earTrackers.keys()) {
      if (key.startsWith(socket.id)) {
        earTrackers.delete(key);
      }
    }

    socket.emit("scan:ready", { classId, message: "Siap memindai wajah." });
  });

  // ============================================
  // Event: Guru menghentikan sesi scanning
  // ============================================
  socket.on("scan:stop", () => {
    console.log(`📷 Socket : Sesi scanning dihentikan — ${socket.id}`);

    // Bersihkan semua tracker untuk socket ini
    for (const key of earTrackers.keys()) {
      if (key.startsWith(socket.id)) {
        earTrackers.delete(key);
      }
    }

    // Reset error state
    socketErrorState.delete(socket.id);
  });

  // ============================================
  // Event: Klien terputus
  // ============================================
  socket.on("disconnect", (reason) => {
    console.log(`🔌 Socket : Klien terputus — ID: ${socket.id}, Alasan: ${reason}`);

    // Bersihkan semua tracker untuk socket ini
    for (const key of earTrackers.keys()) {
      if (key.startsWith(socket.id)) {
        earTrackers.delete(key);
      }
    }

    // Bersihkan error state
    socketErrorState.delete(socket.id);
  });
}

module.exports = registerSocketHandlers;
