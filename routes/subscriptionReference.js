const express = require("express");
const router = express.Router();
const db = require("../config/config");
require("dotenv").config();

// Middleware to parse incoming webhook requests
router.use(express.json());

router.get("/subscription/:reference", async (req, res) => {
    const { reference } = req.params;

    const sql = `SELECT paystack_subscription_id, verification_id, statuses FROM subscriptions WHERE customer_code = ?`;

    db.query(sql, [reference], (err, results) => {
        if (err) {
            console.error("Database Error:", err);
            return res.status(500).json({ error: "Database error" });
        }

        if (results.length === 0) {
            return res.status(404).json({ error: "Subscription not found" });
        }

        res.json(results[0]);
    });
});

module.exports = router;