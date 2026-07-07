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
from app.database.mysql_client import connect_mysql, close_mysql
from app.api.routes import router as api_router


# ============================================
# Lifespan: Dijalankan saat startup & shutdown
# ============================================
@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Startup: Koneksi ke MySQL
    Shutdown: Tutup koneksi MySQL
    """
    # --- STARTUP ---
    await connect_mysql()
    print("[SUCCESS] ML Engine siap menerima request")

    yield  # Aplikasi berjalan di sini

    # --- SHUTDOWN ---
    await close_mysql()
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
    allow_origins=["*"],
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
    # Gunakan PORT dari Railway, jika tidak ada fallback ke ML_PORT atau 8000
    port = int(os.getenv("PORT", os.getenv("ML_PORT", 8000)))

    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        reload=True,    # Auto-reload saat development
        log_level="info",
    )
