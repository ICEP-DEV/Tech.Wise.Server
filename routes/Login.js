const express = require("express");
const bcrypt = require("bcrypt"); // Make sure to install this
const router = express.Router();
const pool = require("../config/config");
require("dotenv").config();

// LOGIN ROUTE
router.post('/login', async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ message: "Email is required" });
    }

    const sql = "SELECT id, role, name, email, customer_code FROM users WHERE email = ?";

    try {
        const connection = await pool.getConnection();
        const [results] = await connection.execute(sql, [email]);
        connection.release();

        if (results.length > 0) {
            res.json({ id: results[0].id, login: true, message: "Login successful" });
        } else {
            return res.status(401).json({ login: false, message: "Invalid email" });
        }
    } catch (error) {
        console.error("Database error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});

// UPDATE PASSWORD ROUTE
router.post('/update-password', async (req, res) => {
    const { email, newPassword } = req.body;

    if (!email || !newPassword) {
        return res.status(400).json({ message: "Email and new password are required" });
    }

    try {
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        const connection = await pool.getConnection();
        const [result] = await connection.execute(
            "UPDATE users SET password = ? WHERE email = ?",
            [hashedPassword, email]
        );
        connection.release();

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "User not found" });
        }

        res.json({ message: "Password updated successfully" });
    } catch (error) {
        console.error("Database error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

module.exports = router;
