const express = require('express');
const router = express.Router();
const pool = require('../config/config'); // Use the pool for database connection
const https = require('https');
const { default: axios } = require('axios');
require("dotenv").config(); // Load environment variables from .env file
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;


// POST endpoint to insert payment data
router.post('/payment', async (req, res) => {
  const { tripId, paymentType, amount, paymentDate } = req.body;

  console.log('Request to process payment data:', req.body); // Log incoming request data

  // Validate the required fields
  if (!tripId || !paymentType || !amount || !paymentDate) {
    return res.status(400).json({ message: 'Required fields are missing' });
  }

  // SQL query to insert payment data with currency = 'ZAR'
  const sql = `
    INSERT INTO payment (tripId, paymentType, amount, paymentDate, currency)
    VALUES (?, ?, ?, ?, 'ZAR')
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


// Endpoint to Insert or Update Customer Code in user_card_details table
router.put('/update-customer-code', async (req, res) => {
  const { customer_code, user_id } = req.body;

  // Validate that the required fields are provided
  if (!customer_code || !user_id) {
    return res.status(400).json({ error: 'Missing required fields: customer_code or user_id' });
  }

  try {
    // Check if a record exists for the provided customer_code and user_id
    const checkQuery = `SELECT id FROM user_card_details WHERE customer_code = ? AND user_id = ?`;
    const [existingCustomer] = await pool.query(checkQuery, [customer_code, user_id]);

    if (existingCustomer.length > 0) {
      // Customer exists, so update the record
      const updateQuery = `UPDATE user_card_details SET customer_code = ? WHERE user_id = ?`;
      await pool.query(updateQuery, [customer_code, user_id]);
      res.status(200).json({ message: "Customer code updated successfully" });
    } else {
      // Customer does not exist, so insert a new record
      const insertQuery = `INSERT INTO user_card_details (customer_code, user_id) VALUES (?, ?)`;
      await pool.query(insertQuery, [customer_code, user_id]);
      res.status(201).json({ message: "Customer code inserted successfully" });
    }
  } catch (error) {
    console.error("Failed to insert/update customer code", error);
    res.status(500).json({ error: "Failed to insert/update customer code" });
  }
});

// Endpoint to Fetch Customer Code for a specific user
router.get('/user/:user_id/customer-code', async (req, res) => {
  const { user_id } = req.params;

  // Validate that the user_id is provided
  if (!user_id) {
    return res.status(400).json({ error: 'Missing required field: user_id' });
  }

  try {
    // Query to get the customer code for the provided user_id
    const query = `SELECT customer_code FROM user_card_details WHERE user_id = ?`;
    const [customer] = await pool.query(query, [user_id]);

    if (customer.length > 0) {
      // If the customer code is found, return it
      res.status(200).json({ customer_code: customer[0].customer_code });
    } else {
      // If no customer code is found for the user_id
      res.status(404).json({ error: 'Customer code not found, please complete your profile' });
    }
  } catch (error) {
    console.error("Failed to fetch customer code", error);
    res.status(500).json({ error: "Failed to fetch customer code" });
  }
});



// // Endpoint to save customer data
// router.post('/customer-payment', async (req, res) => {
//   const { card_number, card_type, bank_code, country_code, user_id, customer_code, is_selected } = req.body;

//   console.log('Incoming card data:', req.body);

//   if (!card_number || !card_type || !bank_code || !country_code || !user_id || !customer_code) {
//     return res.status(400).json({ message: 'Required fields are missing' });
//   }

//   const sql = `
//     INSERT INTO user_card_details 
//     (last_four_digits, card_type, bank_code, country_code, user_id, customer_code, is_selected)
//     VALUES (?, ?, ?, ?, ?, ?, ?)
//   `;

//   try {
//     const [result] = await pool.query(sql, [
//       card_number,
//       card_type,
//       bank_code,
//       country_code,
//       user_id,
//       customer_code,
//       is_selected,
//     ]);

//     res.status(200).json({ message: 'Card details saved successfully', insertId: result.insertId });
//   } catch (error) {
//     console.error('Error saving card details:', error);
//     res.status(500).json({ message: 'Internal server error' });
//   }
// });

// Express route handler for fetching customer cards
router.get('/customer-cards/:user_id', async (req, res, next) => {
  const user_id = req.params.user_id;

  const query = `
    SELECT id, card_type, last_four_digits, is_selected
    FROM user_card_details
    WHERE user_id = ?
  `;

  try {
    const [rows] = await pool.query(query, [user_id]);

    if (!rows || rows.length === 0) {
      // Return an empty array (not 404) so frontend can handle "no cards" state
      return res.json([]);
    }

    // Return all card records for the user
    res.json(rows);
  } catch (error) {
    console.log("Error fetching customer cards:", error);
  }
});

// Endpoint to update a customer's card details
router.delete('/customer-card/:id', async (req, res) => {
  const cardId = req.params.id;

  try {
    const [result] = await pool.query('DELETE FROM user_card_details WHERE id = ?', [cardId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Card not found' });
    }

    res.status(200).json({ message: 'Card deleted successfully' });
  } catch (error) {
    console.error('Error deleting card:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Endpoint to select a customer's card
router.put('/customer-card/select', async (req, res) => {
  const { user_id, selected_card_id } = req.body;

  try {
    // Set all cards to is_selected = 0
    await pool.query('UPDATE user_card_details SET is_selected = 0 WHERE user_id = ?', [user_id]);

    // Set selected card to is_selected = 1
    await pool.query('UPDATE user_card_details SET is_selected = 1 WHERE id = ?', [selected_card_id]);

    res.status(200).json({ message: 'Card selection updated successfully' });
  } catch (err) {
    console.error('Error updating card selection:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

//endpoint to innitialize payment with paystack
// POST /initialize-payment
router.post('/initialize-payment', async (req, res) => {
  const { email, amount } = req.body;

  try {
    const response = await axios.post(
      'https://api.paystack.co/transaction/initialize',
      {
        email,
        amount, // Must be in kobo for NGN (e.g. 1000 NGN = 100000)
        callback_url: 'http://localhost:8081/PaymentSuccess' // Replace with your actual callback URL
      },
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('Payment initialized:', response.data);
    res.json(response.data);
  } catch (error) {
    console.error('Error initializing payment:', error.response?.data || error.message);
    res.status(500).json({ error: 'Payment initialization failed' });
  }
});
// Endpoint to handle Paystack payment verification
router.get('/verify-payment/:reference', async (req, res) => {
  const { reference } = req.params;

  try {
    const response = await axios.get(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
      },
    });

    const data = response.data.data;
    if (data.status === 'success') {
      // You can update your database here as well
      res.json({ status: 'success', data });
    } else {
      res.json({ status: 'failed', data });
    }
  } catch (error) {
    console.error('Verification failed:', error.response?.data || error.message);
    res.status(500).json({ error: 'Verification error' });
  }
});

// Endpoint to save payment details
router.post('/save-payment', async (req, res) => {
  const {
    tripId,
    paymentType,
    amount,
    paymentDate,
    payment_reference,
    payment_status,
    currency,
    paymentId, // This may or may not be present
  } = req.body;

  console.log('Incoming payment data:', req.body);

  if (
    !tripId || !paymentType || !amount || !paymentDate ||
    !payment_reference || !payment_status || !currency
  ) {
    return res.status(400).json({ message: 'Missing required payment fields' });
  }

  try {
    if (paymentId) {
      // ✅ Update existing payment record
      const updateSql = `
        UPDATE payment
        SET
          payment_reference = ?,
          payment_status = ?,
          currency = ?
        WHERE id = ?
      `;
      const [updateResult] = await pool.query(updateSql, [
        payment_reference,
        payment_status,
        currency,
        paymentId,
      ]);

      console.log('Payment updated successfully');
      return res.status(200).json({ message: 'Payment updated successfully', payment_id: paymentId });
    } else {
      // ✅ Insert new payment record
      const insertSql = `
        INSERT INTO payment 
        (tripId, paymentType, amount, paymentDate, payment_reference, payment_status, currency)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;
      const [insertResult] = await pool.query(insertSql, [
        tripId,
        paymentType,
        amount,
        paymentDate,
        payment_reference,
        payment_status,
        currency
      ]);

      console.log('Payment inserted successfully');
      return res.status(200).json({ message: 'Payment saved successfully', payment_id: insertResult.insertId });
    }
  } catch (error) {
    console.error('Error saving or updating payment:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});




// Endpoint to save customer payment details
router.post('/customer-payment', async (req, res) => {
  const {
    card_number,
    card_type,
    bank_code,
    country_code,
    user_id,
    customer_code,
    is_selected,
    is_default,
    payment_id,
    created_at,
    authorization_code
  } = req.body;

  // Check for missing required fields
  if (
    !card_number || !card_type || !bank_code || !country_code || !user_id ||
    !customer_code || typeof is_selected === 'undefined' || typeof is_default === 'undefined' ||
    !payment_id || !created_at || !authorization_code
  ) {
    return res.status(400).json({ message: 'Required fields are missing' });
  }

  try {
    // Check if the payment_id exists (FK check)
    const [paymentExists] = await pool.query(
      `SELECT id FROM payment WHERE id = ?`,
      [payment_id]
    );

    if (paymentExists.length === 0) {
      return res.status(400).json({ message: 'Invalid payment ID (FK constraint)' });
    }

    // Check if card already exists
    const [existing] = await pool.query(
      `SELECT * FROM user_card_details 
       WHERE user_id = ? AND card_type = ? AND last_four_digits = ? AND customer_code = ?`,
      [user_id, card_type, card_number, customer_code]
    );

    if (existing.length > 0) {
      return res.status(200).json({ message: 'Card already saved', cardId: existing[0].id });
    }

    // Step 1: Set all previous cards for user to is_selected = false
    await pool.query(
      `UPDATE user_card_details SET is_selected = false WHERE user_id = ?`,
      [user_id]
    );

    // Step 2: Insert new card with is_selected = true
    const insertSQL = `
      INSERT INTO user_card_details 
      (last_four_digits, card_type, bank_code, country_code, user_id, customer_code, is_selected, is_default, payment_id, created_at, authorization_code)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const [insertResult] = await pool.query(insertSQL, [
      card_number,
      card_type.trim(),
      bank_code,
      country_code,
      user_id,
      customer_code,
      true,  // Always set new card as selected
      is_default,
      payment_id,
      created_at,
      authorization_code // Ensure this is passed correctly here
    ]);

    res.status(200).json({ message: 'Card saved & set as default', insertId: insertResult.insertId });
  } catch (error) {
    console.error('Error saving card details:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});



module.exports = router;
