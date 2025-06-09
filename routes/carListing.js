const express = require("express");
const router = express.Router();
const pool = require("../config/config");
require("dotenv").config();


router.post("/car_listing", async (req, res) => {
  try {
    console.log("🚚 Request received to save car listing...");
    const {
      userId,
      car_make,
      car_model,
      car_year,
      number_of_seats,
      car_colour,
      license_plate,
      car_image,
      class: carClass
    } = req.body;

    console.log("🚚 Request body:", req.body);

    const missingFields = [];
    if (!userId) missingFields.push("userId");
    if (!car_make) missingFields.push("car_make");
    if (!car_model) missingFields.push("car_model");
    if (!car_year) missingFields.push("car_year");
    if (!number_of_seats) missingFields.push("number_of_seats");
    if (!car_colour) missingFields.push("car_colour");
    if (!license_plate) missingFields.push("license_plate");
    if (!car_image) missingFields.push("car_image");
    if (!carClass) missingFields.push("class");

    if (missingFields.length > 0) {
      console.log("❌ Missing fields:", missingFields);
      return res.status(400).json({
        error: "Missing required fields",
        missing: missingFields
      });
    }

    const checkQuery = `SELECT * FROM car_listing WHERE userId = ?`;
    const [existingCar] = await pool.query(checkQuery, [userId]);

    if (existingCar.length > 0) {
      const updateQuery = `UPDATE car_listing SET car_make = ?, car_model = ?, car_year = ?, number_of_seats = ?, car_colour = ?, license_plate = ?, car_image = ?, \`class\` = ? WHERE userId = ?`;
      const updateData = [car_make, car_model, car_year, number_of_seats, car_colour, license_plate, car_image, carClass, userId];
      console.log("🔄 Updating car listing:", updateData);
      await pool.query(updateQuery, updateData);
      return res.json({ message: "Car details updated successfully" });
    } else {
      const insertQuery = `INSERT INTO car_listing (userId, car_make, car_model, car_year, number_of_seats, car_colour, license_plate, car_image, \`class\`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
      const insertData = [userId, car_make, car_model, car_year, number_of_seats, car_colour, license_plate, car_image, carClass];
      console.log("➕ Inserting new car listing:", insertData);
      await pool.query(insertQuery, insertData);
      return res.json({ message: "Car details saved successfully" });
    }

  } catch (error) {
    console.error("❌ Server error:", error);
    return res.status(500).json({ message: "Server error" });
  }
});


// 🚗 Get Car Listings by User ID 
router.get('/car_listing/user/:user_id', async (req, res) => {
    const { user_id } = req.params;

    if (!user_id) {
        return res.status(400).json({ error: "User ID is required." });
    }

    try {
        const [rows] = await pool.query(
            "SELECT * FROM car_listing WHERE userId = ?",
            [user_id]
        );

        res.status(200).json({
            carListings: rows
        });
    } catch (err) {
        console.error("Error fetching car details:", err);
        res.status(500).json({ error: "Failed to fetch car details." });
    }
});


module.exports = router;
