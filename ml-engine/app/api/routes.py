"""
============================================
routes.py — Rute API FastAPI (Implementasi Penuh)
Endpoint untuk health check, registrasi wajah, dan pengenalan wajah
============================================
"""

import base64
import cv2
from datetime import datetime
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from pydantic import BaseModel

# --- Import core modules ---
from app.core.face_detector import decode_image, detect_faces, match_face, register_face
from app.core.liveness_ear import calculate_avg_ear
from app.database.mysql_client import get_pool


# ============================================
# Inisialisasi Router
# ============================================
router = APIRouter()


# ============================================
# Schema Response
# ============================================
class HealthResponse(BaseModel):
    status: str
    timestamp: str
    services: dict


class RegisterResponse(BaseModel):
    success: bool
    message: str
    data: dict | None = None


class RecognitionResponse(BaseModel):
    success: bool
    message: str
    data: dict | None = None


# ============================================
# GET /health — Health Check
# ============================================
@router.get("/health", response_model=HealthResponse)
async def health_check():
    """Mengecek status ML Engine dan koneksi MySQL."""
    try:
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute("SELECT 1")
        mysql_ok = True
    except Exception:
        mysql_ok = False

    return HealthResponse(
        status="ok" if mysql_ok else "degraded",
        timestamp=datetime.now().isoformat(),
        services={
            "fastapi": True,
            "mysql": mysql_ok,
            "face_recognition": True,
            "liveness_detection": True,
        },
    )


# ============================================
# POST /api/v1/register — Registrasi Wajah Siswa
# ============================================
@router.post("/api/v1/register", response_model=RegisterResponse)
async def register_student_face(
    file: UploadFile = File(..., description="Foto wajah siswa (JPEG/PNG)"),
    student_id: int = Form(..., description="ID siswa dari MySQL"),
    nis: str = Form(..., description="Nomor Induk Siswa"),
    nama: str = Form(..., description="Nama lengkap siswa"),
):
    """
    Mendaftarkan wajah siswa ke database.

    Alur:
    1. Terima foto wajah + data siswa
    2. Deteksi wajah (harus tepat 1 wajah)
    3. Ekstrak encoding 128 dimensi
    4. Simpan/update di MongoDB collection 'face_vectors'

    Returns:
        RegisterResponse: Status registrasi dan data encoding
    """
    # Validasi tipe file
    allowed_types = ["image/jpeg", "image/png", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"Tipe file tidak didukung: {file.content_type}. Gunakan JPEG/PNG/WebP.",
        )

    try:
        contents = await file.read()

        result = await register_face(
            student_id=student_id,
            nis=nis,
            nama=nama,
            image_bytes=contents,
        )

        action = "didaftarkan" if result["is_new_registration"] else "diperbarui"
        return RegisterResponse(
            success=True,
            message=f"Wajah {nama} berhasil {action}.",
            data=result,
        )

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gagal registrasi wajah: {str(e)}")


# ============================================
# POST /api/v1/recognize — Pengenalan Wajah Real-Time
# ============================================
@router.post("/api/v1/recognize", response_model=RecognitionResponse)
async def recognize_face(
    file: UploadFile = File(None, description="Frame gambar (jika upload file)"),
    frame_base64: str = Form(None, description="Frame gambar dalam format base64"),
):
    """
    Menerima frame gambar dan melakukan:
    1. Deteksi wajah
    2. Hitung EAR (Eye Aspect Ratio) untuk liveness
    3. Ekstrak encoding 128D
    4. Cocokkan dengan database vektor wajah

    Menerima input via file upload ATAU base64 string.

    Returns:
        RecognitionResponse: Daftar wajah terdeteksi beserta hasil matching dan EAR
    """
    try:
        # --- Ambil image bytes dari file upload atau base64 ---
        if file and file.filename:
            contents = await file.read()
        elif frame_base64:
            # Hapus header data:image/... jika ada
            if "," in frame_base64:
                frame_base64 = frame_base64.split(",")[1]
            contents = base64.b64decode(frame_base64)
        else:
            raise HTTPException(
                status_code=400,
                detail="Kirim gambar via 'file' (upload) atau 'frame_base64' (base64 string).",
            )

        # --- 1. Decode gambar ---
        rgb_image = decode_image(contents)

        # --- 2. Deteksi wajah + encoding + landmarks ---
        # DEBUG: uncomment baris berikut untuk menyimpan frame terakhir ke disk
        # cv2.imwrite("debug_latest_frame.jpg", cv2.cvtColor(rgb_image, cv2.COLOR_RGB2BGR))
        faces = detect_faces(rgb_image, model="hog")

        if not faces:
            return RecognitionResponse(
                success=True,
                message="Tidak ada wajah terdeteksi dalam frame.",
                data={"faces_detected": 0, "results": []},
            )

        # --- 3. Proses setiap wajah yang terdeteksi ---
        results = []
        for face in faces:
            # Hitung EAR untuk liveness check
            ear_value = calculate_avg_ear(face["landmarks"]) if face["landmarks"] else None

            # Cocokkan encoding dengan database
            match = await match_face(face["encoding"])

            face_result = {
                "location": {
                    "top": face["location"][0],
                    "right": face["location"][1],
                    "bottom": face["location"][2],
                    "left": face["location"][3],
                },
                "ear_value": ear_value,
                "attributes": face["attributes"],
                "match": None,
            }

            if match:
                face_result["match"] = {
                    "student_id": match["student_id"],
                    "nis": match["nis"],
                    "nama": match["nama"],
                    "confidence": match["confidence"],
                    "distance": match["distance"],
                }

            results.append(face_result)

        # --- 4. Return hasil ---
        matched_count = sum(1 for r in results if r["match"] is not None)

        # Bersihkan data numpy array yang tidak bisa di-serialize ke JSON oleh Pydantic
        # Frontend dan Node.js juga tidak membutuhkan vektor encoding ini.
        for r in results:
            if "encoding" in r:
                del r["encoding"]

        return RecognitionResponse(
            success=True,
            message=f"{len(results)} wajah terdeteksi, {matched_count} dikenali.",
            data={
                "faces_detected": len(results),
                "faces_matched": matched_count,
                "results": results,
            },
        )

    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error pengenalan wajah: {str(e)}")
