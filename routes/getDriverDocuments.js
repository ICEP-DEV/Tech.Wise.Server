const express = require("express");
const router = express.Router();
const pool = require("../config/config");
require("dotenv").config();

const cors = require('cors');
const multer = require('multer');
const path = require('path');
const mysql = require('mysql');

const app = express();

app.use(cors());
app.use(express.json());
// Endpoint to fetch driver documents
// Endpoint to fetch driver documents
router.get('/getDriverDocuments', async (req, res) => {
  const { userId } = req.query;  // Get userId from query params

  console.log('Fetching driver documents for userId:', userId);

  if (!userId) {
    return res.status(400).json({ message: 'User ID is required' });
  }

  // Query the database for driver documents
  const sql = `
    SELECT photo, id_copy, police_clearance, pdp, car_inspection
    FROM driver
    WHERE users_id = ?
  `;

  try {
    const startTime = Date.now();
    const [rows] = await pool.query(sql, [userId]);
    console.log(`Query executed in ${Date.now() - startTime} ms`);

    // If no records are found, return a 404 status
    if (rows.length === 0) {
      return res.status(404).json({ message: 'No documents found for this user.' });
    }

    // If documents are found, return them
    res.json({ documentsFound: true, documents: rows[0] });
  } catch (error) {
    console.error('Error executing query:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});


const storage = multer.diskStorage({
  destination: function (req, file, cb) {
      return cb(null, './public/documents') // Specify the directory where uploaded files will be stored
  },
  filename: function (req, file, cb) {
      return cb(null, `${file.originalname}`) // Specify the name of the uploaded file
  }
});

const upload = multer({ storage });

// Route for Document Upload
//inserting driver details
// Route for Document Upload (Inserting driver details)
router.post('/driver_details', upload.fields([
  { name: 'photo', maxCount: 1 },
  { name: 'id_copy', maxCount: 1 },
  { name: 'police_clearance', maxCount: 1 },
  { name: 'pdp', maxCount: 1 },
  { name: 'car_inspection', maxCount: 1 } // Added car_inspection field
]), async (req, res) => {
  console.log("Request Body:", req.body);

  const { gender, userId, payment_url } = req.body;
  const { photo, id_copy, police_clearance, pdp, car_inspection } = req.files;

  // Validate that required fields are provided
  if (!userId || !gender || !payment_url || !photo || !id_copy || !police_clearance || !pdp || !car_inspection) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  // SQL query to insert the data into the database
  const sql = `
    INSERT INTO driver (users_id, gender, URL_payment, photo, id_copy, police_clearance, pdp, car_inspection)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;

  try {
    const startTime = Date.now();
    await pool.query(sql, [
      userId,
      gender,
      payment_url,
      photo[0].filename,
      id_copy[0].filename,
      police_clearance[0].filename,
      pdp[0].filename,
      car_inspection[0].filename   // Insert car_inspection file
    ]);
    console.log(`Query executed in ${Date.now() - startTime} ms`);

    // Respond with success message
    res.json({ message: 'Driver documents uploaded successfully.' });

  } catch (error) {
    console.error('Error executing query:', error);
    res.status(500).json({ message: 'Internal server error while saving driver documents.' });
  }
});


// getting driver details
// Endpoint to fetch driver details by user ID
router.get('/more_details/user', (req, res) => {
  const userId = req.query.userId;

  if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
  }
  // Construct SQL SELECT query
  const sql = "SELECT * FROM driver WHERE users_id = ?";

  // Execute the SQL query
  db.query(sql, [userId], (err, results) => {
      if (err) {
          console.error("Error fetching driver details by user ID:", err);
          return res.status(500).json({ error: "An error occurred while fetching driver details" });
      }

      // Check if driver details for the user exist
      if (results.length === 0) {
          return res.status(404).json({ message: "Driver details not found for the user" });
      }

      // Driver details found, return the data
      return res.status(200).json({ driver: results }); // <-- Changed key to 'driver'
  });
});

// Endpoint to fetch driver documents
router.get('/driver_documents/:id', (req, res) => {
  const driverId = req.params.id;

  // Query the database to fetch documents for the specified driver
  const sql = "SELECT * FROM driver WHERE users_id = ?";
  db.query(sql, [driverId], (err, results) => {
      if (err) {
          console.error("Error fetching driver documents:", err);
          return res.status(500).json({ error: "An error occurred while fetching documents" });
      }
      // Check if any documents were found
      if (results.length === 0) {
          return res.status(404).json({ message: "No documents found for the specified driver" });
      }
      // Send the fetched documents back to the client
      return res.status(200).json(results);
  });
});

// Endpoint to update driver documents
router.put('/driver_documents/:id', upload.fields([
  { name: 'photo', maxCount: 1 },
  { name: 'id_copy', maxCount: 1 },
  { name: 'police_clearance', maxCount: 1 },
  { name: 'pdp', maxCount: 1 }
]), (req, res) => {
  const driverId = req.params.id;

  // Log the request body and files to inspect the data
  console.log("Request Body:", req.body);
  console.log("Uploaded Files:", req.files);

  // Extract the necessary fields from the request body
  const { payment_url } = req.body;

  // Extract the uploaded files from req.files
  const { photo, id_copy, police_clearance, pdp } = req.files;

  // Create an array of fields to update, only including those that were provided in the request
  const updates = [];
  if (photo) updates.push(`photo = '${photo[0].filename}'`);
  if (id_copy) updates.push(`id_copy = '${id_copy[0].filename}'`);
  if (police_clearance) updates.push(`police_clearance = '${police_clearance[0].filename}'`);
  if (pdp) updates.push(`pdp = '${pdp[0].filename}'`);
  if (payment_url) updates.push(`URL_payment = '${payment_url}'`);

  // If there are no updates to be made, return an error
  if (updates.length === 0) {
      return res.status(400).json({ error: "No valid fields provided for update" });
  }

  // Construct the SQL UPDATE query
  const sql = `UPDATE driver SET ${updates.join(', ')} WHERE users_id = ?`;

  // Execute the SQL query
  db.query(sql, [driverId], (err, result) => {
      if (err) {
          console.error("Error occurred during document update:", err);
          return res.status(500).json({ error: "An error occurred during the document update" });
      }

      // If no rows were affected, the driver ID might be incorrect
      if (result.affectedRows === 0) {
          return res.status(404).json({ message: "Driver not found or no changes made" });
      }

      return res.status(200).json({ message: "Driver documents updated successfully", result });
  });
});



module.exports = router;
