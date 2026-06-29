// ============================================
// ClassRoom.js — Query Helper untuk tabel 'classes'
// Mengelola data kelas SMA
// ============================================

const { pool } = require("../config/db.mysql");

const ClassRoom = {
  /**
   * Mencari kelas berdasarkan ID.
   *
   * @param {number} id
   * @returns {object|null}
   */
  async findById(id) {
    const [rows] = await pool.query(
      `SELECT c.*, u.nama AS wali_kelas_nama
       FROM classes c
       LEFT JOIN users u ON c.wali_kelas_id = u.id
       WHERE c.id = ?`,
      [id]
    );
    return rows[0] || null;
  },

  /**
   * Mendapatkan semua kelas (dengan nama wali kelas).
   *
   * @param {string} [tahunAjaran] - Filter berdasarkan tahun ajaran
   * @returns {Array}
   */
  async findAll(tahunAjaran = null) {
    let query = `
      SELECT c.*, u.nama AS wali_kelas_nama
      FROM classes c
      LEFT JOIN users u ON c.wali_kelas_id = u.id
    `;
    const params = [];

    if (tahunAjaran) {
      query += " WHERE c.tahun_ajaran = ?";
      params.push(tahunAjaran);
    }

    query += " ORDER BY c.tingkat ASC, c.nama_kelas ASC";
    const [rows] = await pool.query(query, params);
    return rows;
  },

  /**
   * Membuat kelas baru.
   *
   * @param {object} data - { nama_kelas, tingkat, jurusan, tahun_ajaran, wali_kelas_id, batas_waktu_hadir }
   * @returns {object} - { insertId, affectedRows }
   */
  async create(data) {
    const { nama_kelas, tingkat, jurusan, tahun_ajaran, wali_kelas_id, batas_waktu_hadir } = data;
    const [result] = await pool.query(
      `INSERT INTO classes (nama_kelas, tingkat, jurusan, tahun_ajaran, wali_kelas_id, batas_waktu_hadir)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [nama_kelas, tingkat, jurusan || null, tahun_ajaran, wali_kelas_id || null, batas_waktu_hadir || '07:00']
    );
    return result;
  },

  /**
   * Update data kelas.
   *
   * @param {number} id
   * @param {object} data - Fields yang ingin diupdate
   * @returns {object}
   */
  async update(id, data) {
    const allowedFields = ["nama_kelas", "tingkat", "jurusan", "tahun_ajaran", "wali_kelas_id", "batas_waktu_hadir"];
    const fields = [];
    const values = [];

    for (const [key, value] of Object.entries(data)) {
      if (allowedFields.includes(key)) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    }

    if (fields.length === 0) return { affectedRows: 0 };

    values.push(id);
    const [result] = await pool.query(
      `UPDATE classes SET ${fields.join(", ")} WHERE id = ?`,
      values
    );
    return result;
  },

  /**
   * Hapus kelas berdasarkan ID.
   * PERHATIAN: Akan gagal jika masih ada siswa di kelas ini (FK constraint).
   *
   * @param {number} id
   * @returns {object}
   */
  async delete(id) {
    const [result] = await pool.query("DELETE FROM classes WHERE id = ?", [id]);
    return result;
  },

  /**
   * Mendapatkan daftar kelas yang diampu oleh guru tertentu.
   * Berguna untuk filter di dashboard guru.
   *
   * @param {number} guruId - ID guru (dari tabel users)
   * @returns {Array}
   */
  async findByGuru(guruId) {
    const [rows] = await pool.query(
      `SELECT * FROM classes WHERE wali_kelas_id = ? ORDER BY nama_kelas ASC`,
      [guruId]
    );
    return rows;
  },
};

module.exports = ClassRoom;
