// ============================================
// AttendanceLog.js — Query Helper untuk tabel 'attendance_logs'
// Mengelola log absensi real-time di MySQL
// ============================================

const { pool } = require("../config/db.mysql");

const AttendanceLog = {
    async find(query = {}) {
        let sql = `SELECT * FROM attendance_logs`;
        const params = [];
        const conditions = [];

        if (query.tanggal) {
            conditions.push(`tanggal = ?`);
            params.push(query.tanggal);
        }
        if (query.kelas_id) {
            conditions.push(`kelas_id = ?`);
            params.push(query.kelas_id);
        }

        if (conditions.length > 0) {
            sql += ` WHERE ` + conditions.join(` AND `);
        }
        
        sql += ` ORDER BY scanned_at DESC`;

        const [rows] = await pool.query(sql, params);
        return rows.map(r => ({ ...r, _id: r.id }));
    },

    async findTodayByClass(classId, date) {
        const [rows] = await pool.query(
            `SELECT * FROM attendance_logs 
             WHERE kelas_id = ? AND tanggal = ? 
             ORDER BY scanned_at DESC`,
            [classId, date]
        );
        return rows.map(r => ({ ...r, _id: r.id })); // Alias id to _id for frontend compatibility
    },

    async findHistoryByClass(classId, date) {
        const [rows] = await pool.query(
            `SELECT * FROM attendance_logs 
             WHERE kelas_id = ? AND tanggal = ? 
             ORDER BY scanned_at ASC`,
            [classId, date]
        );
        return rows.map(r => ({ ...r, _id: r.id }));
    },

    async findByStudent(studentId, limit) {
        const [rows] = await pool.query(
            `SELECT * FROM attendance_logs 
             WHERE student_id = ? 
             ORDER BY scanned_at DESC 
             LIMIT ?`,
            [studentId, limit]
        );
        return rows.map(r => ({ ...r, _id: r.id }));
    },

    async findRecentByStudent(studentId, cutoffTime) {
        const [rows] = await pool.query(
            `SELECT * FROM attendance_logs 
             WHERE student_id = ? AND scanned_at >= ? 
             ORDER BY scanned_at DESC LIMIT 1`,
            [studentId, cutoffTime]
        );
        return rows[0] || null;
    },

    async findTodayByStudent(studentId, date) {
        const [rows] = await pool.query(
            `SELECT * FROM attendance_logs 
             WHERE student_id = ? AND tanggal = ? 
             ORDER BY scanned_at DESC LIMIT 1`,
            [studentId, date]
        );
        return rows[0] || null;
    },

    async delete(id) {
        const [rows] = await pool.query(`SELECT * FROM attendance_logs WHERE id = ?`, [id]);
        if (rows.length === 0) return null;
        
        await pool.query(`DELETE FROM attendance_logs WHERE id = ?`, [id]);
        return rows[0]; // Return the deleted item
    },

    async create(data) {
        const {
            student_id, nis, nama_siswa, kelas_id, nama_kelas, guru_id, nama_guru,
            status, confidence, liveness_passed, snapshot_path, processing_time_ms,
            attributes, scanned_at, tanggal
        } = data;
        
        const has_mask = attributes ? (attributes.has_mask ? 1 : 0) : 0;
        const has_glasses = attributes ? (attributes.has_glasses ? 1 : 0) : 0;

        const [result] = await pool.query(
            `INSERT INTO attendance_logs 
            (student_id, nis, nama_siswa, kelas_id, nama_kelas, guru_id, nama_guru, status, confidence, liveness_passed, snapshot_path, processing_time_ms, has_mask, has_glasses, scanned_at, tanggal) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                student_id, nis, nama_siswa, kelas_id, nama_kelas, guru_id, nama_guru, 
                status || 'hadir', confidence, liveness_passed ? 1 : 0, snapshot_path || null, 
                processing_time_ms || 0, has_mask, has_glasses, scanned_at || new Date(), tanggal
            ]
        );
        
        const [rows] = await pool.query(`SELECT * FROM attendance_logs WHERE id = ?`, [result.insertId]);
        const newLog = rows[0];
        newLog._id = newLog.id; // Map _id for frontend compatibility
        newLog.attributes = { has_mask: newLog.has_mask === 1, has_glasses: newLog.has_glasses === 1 };
        return newLog;
    }
};

module.exports = AttendanceLog;
