const express = require('express');
const router = express.Router();
const pool = require('../config/config'); // Use the pool for database connection
const https = require('https');
const { default: axios } = require('axios');
require("dotenv").config(); // Load environment variables from .env file
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;


// POST endpoint to insert payment data

router.post('/payment', async (req, res) => {
  const { tripId, user_id, paymentType, amount, paymentDate } = req.body;

  console.log('Request to process payment data:', req.body);

  // Validate required fields
  if (!tripId || !user_id || !paymentType || !amount || !paymentDate) {
    return res.status(400).json({ message: 'Required fields are missing' });
  }

  // SQL query to insert payment data with user_id and currency = 'ZAR'
  const sql = `
    INSERT INTO payment (tripId, user_id, paymentType, amount, paymentDate, currency)
    VALUES (?, ?, ?, ?, ?, 'ZAR')
  `;

  try {
    const startTime = Date.now();

    // Execute the query
    const [result] = await pool.query(sql, [tripId, user_id, paymentType, amount, paymentDate]);

    const queryDuration = Date.now() - startTime;
    console.log('Query executed in:', queryDuration, 'ms');

    console.log('Payment data inserted successfully');
    res.status(200).json({ message: 'Payment data inserted successfully', paymentId: result.insertId });
  } catch (error) {
    console.error('Error processing payment data:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// calculate total revenue from successful payments
router.get('/payment/summary', async (req, res) => {
  const query = `
    SELECT 
      COUNT(*) AS totalPayments,
      SUM(CASE WHEN payment_status = 'successful' THEN amount ELSE 0 END) AS totalRevenue,
      COUNT(DISTINCT user_id) AS uniquePayers
    FROM payment
  `;

  try {
    const [rows] = await pool.query(query);
    res.json(rows[0]);
  } catch (error) {
    console.error('Error fetching payment summary:', error);
    res.status(500).json({ message: 'Internal server error' });
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

// Endpoint to fetch all payment records
router.get('/payment', async (req, res) => {
  const query = `SELECT * FROM payment`;

  try {
    const [rows] = await pool.query(query);

    if (rows.length === 0) {
      return res.status(404).json({ message: 'No payments found' });
    }

    console.log("Fetched all payments");
    res.json(rows); // return array of payments
  } catch (error) {
    console.error('Error fetching all payments:', error);
    res.status(500).send('Error fetching payments');
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

// Endpoint to fetch customer code for a specific user
router.get('/user/:user_id/customer-code', async (req, res) => {
  const { user_id } = req.params;

  console.log('Fetching customer code for user_id:', user_id);

  if (!user_id) {
    return res.status(400).json({ message: 'User ID is required' });
  }

  const sql = `
      SELECT customer_code
      FROM users
      WHERE id = ?
  `;

  try {
    const startTime = Date.now();
    const [rows] = await pool.query(sql, [user_id]);
    console.log(`Query executed in ${Date.now() - startTime} ms`);

    if (rows.length > 0) {
      res.json({
        customer_code: rows[0].customer_code || null, // return null if empty
      });
    } else {
      // User not found in DB
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    console.error('Error executing query:', error);
    res.status(500).json({ message: 'Internal server error' });
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
    SELECT *
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
// POST /initialize-payment automatic pay driver using saved card or new card and charging the customer
// POST /initialize-payment automatic pay driver using saved card or new card and charging the customer
router.post('/initialize-payment', async (req, res) => {
  const { email, amount, user_id, driverId } = req.body;

  if (!email || !amount || !user_id || !driverId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // 1️⃣ 🔍 Get driver's subaccount_code
    const [subaccountRows] = await pool.query(
      `SELECT subaccount_code FROM subaccounts WHERE user_id = ? LIMIT 1`,
      [driverId]
    );

    if (subaccountRows.length === 0) {
      return res.status(404).json({ error: 'Driver subaccount not found' });
    }

    const subaccount_code = subaccountRows[0].subaccount_code;
    console.log(`Found driver subaccount_code: ${subaccount_code}`);

    // 2️⃣ ✅ Check if user has saved card
    const [savedCards] = await pool.query(
      `SELECT authorization_code FROM user_card_details WHERE user_id = ? AND is_selected = 1 AND authorization_code IS NOT NULL`,
      [user_id]
    );

    if (savedCards.length > 0) {
      const authorization_code = savedCards[0].authorization_code;
      console.log(`Found saved card for user ${user_id}: authorization_code = ${authorization_code}`);

      // 3️⃣ 🔥 Charge saved card AND route to subaccount
      const chargeResponse = await axios.post(
        'https://api.paystack.co/transaction/charge_authorization',
        {
          email,
          amount,
          authorization_code,
          subaccount: subaccount_code, // ✅ route split payment to subaccount
        },
        {
          headers: {
            Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );

      console.log('Charge response:', chargeResponse.data);

      // Verify the transaction
      const verificationResult = await verifyTransaction(chargeResponse.data.data.reference);
      console.log('Transaction verification result:', verificationResult);

      return res.json({
        message: 'Payment charged using saved card',
        charged: true,
        data: chargeResponse.data.data,
      });
    }

    // 4️⃣ 🆕 No saved card → initialize payment (with subaccount split)
    const initResponse = await axios.post(
      'https://api.paystack.co/transaction/initialize',
      {
        email,
        amount,
        callback_url: 'http://localhost:8081/PaymentSuccess', // your callback
        subaccount: subaccount_code, // ✅ route split payment to subaccount
      },
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('Payment initialized:', initResponse.data);

    // Verify the transaction after initialization
    const verificationResult = await verifyTransaction(initResponse.data.data.reference);
    console.log('Transaction verification result:', verificationResult);

    return res.json({
      message: 'Payment initialized for new card',
      charged: false,
      data: initResponse.data.data, // includes authorization_url
    });

  } catch (error) {
    console.error('Payment error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Payment processing failed' });
  }
});

// Function to verify the payment using Paystack's API
const verifyTransaction = async (transactionReference) => {
  try {
    const response = await axios.get(
      `https://api.paystack.co/transaction/verify/${transactionReference}`,
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );
    
    const transactionData = response.data.data;
    console.log('Verified Transaction:', transactionData);
    
    // Check if the payment was routed to the subaccount
    if (transactionData.subaccount) {
      console.log('Payment was routed to subaccount:', transactionData.subaccount);
    } else {
      console.log('Payment was not routed to a subaccount.');
    }
    
    return response.data;
  } catch (error) {
    console.error('Error verifying payment:', error);
    throw new Error('Transaction verification failed');
  }
};

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
    paymentId, // optional
  } = req.body;

  console.log('Incoming payment data:', req.body);

  if (
    !tripId || !paymentType || !amount || !paymentDate ||
    !payment_reference || !payment_status || !currency
  ) {
    return res.status(400).json({ message: 'Missing required payment fields' });
  }

  try {
    // ✅ Fetch user_id (customerId) from trips table
    const [tripRows] = await pool.query(
      `SELECT customerId FROM trips WHERE id = ?`,
      [tripId]
    );

    if (tripRows.length === 0) {
      return res.status(404).json({ message: 'Trip not found' });
    }

    const user_id = tripRows[0].customerId; // ✅ got user_id

    if (paymentId) {
      // ✅ UPDATE existing payment (also update user_id just in case)
      const updateSql = `
        UPDATE payment
        SET
          user_id = ?,
          payment_reference = ?,
          payment_status = ?,
          currency = ?
        WHERE id = ?
      `;
      const [updateResult] = await pool.query(updateSql, [
        user_id,
        payment_reference,
        payment_status,
        currency,
        paymentId,
      ]);

      console.log('Payment updated successfully');
      return res.status(200).json({ message: 'Payment updated successfully', payment_id: paymentId });
    } else {
      // ✅ INSERT new payment
      const insertSql = `
        INSERT INTO payment 
        (tripId, user_id, paymentType, amount, paymentDate, payment_reference, payment_status, currency)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const [insertResult] = await pool.query(insertSql, [
        tripId,
        user_id,
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

// PUT /payments/user/:user_id/status
// PUT endpoint to update payment_status to 'success' by userId and tripId
router.put('/payments/user/:userId/trip/:tripId/status', async (req, res) => {
  const { userId, tripId } = req.params;

  try {
    const sql = `
      UPDATE payment
      SET payment_status = 'success'
      WHERE user_id = ? AND tripId = ?
    `;

    const [result] = await pool.query(sql, [userId, tripId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Payment not found for this user and trip' });
    }

    res.status(200).json({ message: 'Payment status updated to success' });
  } catch (error) {
    console.error('Error updating payment status:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});


module.exports = router;
