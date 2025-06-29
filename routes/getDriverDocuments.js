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

// Route to upload driver details and documents
router.post("/driver_details", async (req, res) => {
  try {
    const {
      user_id,
      status,
      state,
      URL_payment,
      online_time,
      last_online_timestamp,
      id_copy,
      police_clearance,
      pdpLicense,
      car_inspection,
      driver_license
    } = req.body;

    console.log('Request body:', req.body);

    // Validate that required fields are provided
    if (
      !user_id || !status || !state || !last_online_timestamp ||
      !id_copy || !police_clearance || !pdpLicense || !car_inspection || !driver_license
    ) {
      return res.status(400).send('All required fields must be provided.');
    }
    // Get current date and time as string (YYYY-MM-DD HH:mm:ss)
    const documentUploadTime = new Date().toISOString().slice(0, 19).replace('T', ' ');

    // Check if the driver details for the given user_id already exist
    const checkQuery = `SELECT * FROM driver WHERE users_id = ?`;
    const [existingDriver] = await pool.query(checkQuery, [user_id]);

    if (existingDriver.length > 0) {
      // If the driver data already exists, update the record
      const updateQuery = `
        UPDATE driver SET 
          status = ?, 
          state = ?, 
          URL_payment = ?, 
          online_time = ?, 
          last_online_timestamp = ?, 
          id_copy = ?, 
          police_clearance = ?, 
          pdp = ?, 
          car_inspection = ?, 
          driver_license = ?, 
          document_upload_time = ?
        WHERE users_id = ?
      `;

      const updateData = [
        status,
        state,
        URL_payment || null,
        online_time || null,
        last_online_timestamp,
        id_copy,
        police_clearance,
        pdpLicense,
        car_inspection,
        driver_license,
        documentUploadTime,
        user_id
      ];

      console.log('Updating driver:', updateData);
      await pool.query(updateQuery, updateData);
      res.json({ message: "Driver details updated successfully" });

    } else {
      // If the driver data does not exist, insert a new record
      const insertQuery = `
        INSERT INTO driver 
        (users_id, status, state, URL_payment, online_time, last_online_timestamp, id_copy, police_clearance, pdp, car_inspection, driver_license, document_upload_time)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const insertData = [
        user_id,
        status,
        state,
        URL_payment || null,
        online_time || null,
        last_online_timestamp,
        id_copy,
        police_clearance,
        pdpLicense,
        car_inspection,
        driver_license,
        documentUploadTime
      ];

      console.log('Inserting driver:', insertData);
      await pool.query(insertQuery, insertData);
      res.json({ message: "Driver details saved successfully" });
    }

  } catch (error) {
    console.error("Error while saving driver details:", error);
    res.status(500).json({ message: "Server error while saving driver details" });
  }
});




// Endpoint to fetch driver details (all or by userId)
router.get('/more_details/user', async (req, res) => {
  const { userId } = req.query;

  let sql = "SELECT * FROM driver";
  const queryParams = [];

  // If userId is provided, filter by it
  if (userId) {
    sql += " WHERE users_id = ?";
    queryParams.push(userId);
    console.log('Fetching driver details for userId:', userId);
  } else {
    console.log('Fetching all driver details');
  }

  try {
    const startTime = Date.now();
    const [rows] = await pool.query(sql, queryParams);
    console.log(`Query executed in ${Date.now() - startTime} ms`);

    if (rows.length === 0) {
      return res.status(404).json({ message: 'No driver details found' });
    }

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
