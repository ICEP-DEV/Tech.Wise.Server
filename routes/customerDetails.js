const express = require('express');
const router = express.Router();
const pool = require('../config/config'); // Use pool for database connection



// Endpoint to fetch customer data
router.get('/customer/:id', async (req, res) => {
    const { id } = req.params;
    console.log(`🚀 Fetching details for customer ID: ${id}`);  // Confirm this is printed

    if (!id) {
        return res.status(400).json({ message: 'Customer ID is required' });
    }

    const query = "SELECT * FROM users WHERE id = ?";

    try {
        const startTime = Date.now();
        const [rows] = await pool.query(query, [id]);
        console.log(`Query executed in ${Date.now() - startTime} ms`);

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

module.exports = router;
