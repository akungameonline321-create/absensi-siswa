// ============================================
// api.js — Router Utama (Aggregator)
// Menggabungkan semua sub-router ke satu mount point
// ============================================

const express = require("express");
const router = express.Router();

// --- Import sub-routers ---
const authRoutes = require("./auth.routes");
const studentRoutes = require("./student.routes");
const classRoutes = require("./class.routes");
const attendanceRoutes = require("./attendance.routes");
const faceRoutes = require("./face.routes");
const userRoutes = require("./user.routes");

// ============================================
// Mount sub-routers
// Semua akan berada di bawah /api/*
// ============================================
router.use("/auth", authRoutes);               // /api/auth/*
router.use("/users", userRoutes);               // /api/users/*
router.use("/students", studentRoutes);         // /api/students/*
router.use("/classes", classRoutes);            // /api/classes/*
router.use("/attendance", attendanceRoutes);    // /api/attendance/*
router.use("/face", faceRoutes);               // /api/face/*

module.exports = router;
