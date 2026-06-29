// ============================================
// verifyToken.js — Middleware Verifikasi JWT
// Melindungi route yang membutuhkan autentikasi
// ============================================

const jwt = require("jsonwebtoken");

/**
 * Middleware untuk memverifikasi JSON Web Token.
 * Token dikirim melalui header: Authorization: Bearer <token>
 *
 * Jika valid, data user ditambahkan ke req.user dan request dilanjutkan.
 * Jika tidak valid, response 401/403 dikembalikan.
 */
function verifyToken(req, res, next) {
  // Ambil header Authorization
  const authHeader = req.headers["authorization"];

  if (!authHeader) {
    return res.status(401).json({
      success: false,
      message: "Akses ditolak. Token tidak ditemukan.",
    });
  }

  // Format: "Bearer <token>"
  const token = authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Akses ditolak. Format token tidak valid. Gunakan: Bearer <token>",
    });
  }

  try {
    // Verifikasi dan decode token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Tambahkan data user ke request object
    // Data ini bisa diakses di controller: req.user.id, req.user.role, dll.
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      nama: decoded.nama,
    };

    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Token sudah kedaluwarsa. Silakan login kembali.",
      });
    }

    return res.status(403).json({
      success: false,
      message: "Token tidak valid.",
    });
  }
}

module.exports = verifyToken;
