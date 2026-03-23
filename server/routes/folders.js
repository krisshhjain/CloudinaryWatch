const express = require('express');
const cloudinary = require('cloudinary').v2;
const auth = require('../middleware/auth');
const CloudinaryCredential = require('../models/CloudinaryCredential');
const { decrypt } = require('../utils/encryption');

const router = express.Router();

// Helper: configure Cloudinary with user's credentials
async function configureUserCloudinary(userId) {
  const cred = await CloudinaryCredential.findOne({ userId });
  if (!cred) return null;

  const decryptedSecret = decrypt(cred.apiSecret);
  cloudinary.config({
    cloud_name: cred.cloudName,
    api_key: cred.apiKey,
    api_secret: decryptedSecret,
  });
  return true;
}

// GET /api/folders — list root folders
router.get('/', auth, async (req, res) => {
  try {
    const configured = await configureUserCloudinary(req.user._id);
    if (!configured) {
      return res.status(400).json({ message: 'Please connect your Cloudinary account first' });
    }

    const result = await cloudinary.api.root_folders();
    const folders = (result.folders || []).map((f) => ({
      name: f.name,
      path: f.path,
    }));

    res.json({ folders });
  } catch (error) {
    console.error('Fetch folders error:', error);
    // Cloudinary may return 420 rate limit or other errors
    if (error.error?.message?.includes('Rate Limit')) {
      return res.status(429).json({ message: 'Rate limited. Try again shortly.' });
    }
    res.status(500).json({ message: 'Failed to fetch folders: ' + (error.error?.message || error.message) });
  }
});

// GET /api/folders/:folder — list sub-folders
router.get('/:folder(*)', auth, async (req, res) => {
  try {
    const configured = await configureUserCloudinary(req.user._id);
    if (!configured) {
      return res.status(400).json({ message: 'Please connect your Cloudinary account first' });
    }

    const folderPath = req.params.folder;
    const result = await cloudinary.api.sub_folders(folderPath);
    const folders = (result.folders || []).map((f) => ({
      name: f.name,
      path: f.path,
    }));

    res.json({ folders, parent: folderPath });
  } catch (error) {
    console.error('Fetch sub-folders error:', error);
    res.status(500).json({ message: 'Failed to fetch sub-folders' });
  }
});

// POST /api/folders — create a new folder
router.post('/', auth, async (req, res) => {
  try {
    const { folderName } = req.body;
    if (!folderName || !folderName.trim()) {
      return res.status(400).json({ message: 'Folder name is required' });
    }

    const configured = await configureUserCloudinary(req.user._id);
    if (!configured) {
      return res.status(400).json({ message: 'Please connect your Cloudinary account first' });
    }

    const cleanName = folderName.trim().replace(/[^a-zA-Z0-9_\-\/\s]/g, '').replace(/\s+/g, '_');

    let result;
    let lastError;
    // Retry up to 2 times — Cloudinary's create_folder can be flaky on first call
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        result = await cloudinary.api.create_folder(cleanName);
        lastError = null;
        break;
      } catch (cloudError) {
        lastError = cloudError;
        const msg = cloudError?.error?.message || cloudError?.message || String(cloudError);
        
        if (msg.toLowerCase().includes('already exists')) {
          return res.status(409).json({ message: 'Folder already exists' });
        }

        console.error(`create_folder attempt ${attempt + 1} failed:`, msg);
        if (attempt < 2) {
          await new Promise((r) => setTimeout(r, 500)); // wait 500ms before retry
        }
      }
    }

    if (lastError) {
      const msg = lastError?.error?.message || lastError?.message || String(lastError);
      return res.status(500).json({ message: 'Cloudinary error: ' + msg });
    }

    res.json({
      message: 'Folder created',
      folder: {
        name: result?.name || cleanName,
        path: result?.path || cleanName,
      },
    });
  } catch (error) {
    console.error('Create folder error:', error);
    res.status(500).json({ message: 'Failed to create folder: ' + error.message });
  }
});

module.exports = router;
