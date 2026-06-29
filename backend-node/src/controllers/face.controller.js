// ============================================
// face.controller.js — Registrasi Wajah Siswa
// Forward foto ke ML Engine untuk ekstrak encoding 128D
// ============================================

const axios = require("axios");
const fs = require("fs");
const path = require("path");
const FormData = require("form-data");
const Student = require("../models/Student");

const ML_ENGINE_URL = process.env.ML_ENGINE_URL || "http://localhost:8000";

const FaceController = {
  /**
   * POST /api/face/register/:studentId
   * Mendaftarkan wajah siswa — upload foto → kirim ke ML Engine → simpan encoding.
   *
   * File foto dikirim sebagai multipart/form-data via multer middleware.
   */
  async registerFace(req, res) {
    try {
      const { studentId } = req.params;

      // 1. Validasi siswa ada di MySQL
      const student = await Student.findById(parseInt(studentId));
      if (!student) {
        return res.status(404).json({
          success: false,
          message: "Siswa tidak ditemukan.",
        });
      }

      // 2. Validasi file foto tersedia (dari multer)
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "File foto wajah wajib dikirim (field: 'photo').",
        });
      }

      // 3. Siapkan form data untuk dikirim ke ML Engine
      const formData = new FormData();
      formData.append("file", req.file.buffer, {
        filename: req.file.originalname,
        contentType: req.file.mimetype,
      });
      formData.append("student_id", student.id.toString());
      formData.append("nis", student.nis);
      formData.append("nama", student.nama);

      // 4. Kirim ke ML Engine
      const mlResponse = await axios.post(
        `${ML_ENGINE_URL}/api/v1/register`,
        formData,
        {
          headers: formData.getHeaders(),
          timeout: 30000, // 30 detik timeout (encoding bisa lambat)
        }
      );

      // 5. Update flag is_face_registered di MySQL
      if (mlResponse.data.success) {
        await Student.update(parseInt(studentId), { is_face_registered: true });
      }

      console.log(`✅ Face   : Wajah ${student.nama} berhasil didaftarkan`);

      res.status(200).json({
        success: true,
        message: `Wajah ${student.nama} berhasil didaftarkan.`,
        data: mlResponse.data.data,
      });
    } catch (error) {
      // Handle error dari ML Engine
      if (error.response) {
        return res.status(error.response.status).json({
          success: false,
          message: error.response.data.detail || "ML Engine error.",
        });
      }

      console.error("❌ Face   : Gagal registrasi —", error.message);
      res.status(500).json({
        success: false,
        message: "Gagal menghubungi ML Engine. Pastikan service Python berjalan.",
      });
    }
  },

  /**
   * GET /api/face/status/:studentId
   * Cek apakah wajah siswa sudah terdaftar.
   */
  async checkStatus(req, res) {
    try {
      const student = await Student.findById(parseInt(req.params.studentId));
      if (!student) {
        return res.status(404).json({
          success: false,
          message: "Siswa tidak ditemukan.",
        });
      }

      res.status(200).json({
        success: true,
        data: {
          student_id: student.id,
          nama: student.nama,
          nis: student.nis,
          is_face_registered: student.is_face_registered,
        },
      });
    } catch (error) {
      console.error("❌ Face   : Gagal cek status —", error.message);
      res.status(500).json({
        success: false,
        message: "Terjadi kesalahan server.",
      });
    }
  },
};

module.exports = FaceController;
