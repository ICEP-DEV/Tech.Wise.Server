const express = require("express");
const axios = require("axios");
const router = express.Router();
const db = require("../config/config");
require("dotenv").config();
router.post('/login', (req, res) => {
    const { email, password } = req.body;
  console.log('Request Bodylogin oooooooooo:', req.body); // Log the incoming request body
  
    // Validate inputs
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }
  
    const sql = "SELECT id, role, name, email FROM users WHERE email = ? AND password = ?";
    db.query(sql, [email, password], (err, result) => {
      if (err) {
        console.error("Error executing SQL query:", err);
        return res.status(500).json({ message: "Internal server error" });
      } 
  
      if (result.length > 0) {
        res.json({ id: result[0].id, login: true, message: "Login successful" });
      } else {
        return res.status(401).json({ login: false, message: "Invalid email or password" });
      }
    });
  });
   
  module.exports = router;