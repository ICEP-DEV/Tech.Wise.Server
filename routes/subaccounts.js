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
router.get("/verify-subaccount", async (req, res) => {
    const { subaccountCode, bank_code, country_code, account_name, account_number } = req.query; // Extract parameters from query

    // Check if the required parameters are provided
    if (!subaccountCode || !bank_code || !country_code || !account_name || !account_number) {
        return res.status(400).json({
            error: "All parameters (subaccountCode, bank_code, country_code, account_name, account_number) are required.",
        });
    }

    console.log(`Request to verify subaccount: ${subaccountCode} with bank_code: ${bank_code}, country_code: ${country_code}, account_name: ${account_name}, account_number: ${account_number}`);

    try {
        // Make a GET request to the Paystack API to verify the subaccount
        const response = await axios.get(
            `https://api.paystack.co/subaccount/${subaccountCode}`,
            {
                headers: {
                    Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
                    "Content-Type": "application/json"
                },
                params: {
                    bank_code,
                    country_code,
                    account_name,
                    account_number
                }
            }
        );

        // Check if the response status is successful
        if (response.data.status) {
            return res.status(200).json({
                success: true,
                message: "Subaccount details retrieved successfully",
                data: response.data.data
            });
        } else {
            return res.status(404).json({
                success: false,
                message: "Subaccount not found or invalid",
                data: response.data
            });
        }
    } catch (error) {
        console.error("Error:", error.response?.data || error.message);

        // Handle errors based on the response
        if (error.response) {
            return res.status(400).json({
                error: error.response.data?.message || "Failed to retrieve subaccount details"
            });
        } else {
            return res.status(500).json({
                error: error.message || "Internal Server Error"
            });
        }
    }
});



module.exports = router;
