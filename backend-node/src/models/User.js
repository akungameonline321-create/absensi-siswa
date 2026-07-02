// ============================================
// User.js — Query Helper untuk tabel 'users'
// Mengelola data Admin dan Guru
// ============================================

const { pool } = require("../config/db.mysql");

const User = {
    /**
     * Mencari user berdasarkan email.
     */
    async findByEmail(email) {
        const [rows] = await pool.query(`SELECT * FROM users WHERE email = ?`, [email]);
        return rows[0] || null;
    },

    /**
     * Mencari user berdasarkan ID.
     */
    async findById(id) {
        const [rows] = await pool.query(`SELECT * FROM users WHERE id = ?`, [id]);
        return rows[0] || null;
    },

    /**
     * Mencari user berdasarkan NIP.
     */
    async findByNip(nip) {
        const [rows] = await pool.query(`SELECT * FROM users WHERE nip = ?`, [nip]);
        return rows[0] || null;
    },

    /**
     * Membuat user baru.
     */
    async create(data) {
        const { nip, nama, email, password, role, student_id } = data;
        const [result] = await pool.query(
            `INSERT INTO users (nip, nama, email, password, role, student_id)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [nip || null, nama, email, password, role || 'guru', student_id || null]
        );
        return { insertId: result.insertId, affectedRows: result.affectedRows, _id: result.insertId }; // _id just in case
    },

    /**
     * Mendapatkan semua user (dengan filter role opsional).
     */
    async findAll(role = null) {
        let query = `SELECT * FROM users`;
        const params = [];
        if (role) {
            query += ` WHERE role = ?`;
            params.push(role);
        }
        query += ` ORDER BY created_at DESC`;
        const [rows] = await pool.query(query, params);
        return rows;
    },

    /**
     * Update data user.
     */
    async update(id, data) {
        const allowedFields = ["nip", "nama", "email", "password", "role", "student_id", "is_active"];
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
            `UPDATE users SET ${fields.join(", ")} WHERE id = ?`,
            values
        );
        return { affectedRows: result.affectedRows };
    },

    /**
     * Hapus user berdasarkan ID.
     */
    async delete(id) {
        const [result] = await pool.query(`DELETE FROM users WHERE id = ?`, [id]);
        return { affectedRows: result.affectedRows };
    }
};

module.exports = User;