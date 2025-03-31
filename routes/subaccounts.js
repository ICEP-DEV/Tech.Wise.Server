const express = require("express");
const router = express.Router();
const axios = require("axios");
const pool = require("../config/config"); // Assuming pool is exported from your config file
require("dotenv").config();

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

// Function to create a subaccount with retry logic
const createSubaccountWithRetry = async (data) => {
    let retries = 3;
    for (let i = 0; i < retries; i++) {
        try {
            const response = await axios.post("https://api.paystack.co/subaccount", data, {
                headers: {
                    Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
                    "Content-Type": "application/json",
                },
                timeout: 15000, // 15 seconds timeout
            });
            return response.data; // Return response if successful
        } catch (error) {
            console.error(`Attempt ${i + 1} failed:`, error.response?.data || error.message);
            if (i === retries - 1) throw error; // Last attempt, throw error
            await new Promise((res) => setTimeout(res, 2000 * (i + 1))); // Wait before retrying (2s, 4s, 6s)
        }
    }
};

// Create subaccount endpoint with retry logic
router.post("/create-subaccount", async (req, res) => {
    const { business_name, settlement_bank, account_number, percentage_charge, bank_code, user_id } = req.body;
    console.log(req.body); // Log the request body for debugging

    if (!business_name || !settlement_bank || !account_number || !percentage_charge || !bank_code) {
        return res.status(400).json({ error: "All fields are required" });
    }

    try {
        const response = await createSubaccountWithRetry({
            business_name,
            settlement_bank,
            account_number,
            percentage_charge,
            bank_code, // Ensure bank code is included
        });

        return res.status(201).json(response);
    } catch (error) {
        console.error("Paystack API Error:", error.response?.data || error);
        return res.status(500).json({ error: error.response?.data || "An error occurred" });
    }
});

// Store subaccount details into the database using connection pool
router.post('/store-subaccount', async (req, res) => {
    const { user_id, subaccount_code, business_name, settlement_bank, currency, percentage_charge, is_verified, created_at, updated_at } = req.body;

    const query = `INSERT INTO subaccounts (user_id, subaccount_code, business_name, settlement_bank, currency, percentage_charge, is_verified, created_at, updated_at) 
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    try {
        await new Promise((resolve, reject) => {
            pool.query(query, [user_id, subaccount_code, business_name, settlement_bank, currency, percentage_charge, is_verified, created_at, updated_at], (error, results) => {
                if (error) {
                    console.error("DB Error:", error);
                    reject(error);
                }
                resolve(results);
            });
        });

        res.status(200).json({ message: "Subaccount data saved successfully" });
    } catch (error) {
        res.status(500).json({ message: "Error saving subaccount data" });
    }
});

// Resolve Account Endpoint
router.get("/resolve-account", async (req, res) => {
    const { account_number, bank_code, currency } = req.query;
    console.log(`Request to resolve account: ${account_number}, ${bank_code}, ${currency}`); // Log the request for debugging

    if (!account_number || !bank_code) {
        return res.status(400).json({ error: "Account number and bank code are required" });
    }

    try {
        const response = await axios.get(
            `https://api.paystack.co/bank/resolve?account_number=${account_number}&bank_code=${bank_code}&currency=${currency}`,
            {
                headers: {
                    Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
                },
            }
        );

        return res.status(200).json({
            valid: response.data.status,
            account_name: response.data.data.account_name,
            bank_name: response.data.data.bank_name,
        });
    } catch (error) {
        return res.status(500).json({
            error: error.response?.data?.message || "Account resolution failed",
        });
    }
});




// Validate Bank Account Endpoint
router.post("/validate-bank-account", async (req, res) => {
    const { bank_code, country_code, account_number, account_name, account_type, document_type, document_number } = req.body;
    console.log(req.body); // Log the request body for debugging

    // Validate required fields
    if (!bank_code || !country_code || !account_number || !account_name || !account_type || !document_type || !document_number) {
        return res.status(400).json({ error: "All fields are required for bank validation." });
    }

    try {
        const response = await axios.post(
            "https://api.paystack.co/bank/validate",
            {
                bank_code,
                country_code,
                account_number,
                account_name,
                account_type,
                document_type,
                document_number
            },
            {
                headers: {
                    Authorization: PAYSTACK_SECRET_KEY,
                    "Content-Type": "application/json"
                }
            }
        );
        console.log(response.data); // Log the response for debugging

        return res.status(200).json({
            success: response.data.status,
            message: response.data.message,
            data: response.data.data
        });
    } catch (error) {
        return res.status(500).json({
            error: error.response?.data?.message || "Bank account validation failed"
        });
    }
});


module.exports = router;
