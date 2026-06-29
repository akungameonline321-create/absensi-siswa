// ============================================
// User.js — Query Helper untuk tabel 'users'
// Mengelola data Admin dan Guru
// ============================================

const { pool } = require("../config/db.mysql");

const User = {
  /**
   * Mencari user berdasarkan email.
   * Digunakan saat login untuk verifikasi kredensial.
   *
   * @param {string} email
   * @returns {object|null} Data user atau null
   */
  async findByEmail(email) {
    const [rows] = await pool.query(
      "SELECT * FROM users WHERE email = ? LIMIT 1",
      [email]
    );
    return rows[0] || null;
  },

  /**
   * Mencari user berdasarkan ID.
   *
   * @param {number} id
   * @returns {object|null}
   */
  async findById(id) {
    const [rows] = await pool.query(
      "SELECT id, nip, nama, email, role, student_id, is_active, created_at FROM users WHERE id = ?",
      [id]
    );
    return rows[0] || null;
  },

  /**
   * Mencari user berdasarkan NIP (Nomor Induk Pegawai).
   *
   * @param {string} nip
   * @returns {object|null}
   */
  async findByNip(nip) {
    const [rows] = await pool.query(
      "SELECT * FROM users WHERE nip = ? LIMIT 1",
      [nip]
    );
    return rows[0] || null;
  },

  /**
   * Membuat user baru (Admin atau Guru).
   *
   * @param {object} data - { nip, nama, email, password, role }
   * @returns {object} - { insertId, affectedRows }
   */
  async create(data) {
    const { nip, nama, email, password, role, student_id } = data;
    const [result] = await pool.query(
      "INSERT INTO users (nip, nama, email, password, role, student_id) VALUES (?, ?, ?, ?, ?, ?)",
      [nip, nama, email, password, role || "guru", student_id || null]
    );
    return result;
  },

  /**
   * Mendapatkan semua user (tanpa password).
   *
   * @param {string} [role] - Filter berdasarkan role ('admin' | 'guru')
   * @returns {Array}
   */
  async findAll(role = null) {
    let query = "SELECT id, nip, nama, email, role, student_id, is_active, created_at FROM users";
    const params = [];

    if (role) {
      query += " WHERE role = ?";
      params.push(role);
    }

    query += " ORDER BY created_at DESC";
    const [rows] = await pool.query(query, params);
    return rows;
  },

  /**
   * Update data user.
   *
   * @param {number} id
   * @param {object} data - Fields yang ingin diupdate
   * @returns {object}
   */
  async update(id, data) {
    const fields = [];
    const values = [];

    // Bangun query dinamis berdasarkan field yang dikirim
    for (const [key, value] of Object.entries(data)) {
      if (["nip", "nama", "email", "password", "role", "is_active"].includes(key)) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    }

    if (fields.length === 0) return { affectedRows: 0 };

    values.push(id);
    const [result] = await pool.query(
      `UPDATE users SET ${fields.join(", ")} WHERE id = ?`,
      values
    );
    return result;
  },

  /**
   * Hapus user berdasarkan ID.
   *
   * @param {number} id
   * @returns {object}
   */
  async delete(id) {
    const [result] = await pool.query("DELETE FROM users WHERE id = ?", [id]);
    return result;
  },
};

module.exports = User;
