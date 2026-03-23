const sharp = require('sharp');
const path = require('path');

/**
 * Smart Auto-Optimization Engine
 * Analyzes images and produces optimized variants in AVIF and WebP only.
 * SVG inputs are kept as-is (special case).
 */

// Quality presets — only modern formats
const QUALITY = {
  avif: { quality: 50, effort: 4 },   // AVIF: aggressive compression, balanced speed
  webp: { quality: 75, effort: 4 },   // WebP: good balance of quality & size
};

/**
 * Analyze an image buffer to determine its characteristics
 */
async function analyzeImage(buffer) {
  const meta = await sharp(buffer).metadata();
  const stats = await sharp(buffer).stats();

  const channels = stats.channels || [];
  const isTransparent = meta.hasAlpha;

  // Estimate color complexity from channel standard deviations
  const avgStdDev = channels.reduce((sum, ch) => sum + (ch.stdev || 0), 0) / (channels.length || 1);

  // High stddev = lots of color variation = photo
  const isPhoto = avgStdDev > 40;
  const isSmall = buffer.length < 10 * 1024; // Under 10KB
  const isSvg = meta.format === 'svg';

  return {
    width: meta.width,
    height: meta.height,
    format: meta.format,
    hasAlpha: isTransparent,
    isPhoto,
    isSmall,
    isSvg,
    originalSize: buffer.length,
    channels: meta.channels,
    avgStdDev: Math.round(avgStdDev * 100) / 100,
    density: meta.density,
  };
}

/**
 * Determine the best optimization strategy for an image
 * ALWAYS outputs AVIF + WebP. Never JPEG or PNG.
 * SVG is special — kept as-is.
 */
function getStrategy(analysis) {
  if (analysis.isSvg) {
    return {
      strategy: 'svg',
      reason: 'SVG detected — vector format, keeping as SVG',
      formats: ['original'],
    };
  }

  if (analysis.isSmall) {
    return {
      strategy: 'keep',
      reason: 'Image is already small (<10KB), optimization overhead not worth it',
      formats: ['original'],
    };
  }

  if (analysis.isPhoto) {
    return {
      strategy: 'photo',
      reason: 'Detected as photo (high color complexity) — AVIF gives best compression, WebP as fallback',
      formats: ['avif', 'webp'],
      bestFormat: 'avif',
    };
  }

  // Graphic / illustration / logo
  if (analysis.hasAlpha) {
    return {
      strategy: 'graphic-alpha',
      reason: 'Graphic with transparency — both AVIF & WebP preserve alpha with great compression',
      formats: ['avif', 'webp'],
      bestFormat: 'webp',
    };
  }

  return {
    strategy: 'graphic',
    reason: 'Detected as graphic/illustration — AVIF & WebP both excel here',
    formats: ['avif', 'webp'],
    bestFormat: 'avif',
  };
}

/**
 * Generate an optimized variant in AVIF or WebP
 */
async function generateVariant(buffer, format, analysis) {
  let pipeline = sharp(buffer).rotate(); // auto-rotate based on EXIF

  // Resize if extremely large (>4K)
  if (analysis.width > 3840 || analysis.height > 3840) {
    pipeline = pipeline.resize(3840, 3840, { fit: 'inside', withoutEnlargement: true });
  }

  switch (format) {
    case 'avif':
      return pipeline.avif(QUALITY.avif).toBuffer();
    case 'webp':
      return pipeline.webp(QUALITY.webp).toBuffer();
    default:
      return buffer;
  }
}

/**
 * Full optimization pipeline for a single image
 */
