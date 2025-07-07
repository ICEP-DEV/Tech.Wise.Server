const express = require("express");
const router = express.Router();
const pool = require("../config/config");
require("dotenv").config();

// 🚗 Save or Update Car Listing
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
      class: carClass, // optional
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
    // Removed class validation

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
      let updateQuery, updateData;
      if (carClass !== undefined) {
        updateQuery = `UPDATE car_listing SET car_make = ?, car_model = ?, car_year = ?, number_of_seats = ?, car_colour = ?, license_plate = ?, car_image = ?, \`class\` = ? WHERE userId = ?`;
        updateData = [car_make, car_model, car_year, number_of_seats, car_colour, license_plate, car_image, carClass, userId];
      } else {
        updateQuery = `UPDATE car_listing SET car_make = ?, car_model = ?, car_year = ?, number_of_seats = ?, car_colour = ?, license_plate = ?, car_image = ? WHERE userId = ?`;
        updateData = [car_make, car_model, car_year, number_of_seats, car_colour, license_plate, car_image, userId];
      }

      console.log("🔄 Updating car listing:", updateData);
      await pool.query(updateQuery, updateData);
      return res.json({ message: "Car details updated successfully" });
    } else {
      let insertQuery, insertData;
      if (carClass !== undefined) {
        insertQuery = `INSERT INTO car_listing (userId, car_make, car_model, car_year, number_of_seats, car_colour, license_plate, car_image, \`class\`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        insertData = [userId, car_make, car_model, car_year, number_of_seats, car_colour, license_plate, car_image, carClass];
      } else {
        insertQuery = `INSERT INTO car_listing (userId, car_make, car_model, car_year, number_of_seats, car_colour, license_plate, car_image) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
        insertData = [userId, car_make, car_model, car_year, number_of_seats, car_colour, license_plate, car_image];
      }

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


// Delete Car Listing by Car ID
router.delete('/car_listing/:car_id', async (req, res) => {
  const { car_id } = req.params;

  if (!car_id) {
    return res.status(400).json({ error: "Car ID is required." });
  }

  try {
    const [result] = await pool.query(
      "DELETE FROM car_listing WHERE car_id = ?",
      [car_id]
    );

    if (result.affectedRows > 0) {
      return res.status(200).json({ message: "Car listing deleted successfully." });
    } else {
      return res.status(404).json({ error: `No car listing found with ID ${car_id}.` });
    }
  } catch (error) {
    console.error("Error deleting car listing:", error);
    return res.status(500).json({ error: "Failed to delete car listing." });
  }
});

module.exports = router;
