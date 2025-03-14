const mysql = require('mysql2/promise'); // Use mysql2 with promises

// Create a connection pool
const pool = mysql.createPool({
  connectionLimit: 10, // Adjust as needed
  host: 'sql8.freesqldatabase.com',
  user: 'sql8766593',
  password: 'TZzNrUc4fB',
  database: 'sql8766593',
  port: 3306
});

// Handle connection errors globally
pool.on('error', (err) => {
  console.error('MySQL Pool Error:', err);
});

// Export the pool for use in other files
module.exports = pool;
