"""
============================================
main.py — Entry Point ML Engine (FastAPI)
Microservice untuk Face Recognition & Liveness Detection
============================================
"""

import os
import uvicorn
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# --- Load environment variables dari .env ---
load_dotenv()

# --- Import modul internal ---
from app.database.mongo_client import connect_mongo, close_mongo
from app.api.routes import router as api_router


# ============================================
# Lifespan: Dijalankan saat startup & shutdown
# ============================================
@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Startup: Koneksi ke MongoDB Atlas
    Shutdown: Tutup koneksi MongoDB
    """
    # --- STARTUP ---
    await connect_mongo()
    print("[SUCCESS] ML Engine siap menerima request")

    yield  # Aplikasi berjalan di sini

    # --- SHUTDOWN ---
    await close_mongo()
    print("[INFO] ML Engine dimatikan")


# ============================================
# Inisialisasi FastAPI App
# ============================================
app = FastAPI(
    title="Absensi SMA — ML Engine",
    description="Microservice untuk Face Recognition dan Liveness Detection (EAR)",
    version="1.0.0",
    lifespan=lifespan,
)

# ============================================
# CORS Middleware
# Izinkan request dari backend Node.js dan frontend
# ============================================
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",    # React dev server
        "http://localhost:5000",    # Backend Node.js
        "http://localhost:5173",    # Vite dev server
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================
# Registrasi Router
# ============================================
app.include_router(api_router)


# ============================================
# Jalankan Server (jika dipanggil langsung)
# ============================================
if __name__ == "__main__":
    host = os.getenv("ML_HOST", "0.0.0.0")
    port = int(os.getenv("ML_PORT", 8000))

    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        reload=True,    # Auto-reload saat development
        log_level="info",
    )
