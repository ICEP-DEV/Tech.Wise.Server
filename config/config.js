const mysql = require('mysql2/promise'); // Use mysql2 with promises

// Create a connection pool
const pool = mysql.createPool({
  connectionLimit: 10, // Adjust as needed
  host: 'sql8.freesqldatabase.com',
  user: 'sql8766593',
  password: 'TZzNrUc4fB',
  database: 'sql8766593',
  waitForConnections: true,
  queueLimit: 0,
  port: 3306,
  connectTimeout: 10000, // 10 seconds timeout for establishing a connection
  acquireTimeout: 10000, // 10 seconds timeout for acquiring a connection
});


// Handle connection errors globally
pool.on('error', (err) => {
  console.error('MySQL Pool Error:', err);
});

// Export the pool for use in other files
module.exports = pool;
