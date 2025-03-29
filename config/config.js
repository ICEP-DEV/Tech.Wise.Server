const mysql = require('mysql2/promise'); // Use mysql2 with promises

// Create a connection pool
const pool = mysql.createPool({
  connectionLimit: 10, // Adjust as needed
  host: 'sql8.freesqldatabase.com',
  user: 'sql8770262',
  password: '3EEGCWaNnH',
  database: 'sql8770262',
  waitForConnections: true,  // Ensures the pool waits for a connection to be released before throwing an error
  queueLimit: 0,            // No limit to the queue
  port: 3306,
  connectTimeout: 60000,     // Connection timeout in ms (60 seconds)
});


// Handle connection errors globally
pool.on('error', (err) => {
  console.error('MySQL Pool Error:', err);
});

// Export the pool for use in other files
module.exports = pool;
