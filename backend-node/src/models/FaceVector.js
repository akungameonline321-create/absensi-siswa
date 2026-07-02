// ============================================
// FaceVector.js — Query Helper untuk tabel 'face_vectors'
// ============================================

const { pool } = require("../config/db.mysql");

const FaceVector = {
    async findByStudent(studentId) {
        const [rows] = await pool.query(
            `SELECT * FROM face_vectors WHERE student_id = ?`,
            [studentId]
        );
        return rows[0] || null;
    },

    async deleteByStudent(studentId) {
        const [result] = await pool.query(
            `DELETE FROM face_vectors WHERE student_id = ?`,
            [studentId]
        );
        return { affectedRows: result.affectedRows };
    }
};

module.exports = FaceVector;
