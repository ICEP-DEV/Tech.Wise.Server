const express = require('express');
const router = express.Router();  // Use `router` instead of `app`
const pool = require('../config/config'); // Import the MySQL connection pool

// Fetch customer details by customerId
router.get("/customer", (req, res) => {
    const { customerId } = req.query;  // Get customerId from query string

    console.log(`Fetching details for customer ID: ${customerId}`);

    const query = "SELECT * FROM users WHERE id = ?";

    pool.getConnection((err, connection) => {
        if (err) {
            console.error("Database connection failed:", err);
            return res.status(500).json({ error: "Database connection error" });
        }

        connection.query(query, [customerId], (err, results) => {
            connection.release(); // Release the connection back to the pool

            if (err) {
                console.error("Error fetching user:", err);
                return res.status(500).json({ error: "Internal Server Error" });
            }

            if (results.length === 0) {
                return res.status(404).json({ message: "User not found" });
            }

            console.log(`User found: ${JSON.stringify(results[0])}`); 
            res.status(200).json(results[0]);
        });
    });
});

module.exports = router;
