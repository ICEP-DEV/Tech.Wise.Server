const mysql = require('mysql');

const db = mysql.createConnection({
  host: 'sql8.freesqldatabase.com',
  user: 'sql8766593',
  password: 'TZzNrUc4fB',
  database: 'sql8766593',
  port: 3306
});

db.connect((err) => {
  if (err) {
    console.error('Error connecting to the database:', err);
    return;
  }
  console.log('Connected to the database');
});

module.exports = db;