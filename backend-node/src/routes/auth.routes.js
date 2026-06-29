// ============================================
// auth.routes.js — Route Autentikasi
// ============================================

const express = require("express");
const router = express.Router();
const AuthController = require("../controllers/auth.controller");
const verifyToken = require("../middlewares/verifyToken");
const roleCheck = require("../middlewares/roleCheck");

// POST /api/auth/login — Login (publik, tidak perlu token)
router.post("/login", AuthController.login);

// POST /api/auth/register — Register user baru (hanya admin)
router.post("/register", verifyToken, roleCheck("admin"), AuthController.register);

// GET /api/auth/me — Profil user yang sedang login
router.get("/me", verifyToken, AuthController.getProfile);

module.exports = router;
