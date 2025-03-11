const express = require('express');
const router = express.Router();
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const pool = require('../config/config'); // Import MySQL connection pool

const app = express();

// Middleware
app.use(cors({
  origin: '*',  // Replace with your frontend URL
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type'],
}));
app.use(express.json());

// Set up Multer middleware to handle file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './public/CarImages'); // Ensure this folder exists
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname);
    }
});

const upload = multer({ storage });

// 🚗 **Car Listing Route**
router.post('/car_listing', upload.single('carImage'), (req, res) => {
    if (req.fileValidationError) {
        return res.status(400).json({ error: req.fileValidationError });
    }

    console.log("Request received:", req.body);
    console.log("Uploaded file:", req.file);

    const { carMaker, carModel, carYear, carSeats, carColor, licensePlate, userId } = req.body;
    const imageName = req.file ? req.file.filename : '';

    if (!carMaker || !carModel || !carYear || !carSeats || !carColor || !licensePlate || !imageName || !userId) {
        return res.status(400).json({ error: "All fields are required" });
    }

    const sql = `
        INSERT INTO car_listing 
        (car_make, car_model, car_year, number_of_seats, car_colour, car_image, license_plate, userId) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    pool.getConnection((err, connection) => {
        if (err) {
            console.error("Database connection failed:", err);
            return res.status(500).json({ error: "Database connection error" });
        }

        connection.query(sql, [carMaker, carModel, carYear, carSeats, carColor, imageName, licensePlate, userId], (error, result) => {
            connection.release(); // Release connection back to pool

            if (error) {
                console.error("Error inserting car details:", error);
                return res.status(500).json({ error: "Failed to save car details" });
            }
            return res.status(200).json({ message: "Car details saved successfully" });
        });
    });
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
