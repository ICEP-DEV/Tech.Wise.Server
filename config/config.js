const mysql = require('mysql');

let db; // Declare db variable outside of the connection function

function createConnection() {
  db = mysql.createConnection({
    host: 'sql8.freesqldatabase.com',
    user: 'sql8766593',
    password: 'TZzNrUc4fB',
    database: 'sql8766593',
    port: 3306
  });

  // Ensure the connection is established properly
  db.connect((err) => {
    if (err) {
      console.error('Error connecting to the database:', err);
      setTimeout(createConnection, 5000); // Try reconnecting after 5 seconds
    } else {
      console.log('Connected to the database');
    }
  });

  // Add an error handler to catch fatal errors
  db.on('error', (err) => {
    console.error('MySQL connection error:', err);
    if (err.code === 'PROTOCOL_ENQUEUE_AFTER_FATAL_ERROR') {
      db.end(); // End the current connection
      createConnection(); // Reconnect to the database
    }
  });
}

// Initialize the connection
createConnection();

module.exports = db;
