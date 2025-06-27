const express = require("express");
const router = express.Router();
const axios = require("axios");
const pool = require("../config/config");
const https = require('https');
const { log } = require("console");
const { api } = require("../api/serverApi");
require("dotenv").config();

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const PAYSTACK_PLAN_WEEKLY = process.env.PAYSTACK_PLAN_WEEKLY;
const PAYSTACK_PLAN_MONTHLY = process.env.PAYSTACK_PLAN_MONTHLY;

// const paystack = require('paystack')(PAYSTACK_SECRET_KEY);
console.log('plan codes:', PAYSTACK_PLAN_WEEKLY, PAYSTACK_PLAN_MONTHLY);

router.get('/paystack-banks', async (req, res) => {
  try {
    const response = await axios.get('https://api.paystack.co/bank?country=south africa', { // Filter for South African banks
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
      },
    });
    // Extract relevant bank information
    const banks = response.data.data.map(bank => ({
      code: bank.code,
      name: bank.name,
    }));
    console.log("Banks fetched successfully:", banks); // Debugging step
    res.json(banks); // Send the extracted bank information
  } catch (error) {
    console.error('Error fetching banks from Paystack:', error);
    res.status(500).json({ error: 'Failed to fetch banks' });
  }
});
// Create recipient for payment
router.post("/create-recipient", async (req, res) => {
  const { email, account_number, bank_code, first_name, country_code, user_id } = req.body;
  console.log('Creating recipient with data:', email, account_number, bank_code, first_name, country_code, user_id);

  if (!email || !account_number || !bank_code || !first_name || !country_code || !user_id) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    console.log("Creating Paystack Recipient...");

    // Call Paystack API to create the recipient
    const response = await axios.post(
      "https://api.paystack.co/transferrecipient",
      {
        type: "nuban", // assuming Nigerian bank accounts, update for other countries if necessary
        name: `${first_name}`,
        account_number: account_number,
        bank_code: bank_code,
        currency: "ZAR", // Set the currency to ZAR or the currency you're working with
        email: email,
        country_code: country_code,
      },
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    // Ensure the response data is as expected
    if (!response.data || !response.data.data) {
      return res.status(500).json({ error: "Invalid response from Paystack API" });
    }

    const recipientData = response.data.data;

    // Ensure recipient data contains the expected fields
    if (!recipientData.recipient_code) {
      return res.status(500).json({ error: "Recipient creation failed: missing recipient_code" });
    }

    // Extract the last four digits from the account number
    const last_four_digits = account_number.slice(-4);

    // SQL query to insert the new recipient into the database
    const sql = `
      INSERT INTO recipients (paystack_recipient_id, bank_code, country_code, user_id, last_four_digits)
      VALUES (?, ?, ?, ?, ?)
    `;

    // Use pool.query to execute the SQL query
    const [result] = await pool.query(sql, [
      recipientData.recipient_code,
      bank_code,
      country_code,
      user_id,  // Include the user ID in the database query
      last_four_digits // Include the last four digits in the database query
    ]);

    console.log("Recipient created and stored in the database!");

    // Return the recipient code as the response
    res.json({ recipient_code: recipientData.recipient_code });

  } catch (error) {
    console.error("Error creating Paystack recipient:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to create recipient" });
  }
});


