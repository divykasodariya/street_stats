const mysql = require('mysql2');

    const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'admin_user',
    password: process.env.DB_PASSWORD || 'Admin@123',
    database: process.env.DB_NAME || 'street_stats',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    });

    const promisePool = pool.promise();

pool.getConnection((err, connection) => {
  if (err) {
    console.error('Database connection error:', err.message);
    process.exit(1);
  }
  console.log('Database connected successfully');
  connection.release();
});

module.exports = promisePool;