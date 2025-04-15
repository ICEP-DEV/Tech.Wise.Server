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
// router.post('/car_listing', upload.single('carImage'), (req, res) => {
//     if (req.fileValidationError) {
//         return res.status(400).json({ error: req.fileValidationError });
//     }

//     console.log("Request received:", req.body);
//     console.log("Uploaded file:", req.file);

//     const { carMaker, carModel, carYear, carSeats, carColor, licensePlate, userId } = req.body;
//     const imageName = req.file ? req.file.filename : '';

//     if (!carMaker || !carModel || !carYear || !carSeats || !carColor || !licensePlate || !imageName || !userId) {
//         return res.status(400).json({ error: "All fields are required" });
//     }

//     const sql = `
//         INSERT INTO car_listing 
//         (car_make, car_model, car_year, number_of_seats, car_colour, car_image, license_plate, userId) 
//         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
//     `;

//     pool.getConnection((err, connection) => {
//         if (err) {
//             console.error("Database connection failed:", err);
//             return res.status(500).json({ error: "Database connection error" });
//         }

//         connection.query(sql, [carMaker, carModel, carYear, carSeats, carColor, imageName, licensePlate, userId], (error, result) => {
//             connection.release(); // Release connection back to pool

//             if (error) {
//                 console.error("Error inserting car details:", error);
//                 return res.status(500).json({ error: "Failed to save car details" });
//             }
//             return res.status(200).json({ message: "Car details saved successfully" });
//         });
//     });
// });

router.post('/car_listing', upload.single('carImage'), async (req, res) => {
    try {
      // Validate that all required fields are provided
      const { carMaker, carModel, carYear, carSeats, carColor, licensePlate, userId } = req.body;
      const imageName = req.file ? req.file.filename : '';
  
      if (!carMaker || !carModel || !carYear || !carSeats || !carColor || !licensePlate || !imageName || !userId) {
        return res.status(400).json({ error: "All fields are required" });
      }
  
      // Check if the car listing for the given user_id already exists
      const checkQuery = `SELECT * FROM car_listing WHERE userId = ?`;
      const [existingCar] = await pool.query(checkQuery, [userId]);
  
      if (existingCar.length > 0) {
        // If the car data already exists, update the record
        const updateQuery = `
          UPDATE car_listing SET 
            car_make = ?, 
            car_model = ?, 
            car_year = ?, 
            number_of_seats = ?, 
            car_colour = ?, 
            car_image = ?, 
            license_plate = ? 
          WHERE userId = ?
        `;
        
        const updateData = [
          carMaker, 
          carModel, 
          carYear, 
          carSeats, 
          carColor, 
          imageName, 
          licensePlate, 
          userId
        ];
  
        console.log('Updating car listing:', updateData);
        await pool.query(updateQuery, updateData);
        return res.json({ message: "Car details updated successfully" });
  
      } else {
        // If the car data does not exist, insert a new record
        const insertQuery = `
          INSERT INTO car_listing 
          (car_make, car_model, car_year, number_of_seats, car_colour, car_image, license_plate, userId) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;
  
        const insertData = [
          carMaker, 
          carModel, 
          carYear, 
          carSeats, 
          carColor, 
          imageName, 
          licensePlate, 
          userId
        ];
  
        console.log('Inserting new car listing:', insertData);
        await pool.query(insertQuery, insertData);
        return res.json({ message: "Car details saved successfully" });
      }
  
    } catch (error) {
      console.error("Error while saving car details:", error);
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
