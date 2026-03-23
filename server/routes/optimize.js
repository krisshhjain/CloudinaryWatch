const express = require('express');
const multer = require('multer');
const archiver = require('archiver');
const auth = require('../middleware/auth');
const {
  optimizeImage,
  bulkOptimize,
  generateSnippets,
  formatBytes,
} = require('../utils/optimizeEngine');

const router = express.Router();

const IMAGE_EXTENSIONS = /\.(jpe?g|png|gif|webp|avif|heic|heif|tiff?|bmp|svg|ico|raw|cr2|nef|arw)$/i;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    // Check MIME type OR file extension (HEIC/HEIF often report as application/octet-stream on Windows)
    if (file.mimetype.startsWith('image/') || IMAGE_EXTENSIONS.test(file.originalname)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file: ${file.originalname}. Only image files are allowed.`), false);
    }
  },
});

// POST /api/optimize — optimize single or multiple images, return analysis + optimized previews
router.post('/', auth, upload.array('files', 100), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No files provided' });
    }

    const { results, summary } = await bulkOptimize(req.files);

    // Build response with base64 preview of best variant + original
    const responseResults = results.map((r) => {
      if (r.error) return r;

      const originalBase64 = req.files
        .find((f) => (f.originalname || f.name) === r.fileName)
        ?.buffer?.toString('base64');

      const bestBase64 = r._bestBuffer?.toString('base64');
      const snippets = generateSnippets(r, '');

      // Build variant previews
      const variantPreviews = {};
      if (r._buffers) {
        Object.entries(r._buffers).forEach(([fmt, buf]) => {
          variantPreviews[fmt] = buf.toString('base64');
        });
      }

      return {
        fileName: r.fileName,
        analysis: r.analysis,
        strategy: r.strategy,
        variants: r.variants,
        best: r.best,
        originalSize: r.originalSize,
        originalBase64: originalBase64 ? `data:image/${r.analysis?.format || 'jpeg'};base64,${originalBase64}` : null,
        bestBase64: bestBase64 ? `data:image/${r.best?.format || 'webp'};base64,${bestBase64}` : null,
        variantPreviews: Object.fromEntries(
          Object.entries(variantPreviews).map(([fmt, b64]) => [
            fmt,
            `data:image/${fmt};base64,${b64}`,
          ])
        ),
        snippets,
      };
    });

    res.json({
      results: responseResults,
      summary,
    });
  } catch (error) {
    console.error('Optimize error:', error);
    res.status(500).json({ message: 'Optimization failed: ' + error.message });
  }
});

// POST /api/optimize/analyze — dry run, just analyze without generating full variants
router.post('/analyze', auth, upload.array('files', 100), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No files provided' });
    }

    const { analyzeImage, getStrategy } = require('../utils/optimizeEngine');

    const analyses = await Promise.all(
      req.files.map(async (file) => {
        const analysis = await analyzeImage(file.buffer);
        const strategy = getStrategy(analysis);
        // Estimate savings based on format type
        const estimatedSavings = analysis.isSmall
          ? 0
          : analysis.isPhoto
          ? Math.round(analysis.originalSize * 0.85) // ~85% savings for photos → AVIF
          : Math.round(analysis.originalSize * 0.6);  // ~60% savings for graphics → WebP

        return {
          fileName: file.originalname,
          analysis,
          strategy,
          estimatedSavings,
          estimatedSavingsPercent: analysis.originalSize > 0
            ? Math.round((estimatedSavings / analysis.originalSize) * 100)
            : 0,
        };
      })
    );

    const totalOriginal = analyses.reduce((sum, a) => sum + a.analysis.originalSize, 0);
    const totalEstimatedSavings = analyses.reduce((sum, a) => sum + a.estimatedSavings, 0);

    res.json({
      analyses,
      summary: {
        totalFiles: analyses.length,
        totalOriginalSize: totalOriginal,
        totalOriginalFormatted: formatBytes(totalOriginal),
        estimatedSavings: totalEstimatedSavings,
        estimatedSavingsFormatted: formatBytes(totalEstimatedSavings),
        estimatedSavingsPercent: totalOriginal > 0
          ? Math.round((totalEstimatedSavings / totalOriginal) * 100)
          : 0,
      },
    });
  } catch (error) {
    console.error('Analyze error:', error);
    res.status(500).json({ message: 'Analysis failed: ' + error.message });
  }
});

// POST /api/optimize/download — optimize and return as zip
router.post('/download', auth, upload.array('files', 100), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No files provided' });
    }

    const includeAll = req.body.includeAllFormats === 'true';
    const { results, summary } = await bulkOptimize(req.files);

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename=optimized-images.zip');

    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.pipe(res);

    for (const result of results) {
      if (result.error || !result._buffers) continue;

      const baseName = result.fileName.replace(/\.[^/.]+$/, '');

      if (includeAll) {
        // Include all format variants
        for (const [fmt, buffer] of Object.entries(result._buffers)) {
          archive.append(buffer, { name: `${baseName}.${fmt}` });
        }
      } else {
        // Include only the best variant
        if (result._bestBuffer) {
          archive.append(result._bestBuffer, {
            name: `${baseName}.${result.best?.format || 'webp'}`,
          });
        }
      }
    }

    // Add a summary.json
    archive.append(
      JSON.stringify(
        {
          summary,
          files: results.map((r) => ({
            fileName: r.fileName,
            originalSize: r.originalSize,
            bestFormat: r.best?.format,
            bestSize: r.best?.size,
            savingsPercent: r.best?.savingsPercent,
          })),
        },
        null,
        2
      ),
      { name: 'optimization-report.json' }
    );

    await archive.finalize();
  } catch (error) {
    console.error('Download error:', error);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Download failed: ' + error.message });
    }
  }
});

// Public API — no auth needed but rate-limited in production
// POST /api/optimize/api — developer API endpoint
router.post('/api', upload.array('files', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No files provided' });
    }

    const { results, summary } = await bulkOptimize(req.files);

    const responseResults = results.map((r) => {
      if (r.error) return { fileName: r.fileName, error: r.error };

      const bestBase64 = r._bestBuffer?.toString('base64');
      const snippets = generateSnippets(r, '');

      return {
        fileName: r.fileName,
        originalSize: r.originalSize,
        optimized: {
          format: r.best?.format,
          size: r.best?.size,
          savingsPercent: r.best?.savingsPercent,
          base64: bestBase64,
          mimeType: r.best?.mimeType,
        },
        analysis: {
          isPhoto: r.analysis?.isPhoto,
          hasAlpha: r.analysis?.hasAlpha,
          width: r.analysis?.width,
          height: r.analysis?.height,
        },
        snippets,
      };
    });

    res.json({ results: responseResults, summary });
  } catch (error) {
    res.status(500).json({ message: 'API optimization failed: ' + error.message });
  }
});

// POST /api/optimize/upload-single — optimize and upload ONE file to user's Cloudinary
router.post('/upload-single', auth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ status: 'failed', message: 'No file provided' });
    }

    const CloudinaryCredential = require('../models/CloudinaryCredential');
    const UploadHistory = require('../models/UploadHistory');
    const { decrypt } = require('../utils/encryption');
    const cloudinary = require('cloudinary').v2;

    const cred = await CloudinaryCredential.findOne({ userId: req.user._id });
    if (!cred) {
      return res.status(400).json({ status: 'failed', message: 'Please connect your Cloudinary account first' });
    }

    cloudinary.config({
      cloud_name: cred.cloudName,
      api_key: cred.apiKey,
      api_secret: decrypt(cred.apiSecret),
    });

    const folder = req.body.folder || '';
    const fileName = req.file.originalname || 'image';

    // Optimize the single image
    const result = await optimizeImage(req.file.buffer, fileName);
    const baseName = fileName.replace(/\.[^/.]+$/, '');
    const buffer = result._bestBuffer || req.file.buffer;
    const format = result.best?.format || 'webp';

    // Upload to Cloudinary with retry
    let cloudResult;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        cloudResult = await new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            {
              folder: folder || undefined,
              public_id: baseName,
              resource_type: 'image',
              format: format,
            },
            (err, result) => {
              if (err) reject(err);
              else resolve(result);
            }
          );
          stream.end(buffer);
        });
        break;
      } catch (err) {
        console.error(`Upload attempt ${attempt + 1} failed for ${fileName}:`, err.message);
        if (attempt === 2) {
          return res.status(500).json({ fileName, status: 'failed', error: err.message });
        }
        await new Promise((r) => setTimeout(r, 600));
      }
    }

    // Save to history
    try {
      await UploadHistory.create({
        userId: req.user._id,
        fileName: `${baseName}.${format}`,
        publicId: cloudResult.public_id,
        url: cloudResult.url,
        secureUrl: cloudResult.secure_url,
        folder,
        format: cloudResult.format,
        bytes: cloudResult.bytes,
        width: cloudResult.width,
        height: cloudResult.height,
        resourceType: cloudResult.resource_type,
        status: 'success',
      });
    } catch (dbErr) {
      console.error('DB save error:', dbErr);
    }

    res.json({
      fileName,
      status: 'success',
      optimizedFormat: format,
      originalSize: result.originalSize,
      optimizedSize: result.best?.size,
      savingsPercent: result.best?.savingsPercent,
      url: cloudResult.secure_url,
      publicId: cloudResult.public_id,
    });
  } catch (error) {
    console.error('Single optimize+upload error:', error);
    res.status(500).json({ fileName: req.file?.originalname || 'unknown', status: 'failed', error: error.message });
  }
});

module.exports = router;