// Endpoint to fetch recipient data
router.get('/recipient', async (req, res) => {
  const { user_id } = req.query;

  console.log('Fetching recipient for user_id:', user_id);

  if (!user_id) {
    return res.status(400).json({ message: 'User ID is required' });
  }

  const sql = `
      SELECT 
          id, paystack_recipient_id, bank_code, country_code, user_id, 
          created_at, last_four_digits, is_selected 
      FROM recipients 
      WHERE user_id = ?
  `;

  try {
    const startTime = Date.now();
    const [rows] = await pool.query(sql, [user_id]);
    console.log(`Query executed in ${Date.now() - startTime} ms`);

    if (rows.length > 0) {
      res.json({ recipients: rows });
    } else {
      res.status(404).json({ message: 'No recipient found. Please add your card details first.' });
    }
  } catch (error) {
    console.error('Error executing query:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Endpoint to update the 'is_selected' value for a card
router.put('/recipients/:cardId/select', async (req, res) => {
  const { user_id } = req.body;  // Assuming user_id is passed in the request body
  const { cardId } = req.params;  // Get the cardId from the URL parameter

  if (!user_id || !cardId) {
    return res.status(400).json({ error: "user_id and cardId are required" });
  }

  const connection = await pool.getConnection(); // Get a connection from the pool

  try {
    // Start a transaction
    await connection.beginTransaction();

    // First, set all other cards to is_selected = 0
    await connection.query(
      'UPDATE recipients SET is_selected = 0 WHERE user_id = ? AND id != ?',
      [user_id, cardId]
    );

    // Then, set the selected card's is_selected to 1
    await connection.query(
      'UPDATE recipients SET is_selected = 1 WHERE user_id = ? AND id = ?',
      [user_id, cardId]
    );

    // Commit the transaction if all queries are successful
    await connection.commit();

    res.status(200).json({ message: "Card selection updated successfully" });
  } catch (error) {
    // Rollback the transaction in case of error
    await connection.rollback();
    console.error("Error updating selected card:", error);
    res.status(500).json({ error: "Failed to update selected card" });
  } finally {
    // Release the connection back to the pool
    connection.release();
  }
});

router.post("/withdraw", async (req, res) => {
  console.log("Withdrawal request received:", req.body); // Log the entire request body

  const { user_id, amount, reason } = req.body;

  if (!user_id || !amount || !reason) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const connection = await pool.getConnection(); // Get a connection from the pool

  try {
    // Assuming a dummy balance for now
    const dummyBalance = 5000;
    console.log("Dummy balance:", dummyBalance);

    if (dummyBalance < amount) {
      return res.status(400).json({ error: "Insufficient balance" });
    }

    // Query to get the paystack_recipient_id for the given user_id
    const recipientQuery = `SELECT paystack_recipient_id FROM recipients WHERE user_id = ?`;
    console.log("Executing query:", recipientQuery, [user_id]);

    const [results] = await connection.query(recipientQuery, [user_id]);

    console.log("Database query results:", results); // Log the query results
    const recipient_code = results[0]?.paystack_recipient_id;

    if (!recipient_code) {
      return res.status(404).json({ error: "Recipient not found" });
    }

    console.log("Recipient code:", recipient_code); // Log the recipient code

    // Now perform the withdrawal via Paystack API
    const transferResponse = await axios.post(
      "https://api.paystack.co/transfer",
      {
        source: "balance",
        amount: amount * 100, // Convert to kobo
        recipient: recipient_code,
        reason: reason,
      },
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const transferData = transferResponse.data.data;

    console.log("Withdrawal successful!");

    // Respond with the transfer data
    res.json({
      message: "Withdrawal successful",
      transferData,
    });
  } catch (error) {
    console.error("Error initiating withdrawal:", error.response?.data || error.message);

    res.status(500).json({
      error: "Failed to process withdrawal",
      details: error.message,
    });
  } finally {
    // Release the connection back to the pool
    connection.release();
  }
});


// create customer in paystack
// router.post("/create-customer", async (req, res) => {
//   try {
//     const { email, user_id } = req.body; // You also need to pass user_id from the frontend
//     console.log('email and user_id', email, user_id);

//     // Step 1: Create Customer in Paystack
//     const response = await axios.post(
//       "https://api.paystack.co/customer",
//       { email },
//       {
//         headers: {
//           Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
//           "Content-Type": "application/json",
//         },
//       }
//     );

//     const customer = response.data;

//     // Step 2: Check if the customer creation was successful
//     if (customer.status) {
//       const customer_id = customer.data.id; // Extract the customer_id (id) from the Paystack response
//       const customer_code = customer.data.customer_code;

//       console.log("Customer created:", customer.data);

//       // Step 3: Insert or update customer_id into the subscriptions table
//       const sql = `
//         INSERT INTO subscriptions (user_id, customer_id, customer_code)
//         VALUES (?, ?, ?)
//         ON DUPLICATE KEY UPDATE
//         customer_id = VALUES(customer_id),
//         customer_code = VALUES(customer_code);
//       `;

//       db.query(sql, [user_id, customer_id, customer_code], (err, result) => {
//         if (err) {
//           console.error("Database error:", err);
//           return res.status(500).json({ error: "Database error" });
//         }

//         console.log("Customer ID stored successfully in the subscriptions table.");
//         res.json({ status: true, message: "Customer created and subscription updated!" });
//       });
//     } else {

//       console.error("Failed to create customer:", customer);
//       res.status(500).json({ error: "Failed to create customer" });
//     }
//   } catch (error) {
//     console.error("Error creating Paystack customer:", error.response?.data || error.message);
//     res.status(500).json({ error: "Failed to create customer" });
//   }
// }); 

// Subscription Payment Route
// router.post("/subscribe", async (req, res) => {
//   const { email, user_id, planType, cost, recipient_code } = req.body;

//   if (!email || !planType || !user_id || !recipient_code) {
//     return res.status(400).json({ error: "Missing required fields" });
//   }

//   let plan_code = planType === "Weekly" ? PAYSTACK_PLAN_WEEKLY : PAYSTACK_PLAN_MONTHLY;
//   const amount = 40000;  // Example, adjust as necessary

//   try {
//     console.log("Subscribing user to plan:", plan_code);

//     const paystackResponse = await axios.post(
//       "https://api.paystack.co/transaction/initialize",
//       {
//         email,
//         plan: plan_code,
//         amount,
//         metadata: {
//           planType,
//           user_id,
//         },
//         recipient: recipient_code,  // Link recipient here
//         callback_url: "http://10.0.2.2:3000/api/payment-success",
//       },
//       {
//         headers: {
//           Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
//           "Content-Type": "application/json",
//         },
//       }
//     );

//     console.log("Paystack Transaction Response:", paystackResponse.data);

//     if (!paystackResponse.data || !paystackResponse.data.data.authorization_url) {
//       return res.status(500).json({ error: "Payment initialization failed" });
//     }

//     const authorization_url = paystackResponse.data.data.authorization_url;
//     const reference = paystackResponse.data.data.reference;

//     // Store Subscription in Database (include recipient_code for future reference)
//     const sql = `
//       INSERT INTO subscriptions (plan_name, user_id, amount, customer_code, recipient_code, statuses)
//       VALUES (?, ?, ?, ?, ?, '0')
//     `;

//     db.query(sql, [planType, user_id, cost, reference, recipient_code], (err) => {
//       if (err) {
//         console.error("Database error:", err);
//         return res.status(500).json({ error: "Database error" });
//       }

//       console.log("Subscription inserted successfully!");
//       res.json({ authorization_url, reference });
//     });
//   } catch (error) {
//     console.error("Paystack error:", error.response?.data || error.message);
//     res.status(500).json({ error: "Payment initialization failed" });
//   }
// });
router.post('/initialize-transaction-with-plan', async (req, res) => {
  const { email, planType, cost, user_id } = req.body;
  console.log('➡️ Received request:', req.body);

  const startTime = Date.now();

  try {
    if (!email || !cost || !planType || !user_id) {
      return res.status(400).json({ error: 'Invalid input' });
    }

    const plan_code = planType === "Weekly" ? PAYSTACK_PLAN_WEEKLY : PAYSTACK_PLAN_MONTHLY;

    const paystackStart = Date.now();
    const paystackResponse = await axios.post(
      "https://api.paystack.co/transaction/initialize",
      {
        email,
        plan: plan_code,
        amount: cost * 100,
        channels: ['card'],
        callback_url: api + "payment-success",
      },
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );
    console.log("✅ Paystack responded in", Date.now() - paystackStart, "ms");

    const { authorization_url, reference } = paystackResponse.data.data;

    const dbStart = Date.now();
    const connection = await pool.getConnection();

    const [userResults] = await connection.query('SELECT id FROM users WHERE id = ?', [user_id]);
    if (userResults.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const [insertResult] = await connection.query(
      `INSERT INTO subscriptions (plan_name, user_id, amount, reference, statuses)
       VALUES (?, ?, ?, ?, '0')`,
      [planType, user_id, cost, reference]
    );
    console.log("✅ DB actions took", Date.now() - dbStart, "ms");

    connection.release();
    console.log("🚀 Total request time:", Date.now() - startTime, "ms");

    res.json({ authorization_url, reference });

  } catch (error) {
    console.error("🔥 Error:", error.response?.data || error.message);
    res.status(500).json({ error: "Internal server error" });
  }
});



router.post("/payment-callback", async (req, res) => {
  const { reference } = req.body;
  console.log("Verifying transaction with reference:", reference);

  try {
    // Verify the Paystack transaction
    const verifyResponse = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` },
      }
    );

    console.log("Full Paystack Verification Response:", verifyResponse.data);

    // Check if the transaction was successful
    if (verifyResponse.data.status && verifyResponse.data.data.status === "success") {
      const { data } = verifyResponse.data;

      // Extract necessary transaction details
      const transactionDetails = {
        customerId: data.customer.id,
        customer_code: data.customer.customer_code,
        first_name: data.customer.first_name,
        last_name: data.customer.last_name,
        email: data.customer.email,
        paidAt: data.paid_at,
        createdAt: data.created_at,
        name: data.plan_object.name,
        description: data.plan_object.description,
        amount: data.plan_object.amount / 100, // Convert cents to currency
        interval: data.plan_object.interval,
        last4: data.authorization.last4,
        status: data.status,
        reference: data.reference,
      };

      // Start a connection with the pool
      const connection = await pool.getConnection();

      try {
        // Update the subscription status in the database
        const sql = `
          UPDATE subscriptions
          SET statuses = '1', authorization_code = ?, customer_code = ?, customer_id = ?
          WHERE reference = ?
        `;

        const [result] = await connection.query(sql, [
          data.authorization.authorization_code,
          transactionDetails.customer_code,
          transactionDetails.customerId,
          transactionDetails.reference,
        ]);

        console.log("Transaction Verified and Subscription Updated!", result);

        // Respond with success and transaction details
        res.json({
          success: true,
          message: "Transaction verified and subscription updated.",
          transactionDetails, // Send all details to frontend
        });

      } catch (err) {
        console.error("Database Error:", err);
        res.status(500).json({ error: "Database error" });
      } finally {
        connection.release(); // Ensure connection is released back to the pool
      }
    } else {
      return res.status(400).json({ error: "Transaction not successful" });
    }
  } catch (error) {
    console.error("Paystack verification error:", error.response?.data || error.message);
    res.status(500).json({ error: "Transaction verification failed" });
  }
});



// Fetch Subscription Details
// router.get("/subscription/:reference", async (req, res) => {
//   const { reference } = req.params;
//   console.log("Received reference:", reference);  // Log the received reference

//   const sql = `
//     SELECT paystack_subscription_id, verification_id, statuses 
//     FROM subscriptions
//     WHERE customer_code = ?`;  // Use reference column instead of customer_code

//   db.query(sql, [reference], (err, results) => {
//     if (err) {
//       console.error("Database Error:", err);
//       return res.status(500).json({ error: "Database error" });
//     }

//     if (results.length === 0) {
//       console.log("No subscription found for reference:", reference);  // Log if no subscription is found
//       return res.status(404).json({ error: "Subscription not found" });
//     }

//     console.log("Subscription found:", results[0]);  // Log the found subscription data
//     res.json(results[0]);
//   });
// });
// Get user's subscription status
// Get user's subscription status// Get the latest subscription for a user
// router.get("/user-subscription/:user_id", async (req, res) => {
//   const { user_id } = req.params;

//   console.log("User ID received:", user_id);  // Log the user_id

//   const query = "SELECT * FROM subscriptions WHERE user_id = ? ORDER BY created_at DESC LIMIT 1"; // Ensure you get the most recent subscription

//   db.query(query, [user_id], (err, results) => {
//     if (err) {
//       console.error("Database Error:", err);
//       return res.status(500).json({ error: "Internal Server Error" });
//     }

//     console.log("Database query results:", results);  // Log the query results

//     if (results.length === 0) {
//       // No subscription found, first-time subscriber
//       console.log("No subscription found for user:", user_id);
//       return res.json({ isFirstTime: true, subscription: null });
//     }

//     // Get the latest subscription (first result due to ORDER BY created_at DESC)
//     const subscription = results[0];

//     // Return the latest valid subscription
//     return res.json({ isFirstTime: false, subscription });
//   });
// });


router.get("/subscription", async (req, res) => {
  try {
    let { customer } = req.query;

    if (!customer) {
      return res.status(400).json({ error: "Please include a valid customer ID" });
    }

    // Ensure customer is treated as a number
    const customerIdNumber = Number(customer);

    // Fetch all subscriptions from Paystack
    const fetchSubscriptionsResponse = await axios.get(
      "https://api.paystack.co/subscription",
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`, // Ensure you have your secret key
          "Content-Type": "application/json",
        },
      }
    );

    if (!fetchSubscriptionsResponse.data.status) {
      return res.status(400).json({
        error: `Error fetching subscriptions: ${fetchSubscriptionsResponse.data.message}`,
      });
    }

    const subscriptions = fetchSubscriptionsResponse.data.data || [];
    console.log('subscriptionsrrrrrrrrrrr', subscriptions[0]);

    // Log the status of each subscription for debugging
    // subscriptions.forEach((sub) => {
    //   console.log(`Subscription status: ${sub.status}, Customer ID: ${sub.customer.id}`);
    // });

    // Filter subscriptions for the specified customer and valid statuses
    const customerSubscriptions = subscriptions.filter(
      (sub) =>
        sub.customer.id === customerIdNumber &&
        (sub.status === "active" || sub.status === "non-renewing")
    );

    return res.status(200).json(customerSubscriptions);
  } catch (error) {
    console.error("Error fetching subscriptions:", error);
    return res.status(500).json({ error: error.message });
  }
});


router.get("/get-customer-id", async (req, res) => {
  try {
    let { user_id } = req.query;
    console.log("User ID received:", user_id);

    // Validate that the user_id is provided
    if (!user_id) {
      return res.status(400).json({ error: "Please provide a valid user ID" });
    }

    // Define the SQL query to fetch the customer_id
    const sql = "SELECT customer_id FROM subscriptions WHERE user_id = ? LIMIT 1";

    // Use pool.query for a promise-based database query
    const startTime = Date.now();
    const [rows] = await pool.query(sql, [user_id]);
    console.log(`Query executed in ${Date.now() - startTime} ms`);

    // Handle case where no customer ID is found
    if (rows.length === 0) {
      console.log("❌ No customer ID found for user_id:", user_id);
      return res.status(404).json({ error: "No customer ID found for this user" });
    }

    // Return the found customer ID
    console.log("✅ Found customer ID:", rows[0].customer_id);
    return res.status(200).json({ customer_id: rows[0].customer_id });

  } catch (error) {
    console.error("🔥 Backend Error fetching customer ID:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});


//   try {
//     const { subscription_code } = req.query;

//     if (!subscription_code) {
//       return res.status(400).json({ message: "Subscription code is required" });
//     }

//     // Make a GET request to Paystack's subscription API for the specific subscription using subscription_code
//     const fetchSubscriptionResponse = await axios.get(
//       `https://api.paystack.co/subscription/${subscription_code}`, // Directly using the subscription code in the URL
//       {
//         headers: {
//           Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`, // Replace with your secret key
//           "Content-Type": "application/json",
//         },
//       }
//     );


//     console.log("Fetched Subscription Data:", fetchSubscriptionResponse.data);

//     // Get the manage link from the response data
//     const manageSubscriptionLink = fetchSubscriptionResponse.data.data.manage_link;

//     if (!manageSubscriptionLink) {
//       console.log("Manage link not available for this subscription.");
//       return res.status(404).json({ message: "Manage link not available" });
//     }

//     // Send the manage link in the response
//     return res.status(200).json({ link: manageSubscriptionLink });
//   } catch (error) {
//     console.error("Error fetching subscription:", error);
//     return res.status(500).json({ message: "An error occurred", error: error.message });
//   }
// });



// list subscriptions


// router.post('/get-subscription', (req, res) => {
//   const { email } = req.body;  // Get email from the request

//   const options = {
//     hostname: 'api.paystack.co',
//     port: 443,
//     path: `/subscription?email=${encodeURIComponent(email)}`,
//     method: 'GET',
//     headers: {
//       Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
//     },
//   };

//   https.request(options, apiRes => {
//     let data = '';
//     apiRes.on('data', chunk => {
//       data += chunk;
//     });

//     apiRes.on('end', () => {
//       res.json(JSON.parse(data));  // Send the response back to frontend
//     });
//   }).on('error', error => {
//     console.error('Error with Paystack request:', error);
//     res.status(500).json({ error: 'Failed to fetch subscription data from Paystack' });
//   }).end();
// });


// Upgrade Subscription API
router.put('/api/upgrade-subscription', async (req, res) => {
  const { userId, newPlanName, newAmount, paystackSubscriptionId } = req.body;

  // Ensure all necessary fields are provided
  if (!newPlanName || !newAmount || !paystackSubscriptionId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // Find the current subscription
    const subscription = await Subscription.findOne({ where: { user_id: userId } });

    if (subscription) {
      // If the subscription exists, update the plan
      subscription.plan_name = newPlanName;
      subscription.amount = newAmount;
      subscription.paystack_subscription_id = paystackSubscriptionId; // Store Paystack subscription ID
      await subscription.save();

      return res.json({ success: true, subscription });
    } else {
      return res.status(404).json({ error: 'Subscription not found' });
    }
  } catch (error) {
    console.error('Error upgrading subscription:', error);
    return res.status(500).json({ error: 'Failed to upgrade subscription' });
  }
});

// Downgrade Subscription API
router.put('/api/downgrade-subscription', async (req, res) => {
  const { userId, newPlanName, newAmount, paystackSubscriptionId } = req.body;

  // Ensure all necessary fields are provided
  if (!newPlanName || !newAmount || !paystackSubscriptionId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // Find the current subscription
    const subscription = await Subscription.findOne({ where: { user_id: userId } });

    if (subscription) {
      // If the subscription exists, update the plan
      subscription.plan_name = newPlanName;
      subscription.amount = newAmount;
      subscription.paystack_subscription_id = paystackSubscriptionId; // Store Paystack subscription ID
      await subscription.save();

      return res.json({ success: true, subscription });
    } else {
      return res.status(404).json({ error: 'Subscription not found' });
    }
  } catch (error) {
    console.error('Error downgrading subscription:', error);
    return res.status(500).json({ error: 'Failed to downgrade subscription' });
  }
});

router.post('/update-payment-method', async (req, res) => {
  const { email, subscription_code } = req.body;

  if (!subscription_code || !email) {
    return res.status(400).json({ error: 'Subscription code and email are required' });
  }

  console.log("Fetching update link for subscription_code:", subscription_code);

  try {
    // Generate update link
    const response = await axios.get(
      `https://api.paystack.co/subscription/${subscription_code}/manage/link`,
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        },
      }
    );

    const updateLink = response.data.data.link;

    if (!updateLink) {
      return res.status(400).json({ error: 'Could not retrieve update link from Paystack' });
    }

    console.log("Update link:", updateLink);

    // Send email with update link (optional)
    await axios.post(
      `https://api.paystack.co/subscription/${subscription_code}/manage/email`,
      { email },
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    res.json({ link: updateLink });

  } catch (error) {
    console.error("Error:", error.response?.data || error.message);
    res.status(500).json({ error: error.response?.data?.message || 'Something went wrong' });
  }
});
// Cancel Subscription API
router.post('/cancel-subscription', async (req, res) => {
  const { code, token } = req.body;  // subscription_code and email_token
  console.log("Subscription Code:", code);

  if (!code || !token) {
    const response = { message: 'Subscription code and token are required' };
    console.log('Response:', response);
    return res.status(400).json(response);
  }

  try {
    // Fetch subscription details to check status before canceling
    const subscriptionResponse = await axios.get(
      `https://api.paystack.co/subscription/${code}`,
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const subscription = subscriptionResponse.data.data;

    // If subscription is already canceled or inactive
    if (subscription.status === 'cancelled' || subscription.status === 'inactive') {
      const response = { message: 'Subscription is already cancelled or inactive' };
      console.log('Response:', response);
      return res.status(400).json(response);
    }

    // If subscription is non-renewing, check if it's active or finished
    if (subscription.status === 'non-renewing') {
      const response = { message: 'Subscription is non-renewing and will expire at the end of the term' };
      console.log('Response:', response);
      return res.status(200).json(response);
    }

    // Proceed to cancel if active
    const cancelResponse = await axios.post(
      `https://api.paystack.co/subscription/disable`,
      {
        code,  // subscription_code
        token, // email_token
      },
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const cancelResult = cancelResponse.data;

    if (cancelResult.status === true && cancelResult.message === 'Subscription disabled successfully') {
      const response = {
        message: cancelResult.message,
        subscription_status: cancelResult.data?.status || 'unknown'
      };
      console.log('Response:', response);
      return res.status(200).json(response);
    } else {
      const response = {
        message: 'Failed to cancel subscription',
        details: cancelResult
      };
      console.log('Response:', response);
      return res.status(400).json(response);
    }
  } catch (error) {
    const response = {
      message: 'An error occurred while canceling the subscription',
      error: error.response?.data || error.message
    };
    console.error('Error canceling subscription:', error.response?.data || error.message);
    console.log('Response:', response);
    return res.status(500).json(response);
  }
});



module.exports = router;
