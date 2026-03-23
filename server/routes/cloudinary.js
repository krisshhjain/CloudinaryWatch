const express = require('express');
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const CloudinaryCredential = require('../models/CloudinaryCredential');
const { encrypt, decrypt } = require('../utils/encryption');

const router = express.Router();

// POST /api/cloudinary/credentials — save/update credentials
router.post(
  '/credentials',
  auth,
  [
    body('cloudName').trim().notEmpty().withMessage('Cloud name is required'),
    body('apiKey').trim().notEmpty().withMessage('API key is required'),
    body('apiSecret').trim().notEmpty().withMessage('API secret is required'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { cloudName, apiKey, apiSecret } = req.body;

      // Encrypt the API secret
      const encryptedSecret = encrypt(apiSecret);

      // Upsert credentials
      const cred = await CloudinaryCredential.findOneAndUpdate(
        { userId: req.user._id },
        {
          cloudName,
          apiKey,
          apiSecret: encryptedSecret,
          connectedAt: new Date(),
        },
        { upsert: true, new: true }
      );

      res.json({
        message: 'Cloudinary credentials saved successfully',
        credentials: {
          cloudName: cred.cloudName,
          apiKey: cred.apiKey,
          connected: true,
          connectedAt: cred.connectedAt,
        },
      });
    } catch (error) {
      console.error('Save credentials error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// GET /api/cloudinary/credentials — get credentials (never expose secret)
router.get('/credentials', auth, async (req, res) => {
  try {
    const cred = await CloudinaryCredential.findOne({ userId: req.user._id });
    if (!cred) {
      return res.json({ connected: false });
    }

    res.json({
      connected: true,
      credentials: {
        cloudName: cred.cloudName,
        apiKey: cred.apiKey,
        connectedAt: cred.connectedAt,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/cloudinary/credentials — disconnect
router.delete('/credentials', auth, async (req, res) => {
  try {
    await CloudinaryCredential.findOneAndDelete({ userId: req.user._id });
    res.json({ message: 'Cloudinary account disconnected' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/cloudinary/usage — fetch Cloudinary account usage
router.get('/usage', auth, async (req, res) => {
  try {
    const cloudinary = require('cloudinary').v2;
    const cred = await CloudinaryCredential.findOne({ userId: req.user._id });
    if (!cred) {
      return res.json({ connected: false });
    }

    cloudinary.config({
      cloud_name: cred.cloudName,
      api_key: cred.apiKey,
      api_secret: decrypt(cred.apiSecret),
    });

    const usage = await cloudinary.api.usage();

    // Free plan defaults — Cloudinary API often returns 0 for limits
    const FREE_PLAN_LIMITS = {
      storage: 25 * 1024 * 1024 * 1024,       // 25 GB
      bandwidth: 25 * 1024 * 1024 * 1024,      // 25 GB
      transformations: 25000,
      credits: 25,
    };

    const storageLimit = usage.storage?.limit || FREE_PLAN_LIMITS.storage;
    const bandwidthLimit = usage.bandwidth?.limit || FREE_PLAN_LIMITS.bandwidth;
    const transformLimit = usage.transformations?.limit || FREE_PLAN_LIMITS.transformations;
    const creditsLimit = usage.credits?.limit || FREE_PLAN_LIMITS.credits;

    res.json({
      connected: true,
      cloudName: cred.cloudName,
      plan: usage.plan || 'Free',
      lastUpdated: usage.last_updated,
      storage: {
        used: usage.storage?.usage || 0,
        limit: storageLimit,
        usedPercent: storageLimit > 0 ? Math.round(((usage.storage?.usage || 0) / storageLimit) * 100) : 0,
      },
      bandwidth: {
        used: usage.bandwidth?.usage || 0,
        limit: bandwidthLimit,
        usedPercent: bandwidthLimit > 0 ? Math.round(((usage.bandwidth?.usage || 0) / bandwidthLimit) * 100) : 0,
      },
      transformations: {
        used: usage.transformations?.usage || 0,
        limit: transformLimit,
        usedPercent: transformLimit > 0 ? Math.round(((usage.transformations?.usage || 0) / transformLimit) * 100) : 0,
      },
      credits: {
        used: usage.credits?.usage || 0,
        limit: creditsLimit,
        usedPercent: creditsLimit > 0 ? Math.round(((usage.credits?.usage || 0) / creditsLimit) * 100) : 0,
      },
      resources: usage.resources || 0,
      derivedResources: usage.derived_resources || 0,
      mediaLimits: {
        imageMaxSizeBytes: usage.media_limits?.image_max_size_bytes || 0,
        videoMaxSizeBytes: usage.media_limits?.video_max_size_bytes || 0,
      },
    });
  } catch (error) {
    console.error('Cloudinary usage error:', error);
    res.status(500).json({ message: 'Failed to fetch usage: ' + (error?.error?.message || error.message) });
  }
});

// GET /api/cloudinary/impressions — daily requests/bandwidth for last 7 days
router.get('/impressions', auth, async (req, res) => {
  try {
    const cloudinary = require('cloudinary').v2;
    const cred = await CloudinaryCredential.findOne({ userId: req.user._id });
    if (!cred) {
      return res.json({ connected: false, data: [] });
    }

    cloudinary.config({
      cloud_name: cred.cloudName,
      api_key: cred.apiKey,
      api_secret: decrypt(cred.apiSecret),
    });

    // Fetch usage for each of the last 7 days
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push(d.toISOString().split('T')[0]); // YYYY-MM-DD
    }

    const dailyData = [];
    for (const date of days) {
      try {
        const usage = await cloudinary.api.usage({ date });
        dailyData.push({
          date,
          requests: usage.requests || 0,
          bandwidth: usage.bandwidth?.usage || 0,
          transformations: usage.transformations?.usage || 0,
          resources: usage.resources || 0,
        });
      } catch (err) {
        // If a specific date fails, push zeros
        dailyData.push({ date, requests: 0, bandwidth: 0, transformations: 0, resources: 0 });
      }
      // Small delay to avoid rate limiting
      await new Promise((r) => setTimeout(r, 200));
    }

    res.json({ connected: true, data: dailyData });
  } catch (error) {
    console.error('Impressions error:', error);
    res.status(500).json({ message: 'Failed to fetch impressions' });
  }
});

// GET /api/cloudinary/stats — internal upload stats from our database
router.get('/stats', auth, async (req, res) => {
  try {
    const UploadHistory = require('../models/UploadHistory');

    // Uploads per day (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const uploadsPerDay = await UploadHistory.aggregate([
      { $match: { userId: req.user._id, createdAt: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
          totalBytes: { $sum: '$bytes' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Format breakdown
    const formatBreakdown = await UploadHistory.aggregate([
      { $match: { userId: req.user._id } },
      {
        $group: {
          _id: { $toLower: '$format' },
          count: { $sum: 1 },
          totalBytes: { $sum: '$bytes' },
        },
      },
      { $sort: { count: -1 } },
    ]);

    // Storage per folder (top 10)
    const folderBreakdown = await UploadHistory.aggregate([
      { $match: { userId: req.user._id } },
      {
        $group: {
          _id: { $ifNull: ['$folder', 'Root'] },
          count: { $sum: 1 },
          totalBytes: { $sum: '$bytes' },
        },
      },
      { $sort: { totalBytes: -1 } },
      { $limit: 10 },
    ]);

    // Overall stats
    const overallStats = await UploadHistory.aggregate([
      { $match: { userId: req.user._id } },
      {
        $group: {
          _id: null,
          totalUploads: { $sum: 1 },
          totalBytes: { $sum: '$bytes' },
          successCount: { $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] } },
          failedCount: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
          avgFileSize: { $avg: '$bytes' },
        },
      },
    ]);

    const overall = overallStats[0] || {
      totalUploads: 0, totalBytes: 0, successCount: 0, failedCount: 0, avgFileSize: 0,
    };

    res.json({
      uploadsPerDay: uploadsPerDay.map((d) => ({ date: d._id, count: d.count, bytes: d.totalBytes })),
      formatBreakdown: formatBreakdown.map((f) => ({ format: f._id || 'unknown', count: f.count, bytes: f.totalBytes })),
      folderBreakdown: folderBreakdown.map((f) => ({ folder: f._id || 'Root', count: f.count, bytes: f.totalBytes })),
      overall: {
        totalUploads: overall.totalUploads,
        totalBytes: overall.totalBytes,
        successCount: overall.successCount,
        failedCount: overall.failedCount,
        avgFileSize: Math.round(overall.avgFileSize || 0),
        successRate: overall.totalUploads > 0 ? Math.round((overall.successCount / overall.totalUploads) * 100) : 0,
      },
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ message: 'Failed to fetch stats' });
  }
});

module.exports = router;
