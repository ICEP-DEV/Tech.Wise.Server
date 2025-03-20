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
// Route for Document Upload (Inserting driver details)
router.post('/driver_details', upload.fields([
  { name: 'photo', maxCount: 1 },
  { name: 'id_copy', maxCount: 1 },
  { name: 'police_clearance', maxCount: 1 },
  { name: 'pdp', maxCount: 1 },
  { name: 'car_inspection', maxCount: 1 },
  { name: 'driver_license', maxCount: 1 } // Added driver_license field
]), async (req, res) => {
  console.log("Request Body:", req.body);

  const { users_id, status, state, URL_payment, online_time, last_online_timestamp } = req.body;
  const { photo, id_copy, police_clearance, pdp, car_inspection, driver_license } = req.files;

  // Validate that required fields are provided
  if (!users_id || !status || !state||
      !photo || !id_copy || !police_clearance || !pdp || !car_inspection || !driver_license) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  // SQL query to insert the data into the database
  const sql = `
    INSERT INTO driver 
    (users_id, status, state, URL_payment, online_time, last_online_timestamp, photo, id_copy, police_clearance, pdp, car_inspection, driver_license)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  try {
    const startTime = Date.now();
    await pool.query(sql, [
      users_id,
      status,
      state,
      URL_payment,
      online_time,
      last_online_timestamp,
      photo[0].filename,          // Save photo file
      id_copy[0].filename,        // Save id_copy file
      police_clearance[0].filename, // Save police_clearance file
      pdp[0].filename,            // Save pdp file
      car_inspection[0].filename, // Save car_inspection file
      driver_license[0].filename  // Save driver_license file
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
// Endpoint to fetch driver details by user ID
router.get('/more_details/user', async (req, res) => {
  const { userId } = req.query;  // Get userId from query params

  console.log('Fetching driver details for userId:', userId);

  if (!userId) {
    return res.status(400).json({ message: 'User ID is required' });
  }

  const sql = "SELECT * FROM driver WHERE users_id = ?";

  try {
    const startTime = Date.now();
    const [rows] = await pool.query(sql, [userId]);
    console.log(`Query executed in ${Date.now() - startTime} ms`);

    // If no records are found, return a 404 status
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Driver details not found for this user' });
    }

    // If driver details are found, return them in the response
    res.json({ driver: rows });
  } catch (error) {
    console.error('Error executing query:', error);
    res.status(500).json({ message: 'Internal server error while fetching driver details' });
  }
});


// Endpoint to fetch driver documents by driver ID
router.get('/driver_documents/:id', async (req, res) => {
  const driverId = req.params.id;  // Get driverId from URL params

  console.log('Fetching driver documents for driverId:', driverId);

  if (!driverId) {
    return res.status(400).json({ message: 'Driver ID is required' });
  }

  const sql = "SELECT * FROM driver WHERE users_id = ?";

  try {
    const startTime = Date.now();
    const [rows] = await pool.query(sql, [driverId]);
    console.log(`Query executed in ${Date.now() - startTime} ms`);

    // If no records are found, return a 404 status
    if (rows.length === 0) {
      return res.status(404).json({ message: 'No documents found for the specified driver' });
    }

    // If driver documents are found, return them in the response
    res.json({ documentsFound: true, documents: rows });
  } catch (error) {
    console.error('Error executing query:', error);
    res.status(500).json({ message: 'Internal server error while fetching driver documents' });
  }
});


// Endpoint to update driver documents by driver ID
router.put('/driver_documents/:id', upload.fields([
  { name: 'photo', maxCount: 1 },
  { name: 'id_copy', maxCount: 1 },
  { name: 'police_clearance', maxCount: 1 },
  { name: 'pdp', maxCount: 1 }
]), async (req, res) => {
  const driverId = req.params.id;  // Get driverId from URL params

  console.log('Updating driver documents for driverId:', driverId);

  // Extract the necessary fields from the request body
  const { payment_url } = req.body;
  const { photo, id_copy, police_clearance, pdp } = req.files;

  // Create an array of fields to update, only including those that were provided
  const updates = [];
  if (photo) updates.push(`photo = '${photo[0].filename}'`);
  if (id_copy) updates.push(`id_copy = '${id_copy[0].filename}'`);
  if (police_clearance) updates.push(`police_clearance = '${police_clearance[0].filename}'`);
  if (pdp) updates.push(`pdp = '${pdp[0].filename}'`);
  if (payment_url) updates.push(`URL_payment = '${payment_url}'`);

  // If there are no updates to be made, return an error
  if (updates.length === 0) {
    return res.status(400).json({ message: 'No valid fields provided for update' });
  }

  // Construct the SQL UPDATE query
  const sql = `UPDATE driver SET ${updates.join(', ')} WHERE users_id = ?`;

  try {
    const startTime = Date.now();
    const [result] = await pool.query(sql, [driverId]);
    console.log(`Query executed in ${Date.now() - startTime} ms`);

    // If no rows were affected, return a 404 (driver not found or no changes made)
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Driver not found or no changes made' });
    }

    // If the update is successful, return a success message
    res.status(200).json({ message: 'Driver documents updated successfully', result });
  } catch (error) {
    console.error('Error executing query:', error);
    res.status(500).json({ message: 'Internal server error while updating driver documents' });
  }
});




module.exports = router;
