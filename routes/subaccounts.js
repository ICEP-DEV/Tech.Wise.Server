const express = require("express");
const router = express.Router();
const axios = require("axios");
const pool = require("../config/config");
require("dotenv").config();

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

// Create subaccount endpoint
router.post("/create-subaccount", async (req, res) => {
    const { business_name, settlement_bank, account_number } = req.body;
    const percentage_charge = '3'; // Default value
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

module.exports = router;
