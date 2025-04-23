const express = require("express");
const router = express.Router();
const pool = require("../config/config");
require("dotenv").config();
const multer = require("multer");
const { bucket } = require("../config/googleCloudConfig"); // Import your custom Google Cloud config
const path = require("path");

// Multer setup for file handling
const multerStorage = multer.memoryStorage(); // Store files in memory
const upload = multer({ storage: multerStorage });


// Helper function to upload file to Google Cloud Storage
const uploadFile = async (file) => {
  try {
    const blob = bucket.file(Date.now() + "-" + file.originalname); // Unique file name
    const blobStream = blob.createWriteStream({
      resumable: false,
      gzip: true,
      contentType: file.mimetype,
    });

    return new Promise((resolve, reject) => {
      blobStream.on("finish", () => {
        const fileUrl = `https://storage.googleapis.com/${bucket.name}/${blob.name}`;
        resolve(fileUrl);
      });

      blobStream.on("error", (err) => {
        console.error("Error uploading file:", err);
        reject(err);
      });

      blobStream.end(file.buffer);
    });
  } catch (error) {
    console.error("Error during file upload:", error);
    throw new Error("Error during file upload");
  }
};



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
      class: carClass
    } = req.body;

    console.log("🚚 Received body:", req.body);

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

    console.log("🔍 Checking if the car already exists for userId:", userId);

    if (existingCar.length > 0) {
      const updateQuery = `
        UPDATE car_listing SET 
          car_make = ?, 
          car_model = ?, 
          car_year = ?, 
          number_of_seats = ?, 
          car_colour = ?, 
          license_plate = ?, 
          car_image = ?,
          \`class\` = ?
        WHERE userId = ?
      `;

      const updateData = [
        car_make,
        car_model,
        car_year,
        number_of_seats,
        car_colour,
        license_plate,
        car_image,
        carClass,
        userId
      ];

      console.log("📝 Update query data:", updateData);
      await pool.query(updateQuery, updateData);
      console.log("✅ Car details updated successfully!");
      return res.json({ message: "Car details updated successfully" });
    } else {
      const insertQuery = `
        INSERT INTO car_listing 
        (userId, car_make, car_model, car_year, number_of_seats, car_colour, license_plate, car_image, \`class\`)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        carClass || null
      ];

      console.log("📝 Insert query data:", insertData);
      await pool.query(insertQuery, insertData);
      console.log("✅ Car details saved successfully!");
      return res.json({ message: "Car details saved successfully" });
    }
  } catch (error) {
    console.error("❌ Server error:", error);
    return res.status(500).json({ message: "Server error" });
  }
});



module.exports = router;





// 🚗 **Get Car Listings by User ID**
router.get('/car_listing/user', (req, res) => {
    const userId = req.query.userId;

    if (!userId) {
        return res.status(400).json({ error: "User ID is required" });
    }

    const sql = "SELECT * FROM car_listing WHERE userId = ?";

    pool.getConnection((err, connection) => {
        if (err) {
            console.error("Database connection failed:", err);
            return res.status(500).json({ error: "Database connection error" });
        }

        connection.query(sql, [userId], (error, results) => {
            connection.release(); // Release connection back to pool

            if (error) {
                console.error("Error fetching car details:", error);
                return res.status(500).json({ error: "Error fetching car details" });
            }
            return res.status(200).json({ carListings: results });
        });
    });
});

module.exports = router;
