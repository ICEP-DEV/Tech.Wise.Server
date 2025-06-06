// const express = require("express");
// const axios = require("axios");
// const router = express.Router();
// const pool = require("../config/config"); // Use pool for database connection
// require("dotenv").config();

// // Middleware to parse incoming webhook requests
// router.use(express.json());

// router.get("/payment-callback", async (req, res) => {
//     try {
//         const { reference } = req.query;

//         console.log("Received Paystack callback for reference:", reference);

//         // Verify transaction with Paystack API
//         const response = await axios.get(`https://api.paystack.co/transaction/verify/${reference}`, {
//             headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` }
//         });

//         const paymentData = response.data.data;
//         console.log("Full Paystack Response:", paymentData); // Debugging step

//         if (paymentData.status === "success") {
//             // Extract details from Paystack response
//             const verification_id = paymentData.reference;
//             const customer_code = paymentData.customer.customer_code;

//             // Try getting subscription_id from metadata if not present in response
//             let paystack_subscription_id = paymentData.paystackSubscriptionId;

//             if (!paystack_subscription_id && paymentData.metadata) {
//                 paystack_subscription_id = paymentData.metadata.paystackSubscriptionId;
//             }

//             console.log(`Subscription ID: ${paystack_subscription_id || "Not Found"}`);
//             console.log(`Verification ID: ${verification_id}`);
//             console.log(`Customer Code: ${customer_code}`);

//             // Update the database using the connection pool
//             const updateSql = `
//                 UPDATE subscriptions 
//                 SET paystack_subscription_id = ?, verification_id = ?, statuses = 'completed'
//                 WHERE customer_code = ?
//             `;

//             // Get a connection from the pool
//             const connection = await pool.getConnection();
//             try {
//                 const [result] = await connection.query(updateSql, [paystack_subscription_id, verification_id, customer_code]);
//                 connection.release(); // Release connection back to the pool

//                 if (result.affectedRows === 0) {
//                     return res.status(404).json({ error: "Subscription not found" });
//                 }

//                 console.log("Subscription updated successfully!");

//                 // Send the correct response format
//                 return res.json({
//                     paystack_subscription_id: paystack_subscription_id || "Not Found",
//                     verification_id,
//                     customer_code
//                 });
//             } catch (dbError) {
//                 connection.release();
//                 console.error("Database Update Error:", dbError);
//                 return res.status(500).json({ error: "Database update failed" });
//             }
//         } else {
//             console.log("Payment verification failed:", paymentData);
//             return res.status(400).json({ error: "Payment verification failed" });
//         }
//     } catch (error) {
//         console.error("Payment Callback Error:", error);
//         return res.status(500).json({ error: "An error occurred during payment verification" });
//     }
// });

// module.exports = router;
