const express = require("express");
const router = express.Router();
const pool = require("../config/config"); // Import the MySQL connection pool
require("dotenv").config();

router.post('/login', (req, res) => {
    const { email, password } = req.body;
    console.log('Request Body:', req.body); // Log the incoming request body

    // Validate inputs
    if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
    }

    const sql = "SELECT id, role, name, email FROM users WHERE email = ? AND password = ?";

    pool.getConnection((err, connection) => {
        if (err) {
            console.error("Database connection failed:", err);
            return res.status(500).json({ message: "Database connection error" });
        }

        connection.query(sql, [email, password], (error, results) => {
            connection.release(); // Release the connection back to the pool

            if (error) {
                console.error("Error executing SQL query:", error);
                return res.status(500).json({ message: "Internal server error" });
            }

            if (results.length > 0) {
                res.json({ id: results[0].id, login: true, message: "Login successful" });
            } else {
                return res.status(401).json({ login: false, message: "Invalid email or password" });
            }
        });
    });
});

module.exports = router;
