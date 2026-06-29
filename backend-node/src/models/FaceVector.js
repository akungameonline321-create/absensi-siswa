// ============================================
// FaceVector.js — Mongoose Schema
// Menyimpan vektor wajah 128 dimensi di MongoDB Atlas
// ============================================

const { mongoose } = require("../config/db.mongo");

/**
 * Schema untuk menyimpan encoding wajah siswa.
 * Setiap siswa memiliki satu dokumen berisi array 128 float
 * yang dihasilkan oleh library face_recognition (dlib).
 *
 * student_id dan nis mereferensikan data di MySQL.
 */
const faceVectorSchema = new mongoose.Schema(
  {
    // Referensi ke tabel students di MySQL
    student_id: {
      type: Number,
      required: true,
      unique: true,
      index: true,
    },

    // NIS untuk cross-reference cepat
    nis: {
      type: String,
      required: true,
      unique: true,
    },

    // Nama siswa (denormalisasi untuk kemudahan logging)
    nama: {
      type: String,
      required: true,
    },

    // Vektor wajah 128 dimensi dari face_recognition
    encoding: {
      type: [Number],
      required: true,
      validate: {
        validator: (arr) => arr.length === 128,
        message: "Encoding wajah harus berisi tepat 128 elemen",
      },
    },
  },
  {
    timestamps: true,   // Otomatis tambah createdAt & updatedAt
    collection: "face_vectors",
  }
);

const FaceVector = mongoose.model("FaceVector", faceVectorSchema);

module.exports = FaceVector;
