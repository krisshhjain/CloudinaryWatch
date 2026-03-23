const express = require('express');
const adminAuth = require('../middleware/adminAuth');
const User = require('../models/User');
const UploadHistory = require('../models/UploadHistory');
const LoginHistory = require('../models/LoginHistory');
const CloudinaryCredential = require('../models/CloudinaryCredential');

const router = express.Router();

// All admin routes require adminAuth middleware
router.use(adminAuth);

// ===========================================
// A. DASHBOARD ANALYTICS
// ===========================================

// GET /api/admin/dashboard — comprehensive dashboard stats (no sensitive data)
router.get('/dashboard', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    // Basic counts only - no sensitive data
    const [totalUsers, totalUploads, totalLoginRecords] = await Promise.all([
      User.countDocuments(),
      UploadHistory.countDocuments(),
      LoginHistory.countDocuments(),
    ]);

    // Total storage used (aggregate only - no individual data)
    const storageAgg = await UploadHistory.aggregate([
      { $group: { _id: null, totalBytes: { $sum: '$bytes' } } },
    ]);
    const totalStorageUsed = storageAgg[0]?.totalBytes || 0;

    // Uploads today (count only)
    const uploadsToday = await UploadHistory.countDocuments({
      createdAt: { $gte: today },
    });

    // Active users (count only)
    const activeUsersAgg = await LoginHistory.aggregate([
      { $match: { loginAt: { $gte: sevenDaysAgo } } },
      { $group: { _id: '$userId' } },
      { $count: 'count' },
    ]);
    const activeUsers = activeUsersAgg[0]?.count || 0;

    // Last 7 days uploads (aggregate counts only - no content)
    const last7DaysUploads = await UploadHistory.aggregate([
      { $match: { createdAt: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
          bytes: { $sum: '$bytes' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Fill in missing days
    const uploadsChart = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const found = last7DaysUploads.find((u) => u._id === dateStr);
      uploadsChart.push({
        date: dateStr,
        count: found?.count || 0,
        bytes: found?.bytes || 0,
      });
    }

    // Recent users (basic info only - no sensitive data)
    const recentUsers = await User.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('name email createdAt');

    // Users registered this week
    const newUsersThisWeek = await User.countDocuments({
      createdAt: { $gte: sevenDaysAgo },
    });

    res.json({
      totalUsers,
      totalUploads,
      totalLoginRecords,
      totalStorageUsed,
      uploadsToday,
      activeUsers,
      newUsersThisWeek,
      last7DaysUploads: uploadsChart,
      recentUsers,
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ===========================================
// B. USER MANAGEMENT
// ===========================================

// GET /api/admin/users — list all users with usage stats only (no sensitive data)
router.get('/users', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || '';
    const skip = (page - 1) * limit;

    const query = search
      ? {
          $or: [
            { name: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
          ],
        }
      : {};

    const [users, total] = await Promise.all([
      User.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('name email createdAt'), // Only basic info
      User.countDocuments(query),
    ]);

    // Enrich with usage stats only - no sensitive data
    const enrichedUsers = await Promise.all(
      users.map(async (user) => {
        const [uploadStats, lastLogin, loginCount] = await Promise.all([
          UploadHistory.aggregate([
            { $match: { userId: user._id } },
            {
              $group: {
                _id: null,
                count: { $sum: 1 },
                totalBytes: { $sum: '$bytes' },
              },
            },
          ]),
          LoginHistory.findOne({ userId: user._id })
            .sort({ loginAt: -1 })
            .select('loginAt'), // Only timestamp, no IP
          LoginHistory.countDocuments({ userId: user._id }),
        ]);

        return {
          _id: user._id,
          name: user.name,
          email: user.email,
          createdAt: user.createdAt,
          // Usage stats only
          totalUploads: uploadStats[0]?.count || 0,
          storageUsed: uploadStats[0]?.totalBytes || 0,
          totalLogins: loginCount,
          lastActive: lastLogin?.loginAt || user.createdAt,
        };
      })
    );

    res.json({
      users: enrichedUsers,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Users list error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/admin/users/:id — user usage stats only (no uploads, folders, cloudinary)
router.get('/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('name email createdAt');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get usage stats only - no sensitive content
    const [totalUploads, storageAgg, loginCount, lastLogin, firstLogin] =
      await Promise.all([
        UploadHistory.countDocuments({ userId: user._id }),
        UploadHistory.aggregate([
          { $match: { userId: user._id } },
          { $group: { _id: null, totalBytes: { $sum: '$bytes' } } },
        ]),
        LoginHistory.countDocuments({ userId: user._id }),
        LoginHistory.findOne({ userId: user._id })
          .sort({ loginAt: -1 })
          .select('loginAt method'), // Only timestamp and method, no IP/userAgent
        LoginHistory.findOne({ userId: user._id })
          .sort({ loginAt: 1 })
          .select('loginAt'),
      ]);

    const storageUsed = storageAgg[0]?.totalBytes || 0;

    // Get upload activity by date (counts only, no content)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const uploadActivity = await UploadHistory.aggregate([
      { $match: { userId: user._id, createdAt: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Get login activity by date (counts only)
    const loginActivity = await LoginHistory.aggregate([
      { $match: { userId: user._id, loginAt: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$loginAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.json({
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
      },
      // Usage stats only
      stats: {
        totalUploads,
        storageUsed,
        totalLogins: loginCount,
        lastActive: lastLogin?.loginAt || user.createdAt,
        firstLogin: firstLogin?.loginAt || user.createdAt,
        preferredLoginMethod: lastLogin?.method || 'email',
      },
      // Activity trends (counts only, no content)
      activity: {
        uploads: uploadActivity,
        logins: loginActivity,
      },
    });
  } catch (error) {
    console.error('User detail error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/admin/users/:id — delete user and all associated data
router.delete('/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Count uploads for response (don't expose actual content)
    const uploadCount = await UploadHistory.countDocuments({ userId: user._id });

    // Delete all associated data from database
    // Note: We don't delete from Cloudinary as that's the user's own account
    await Promise.all([
      UploadHistory.deleteMany({ userId: user._id }),
      LoginHistory.deleteMany({ userId: user._id }),
      CloudinaryCredential.deleteMany({ userId: user._id }),
      User.findByIdAndDelete(user._id),
    ]);

    res.json({
      message: 'User and all associated data deleted successfully',
      deletedRecords: uploadCount,
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ===========================================
// C. LOGIN TRACKING (Aggregated only)
// ===========================================

// GET /api/admin/login-history — login activity overview (no IPs or user agents)
router.get('/login-history', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const [records, total] = await Promise.all([
      LoginHistory.find()
        .sort({ loginAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('userId loginAt method') // No IP or userAgent
        .populate('userId', 'name email'),
      LoginHistory.countDocuments(),
    ]);

    res.json({
      records,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Login history error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ===========================================
// D. ENGAGEMENT METRICS (Aggregated only)
// ===========================================

// GET /api/admin/engagement — engagement analytics (no folder names or user content)
router.get('/engagement', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Daily Active Users (DAU)
    const dauAgg = await LoginHistory.aggregate([
      { $match: { loginAt: { $gte: today } } },
      { $group: { _id: '$userId' } },
      { $count: 'count' },
    ]);
    const dau = dauAgg[0]?.count || 0;

    // Weekly Active Users (WAU)
    const wauAgg = await LoginHistory.aggregate([
      { $match: { loginAt: { $gte: sevenDaysAgo } } },
      { $group: { _id: '$userId' } },
      { $count: 'count' },
    ]);
    const wau = wauAgg[0]?.count || 0;

    // Monthly Active Users (MAU)
    const mauAgg = await LoginHistory.aggregate([
      { $match: { loginAt: { $gte: thirtyDaysAgo } } },
      { $group: { _id: '$userId' } },
      { $count: 'count' },
    ]);
    const mau = mauAgg[0]?.count || 0;

    // Average uploads per user
    const totalUsers = await User.countDocuments();
    const totalUploads = await UploadHistory.countDocuments();
    const avgUploadsPerUser = totalUsers > 0 ? (totalUploads / totalUsers).toFixed(2) : 0;

    // Top active users by upload COUNT only (no content, no bytes to protect usage patterns)
    const topActiveUsers = await UploadHistory.aggregate([
      {
        $group: {
          _id: '$userId',
          uploadCount: { $sum: 1 },
        },
      },
      { $sort: { uploadCount: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: '$user' },
      {
        $project: {
          _id: 1,
          uploadCount: 1,
          name: '$user.name',
        },
      },
    ]);

    // Daily uploads for last 30 days (counts only)
    const dailyUploads = await UploadHistory.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Daily active users for last 30 days
    const dailyActiveUsers = await LoginHistory.aggregate([
      { $match: { loginAt: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$loginAt' } },
            userId: '$userId',
          },
        },
      },
      {
        $group: {
          _id: '$_id.date',
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // User growth over last 30 days
    const userGrowth = await User.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Retention rate
    const retentionAgg = await LoginHistory.aggregate([
      {
        $group: {
          _id: '$userId',
          loginCount: { $sum: 1 },
        },
      },
      { $match: { loginCount: { $gte: 2 } } },
      { $count: 'count' },
    ]);
    const returningUsers = retentionAgg[0]?.count || 0;
    const retentionRate = totalUsers > 0 ? ((returningUsers / totalUsers) * 100).toFixed(1) : 0;

    res.json({
      dau,
      wau,
      mau,
      avgUploadsPerUser: parseFloat(avgUploadsPerUser),
      topActiveUsers,
      dailyUploads,
      dailyActiveUsers,
      userGrowth,
      retentionRate: parseFloat(retentionRate),
      totalUsers,
    });
  } catch (error) {
    console.error('Engagement error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
