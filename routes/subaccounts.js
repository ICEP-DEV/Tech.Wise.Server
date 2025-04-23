const express = require("express");
const router = express.Router();
const axios = require("axios");
const pool = require("../config/config"); // Assuming pool is exported from your config file
require("dotenv").config();
const https = require('https'); // Import the https module

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
// Validate Bank Account Endpoint (POST)
router.post("/verify-subaccount", async (req, res) => {
    const { subaccountCode, bank_code, country_code, account_name, account_number } = req.body; // Extract parameters from the body
    console.log(`Request to verify subaccount: ${subaccountCode} with bank_code: ${bank_code}, country_code: ${country_code}, account_name: ${account_name}, account_number: ${account_number}`); // Log the request for debugging
    console.log(req.body); // Log the request body for debugging

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
                    account_number,
                    is_verified: true // Assuming you want to check if the subaccount is verified
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

//fetch subaccounts endpoint

router.post("/fetch-subaccount", (req, res) => {
    const { subaccountCode } = req.body;

    // Validate if subaccountCode is provided
    if (!subaccountCode) {
        return res.status(400).json({
            error: "subaccountCode is required."
        });
    }

    // Set up the request options for the Paystack API
    const options = {
        hostname: 'api.paystack.co',
        port: 443,
        path: '/subaccount/' + subaccountCode,
        method: 'GET',
        headers: {
            Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        }
    };

    // Send the HTTPS request to Paystack
    const request = https.request(options, (response) => {
        let data = '';

        response.on('data', (chunk) => {
            data += chunk;
        });

        response.on('end', () => {
            const responseData = JSON.parse(data);

            if (responseData.status) {
                return res.status(200).json({
                    success: true,
                    message: "Subaccount details retrieved successfully",
                    data: responseData.data
                });
            } else {
                return res.status(404).json({
                    success: false,
                    message: "Subaccount not found or invalid",
                    data: responseData
                });
            }
        });
    });

    request.on('error', (error) => {
        console.error("Error:", error);
        return res.status(500).json({
            error: error.message || "Internal Server Error"
        });
    });

    request.end();
});

// Get the latest subaccount by user_id
router.get('/subaccount', async (req, res) => {
    const { user_id } = req.query;

    console.log('Fetching latest subaccount for user_id:', user_id);

    if (!user_id) {
        return res.status(400).json({ message: 'User ID is required' });
    }

    const sql = `
        SELECT 
            id, user_id, subaccount_code, business_name, settlement_bank, 
            currency, percentage_charge, is_verified, created_at, updated_at 
        FROM subaccounts 
        WHERE user_id = ? 
        ORDER BY created_at DESC 
        LIMIT 1
    `;

    try {
        const startTime = Date.now();
        const [rows] = await pool.query(sql, [user_id]);
        console.log(`Query executed in ${Date.now() - startTime} ms`);

        if (rows.length > 0) {
            res.json({ subaccount: rows[0] });
        } else {
            res.status(404).json({ message: 'No subaccount found for this user.' });
        }
    } catch (error) {
        console.error('Error executing query:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Update subaccount endpoint
router.post("/update-subaccount", (req, res) => {
    const { subaccountCode, updateData } = req.body;

    if (!subaccountCode || !updateData) {
        return res.status(400).json({
            error: "subaccountCode and updateData are required."
        });
    }

    const params = JSON.stringify(updateData);

    const options = {
        hostname: 'api.paystack.co',
        port: 443,
        path: `/subaccount/${subaccountCode}`,
        method: 'PUT',
        headers: {
            Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
            'Content-Type': 'application/json'
        }
    };

    const request = https.request(options, (response) => {
        let data = '';

        response.on('data', (chunk) => {
            data += chunk;
        });

        response.on('end', () => {
            const responseData = JSON.parse(data);

            if (responseData.status) {
                return res.status(200).json({
                    success: true,
                    message: "Subaccount updated successfully",
                    data: responseData.data
                });
            } else {
                return res.status(400).json({
                    success: false,
                    message: responseData.message || "Failed to update subaccount",
                    data: responseData
                });
            }
        });
    });

    request.on('error', (error) => {
        console.error("Error:", error);
        return res.status(500).json({
            error: error.message || "Internal Server Error"
        });
    });

    request.write(params);
    request.end();
});


// Delete subaccount endpoint
router.delete('/delete-subaccount', (req, res) => {
    const { subaccountCode } = req.query;
    console.log(`Incoming request to delete subaccount: ${subaccountCode}`);

    if (!subaccountCode) {
        return res.status(400).json({ error: 'subaccountCode is required' });
    }

    const options = {
        hostname: 'api.paystack.co',
        port: 443,
        path: `/subaccount/${subaccountCode}`,
        method: 'DELETE',
        headers: {
            Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        }
    };

    const request = https.request(options, (response) => {
        console.log(`Paystack response status: ${response.statusCode}`);
        console.log('Response headers:', response.headers);

        let data = '';

        response.on('data', (chunk) => {
            console.log('Received chunk:', chunk.toString());
            data += chunk;
        });

        response.on('end', () => {
            console.log('Full response body from Paystack:', data);

            try {
                if (!data) {
                    console.error('No response body from Paystack.');
                    return res.status(502).json({ error: 'Empty response from Paystack' });
                }

                const parsed = JSON.parse(data);

                if (parsed.status) {
                    console.log('Subaccount deleted successfully:', parsed.data);
                    return res.status(200).json({
                        success: true,
                        message: 'Subaccount deleted successfully',
                        data: parsed.data
                    });
                } else {
                    console.warn('Paystack deletion failed:', parsed);
                    return res.status(400).json({
                        success: false,
                        message: parsed.message || 'Failed to delete subaccount',
                        raw: parsed
                    });
                }
            } catch (parseError) {
                console.error('Error parsing Paystack response:', parseError);
                return res.status(500).json({ error: 'Invalid response from Paystack', raw: data });
            }
        });
    });

    request.on('error', (error) => {
        console.error('HTTPS error when deleting subaccount:', error);
        return res.status(500).json({ error: error.message || 'Internal server error' });
    });

    request.end();
});



module.exports = router;
