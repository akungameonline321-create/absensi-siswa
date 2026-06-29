"""
============================================
face_detector.py — Deteksi Wajah & Pencocokan
Menggunakan library face_recognition (wrapper dlib CNN)
============================================

Alur kerja:
  1. Terima gambar (bytes) → decode ke numpy array
  2. Deteksi lokasi wajah dalam gambar
  3. Ekstrak encoding 128 dimensi untuk setiap wajah
  4. Cocokkan encoding dengan database vektor di MongoDB
"""

import numpy as np
import cv2
import face_recognition
from app.database.mongo_client import get_collection


def decode_image(image_bytes: bytes) -> np.ndarray:
    """
    Konversi bytes gambar → numpy array RGB.

    Args:
        image_bytes: Raw bytes dari file upload / base64 decode

    Returns:
        np.ndarray: Gambar dalam format RGB (H, W, 3)

    Raises:
        ValueError: Jika gambar tidak bisa di-decode
    """
    # Decode bytes → OpenCV BGR image
    nparr = np.frombuffer(image_bytes, np.uint8)
    bgr_image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    if bgr_image is None:
        raise ValueError("Gambar tidak bisa di-decode. Pastikan format JPEG/PNG valid.")

    # Konversi BGR → RGB (face_recognition menggunakan RGB)
    rgb_image = cv2.cvtColor(bgr_image, cv2.COLOR_BGR2RGB)
    return rgb_image


def detect_faces(rgb_image: np.ndarray, model: str = "hog"):
    """
    Deteksi semua wajah dalam gambar dan ekstrak encoding 128D.

    Args:
        rgb_image: Gambar RGB numpy array
        model: Model deteksi — "hog" (CPU, cepat) atau "cnn" (GPU, akurat)

    Returns:
        list[dict]: Daftar wajah yang terdeteksi, masing-masing berisi:
            - location: (top, right, bottom, left)
            - encoding: numpy array 128 dimensi
            - landmarks: dict titik wajah (mata, hidung, mulut, dll.)
    """
    # Deteksi lokasi wajah
    face_locations = face_recognition.face_locations(rgb_image, model=model)

    if not face_locations:
        return []

    # Ekstrak encoding 128 dimensi untuk setiap wajah
    face_encodings = face_recognition.face_encodings(rgb_image, face_locations)

    # Ekstrak facial landmarks (68 titik) untuk EAR calculation
    face_landmarks_list = face_recognition.face_landmarks(rgb_image, face_locations)

    # Load cascade classifier untuk kacamata (bawaan OpenCV)
    try:
        glasses_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_eye_tree_eyeglasses.xml')
    except:
        glasses_cascade = None

    results = []
    for i, (location, encoding) in enumerate(zip(face_locations, face_encodings)):
        landmarks = face_landmarks_list[i] if i < len(face_landmarks_list) else None
        
        has_glasses = False
        has_mask = False

        # --- Heuristik Kacamata (Menggunakan Haar Cascade di area mata) ---
        if glasses_cascade and not glasses_cascade.empty():
            top, right, bottom, left = location
            # Potong area wajah untuk deteksi lebih cepat
            face_roi = rgb_image[top:bottom, left:right]
            if face_roi.size > 0:
                gray_roi = cv2.cvtColor(face_roi, cv2.COLOR_RGB2GRAY)
                eyes = glasses_cascade.detectMultiScale(gray_roi, scaleFactor=1.1, minNeighbors=3)
                if len(eyes) > 0:
                    has_glasses = True
        
        # --- Heuristik Masker (Sangat sederhana: cek jika hidung/mulut tertutup rapat/tidak dikenali dengan baik) ---
        # Catatan: Library face_recognition cenderung GAGAL mendeteksi wajah jika pakai masker.
        # Jika berhasil dideteksi tapi titik hidung berantakan, kita asumsikan masker.
        if landmarks and "nose_bridge" in landmarks and "bottom_lip" in landmarks:
            # Mengukur jarak vertikal hidung ke bibir bawah. Jika sangat kecil/tidak wajar, mungkin pakai masker.
            nose_bridge_y = landmarks["nose_bridge"][-1][1]
            bottom_lip_y = landmarks["bottom_lip"][0][1]
            face_height = bottom - top
            if (bottom_lip_y - nose_bridge_y) / face_height < 0.1:
                has_mask = True

        results.append({
            "location": location,           # (top, right, bottom, left)
            "encoding": encoding,           # numpy array (128,)
            "landmarks": landmarks,         # dict dengan left_eye, right_eye, dll.
            "attributes": {
                "has_glasses": has_glasses,
                "has_mask": has_mask
            }
        })

    return results


