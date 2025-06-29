const express = require('express');
const router = express.Router();
const pool = require('../config/config'); // Use pool for database connection



// Endpoint to fetch customer data (all or by ID)
router.get('/customer', async (req, res) => {
    const { id } = req.query;  // Use query param for optionality

    let query = "SELECT * FROM users";
    const queryParams = [];

    if (id) {
        query += " WHERE id = ?";
        queryParams.push(id);
        console.log(`🚀 Fetching details for customer ID: ${id}`);
    } else {
        console.log("🚀 Fetching all customer details");
    }

    try {
        const startTime = Date.now();
        const [rows] = await pool.query(query, queryParams);
        console.log(`Query executed in ${Date.now() - startTime} ms`);

        if (rows.length === 0) {
            return res.status(404).json({ message: "No customer(s) found" });
        }

        // If fetching by ID, return single object
        if (id) {
            console.log("✅ Customer found:", rows[0]);
            res.status(200).json(rows[0]);
        } else {
            res.status(200).json(rows);  // return full list
        }
    } catch (error) {
        console.error("❌ Error executing query:", error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
router.get('/customer/:id', async (req, res) => {
  const { id } = req.params;
  console.log(`🚀 Fetching details for customer ID: ${id}`);  // ✅ backticks

  if (!id) {
    return res.status(400).json({ message: 'Customer ID is required' });
  }

  const query = "SELECT * FROM users WHERE id = ?";

  try {
    const startTime = Date.now();
    const [rows] = await pool.query(query, [id]);
    console.log(`⏱️ Query executed in ${Date.now() - startTime} ms`);  // ✅ backticks

    if (rows.length > 0) {
      console.log("✅ User found:", rows[0]);
      res.status(200).json(rows[0]);
    } else {
      console.log("⚠️ No results found");
      return res.status(404).json({ message: "User not found" });
    }
  } catch (error) {
    console.error("❌ Error executing query:", error);
    res.status(500).json({ message: 'Internal server error' });
  }
});



// Endpoint to update customer data
router.post('/update-profile-picture', async (req, res) => {
    const { profile_picture, user_id } = req.body;
    console.log(`🚀 Updating profile picture for user ID: ${profile_picture}`);  // Confirm this is printed

    // Validate inputs
    if (!profile_picture || !user_id) {
        return res.status(400).json({ message: 'Profile picture URL and user ID are required' });
    }

    try {
        const query = `UPDATE users SET profile_picture = ? WHERE id = ?`;
        const [result] = await pool.query(query, [profile_picture, user_id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'User not found or no change made' });
        }

        return res.status(200).json({ message: 'Profile picture updated successfully', profile_picture });
    } catch (error) {
        console.error("❌ Error updating profile picture:", error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});
// Endpoint to update customer data
router.put('/update-customer', async (req, res) => {
    const { customer_code, user_id, ...fieldsToUpdate } = req.body;

    console.log("📝 Customer update request for user ID:", user_id, "Fields:", fieldsToUpdate, "customer code: ", customer_code);

    if (!user_id || Object.keys(fieldsToUpdate).length === 0) {
        return res.status(400).json({ message: 'User ID and at least one field are required' });
    }

    try {
        // ✅ Add customer_code to fieldsToUpdate if provided
        if (customer_code) {
            fieldsToUpdate.customer_code = customer_code;
        }

        // Build SET clause dynamically
        const setClauses = Object.keys(fieldsToUpdate).map(field => `${field} = ?`).join(', ');
        const values = Object.values(fieldsToUpdate);

        const query = `UPDATE users SET ${setClauses} WHERE id = ?`;
        values.push(user_id); // Add user_id as the last parameter

        const [result] = await pool.query(query, values);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'User not found or no change made' });
        }

        return res.status(200).json({ message: 'Customer details updated successfully' });
    } catch (error) {
        console.error("❌ Error updating customer details:", error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});


module.exports = router;
