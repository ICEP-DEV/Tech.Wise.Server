const { Storage } = require('@google-cloud/storage');

// Load Google Cloud Storage credentials from environment variables
const gcsServiceAccount = {
  type: "service_account",
  project_id: process.env.GCS_PROJECT_ID,
  private_key_id: process.env.GCS_PRIVATE_KEY_ID,
  private_key: process.env.GCS_PRIVATE_KEY.replace(/\\n/g, "\n"),
  client_email: process.env.GCS_CLIENT_EMAIL,
  client_id: process.env.GCS_CLIENT_ID,
  auth_uri: process.env.GCS_AUTH_URI,
  token_uri: process.env.GCS_TOKEN_URI,
  auth_provider_x509_cert_url: process.env.GCS_AUTH_PROVIDER_X509_CERT_URL,
  client_x509_cert_url: process.env.GCS_CLIENT_X509_CERT_URL,
  universe_domain: process.env.GCS_UNIVERSE_DOMAIN, // Include this new field
};

// Initialize Google Cloud Storage
const storage = new Storage({
  credentials: gcsServiceAccount,
});

const bucket = storage.bucket(process.env.GCS_BUCKET_NAME);

module.exports = { bucket };
