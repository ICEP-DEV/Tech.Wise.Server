const express = require("express");
const router = express.Router();
const axios = require("axios");
const db = require("../config/config");
require("dotenv").config();

router.post('/register', (req, res) => {
  console.log('Received request:', req.body);

  try {
      const {id,  name, email, password, role,  gender,user_uid } = req.body;

      const sql = `INSERT INTO users ( name, email, password, role,    gender,user_uid) VALUES (?,  ?, ?, ?, ?,?)`;

      db.query(sql, [ name, email, password, role, gender,user_uid], (err, result) => {
          if (err) {
              console.error('MySQL Error:', err);
              return res.status(500).json({ message: 'Database error', error: err });
          }
          res.status(201).json({ message: 'User registered successfully', userId: id });
      });
  } catch (error) {
      console.error('Catch Block Error:', error);
      res.status(500).json({ message: 'Error registering user', error: error.message });
  }
  
});

  
  module.exports = router;