async def match_face(encoding: np.ndarray, tolerance: float = 0.55):
    """
    Cocokkan encoding wajah dengan semua vektor di database MongoDB.

    Menggunakan Euclidean distance — jarak < tolerance dianggap cocok.
    Nilai tolerance default 0.45 lebih ketat dari default library (0.6)
    untuk mengurangi false positive.

    Args:
        encoding: Numpy array 128 dimensi dari wajah yang dideteksi
        tolerance: Batas jarak maksimum untuk dianggap cocok (0.0–1.0)

    Returns:
        dict | None: Data siswa yang cocok, atau None jika tidak ditemukan
            - student_id: int
            - nis: str
            - nama: str
            - distance: float (semakin kecil = semakin mirip)
            - confidence: float (0.0–1.0, semakin besar = semakin yakin)
    """
    collection = get_collection("face_vectors")

    # Ambil semua vektor wajah dari database
    cursor = collection.find({}, {"student_id": 1, "nis": 1, "nama": 1, "encoding": 1})

    best_match = None
    best_distance = float("inf")

    async for doc in cursor:
        # Konversi list → numpy array untuk perhitungan jarak
        stored_encoding = np.array(doc["encoding"])

        # Hitung Euclidean distance
        distance = np.linalg.norm(encoding - stored_encoding)

        if distance < tolerance and distance < best_distance:
            best_distance = distance
            best_match = {
                "student_id": doc["student_id"],
                "nis": doc["nis"],
                "nama": doc["nama"],
                "distance": round(float(distance), 4),
                "confidence": round(1.0 - float(distance), 4),
            }

    return best_match


async def register_face(student_id: int, nis: str, nama: str, image_bytes: bytes):
    """
    Mendaftarkan wajah siswa ke database.

    Alur:
      1. Decode gambar
      2. Deteksi tepat 1 wajah
      3. Ekstrak encoding 128D
      4. Simpan ke MongoDB collection 'face_vectors'

    Args:
        student_id: ID siswa dari MySQL
        nis: Nomor Induk Siswa
        nama: Nama siswa
        image_bytes: Foto wajah siswa (bytes)

    Returns:
        dict: Hasil registrasi

    Raises:
        ValueError: Jika tidak ada wajah atau lebih dari 1 wajah terdeteksi
    """
    # 1. Decode gambar
    rgb_image = decode_image(image_bytes)

    # 2. Deteksi wajah
    faces = detect_faces(rgb_image)

    if len(faces) == 0:
        raise ValueError("Tidak ada wajah terdeteksi dalam foto. Pastikan wajah terlihat jelas.")

    if len(faces) > 1:
        raise ValueError(
            f"Terdeteksi {len(faces)} wajah. Foto registrasi harus berisi tepat 1 wajah."
        )

    # 3. Ambil encoding wajah
    encoding = faces[0]["encoding"].tolist()  # Konversi numpy → list untuk MongoDB

    # 4. Simpan ke MongoDB (upsert — update jika sudah ada)
    collection = get_collection("face_vectors")
    result = await collection.update_one(
        {"student_id": student_id},
        {
            "$set": {
                "student_id": student_id,
                "nis": nis,
                "nama": nama,
                "encoding": encoding,
            },
            "$currentDate": {"updatedAt": True},
            "$setOnInsert": {"createdAt": {"$type": "date"}},
        },
        upsert=True,
    )

    is_new = result.upserted_id is not None

    return {
        "student_id": student_id,
        "nis": nis,
        "nama": nama,
        "is_new_registration": is_new,
        "encoding_length": len(encoding),
    }
