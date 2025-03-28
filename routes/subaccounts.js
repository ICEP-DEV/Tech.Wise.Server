const express = require("express");
const router = express.Router();
const axios = require("axios");
const pool = require("../config/config");
require("dotenv").config();

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

// Create subaccount endpoint with verification
router.post("/create-subaccount", async (req, res) => {
    const { business_name, settlement_bank, account_number, bank_code, currency, percentage_charge } = req.body;


    // Validate required fields
    if (!business_name || !settlement_bank || !account_number || !bank_code || !currency || !percentage_charge) {
        return res.status(400).json({ error: "All fields are required" });
    }

    try {
        // Step 1: Verify the bank account details
        const verifyResponse = await axios.get(
            `https://api.paystack.co/bank/resolve?account_number=${account_number}&bank_code=${bank_code}`,
            {
                headers: {
                    Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
                    "Content-Type": "application/json",
                },
            }
        );

        // If verification fails, return an error
        if (!verifyResponse.data.status) {
            return res.status(400).json({ error: "Invalid account number or bank details" });
        }

        // Step 2: Create the subaccount after successful verification
        const subaccountResponse = await axios.post(
            "https://api.paystack.co/subaccount",
            {
                business_name,
                settlement_bank,
                account_number,
                percentage_charge,
                currency, // ✅ Added currency field
            },
            {
                headers: {
                    Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
                    "Content-Type": "application/json",
                },
            }
        );

        return res.status(201).json(subaccountResponse.data);
    } catch (error) {
        console.error("Error creating subaccount:", error.response?.data || error);
        return res.status(500).json({ error: error.response?.data || "An error occurred" });
    }
});


module.exports = router;
