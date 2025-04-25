const express = require('express');
const router = express.Router();
const pool = require('../config/config'); // Use the pool for database connection
const https = require('https');


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

// Create Paystack customer
router.post('/create-customer', (req, res) => {
  const { email, first_name, last_name, phone } = req.body;

  const params = JSON.stringify({
    email,
    first_name,
    last_name,
    phone
  });

  const options = {
    hostname: 'api.paystack.co',
    port: 443,
    path: '/customer',
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`, // Use dotenv for security
      'Content-Type': 'application/json',
    },
  };

  const paystackReq = https.request(options, paystackRes => {
    let data = '';

    paystackRes.on('data', chunk => {
      data += chunk;
    });

    paystackRes.on('end', () => {
      const result = JSON.parse(data);
      if (paystackRes.statusCode === 200 || paystackRes.statusCode === 201) {
        res.status(200).json(result);
      } else {
        res.status(400).json({ error: result });
      }
    });
  });

  paystackReq.on('error', error => {
    console.error('Paystack Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  });

  paystackReq.write(params);
  paystackReq.end();
});
// Endpoint to save customer data
router.post('/customer-payment', async (req, res) => {
  const { card_number, card_type, bank_code, country_code, user_id, customer_code, is_selected } = req.body;

  console.log('Incoming card data:', req.body);

  if (!card_number || !card_type || !bank_code || !country_code || !user_id || !customer_code) {
    return res.status(400).json({ message: 'Required fields are missing' });
  }

  const sql = `
    INSERT INTO user_card_details 
    (last_four_digits, card_type, bank_code, country_code, user_id, customer_code, is_selected)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  try {
    const [result] = await pool.query(sql, [
      card_number,
      card_type,
      bank_code,
      country_code,
      user_id,
      customer_code,
      is_selected,
    ]);

    res.status(200).json({ message: 'Card details saved successfully', insertId: result.insertId });
  } catch (error) {
    console.error('Error saving card details:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Endpoint to fetch customer payment details
router.get('/customer-cards/:userId', async (req, res) => {
  const userId = req.params.userId;

  const query = `
    SELECT * FROM user_card_details
    WHERE user_id = ?
  `;

  try {
    const [rows] = await pool.query(query, [userId]);

    if (rows.length === 0) {
      return res.status(404).json({ message: 'No payment details found for this user' });
    }

    console.log("Fetched payment details for userId:", userId);
    res.json(rows); // return all payment records for the user
  } catch (error) {
    console.error('Error fetching payment data:', error);
    res.status(500).send('Error fetching payment');
  }
});

module.exports = router;
