// ============================================
// Student.js — Query Helper untuk tabel 'students'
// Mengelola data siswa SMA
// ============================================

const { pool } = require("../config/db.mysql");

const Student = {
  /**
   * Mencari siswa berdasarkan ID.
   *
   * @param {number} id
   * @returns {object|null}
   */
  async findById(id) {
    const [rows] = await pool.query(
      `SELECT s.*, c.nama_kelas, c.tingkat, c.jurusan
       FROM students s
       JOIN classes c ON s.kelas_id = c.id
       WHERE s.id = ?`,
      [id]
    );
    return rows[0] || null;
  },

  /**
   * Mencari siswa berdasarkan NIS.
   *
   * @param {string} nis
   * @returns {object|null}
   */
  async findByNis(nis) {
    const [rows] = await pool.query(
      `SELECT s.*, c.nama_kelas
       FROM students s
       JOIN classes c ON s.kelas_id = c.id
       WHERE s.nis = ? LIMIT 1`,
      [nis]
    );
    return rows[0] || null;
  },

  /**
   * Mendapatkan semua siswa (dengan nama kelas).
   * Bisa difilter berdasarkan kelas_id.
   *
   * @param {number} [kelasId] - Filter berdasarkan kelas
   * @returns {Array}
   */
  async findAll(kelasId = null) {
    let query = `
      SELECT s.id, s.nis, s.nisn, s.nama, s.jenis_kelamin,
             s.kelas_id, c.nama_kelas, s.is_face_registered,
             s.is_active, s.created_at
      FROM students s
      JOIN classes c ON s.kelas_id = c.id
    `;
    const params = [];

    if (kelasId) {
      query += " WHERE s.kelas_id = ?";
      params.push(kelasId);
    }

    query += " ORDER BY c.nama_kelas ASC, s.nama ASC";
    const [rows] = await pool.query(query, params);
    return rows;
  },

  /**
   * Membuat siswa baru.
   *
   * @param {object} data - { nis, nisn, nama, kelas_id, jenis_kelamin, alamat, no_telp_ortu }
   * @returns {object} - { insertId, affectedRows }
   */
  async create(data) {
    const { nis, nisn, nama, kelas_id, jenis_kelamin, alamat, no_telp_ortu } = data;
    const [result] = await pool.query(
      `INSERT INTO students (nis, nisn, nama, kelas_id, jenis_kelamin, alamat, no_telp_ortu)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [nis, nisn || null, nama, kelas_id, jenis_kelamin, alamat || null, no_telp_ortu || null]
    );
    return result;
  },

  /**
   * Update data siswa.
   *
   * @param {number} id
   * @param {object} data - Fields yang ingin diupdate
   * @returns {object}
   */
  async update(id, data) {
    const allowedFields = [
      "nis", "nisn", "nama", "kelas_id", "jenis_kelamin",
      "alamat", "no_telp_ortu", "foto_path", "is_face_registered", "is_active",
    ];
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
      `UPDATE students SET ${fields.join(", ")} WHERE id = ?`,
      values
    );
    return result;
  },

  /**
   * Hapus siswa berdasarkan ID.
   *
   * @param {number} id
   * @returns {object}
   */
  async delete(id) {
    const [result] = await pool.query("DELETE FROM students WHERE id = ?", [id]);
    return result;
  },

  /**
   * Hitung jumlah siswa per kelas.
   *
   * @returns {Array} - [{ kelas_id, nama_kelas, jumlah_siswa }]
   */
  async countByClass() {
    const [rows] = await pool.query(`
      SELECT c.id AS kelas_id, c.nama_kelas, COUNT(s.id) AS jumlah_siswa
      FROM classes c
      LEFT JOIN students s ON s.kelas_id = c.id AND s.is_active = TRUE
      GROUP BY c.id, c.nama_kelas
      ORDER BY c.nama_kelas ASC
    `);
    return rows;
  },
};

module.exports = Student;
