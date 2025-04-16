// const express = require("express");
// const router = express.Router();
// const pool = require("../config/config");
// require("dotenv").config();
// const multer = require("multer");
// const { bucket } = require("../config/googleCloudConfig");

// // Multer in-memory storage
// const multerStorage = multer.memoryStorage();
// const upload = multer({ storage: multerStorage });

// // Upload helper (you already have it correctly)
// const uploadFile = async (file) => {
//   try {
//     const blob = bucket.file(Date.now() + "-" + file.originalname);
//     const blobStream = blob.createWriteStream({
//       resumable: false,
//       gzip: true,
//       contentType: file.mimetype,
//     });

//     return new Promise((resolve, reject) => {
//       blobStream.on("finish", () => {
//         const fileUrl = `https://storage.googleapis.com/${bucket.name}/${blob.name}`;
//         resolve(fileUrl);
//       });

//       blobStream.on("error", reject);
//       blobStream.end(file.buffer);
//     });
//   } catch (error) {
//     console.error("Upload error:", error);
//     throw error;
//   }
// };

// // Route
// router.post("/car_listing", upload.single("carImage"), async (req, res) => {
//   try {
//     const { carMaker, carModel, carYear, carSeats, carColor, licensePlate, userId } = req.body;
// console.log(req.body);

//     if (!carMaker || !carModel || !carYear || !carSeats || !carColor || !licensePlate || !req.file || !userId) {
//       return res.status(400).json({ error: "All fields including image are required" });
//     }

//     const firebaseImageUrl = await uploadFile(req.file);

//     // Check existing car listing
//     const [existingCar] = await pool.query(`SELECT * FROM car_listing WHERE userId = ?`, [userId]);

//     if (existingCar.length > 0) {
//       const updateQuery = `
//         UPDATE car_listing SET 
//           car_make = ?, 
//           car_model = ?, 
//           car_year = ?, 
//           number_of_seats = ?, 
//           car_colour = ?, 
//           car_image = ?, 
//           license_plate = ? 
//         WHERE userId = ?`;

//       const updateData = [carMaker, carModel, carYear, carSeats, carColor, firebaseImageUrl, licensePlate, userId];
//       await pool.query(updateQuery, updateData);
//       return res.json({ message: "Car details updated successfully" });

//     } else {
//       const insertQuery = `
//         INSERT INTO car_listing 
//         (car_make, car_model, car_year, number_of_seats, car_colour, car_image, license_plate, userId) 
//         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

//       const insertData = [carMaker, carModel, carYear, carSeats, carColor, firebaseImageUrl, licensePlate, userId];
//       await pool.query(insertQuery, insertData);
//       return res.json({ message: "Car details saved successfully" });
//     }
//   } catch (error) {
//     console.error("Error while saving car details:", error);
//     return res.status(500).json({ message: "Server error while saving car details" });
//   }
// });

const express = require("express");
const router = express.Router();
const pool = require("../config/config");
require("dotenv").config();
const multer = require("multer");
const { bucket } = require("../config/googleCloudConfig");

// Multer in-memory storage
const multerStorage = multer.memoryStorage();
const upload = multer({ storage: multerStorage });

// Upload helper
const uploadFile = async (file) => {
  try {
    const blob = bucket.file(Date.now() + "-" + file.originalname);
    const blobStream = blob.createWriteStream({
      resumable: false,
      gzip: true,
      contentType: file.mimetype,
    });

    return new Promise((resolve, reject) => {
      blobStream.on("finish", () => {
        const fileUrl = `https://storage.googleapis.com/${bucket.name}/${blob.name}`;
        console.log("✅ File uploaded to Firebase:", fileUrl);
        resolve(fileUrl);
      });

      blobStream.on("error", (err) => {
        console.error("❌ Error during Firebase upload:", err);
        reject(err);
      });

      blobStream.end(file.buffer);
    });
  } catch (error) {
    console.error("❌ Upload error:", error);
    throw error;
  }
};

// Route for car listing
router.post("/car_listing", upload.single("carImage"), async (req, res) => {
  try {
    // Log received data
    console.log("Received request data:", req.body);
    console.log("Received file:", req.file);

    const { carMaker, carModel, carYear, carSeats, carColor, licensePlate, userId } = req.body;

    // Basic validation
    if (!carMaker || !carModel || !carYear || !carSeats || !carColor || !licensePlate || !userId || !req.file) {
      console.log("❌ Missing required fields.");
      return res.status(400).json({ error: "All fields including image are required" });
    }

    // Upload image to Firebase
    const firebaseImageUrl = await uploadFile(req.file);
    console.log("📡 Firebase image URL:", firebaseImageUrl);

    // Check if the car already exists for the user
    const [existingCar] = await pool.query(`SELECT * FROM car_listing WHERE userId = ?`, [userId]);

    if (existingCar.length > 0) {
      // Update existing car listing
      console.log("🔄 Updating existing car listing");

      const updateQuery = `
        UPDATE car_listing SET 
          car_make = ?, 
          car_model = ?, 
          car_year = ?, 
          number_of_seats = ?, 
          car_colour = ?, 
          car_image = ?, 
          license_plate = ? 
        WHERE userId = ?`;

      const updateData = [carMaker, carModel, carYear, carSeats, carColor, firebaseImageUrl, licensePlate, userId];
      await pool.query(updateQuery, updateData);

      return res.json({ message: "Car details updated successfully" });
    } else {
      // Insert new car listing
      console.log("➕ Inserting new car listing");

      const insertQuery = `
        INSERT INTO car_listing 
        (car_make, car_model, car_year, number_of_seats, car_colour, car_image, license_plate, userId) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

      const insertData = [carMaker, carModel, carYear, carSeats, carColor, firebaseImageUrl, licensePlate, userId];
      await pool.query(insertQuery, insertData);

      return res.json({ message: "Car details saved successfully" });
    }
  } catch (error) {
    console.error("❌ Error while saving car details:", error);
    console.error("🛠 Full error stack:", error.stack);
    return res.status(500).json({ message: "Server error while saving car details" });
  }
});


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
