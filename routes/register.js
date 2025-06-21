const express = require("express");
const router = express.Router();
const pool = require("../config/config"); // Import the MySQL connection pool
require("dotenv").config();

// Endpoint to register a new user
router.post('/register', async (req, res) => {
    console.log('Received request:', req.body);

    try {
        const { name, email, role, user_uid } = req.body;

        if (!name || !email || !role || !user_uid) {
            return res.status(400).json({ message: "All fields are required" });
        }

        const sql = `INSERT INTO users (name, email, role, user_uid) VALUES (?, ?, ?, ?)`;

        const connection = await pool.getConnection();
        const [result] = await connection.execute(sql, [name, email, role, user_uid]);
        connection.release(); // Release the connection back to the pool

        res.status(201).json({ message: 'User registered successfully', userId: result.insertId });
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({ message: 'Error registering user', error: error.message });
    }
});

module.exports = router;
