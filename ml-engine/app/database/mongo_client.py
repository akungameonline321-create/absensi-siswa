"""
============================================
mongo_client.py — Koneksi Async ke MongoDB Atlas
Menggunakan Motor (AsyncIOMotorClient) untuk kompatibilitas
dengan FastAPI yang berjalan secara asynchronous.
============================================
"""

import os
from motor.motor_asyncio import AsyncIOMotorClient

# ============================================
# Variabel global untuk menyimpan instance client & database
# Menggunakan pola Singleton agar koneksi di-reuse
# ============================================
_client: AsyncIOMotorClient | None = None
_database = None


async def connect_mongo():
    """
    Membuka koneksi ke MongoDB Atlas.
    Dipanggil saat startup FastAPI (lifespan).
    """
    global _client, _database

    uri = os.getenv("MONGODB_URI")
    if not uri:
        raise ValueError("[ERROR] MONGODB_URI belum diset di file .env")

    # Buat koneksi async ke MongoDB Atlas
    _client = AsyncIOMotorClient(uri)

    # Pilih database (nama diambil dari URI atau default)
    _database = _client.get_default_database()

    # Verifikasi koneksi dengan perintah ping
    await _client.admin.command("ping")
    print(f"[SUCCESS] MongoDB: Terhubung ke database \"{_database.name}\"")


async def close_mongo():
    """
    Menutup koneksi MongoDB.
    Dipanggil saat shutdown FastAPI (lifespan).
    """
    global _client
    if _client:
        _client.close()
        print("[INFO] MongoDB: Koneksi ditutup")


def get_database():
    """
    Mendapatkan referensi ke database MongoDB.
    Digunakan oleh modul lain untuk akses collection.

    Returns:
        AsyncIOMotorDatabase: Instance database MongoDB

    Contoh penggunaan:
        db = get_database()
        collection = db["attendance_logs"]
        await collection.insert_one({...})
    """
    if _database is None:
        raise RuntimeError("Database belum terhubung. Pastikan connect_mongo() sudah dipanggil.")
    return _database


def get_collection(name: str):
    """
    Shortcut untuk mendapatkan referensi collection tertentu.

    Args:
        name: Nama collection (contoh: "face_vectors", "attendance_logs")

    Returns:
        AsyncIOMotorCollection: Instance collection MongoDB
    """
    db = get_database()
    return db[name]
