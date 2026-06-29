"""
============================================
liveness_ear.py — Deteksi Kehidupan (Liveness Detection)
Menggunakan Eye Aspect Ratio (EAR) dari 68 Facial Landmarks
============================================

Konsep EAR (Eye Aspect Ratio):
  - Mata terbuka: EAR ≈ 0.25–0.35
  - Mata tertutup (kedipan): EAR < 0.21
  - Rumus: EAR = (||p2-p6|| + ||p3-p5||) / (2 × ||p1-p4||)

  Titik mata (dari face_recognition landmarks):
    p1 ---- p2
   /          \\
  p0          p3
   \\          /
    p5 ---- p4

Cara kerja anti-spoofing:
  - Foto/gambar statis → EAR konstan, tidak pernah berkedip
  - Wajah asli → EAR berfluktuasi, terdeteksi kedipan
  - Sistem mengirim beberapa frame → cek apakah ada kedipan
"""

import numpy as np


# ============================================
# Konstanta EAR
# ============================================
EAR_THRESHOLD = 0.21       # Di bawah ini dianggap mata tertutup
CONSEC_FRAMES = 2          # Jumlah frame berturut-turut mata tertutup = 1 kedipan


def calculate_ear(eye_points: list) -> float:
    """
    Hitung Eye Aspect Ratio (EAR) untuk satu mata.

    Args:
        eye_points: List 6 tuple (x, y) dari facial landmarks
                    Urutan: [p0, p1, p2, p3, p4, p5]
                    - p0, p3 = sudut mata (horizontal)
                    - p1, p5 = kelopak atas-bawah kiri
                    - p2, p4 = kelopak atas-bawah kanan

    Returns:
        float: Nilai EAR (0.0 – ~0.4)
    """
    # Konversi ke numpy array untuk kalkulasi vektor
    points = np.array(eye_points, dtype=np.float64)

    # Jarak vertikal antara kelopak atas dan bawah
    A = np.linalg.norm(points[1] - points[5])  # ||p1 - p5||
    B = np.linalg.norm(points[2] - points[4])  # ||p2 - p4||

    # Jarak horizontal antara sudut mata
    C = np.linalg.norm(points[0] - points[3])  # ||p0 - p3||

    # Hindari division by zero
    if C == 0:
        return 0.0

    # Rumus EAR
    ear = (A + B) / (2.0 * C)
    return round(float(ear), 4)


def calculate_avg_ear(landmarks: dict) -> float | None:
    """
    Hitung rata-rata EAR dari kedua mata menggunakan landmarks face_recognition.

    Args:
        landmarks: Dict dari face_recognition.face_landmarks()
                   Harus memiliki key 'left_eye' dan 'right_eye'

    Returns:
        float | None: Rata-rata EAR kedua mata, atau None jika landmarks tidak lengkap
    """
    if not landmarks:
        return None

    left_eye = landmarks.get("left_eye")
    right_eye = landmarks.get("right_eye")

    if not left_eye or not right_eye:
        return None

    left_ear = calculate_ear(left_eye)
    right_ear = calculate_ear(right_eye)

    avg_ear = (left_ear + right_ear) / 2.0
    return round(avg_ear, 4)


class BlinkDetector:
    """
    Detektor kedipan mata berbasis EAR untuk Liveness Detection.

    Cara pakai:
        detector = BlinkDetector()

        # Feed EAR values dari beberapa frame berturut-turut
        for frame in video_frames:
            ear = calculate_avg_ear(landmarks)
            result = detector.update(ear)
            if result["liveness_passed"]:
                # Wajah asli terdeteksi!
                break

    State machine:
        OPEN → CLOSED (EAR < threshold) → OPEN (EAR >= threshold) = 1 BLINK
    """

    def __init__(self, ear_threshold: float = EAR_THRESHOLD, consec_frames: int = CONSEC_FRAMES):
        self.ear_threshold = ear_threshold
        self.consec_frames = consec_frames

        # State tracking
        self.closed_count = 0       # Frame berturut-turut dengan mata tertutup
        self.blink_count = 0        # Total kedipan terdeteksi
        self.frame_count = 0        # Total frame yang diproses
        self.ear_history = []       # Riwayat EAR untuk debugging

    def update(self, ear_value: float) -> dict:
        """
        Update detektor dengan nilai EAR dari frame terbaru.

        Args:
            ear_value: Rata-rata EAR kedua mata

        Returns:
            dict:
                - ear: float — Nilai EAR frame ini
                - blink_count: int — Total kedipan terdeteksi
                - is_blinking: bool — Apakah mata sedang tertutup
                - liveness_passed: bool — Apakah liveness terverifikasi (≥1 kedipan)
                - frame_count: int — Total frame diproses
        """
        self.frame_count += 1
        self.ear_history.append(ear_value)

        is_blinking = False

        if ear_value < self.ear_threshold:
            # Mata tertutup
            self.closed_count += 1
            is_blinking = True
        else:
            # Mata terbuka — cek apakah sebelumnya ada sequence tertutup
            if self.closed_count >= self.consec_frames:
                # Transisi CLOSED → OPEN = 1 kedipan terdeteksi!
                self.blink_count += 1

            # Reset counter
            self.closed_count = 0

        return {
            "ear": ear_value,
            "blink_count": self.blink_count,
            "is_blinking": is_blinking,
            "liveness_passed": self.blink_count >= 1,
            "frame_count": self.frame_count,
        }

    def reset(self):
        """Reset semua state. Dipanggil saat sesi pemindaian baru."""
        self.closed_count = 0
        self.blink_count = 0
        self.frame_count = 0
        self.ear_history = []
