"""
============================================
mysql_client.py — Koneksi Async ke MySQL
Menggunakan aiomysql untuk kompatibilitas
dengan FastAPI yang berjalan secara asynchronous.
============================================
"""

import os
import aiomysql

# Variabel global untuk menyimpan pool koneksi
_pool: aiomysql.Pool | None = None

async def connect_mysql():
    """
    Membuka koneksi ke MySQL.
    Dipanggil saat startup FastAPI (lifespan).
    """
    global _pool

    # Gunakan environment variable MONGODB_URI yang diganti atau manual,
    # atau baca dari MYSQL_HOST, MYSQL_USER, dll. 
    # Karena awalnya project pakai MYSQL di Node.js, kita bisa setup param
    host = os.getenv("MYSQL_HOST", "localhost")
    port = int(os.getenv("MYSQL_PORT", 3306))
    user = os.getenv("MYSQL_USER", "root")
    password = os.getenv("MYSQL_PASSWORD", "")
    db = os.getenv("MYSQL_DATABASE", "absensi_db")

    _pool = await aiomysql.create_pool(
        host=host,
        port=port,
        user=user,
        password=password,
        db=db,
        autocommit=True
    )
    print(f"[SUCCESS] MySQL: Terhubung ke database \"{db}\"")

async def close_mysql():
    """
    Menutup koneksi MySQL.
    Dipanggil saat shutdown FastAPI (lifespan).
    """
    global _pool
    if _pool:
        _pool.close()
        await _pool.wait_closed()
        print("[INFO] MySQL: Koneksi ditutup")

def get_pool():
    """
    Mendapatkan referensi ke connection pool.
    """
    if _pool is None:
        raise RuntimeError("Database belum terhubung. Pastikan connect_mysql() sudah dipanggil.")
    return _pool
