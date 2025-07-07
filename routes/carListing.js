const express = require("express");
const router = express.Router();
const pool = require("../config/config");
require("dotenv").config();

// Create New Car Listing
router.post("/car_listing", async (req, res) => {
  try {
    const {
      userId,
      car_make,
      car_model,
      car_year,
      number_of_seats,
      car_colour,
      license_plate,
      car_image,
    } = req.body;

    const missingFields = [];
    if (!userId) missingFields.push("userId");
    if (!car_make) missingFields.push("car_make");
    if (!car_model) missingFields.push("car_model");
    if (!car_year) missingFields.push("car_year");
    if (!number_of_seats) missingFields.push("number_of_seats");
    if (!car_colour) missingFields.push("car_colour");
    if (!license_plate) missingFields.push("license_plate");
    if (!car_image) missingFields.push("car_image");

    if (missingFields.length > 0) {
      return res.status(400).json({
        error: "Missing required fields for car creation",
        missing: missingFields,
      });
    }

    const insertQuery = `
      INSERT INTO car_listing (userId, car_make, car_model, car_year, number_of_seats, car_colour, license_plate, car_image)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const insertData = [
      userId,
      car_make,
      car_model,
      car_year,
      number_of_seats,
      car_colour,
      license_plate,
      car_image,
    ];

    const [result] = await pool.query(insertQuery, insertData);

    if (result.affectedRows > 0) {
      res.status(201).json({
        message: "Car listing created successfully.",
        car_id: result.insertId,
      });
    } else {
      res.status(500).json({ error: "Failed to create car listing." });
    }
  } catch (error) {
    console.error("❌ Create car listing error:", error);
    res.status(500).json({ error: "Failed to create car listing." });
  }
});

// Update Car Listing by Car ID
router.put("/car_listing/:car_id", async (req, res) => {
  try {
    const { car_id } = req.params;
    const {
      userId,
      car_make,
      car_model,
      car_year,
      number_of_seats,
      car_colour,
      license_plate,
      car_image,
      class: carClass, // optional - I'll keep this as is, but it won't be used in the frontend's PUT request
    } = req.body;

    if (!car_id) {
      return res.status(400).json({ error: "Car ID is required." });
    }

    const missingFields = [];
    if (!userId) missingFields.push("userId");
    if (!car_make) missingFields.push("car_make");
    if (!car_model) missingFields.push("car_model");
    if (!car_year) missingFields.push("car_year");
    if (!number_of_seats) missingFields.push("number_of_seats");
    if (!car_colour) missingFields.push("car_colour");
    if (!license_plate) missingFields.push("license_plate");
    if (!car_image) missingFields.push("car_image");

    if (missingFields.length > 0) {
      return res.status(400).json({
        error: "Missing required fields",
        missing: missingFields,
      });
    }

    // The frontend is no longer sending 'class' for PUT, so we can simplify this.
    // If you still need 'class' on the backend for other reasons, keep the conditional logic.
    // For now, I'll assume the frontend's PUT request will not include 'class'.
    const updateQuery = `
      UPDATE car_listing
      SET userId = ?, car_make = ?, car_model = ?, car_year = ?, number_of_seats = ?, car_colour = ?, license_plate = ?, car_image = ?
      WHERE car_id = ?
    `;
    const updateData = [
      userId,
      car_make,
      car_model,
      car_year,
      number_of_seats,
      car_colour,
      license_plate,
      car_image,
      car_id,
    ];

    const [result] = await pool.query(updateQuery, updateData);

    if (result.affectedRows > 0) {
      res.status(200).json({ message: "Car listing updated successfully." });
    } else {
      res.status(404).json({ error: `Car listing not found for ID ${car_id}` });
    }
  } catch (error) {
    console.error("❌ Update error:", error);
    res.status(500).json({ error: "Failed to update car listing." });
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