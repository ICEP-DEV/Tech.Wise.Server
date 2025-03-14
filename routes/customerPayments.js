const express = require('express');
const router = express.Router();
const pool = require('../config/config'); // Use the pool for database connection

// Endpoint to fetch recipient data
router.get('/recipient', (req, res) => {
    const { user_id } = req.query; // Get user_id from the query string

    console.log('Request to fetch recipient data:', req.query); // Log the incoming query parameters

    // Validate the user_id
    if (!user_id) {
        return res.status(400).json({ message: 'User ID is required' });
    }

    // SQL query to fetch recipient data based on user_id
    const sql = `
      SELECT id, paystack_recipient_id, bank_code, country_code, user_id, created_at, last_four_digits, is_selected
      FROM recipients
      WHERE user_id = ?;
    `;

    pool.getConnection((err, connection) => {
        if (err) {
            console.error('Error connecting to the database:', err);
            return res.status(500).json({ message: 'Internal server error' });
        }
    
        const startTime = Date.now(); // Log start time
    
        connection.query(sql, [user_id], (error, result) => {
            const queryDuration = Date.now() - startTime; // Log query duration
            console.log('Query executed in:', queryDuration, 'ms');
            connection.release(); // Release connection back to the pool
    
            if (error) {
                console.error('Error executing SQL query:', error);
                return res.status(500).json({ message: 'Internal server error' });
            }
    
            if (result.length > 0) {
                res.json({ recipients: result }); // Return recipients as an array
            } else {
                return res.status(404).json({ message: 'No recipient found for this user' });
            }
        });
    });
    
});

// POST endpoint to insert payment data
router.post('/payment', (req, res) => {
    const { tripId, paymentType, amount, paymentDate } = req.body;

    // Ensure required fields are present
    if (!tripId || !paymentType || !amount || !paymentDate) {
        return res.status(400).json({ error: "Required fields are missing" });
    }

    // SQL query to insert payment data into the database
    const sql = `
      INSERT INTO payment (tripId, paymentType, amount, paymentDate)
      VALUES (?, ?, ?, ?)
    `;

    // Insert payment data into MySQL
    pool.getConnection((err, connection) => {
        if (err) {
            console.error('Error connecting to the database:', err);
            return res.status(500).json({ error: "An error occurred while connecting to the database" });
        }

        connection.query(sql, [tripId, paymentType, amount, paymentDate], (error, result) => {
            connection.release(); // Release connection back to the pool

            if (error) {
                console.error("Error saving payment data:", error);
                return res.status(500).json({ error: "An error occurred while saving payment data" });
            }

            console.log("Payment data inserted successfully");
            res.status(200).json({ message: "Payment data inserted successfully", paymentId: result.insertId });
        });
    });
});

module.exports = router;
