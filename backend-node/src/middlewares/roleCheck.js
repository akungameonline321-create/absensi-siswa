// ============================================
// roleCheck.js — Middleware Kontrol Akses Berbasis Role
// Membatasi akses endpoint berdasarkan role user
// ============================================

/**
 * Factory function yang menghasilkan middleware untuk mengecek role user.
 * Gunakan setelah verifyToken agar req.user sudah tersedia.
 *
 * @param  {...string} allowedRoles - Role yang diizinkan ('admin', 'guru')
 * @returns {Function} Express middleware
 *
 * Contoh penggunaan:
 *   router.get("/admin-only", verifyToken, roleCheck("admin"), controller);
 *   router.get("/all-staff", verifyToken, roleCheck("admin", "guru"), controller);
 */
function roleCheck(...allowedRoles) {
  return (req, res, next) => {
    // Pastikan verifyToken sudah dijalankan sebelumnya
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Autentikasi diperlukan sebelum cek role.",
      });
    }

    // Cek apakah role user termasuk dalam daftar yang diizinkan
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Akses ditolak. Role '${req.user.role}' tidak memiliki izin. Diperlukan: ${allowedRoles.join(" atau ")}.`,
      });
    }

    next();
  };
}

module.exports = roleCheck;
