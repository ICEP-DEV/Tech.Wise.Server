const express = require("express");
const router = express.Router();
const pool = require("../config/config"); // Import the MySQL connection pool
require("dotenv").config();

// Endpoint to register a new user
router.post('/register', async (req, res) => {
    console.log('Received request:', req.body);

    let connection;

    try {
        const { name, email, role, user_uid } = req.body;

        if (!name || !email || !role || !user_uid) {
            return res.status(400).json({ message: "All fields are required" });
        }

        connection = await pool.getConnection();

        // Check if email already exists
        const [existingUser] = await connection.execute('SELECT * FROM users WHERE email = ?', [email]);

        if (existingUser.length > 0) {
            return res.status(409).json({ message: 'Email already exists' }); // 409 = Conflict
        }

        // Insert new user
        const sql = `INSERT INTO users (name, email, role, user_uid) VALUES (?, ?, ?, ?)`;
        const [result] = await connection.execute(sql, [name, email, role, user_uid]);

        res.status(201).json({ message: 'User registered successfully', userId: result.insertId });
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({ message: 'Error registering user', error: error.message });
    } finally {
        if (connection) connection.release(); // Always release the connection
    }
});

// Endpoint to check if email exists
router.post('/check-email', async (req, res) => {
    let connection;

    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ message: "Email is required" });
        }

        connection = await pool.getConnection();
        const [existingUser] = await connection.execute('SELECT * FROM users WHERE email = ?', [email]);

        if (existingUser.length > 0) {
            return res.json({ exists: true });
        } else {
            return res.json({ exists: false });
        }
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({ message: 'Error checking email', error: error.message });
    } finally {
        if (connection) connection.release(); // Always release the connection
    }
});

module.exports = router;
