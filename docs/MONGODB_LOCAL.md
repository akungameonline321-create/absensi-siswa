## Cara Start MongoDB Lokal via Laragon

### Otomatis (setelah setup)
MongoDB akan berjalan di `localhost:27017` — cukup jalankan command:

```powershell
# Start MongoDB
& "D:\gm\laragon\bin\mongodb\mongodb-win32-x86_64-windows-7.0.20\bin\mongod.exe" --dbpath "D:\gm\laragon\data\mongodb" --port 27017
```

### Verifikasi
```powershell
# Di terminal baru, test koneksi
& "D:\gm\laragon\bin\mongodb\mongodb-win32-x86_64-windows-7.0.20\bin\mongosh.exe" --eval "db.version()"
```
