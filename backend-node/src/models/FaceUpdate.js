// ============================================
// FaceUpdate.js — Query Helper untuk tabel 'face_updates'
// ============================================

const { pool } = require("../config/db.mysql");

const FaceUpdate = {
    async findPending() {
        const [rows] = await pool.query(
            `SELECT * FROM face_updates WHERE status = 'pending' ORDER BY created_at ASC`
        );
        return rows.map(r => ({ ...r, _id: r.id }));
    },

    async findById(id) {
        const [rows] = await pool.query(
            `SELECT * FROM face_updates WHERE id = ?`,
            [id]
        );
        return rows[0] ? { ...rows[0], _id: rows[0].id } : null;
    },

    async create(data) {
        const { student_id, nis, nama_siswa, kelas_id, nama_kelas, photo_path } = data;
        const [result] = await pool.query(
            `INSERT INTO face_updates (student_id, nis, nama_siswa, kelas_id, nama_kelas, photo_path, status)
             VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
            [student_id, nis, nama_siswa, kelas_id, nama_kelas, photo_path]
        );
        return { insertId: result.insertId, _id: result.insertId };
    },

    async updateStatus(id, status, approved_by) {
        const [result] = await pool.query(
            `UPDATE face_updates SET status = ?, approved_by = ? WHERE id = ?`,
            [status, approved_by, id]
        );
        return { affectedRows: result.affectedRows };
    }
};

module.exports = FaceUpdate;
