const express = require('express');
const router = express.Router();
const pool = require('../config/config'); // Use the pool for database connection


// // Endpoint to fetch recipient data
// router.get('/recipient', async (req, res) => {
//   const { user_id } = req.query;

//   console.log('Fetching recipient for user_id:', user_id);

//   if (!user_id) {
//     return res.status(400).json({ message: 'User ID is required' });
//   }

//   const sql = `
//       SELECT 
//           id, paystack_recipient_id, bank_code, country_code, user_id, 
//           created_at, last_four_digits, is_selected 
//       FROM recipients 
//       WHERE user_id = ?
//   `;

//   try {
//     const startTime = Date.now();
//     const [rows] = await pool.query(sql, [user_id]);
//     console.log(`Query executed in ${Date.now() - startTime} ms`);

//     if (rows.length > 0) {
//       res.json({ recipients: rows });
//     } else {
//       res.status(404).json({ message: 'No recipient found. Please add your card details first.' });
//     }
//   } catch (error) {
//     console.error('Error executing query:', error);
//     res.status(500).json({ message: 'Internal server error' });
//   }
// });

// POST endpoint to insert payment data
router.post('/payment', async (req, res) => {
  const { tripId, paymentType, amount, paymentDate } = req.body;

  console.log('Request to process payment data:', req.body); // Log incoming request data

  // Validate the required fields
  if (!tripId || !paymentType || !amount || !paymentDate) {
    return res.status(400).json({ message: 'Required fields are missing' });
  }

  // SQL query to insert payment data into the database
  const sql = `
    INSERT INTO payment (tripId, paymentType, amount, paymentDate)
    VALUES (?, ?, ?, ?)
  `;

  try {
    const startTime = Date.now(); // Log start time

    // Execute the query using the pool.query method
    const [result] = await pool.query(sql, [tripId, paymentType, amount, paymentDate]);

    const queryDuration = Date.now() - startTime; // Log query duration
    console.log('Query executed in:', queryDuration, 'ms');

    console.log('Payment data inserted successfully');
    res.status(200).json({ message: 'Payment data inserted successfully', paymentId: result.insertId });
  } catch (error) {
    console.error('Error processing payment data:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Endpoint to fetch payment details for a specific trip
router.get('/payment/:tripId', async (req, res) => {
  const tripId = req.params.tripId;

  const query = `
    SELECT * FROM payment
    WHERE tripId = ?
  `;

  try {
    const [rows] = await pool.query(query, [tripId]);

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Payment not found for this trip' });
    }

    console.log("Fetched payment for tripId:", tripId);
    res.json(rows[0]); // return a single payment record
  } catch (error) {
    console.error('Error fetching payment data:', error);
    res.status(500).send('Error fetching payment');
  }
});

module.exports = router;
