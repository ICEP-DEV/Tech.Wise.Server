const express = require("express");
const router = express.Router();
const axios = require("axios");
const pool = require("../config/config"); // Assuming pool is exported from your config file
require("dotenv").config();

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

// Create subaccount endpoint
router.post("/create-subaccount", async (req, res) => {
    const { business_name, settlement_bank, account_number, percentage_charge, user_id } = req.body;
    console.log(req.body); // Log the request body for debugging

    if (!business_name || !settlement_bank || !account_number || !percentage_charge) {
        return res.status(400).json({ error: "All fields are required" });
    }

    try {
        const response = await axios.post(
            "https://api.paystack.co/subaccount",
            {
                business_name,
                settlement_bank,
                account_number,
                percentage_charge,
                // bank_code,
            },
            {
                headers: {
                    Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
                    "Content-Type": "application/json",
                },
            }
        );

        return res.status(201).json(response.data);
    } catch (error) {
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

// Verify bank account endpoint
router.post("/verify-bank-account", async (req, res) => {
    const { account_number, bank_code } = req.body;
    console.log(req.body); // Log the request body for debugging

    if (!account_number || !bank_code) {
        return res.status(400).json({ error: "Account number and bank code are required" });
    }

    try {
        const response = await axios.get(
            `https://api.paystack.co/bank/resolve?account_number=${account_number}&bank_code=${bank_code}`,
            {
                headers: {
                    Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
                    "Content-Type": "application/json",
                },
            }
        );

        // Check if Paystack response is valid
        if (response.data.status) {
            return res.status(200).json({
                valid: true,
                account_number: response.data.data.account_number,
                bank_name: response.data.data.bank_name,
                account_name: response.data.data.account_name,
            });
        } else {
            return res.status(400).json({ error: "Invalid account details" });
        }
    } catch (error) {
        console.error("Error verifying bank account:", error.response?.data || error);
        return res.status(500).json({ error: error.response?.data || "An error occurred" });
    }
});


module.exports = router;

