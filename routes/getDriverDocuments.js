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

//  and uploading documents to Google Cloud Storage
// router.post("/driver_details", upload.fields([
//   { name: "id_copy", maxCount: 1 }, // Match this field name to what frontend sends
//   { name: "police_clearance", maxCount: 1 },
//   { name: "pdpLicense", maxCount: 1 },
//   { name: "car_inspection", maxCount: 1 },
//   { name: "driver_license", maxCount: 1 },
// ]),
// async (req, res) => {
//   try {
//     const { users_id, status, state, URL_payment, online_time, last_online_timestamp } = req.body;
//     console.log('Request body:', req.body);
//     const {  id_copy, police_clearance, pdpLicense, car_inspection, driver_license } = req.files;
//     console.log('Request files:', req.files);

//     // Check if all required fields are present
//     if (!req.body.users_id || !req.files.id_copy) {
//       return res.status(400).send('All fields are required.');
//     }    

//     // Helper function to upload file to Google Cloud Storage
//     const uploadFile = async (file) => {
//       try {
//         const blob = bucket.file(file.originalname);
//         const blobStream = blob.createWriteStream({
//           resumable: false,
//           gzip: true,
//           contentType: file.mimetype,
//         });
    
//         return new Promise((resolve, reject) => {
//           blobStream.on("finish", () => {
//             const fileUrl = `https://storage.googleapis.com/${process.env.GCS_BUCKET_NAME}/${blob.name}`;
//             resolve(fileUrl);
//           });
    
//           blobStream.on("error", (err) => {
//             console.error("Blob stream error:", err);
//             reject(err);
//           });
//           blobStream.end(file.buffer);
//         });
//       } catch (error) {
//         console.error("Error during file upload:", error);
//         throw new Error("Error during file upload");
//       }
//     };
    

//     // Upload files and get their URLs
//     const idCopyUrl = await uploadFile(id_copy[0]);
//     const policeClearanceUrl = await uploadFile(police_clearance[0]);
//     const pdpLicenseUrl = await uploadFile(pdpLicense[0]);
//     const carInspectionUrl = await uploadFile(car_inspection[0]);
//     const driverLicenseUrl = await uploadFile(driver_license[0]);

//     // Insert into database
//     const sql = `
//       INSERT INTO driver 
//       (users_id, status, state, URL_payment, online_time, last_online_timestamp, id_copy, police_clearance, pdpLicense, car_inspection, driver_license)
//       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
//     `;

//     await pool.query(sql, [
//       users_id, status, state, URL_payment, online_time, last_online_timestamp,
//       idCopyUrl, policeClearanceUrl, pdpLicenseUrl, carInspectionUrl, driverLicenseUrl
//     ]);

//     res.json({ message: "Documents uploaded successfully" });
//   } catch (error) {
//     console.error("Error during document upload:", error);
//     res.status(500).json({ message: "Server error while uploading documents" });
//   }
// }
// );
// single file upload


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
    const { user_id, status, state, URL_payment, online_time, last_online_timestamp, 
      id_copy, police_clearance, pdpLicense, car_inspection, driver_license } = req.body;
    
    console.log('Request body:', req.body);

    // Validate that required fields are provided
    if (!user_id || !status || !state || !last_online_timestamp || 
        !id_copy || !police_clearance || !pdpLicense || !car_inspection || !driver_license) {
      return res.status(400).send('All required fields must be provided.');
    }

    // Handle optional fields (URL_payment and online_time can be null)
    const sql = `
      INSERT INTO driver 
      (users_id, status, state, URL_payment, online_time, last_online_timestamp, id_copy, police_clearance, pdpLicense, car_inspection, driver_license)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    // Prepare the data for insertion (handle nulls properly)
    const queryData = [
      user_id, 
      status, 
      state, 
      URL_payment || null, // If URL_payment is null, set it to null
      online_time || null, // If online_time is null, set it to null
      last_online_timestamp,
      id_copy, 
      police_clearance, 
      pdpLicense, 
      car_inspection, 
      driver_license
    ];

    // Insert the data into the MySQL database
    await pool.query(sql, queryData);

    // Send success response
    res.json({ message: "Driver details saved successfully" });
  } catch (error) {
    console.error("Error while saving driver details:", error);
    res.status(500).json({ message: "Server error while saving driver details" });
  }
});




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
