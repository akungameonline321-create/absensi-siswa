const mysql = require('mysql2/promise');

async function run() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '', // Laragon default is empty password
    database: 'absensi_sma'
  });

  try {
    console.log("Altering 'role' column in users...");
    await connection.query("ALTER TABLE users MODIFY COLUMN role ENUM('admin', 'guru', 'siswa') NOT NULL DEFAULT 'guru';");
    console.log("Success.");

    console.log("Adding 'student_id' column to users...");
    try {
      await connection.query("ALTER TABLE users ADD COLUMN student_id INT DEFAULT NULL;");
      console.log("Success.");
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') {
        console.log("Column student_id already exists.");
      } else {
        throw e;
      }
    }

    console.log("Adding foreign key constraint...");
    try {
      await connection.query("ALTER TABLE users ADD CONSTRAINT fk_user_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE;");
      console.log("Success.");
    } catch (e) {
      if (e.code === 'ER_DUP_KEYNAME' || e.message.includes('Duplicate key name') || e.message.includes('already exists')) {
         console.log("Constraint already exists.");
      } else {
         // ignore if already exists, mysql error codes are sometimes different
         console.log(e.message);
      }
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await connection.end();
  }
}

run();
