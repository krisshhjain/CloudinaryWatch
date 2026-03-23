const express = require('express');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const auth = require('../middleware/auth');
const CloudinaryCredential = require('../models/CloudinaryCredential');
const UploadHistory = require('../models/UploadHistory');
const { decrypt } = require('../utils/encryption');

const router = express.Router();

const ALLOWED_EXTENSIONS = /\.(jpe?g|png|gif|webp|avif|heic|heif|tiff?|bmp|svg|ico|raw|cr2|nef|arw|mp4|mov|avi|mkv|webm)$/i;

// Multer memory storage (files stay in buffer, not saved to disk)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB per file
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/') || ALLOWED_EXTENSIONS.test(file.originalname)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file: ${file.originalname}`), false);
    }
  },
});

// POST /api/upload — upload files to user's Cloudinary
router.post('/', auth, upload.array('files', 100), async (req, res) => {
  try {
    // Get user's Cloudinary credentials
    const cred = await CloudinaryCredential.findOne({ userId: req.user._id });
    if (!cred) {
      return res.status(400).json({
        message: 'Please connect your Cloudinary account first',
      });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No files provided' });
    }

    const folder = req.body.folder || '';
    const customNames = req.body.customNames
      ? JSON.parse(req.body.customNames)
      : {};

    // Decrypt and configure Cloudinary with user's credentials
    const decryptedSecret = decrypt(cred.apiSecret);
    cloudinary.config({
      cloud_name: cred.cloudName,
      api_key: cred.apiKey,
      api_secret: decryptedSecret,
    });

    // Upload all files in parallel
    const uploadPromises = req.files.map((file, index) => {
      return new Promise((resolve) => {
        // Generate public_id from custom name or original filename
        const originalName = file.originalname.replace(/\.[^/.]+$/, '');
        const publicId = customNames[index] || originalName;

        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: folder || undefined,
            public_id: publicId,
            resource_type: 'auto',
          },
          async (error, result) => {
            if (error) {
              resolve({
                fileName: file.originalname,
                status: 'failed',
                error: error.message,
              });
            } else {
              // Save to upload history
              try {
                await UploadHistory.create({
                  userId: req.user._id,
                  fileName: file.originalname,
                  publicId: result.public_id,
                  url: result.url,
                  secureUrl: result.secure_url,
                  folder: folder,
                  format: result.format,
                  bytes: result.bytes,
                  width: result.width,
                  height: result.height,
                  resourceType: result.resource_type,
                  status: 'success',
                });
              } catch (dbErr) {
                console.error('DB save error:', dbErr);
              }

              resolve({
                fileName: file.originalname,
                status: 'success',
                publicId: result.public_id,
                url: result.secure_url,
                format: result.format,
                bytes: result.bytes,
                width: result.width,
                height: result.height,
              });
            }
          }
        );

        uploadStream.end(file.buffer);
      });
    });

    const results = await Promise.all(uploadPromises);
    const successful = results.filter((r) => r.status === 'success');
    const failed = results.filter((r) => r.status === 'failed');

    res.json({
      message: `Uploaded ${successful.length}/${results.length} files`,
      results,
      summary: {
        total: results.length,
        successful: successful.length,
        failed: failed.length,
      },
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ message: 'Upload failed: ' + error.message });
  }
});

// GET /api/upload/history — get upload history
router.get('/history', auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const [uploads, total] = await Promise.all([
      UploadHistory.find({ userId: req.user._id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      UploadHistory.countDocuments({ userId: req.user._id }),
    ]);

    res.json({
      uploads,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/upload/:id — delete an asset
router.delete('/:id', auth, async (req, res) => {
  try {
    const upload = await UploadHistory.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!upload) {
      return res.status(404).json({ message: 'Upload not found' });
    }

    // Get user's Cloudinary credentials to delete from Cloudinary
    const cred = await CloudinaryCredential.findOne({ userId: req.user._id });
    if (cred) {
      const decryptedSecret = decrypt(cred.apiSecret);
      cloudinary.config({
        cloud_name: cred.cloudName,
        api_key: cred.apiKey,
        api_secret: decryptedSecret,
      });

      try {
        await cloudinary.uploader.destroy(upload.publicId);
      } catch (cloudErr) {
        console.error('Cloudinary delete error:', cloudErr);
      }
    }

    await UploadHistory.findByIdAndDelete(req.params.id);
    res.json({ message: 'Asset deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/upload/single — upload ONE file to user's Cloudinary (for per-file progress)
router.post('/single', auth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ status: 'failed', message: 'No file provided' });
    }

    const cred = await CloudinaryCredential.findOne({ userId: req.user._id });
    if (!cred) {
      return res.status(400).json({ status: 'failed', message: 'Please connect your Cloudinary account first' });
    }

    const decryptedSecret = decrypt(cred.apiSecret);
    cloudinary.config({
      cloud_name: cred.cloudName,
      api_key: cred.apiKey,
      api_secret: decryptedSecret,
    });

    const folder = req.body.folder || '';
    const customName = req.body.customName || '';
    const originalName = req.file.originalname.replace(/\.[^/.]+$/, '');
    const publicId = customName || originalName;

    // Upload with retry
    let result;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        result = await new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            {
              folder: folder || undefined,
              public_id: publicId,
              resource_type: 'auto',
            },
            (err, res) => {
              if (err) reject(err);
              else resolve(res);
            }
          );
          stream.end(req.file.buffer);
        });
        break;
      } catch (err) {
        if (attempt === 2) {
          return res.status(500).json({
            fileName: req.file.originalname,
            status: 'failed',
            error: err.message,
          });
        }
        await new Promise((r) => setTimeout(r, 500));
      }
    }

    // Save to history
    try {
      await UploadHistory.create({
        userId: req.user._id,
        fileName: req.file.originalname,
        publicId: result.public_id,
        url: result.url,
        secureUrl: result.secure_url,
        folder,
        format: result.format,
        bytes: result.bytes,
        width: result.width,
        height: result.height,
        resourceType: result.resource_type,
        status: 'success',
      });
    } catch (dbErr) {
      console.error('DB save error:', dbErr);
    }

    res.json({
      fileName: req.file.originalname,
      status: 'success',
      publicId: result.public_id,
      url: result.secure_url,
      format: result.format,
      bytes: result.bytes,
      width: result.width,
      height: result.height,
    });
  } catch (error) {
    console.error('Single upload error:', error);
    res.status(500).json({
      fileName: req.file?.originalname || 'unknown',
      status: 'failed',
      error: error.message,
    });
  }
});

module.exports = router;