async function optimizeImage(buffer, fileName) {
  const analysis = await analyzeImage(buffer);
  const strategy = getStrategy(analysis);

  // If SVG or too small, skip
  if (strategy.strategy === 'keep' || strategy.strategy === 'svg') {
    return {
      fileName,
      analysis,
      strategy,
      variants: [],
      best: {
        format: analysis.format,
        buffer,
        size: buffer.length,
        savings: 0,
        savingsPercent: 0,
      },
      originalSize: buffer.length,
    };
  }

  // Generate AVIF + WebP variants in parallel
  const variantPromises = strategy.formats.map(async (fmt) => {
    try {
      const start = Date.now();
      const optimizedBuffer = await generateVariant(buffer, fmt, analysis);
      const duration = Date.now() - start;

      return {
        format: fmt,
        buffer: optimizedBuffer,
        size: optimizedBuffer.length,
        savings: buffer.length - optimizedBuffer.length,
        savingsPercent: Math.round(((buffer.length - optimizedBuffer.length) / buffer.length) * 100),
        duration,
        mimeType: getMimeType(fmt),
      };
    } catch (err) {
      return {
        format: fmt,
        error: err.message,
        size: buffer.length,
        savings: 0,
        savingsPercent: 0,
      };
    }
  });

  const variants = await Promise.all(variantPromises);

  // Find the best (smallest) variant — will always be AVIF or WebP
  const validVariants = variants.filter((v) => !v.error && v.size < buffer.length);
  const best = validVariants.length > 0
    ? validVariants.reduce((a, b) => (a.size < b.size ? a : b))
    : { format: 'webp', buffer, size: buffer.length, savings: 0, savingsPercent: 0 };

  return {
    fileName,
    analysis,
    strategy,
    variants: variants.map(({ buffer: _b, ...rest }) => rest),
    best: {
      format: best.format,
      size: best.size,
      savings: best.savings,
      savingsPercent: best.savingsPercent,
      mimeType: best.mimeType || getMimeType(best.format),
    },
    _buffers: Object.fromEntries(variants.filter((v) => v.buffer).map((v) => [v.format, v.buffer])),
    _bestBuffer: best.buffer || buffer,
    originalSize: buffer.length,
  };
}

/**
 * Bulk optimize multiple images
 */
async function bulkOptimize(files) {
  const results = await Promise.all(
    files.map(async (file) => {
      try {
        return await optimizeImage(file.buffer, file.originalname || file.name);
      } catch (err) {
        return {
          fileName: file.originalname || file.name,
          error: err.message,
          originalSize: file.buffer?.length || 0,
        };
      }
    })
  );

  const totalOriginal = results.reduce((sum, r) => sum + (r.originalSize || 0), 0);
  const totalOptimized = results.reduce((sum, r) => sum + (r.best?.size || r.originalSize || 0), 0);
  const totalSavings = totalOriginal - totalOptimized;
  const savingsPercent = totalOriginal > 0 ? Math.round((totalSavings / totalOriginal) * 100) : 0;

  return {
    results,
    summary: {
      totalFiles: results.length,
      totalOriginalSize: totalOriginal,
      totalOptimizedSize: totalOptimized,
      totalSavings,
      savingsPercent,
      totalOriginalFormatted: formatBytes(totalOriginal),
      totalOptimizedFormatted: formatBytes(totalOptimized),
      totalSavingsFormatted: formatBytes(totalSavings),
    },
  };
}

/**
 * Generate HTML/JSX code snippets for optimized images
 */
function generateSnippets(result, baseUrl = '') {
  const name = result.fileName.replace(/\.[^/.]+$/, '');
  const bestFmt = result.best?.format || 'webp';

  // HTML <picture> tag — AVIF source + WebP fallback (no JPEG/PNG)
  const html = `<picture>
  <source srcset="${baseUrl}/${name}.avif" type="image/avif">
  <source srcset="${baseUrl}/${name}.webp" type="image/webp">
  <img src="${baseUrl}/${name}.webp" alt="${name}" width="${result.analysis?.width}" height="${result.analysis?.height}" loading="lazy" />
</picture>`;

  // Next.js Image
  const nextjs = `<Image
  src="${baseUrl}/${name}.${bestFmt}"
  alt="${name}"
  width={${result.analysis?.width || 'auto'}}
  height={${result.analysis?.height || 'auto'}}
  quality={80}
  placeholder="blur"
/>`;

  // CSS background with image-set
  const css = `.${name.replace(/[^a-zA-Z0-9]/g, '-')} {
  background-image: url("${baseUrl}/${name}.webp");
  background-image: image-set(
    url("${baseUrl}/${name}.avif") type("image/avif"),
    url("${baseUrl}/${name}.webp") type("image/webp")
  );
}`;

  return { html, nextjs, css };
}

function getMimeType(format) {
  const map = {
    avif: 'image/avif',
    webp: 'image/webp',
    jpeg: 'image/jpeg',
    jpg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    svg: 'image/svg+xml',
  };
  return map[format] || 'application/octet-stream';
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

module.exports = {
  analyzeImage,
  getStrategy,
  optimizeImage,
  bulkOptimize,
  generateSnippets,
  formatBytes,
};
