const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');

async function run() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'absensi_sma'
  });

  try {
    const password = await bcrypt.hash('siswa123', 10);
    const email = 'rembo@siswa.sch.id';
    
    // Cek apakah sudah ada
    const [rows] = await connection.query("SELECT * FROM users WHERE email = ?", [email]);
    if (rows.length === 0) {
      await connection.query(
        "INSERT INTO users (nip, nama, email, password, role, student_id) VALUES (?, ?, ?, ?, ?, ?)",
        ['001', 'Rembo', email, password, 'siswa', 1]
      );
      console.log("Siswa user created: email = rembo@siswa.sch.id, password = siswa123");
    } else {
      console.log("Siswa user already exists.");
    }
  } catch (error) {
    console.error(error);
  } finally {
    await connection.end();
  }
}

run();
