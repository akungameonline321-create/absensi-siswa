# 🛠️ Panduan Setup Windows — Sistem Absensi Face Recognition

> **WAJIB** diikuti sebelum menjalankan `pip install dlib` atau `pip install face_recognition`.
> Tanpa langkah ini, instalasi **pasti gagal** di Windows.

---

## 1. Instal CMake

CMake diperlukan untuk mengompilasi library C++ (dlib).

1. Download installer dari: https://cmake.org/download/
2. Pilih **Windows x64 Installer (.msi)**
3. Saat instalasi, **centang** opsi: `Add CMake to the system PATH for all users`
4. Verifikasi:
   ```powershell
   cmake --version
   # Output: cmake version 3.x.x
   ```

---

## 2. Instal Visual Studio Build Tools 2022 (C++ Compiler)

Dlib membutuhkan compiler C++ untuk dikompilasi dari source.

1. Download dari: https://visualstudio.microsoft.com/visual-cpp-build-tools/
2. Jalankan installer, pilih tab **Workloads**
3. **Centang**: `Desktop development with C++`
4. Pastikan komponen berikut tercentang di sidebar kanan:
   - MSVC v143 — VS 2022 C++ x64/x86 build tools
   - Windows 10/11 SDK
   - C++ CMake tools for Windows
5. Klik **Install** (ukuran ~6-8 GB)
6. **Restart komputer** setelah instalasi selesai
7. Verifikasi:
   ```powershell
   cl
   # Output: Microsoft (R) C/C++ Optimizing Compiler Version 19.x.x
   ```
   > Jika `cl` tidak ditemukan, buka **"Developer Command Prompt for VS 2022"**
   > atau tambahkan path MSVC ke environment variable PATH secara manual.

---

## 3. Instal Python 3.10+

1. Download dari: https://www.python.org/downloads/
2. Saat instalasi, **centang**: `Add Python to PATH`
3. Verifikasi:
   ```powershell
   python --version
   # Output: Python 3.10.x atau lebih baru

   pip --version
   # Output: pip 2x.x.x from ...
   ```

---

## 4. Instal Node.js 18 LTS

1. Download dari: https://nodejs.org/
2. Pilih versi **LTS** (Long Term Support)
3. Ikuti wizard instalasi (default settings)
4. Verifikasi:
   ```powershell
   node --version
   # Output: v18.x.x atau lebih baru

   npm --version
   # Output: 9.x.x atau lebih baru
   ```

---

## 5. Aktifkan MySQL via Laragon

1. Buka **Laragon**
2. Klik **Start All** atau klik kanan → **MySQL** → **Start**
3. Pastikan indikator MySQL berwarna hijau (running)
4. Buat database `absensi_sma`:
   - Klik kanan pada Laragon → **MySQL** → **HeidiSQL** (atau phpMyAdmin)
   - Buat database baru dengan nama `absensi_sma`
   - Atau via terminal Laragon:
   ```powershell
   mysql -u root -e "CREATE DATABASE absensi_sma;"
   ```
5. Verifikasi koneksi:
   ```powershell
   mysql -u root -e "SHOW DATABASES;"
   ```

> **Catatan**: Laragon menggunakan user `root` tanpa password secara default, sama seperti konfigurasi di `.env.example`.

---

## 6. Instal Dlib & Face Recognition (Setelah Langkah 1–3)

```powershell
# Buat virtual environment untuk ML Engine
cd ml-engine
python -m venv venv
venv\Scripts\activate

# Instal dlib (membutuhkan CMake + C++ compiler)
pip install dlib

# Jika berhasil, instal face_recognition
pip install face_recognition

# Instal semua dependensi proyek
pip install -r requirements.txt
```

---

## ❗ Troubleshooting Umum

| Masalah | Solusi |
|---|---|
| `CMake must be installed to build dlib` | Pastikan CMake terinstal dan ada di PATH. Restart terminal. |
| `error: Microsoft Visual C++ 14.0 or greater is required` | Instal Visual Studio Build Tools dengan workload C++. Restart PC. |
| `pip install dlib` sangat lama | Normal — dlib dikompilasi dari source (~5-15 menit). Biarkan berjalan. |
| `ImportError: No module named 'dlib'` | Pastikan Anda mengaktifkan virtual environment (`venv\Scripts\activate`). |
| MySQL tidak bisa diakses | Pastikan service MySQL di Laragon sudah **Start** (hijau). |
