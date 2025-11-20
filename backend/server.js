import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import JSZip from 'jszip';
import { jsPDF } from 'jspdf';
import axios from 'axios';
import Replicate from 'replicate';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.API_KEY;
const RATE_LIMIT_WINDOW = 15 * 60 * 1000;
const RATE_LIMIT_MAX = 120;

const DATA_DIR = process.env.DATA_DIR || '/data';
const DIRS = {
  uploads: path.join(DATA_DIR, 'uploads'),
  mockups: path.join(DATA_DIR, 'mockups'),
  output: path.join(DATA_DIR, 'output'),
  temp: path.join(DATA_DIR, 'temp')
};

Object.values(DIRS).forEach(dir => {
  try {
    fs.mkdirSync(dir, { recursive: true });
  } catch (error) {
    console.log(`Directory ${dir} already exists or created`);
  }
});

const allowedOrigins = (process.env.CORS_ORIGINS || '*').split(',').map(o => o.trim()).filter(Boolean);
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      return callback(null, origin || '*');
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'build')));

const rateBuckets = new Map();
const rateLimit = (max = RATE_LIMIT_MAX, windowMs = RATE_LIMIT_WINDOW) => (req, res, next) => {
  const key = req.headers['x-forwarded-for'] || req.ip || 'global';
  const now = Date.now();
  const bucket = rateBuckets.get(key) || { count: 0, start: now };

  if (now - bucket.start > windowMs) {
    bucket.count = 0;
    bucket.start = now;
  }

  bucket.count += 1;
  rateBuckets.set(key, bucket);

  if (bucket.count > max) {
    return res.status(429).json({ error: 'Rate limit exceeded. Please slow down.' });
  }

  next();
};

const heavyProcessLimiter = rateLimit(40, 30 * 60 * 1000);
const burstLimiter = rateLimit(10, 5 * 60 * 1000);

const authenticate = (req, res, next) => {
  if (!API_KEY) {
    return res.status(500).json({ error: 'Server authentication key not configured' });
  }

  const headerKey = req.headers['x-api-key'] || (req.headers.authorization || '').replace('Bearer ', '');
  if (headerKey !== API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  next();
};

app.use('/api', authenticate, rateLimit());

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, DIRS.uploads),
    filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
  }),
  limits: { fileSize: 25 * 1024 * 1024 }
});

const safeFilename = (name) => {
  return name.toLowerCase()
    .replace(/[^a-z0-9.-]/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 50) || 'file';
};

const cleanup = (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    console.error('Cleanup error:', error);
  }
};

// PSD processor module wrapper
const createPSDProcessor = () => {
  const scriptPath = path.join(__dirname, 'psd_processor', 'main.py');
  if (!fs.existsSync(scriptPath)) {
    throw new Error('PSD processor module is missing');
  }
  return scriptPath;
};

// Initialize enhanced PSD processor
let psdProcessorPath;
try {
  psdProcessorPath = createPSDProcessor();
  console.log('✓ Enhanced PSD processor script created');
} catch (error) {
  console.error('✗ Failed to create PSD processor:', error);
}

const runPythonProcessor = (mockupData, artworkData, filename) => {
  return new Promise((resolve, reject) => {
    const python = spawn('python3', [psdProcessorPath]);

    let stdout = '';
    let stderr = '';

    python.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    python.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    const timeout = setTimeout(() => {
      python.kill('SIGKILL');
      reject(new Error('Python processor timed out'));
    }, 30000);

    python.on('close', (code) => {
      clearTimeout(timeout);
      if (code === 0) {
        try {
          const result = JSON.parse(stdout.trim());
          resolve(result);
        } catch (parseError) {
          reject(new Error(`Failed to parse Python output: ${parseError.message}`));
        }
      } else {
        reject(new Error(`Python process failed with code ${code}. Error: ${stderr}`));
      }
    });

    python.on('error', (error) => {
      reject(new Error(`Python process error: ${error.message}`));
    });

    // Send input data
    const inputData = {
      mockup: mockupData,
      artwork: artworkData,
      filename: filename || 'unknown'
    };

    python.stdin.write(JSON.stringify(inputData));
    python.stdin.end();
  });
};

// Enhanced Sharp-based fallback with better processing
const sharpFallbackProcessor = async (mockupData, artworkData, filename) => {
  try {
    console.log(`🔧 Processing with Sharp fallback: ${filename}`);

    // Decode base64 data
    const mockupBuffer = Buffer.from(mockupData.includes(',') ? mockupData.split(',')[1] : mockupData, 'base64');
    const artworkBuffer = Buffer.from(artworkData.includes(',') ? artworkData.split(',')[1] : artworkData, 'base64');

    // Get mockup metadata
    const mockupImage = sharp(mockupBuffer);
    const { width: mockupWidth, height: mockupHeight } = await mockupImage.metadata();

    // Calculate artwork dimensions (70% of mockup size for realistic placement)
    const artworkWidth = Math.round(mockupWidth * 0.7);
    const artworkHeight = Math.round(mockupHeight * 0.7);

    // Resize artwork using same logic as working PSD processor
    const artworkMeta = await sharp(artworkBuffer).metadata();
    const artworkRatio = artworkMeta.width / artworkMeta.height;
    const targetRatio = artworkWidth / artworkHeight;

    let resizeWidth, resizeHeight, cropLeft = 0, cropTop = 0;

    if (artworkRatio > targetRatio) {
      // Artwork is wider, fit to height and crop width
      resizeHeight = artworkHeight;
      resizeWidth = Math.round(artworkHeight * artworkRatio);
      cropLeft = Math.round((resizeWidth - artworkWidth) / 2);
    } else {
      // Artwork is taller, fit to width and crop height
      resizeWidth = artworkWidth;
      resizeHeight = Math.round(artworkWidth / artworkRatio);
      cropTop = Math.round((resizeHeight - artworkHeight) / 2);
    }

    // Process artwork
    const processedArtwork = await sharp(artworkBuffer)
      .resize(resizeWidth, resizeHeight, {
        fit: 'fill',
        kernel: sharp.kernel.lanczos3
      })
      .extract({
        left: cropLeft,
        top: cropTop,
        width: artworkWidth,
        height: artworkHeight
      })
      .png()
      .toBuffer();

    // Calculate position to center artwork
    const left = Math.round((mockupWidth - artworkWidth) / 2);
    const top = Math.round((mockupHeight - artworkHeight) / 2);

    // Composite artwork onto mockup
    const result = await mockupImage
      .composite([{
        input: processedArtwork,
        left: left,
        top: top,
        blend: 'over'
      }])
      .withMetadata({ density: 300 })
      .jpeg({ quality: 90, mozjpeg: true })
      .toBuffer();

    return {
      success: true,
      result: result.toString('base64'),
      method: 'enhanced_sharp_fallback',
      size: {
        width: mockupWidth,
        height: mockupHeight
      }
    };

  } catch (error) {
    throw new Error(`Enhanced Sharp fallback failed: ${error.message}`);
  }
};

app.get('/api/mockups', (req, res) => {
  try {
    const files = fs.readdirSync(DIRS.mockups)
      .filter(f => f.includes('__'))
      .map(f => {
        const [id, ...nameParts] = f.split('__');
        return { id, name: nameParts.join('__'), filename: f };
      });
    res.json(files);
  } catch (error) {
    res.status(500).json({ error: 'Failed to read mockups directory' });
  }
});

app.post('/api/save-mockups', upload.array('mockups', 20), (req, res) => {
  try {
    const saved = [];
    for (const file of req.files || []) {
      const id = uuidv4();
      const name = safeFilename(file.originalname);
      const target = path.join(DIRS.mockups, `${id}__${name}`);
      fs.copyFileSync(file.path, target);
      cleanup(file.path);
      saved.push({ id, name });
    }
    res.json({ success: true, saved });
  } catch (error) {
    res.status(500).json({ error: 'Save failed' });
  }
});

app.get('/api/mockup/:id', (req, res) => {
  try {
    const file = fs.readdirSync(DIRS.mockups)
      .find(f => f.startsWith(`${req.params.id}__`));
    if (!file) return res.status(404).json({ error: 'Not found' });
    res.sendFile(path.join(DIRS.mockups, file));
  } catch (error) {
    res.status(500).json({ error: 'Retrieval failed' });
  }
});

// ENHANCED PSD processing endpoint with YOUR WORKING LOGIC INTEGRATED
app.post('/api/process-psd', burstLimiter, async (req, res) => {
  const startTime = Date.now();
  console.log('🎨 Starting enhanced mockup processing...');

  try {
    const { psd_file, artwork_file, filename } = req.body;

    if (!psd_file || !artwork_file) {
      return res.status(400).json({
        error: 'Missing required files',
        details: 'Both psd_file and artwork_file are required'
      });
    }

    console.log(`📄 Processing file: ${filename || 'unknown'}`);

    let result;
    let processingErrors = [];

    // Try Enhanced Python processor first (with YOUR working logic)
    if (psdProcessorPath && fs.existsSync(psdProcessorPath)) {
      try {
        console.log('🐍 Attempting Enhanced Python PSD processing...');
        result = await runPythonProcessor(psd_file, artwork_file, filename);
        console.log(`✓ Enhanced Python processing succeeded with method: ${result.method}`);
      } catch (pythonError) {
        console.log(`✗ Enhanced Python processing failed: ${pythonError.message}`);
        processingErrors.push(`Enhanced Python: ${pythonError.message}`);
      }
    } else {
      console.log('⚠️ Enhanced Python processor not available');
      processingErrors.push('Enhanced Python processor not initialized');
    }

    // Fallback to Enhanced Sharp if Python failed
    if (!result || !result.success) {
      try {
        console.log('🔧 Attempting Enhanced Sharp fallback processing...');
        result = await sharpFallbackProcessor(psd_file, artwork_file, filename);
        console.log(`✓ Enhanced Sharp processing succeeded with method: ${result.method}`);
      } catch (sharpError) {
        console.log(`✗ Enhanced Sharp processing failed: ${sharpError.message}`);
        processingErrors.push(`Enhanced Sharp: ${sharpError.message}`);

        return res.status(500).json({
          error: 'All enhanced processing methods failed',
          details: processingErrors.join('; '),
          filename: filename
        });
      }
    }

    if (!result || !result.success || !result.result) {
      return res.status(500).json({
        error: 'Enhanced processing failed to produce valid result',
        details: processingErrors.join('; '),
        filename: filename
      });
    }

    // Convert base64 result to buffer and send
    const imageBuffer = Buffer.from(result.result, 'base64');

    const processingTime = Date.now() - startTime;
    console.log(`✓ Enhanced processing completed in ${processingTime}ms using ${result.method}`);

    res.set({
      'Content-Type': 'image/jpeg',
      'X-Processing-Method': result.method,
      'X-Processing-Time': processingTime.toString(),
      'X-Image-Dimensions': `${result.size?.width || 'unknown'}x${result.size?.height || 'unknown'}`,
      'X-Enhanced-Version': 'true'
    });

    res.send(imageBuffer);

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error(`✗ Enhanced processing failed after ${processingTime}ms:`, error);

    res.status(500).json({
      error: 'Enhanced processing failed',
      details: error.message,
      filename: req.body.filename,
      processingTime
    });
  }
});

app.post('/api/create-zip', upload.array('images', 50), async (req, res) => {
  try {
    const zip = new JSZip();
    for (const file of req.files || []) {
      const buffer = fs.readFileSync(file.path);
      zip.file(file.originalname, buffer);
      cleanup(file.path);
    }
    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
    res.set('Content-Type', 'application/zip');
    res.set('Content-Disposition', 'attachment; filename=processed.zip');
    res.send(zipBuffer);
  } catch (error) {
    res.status(500).json({ error: 'ZIP creation failed' });
  }
});

app.post('/api/package-artwork', upload.single('image'), async (req, res) => {
  try {
    const { path: filePath } = req.file;
    const baseName = safeFilename(path.parse(req.file.originalname).name);

    const fourK = await sharp(filePath)
      .resize(3840, 2160, { fit: 'cover' })
      .withMetadata({ density: 300 })
      .png()
      .toBuffer();

    const doc = new jsPDF();
    doc.setFillColor(59, 130, 246);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.text('AURELIA STUDIO', 105, 20, { align: 'center' });
    doc.setFontSize(12);
    doc.text(`Installation Guide - ${baseName}`, 105, 30, { align: 'center' });
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.text("What's Included:", 20, 60);
    doc.setFontSize(11);
    doc.text(`• 1 High-Resolution JPG file - ${baseName}_4K.png (3840 x 2160 px, 16:9 ratio)`, 20, 75);
    doc.text('  Perfectly sized for The Frame TV and other 4K displays', 25, 83);

    doc.setFontSize(14);
    doc.text('How to Download Your Files:', 20, 100);
    doc.setFontSize(11);
    doc.text('If signed in to Etsy:', 20, 112);
    doc.text('1. Go to your Etsy account > Purchases and Reviews', 25, 120);
    doc.text('2. Find your order and click Download Files', 25, 128);
    doc.text('If you purchased as a guest:', 20, 143);
    doc.text('1. Check your order confirmation email from Etsy', 25, 151);
    doc.text('2. Click the download link in that email to access your files', 25, 159);

    doc.setFontSize(14);
    doc.text('How to Display on The Frame TV:', 20, 176);
    doc.setFontSize(11);
    doc.text('1. Open the SmartThings app and go to Devices > "Add Device" or press "+"', 25, 188);
    doc.text('   > "Add device"', 25, 196);
    doc.text('2. Connect your TV (scan for nearby devices for easiest setup)', 25, 204);
    doc.text('3. Once connected, select Art Mode', 25, 212);
    doc.text('4. Tap Add Your Photos (+) > choose the image > Save on The Frame', 25, 220);
    doc.text('5. To make a slideshow, select Slideshow when viewing your chosen photos', 25, 228);

    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

    const zip = new JSZip();
    zip.file(`${baseName}_4K.png`, fourK);
    zip.file(`Installation_Guide_${baseName}.pdf`, pdfBuffer);

    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
    cleanup(filePath);

    res.set('Content-Type', 'application/zip');
    res.set('Content-Disposition', `attachment; filename=${baseName}-package.zip`);
    res.send(zipBuffer);
  } catch (error) {
    cleanup(req.file?.path);
    res.status(500).json({ error: 'Package creation failed' });
  }
});

app.post('/api/generate', heavyProcessLimiter, async (req, res) => {
  console.log('🎨 AI Generation request received');

  try {
    // Extract ALL parameters from request body
    const {
      prompt,
      aspect_ratio = '1:1',
      size = 'regular',
      guidance_scale = 3.5,
      seed
    } = req.body;

    // Validate prompt
    if (!prompt?.trim()) {
      console.log('❌ No prompt provided');
      return res.status(400).json({ error: 'Prompt required' });
    }

    console.log(`🎯 Processing prompt: "${prompt.trim()}"`);
    console.log(`📐 Parameters: ${aspect_ratio}, ${size}, guidance: ${guidance_scale}`);

    // Check for API token
    const token = process.env.REPLICATE_API_TOKEN;
    if (!token) {
      console.log('❌ REPLICATE_API_TOKEN not configured');
      return res.status(500).json({
        error: 'Replicate API token not configured',
        details: 'Please set REPLICATE_API_TOKEN environment variable'
      });
    }

    console.log('✅ API token found, initializing Replicate...');

    // Initialize Replicate
    const replicate = new Replicate({ auth: token });

    // Try the generation with detailed logging
    console.log('🚀 Starting image generation with SeedreamS-3...');

    try {
      // Prepare input parameters - USE FRONTEND VALUES!
      const inputParams = {
        prompt: prompt.trim(),
        aspect_ratio: aspect_ratio,     // Use frontend value
        size: size,                     // Use frontend value
        guidance_scale: guidance_scale  // Use frontend value
      };

      // Add seed if provided or use random
      if (seed !== undefined && seed !== null) {
        inputParams.seed = seed;
      } else {
        inputParams.seed = Math.floor(Math.random() * 1000000);
      }

      console.log('📋 Input parameters:', inputParams);

      // Use bytedance/seedream-3 with frontend parameters
      const output = await replicate.run("bytedance/seedream-3", {
        input: inputParams
      });

      console.log('✅ Replicate API call successful');
      console.log('📦 Output type:', typeof output);
      console.log('📦 Output:', Array.isArray(output) ? `Array with ${output.length} items` : output);

      // Handle different output formats
      let imageUrl;
      if (Array.isArray(output)) {
        imageUrl = output[0];
      } else if (typeof output === 'string') {
        imageUrl = output;
      } else if (output && output.output) {
        imageUrl = Array.isArray(output.output) ? output.output[0] : output.output;
      } else {
        throw new Error('Unexpected output format from Replicate');
      }

      if (!imageUrl) {
        throw new Error('No image URL received from Replicate');
      }

      console.log('🖼️ Image URL received:', imageUrl);

      const result = {
        imageUrl: imageUrl,
        prompt: prompt.trim(),
        timestamp: new Date().toISOString(),
        model: 'seedream-3',
        parameters: {
          aspect_ratio: aspect_ratio,
          size: size,
          guidance_scale: guidance_scale,
          seed: inputParams.seed
        },
        success: true
      };

      console.log('✅ Generation completed successfully');
      res.json(result);

    } catch (replicateError) {
      console.error('❌ Replicate API Error:', replicateError);
      console.error('Error details:', {
        message: replicateError.message,
        status: replicateError.status,
        response: replicateError.response
      });

      // Try fallback with different parameters if SeedreamS-3 fails
      if (replicateError.message?.includes('not found') || replicateError.status === 404) {
        console.log('🔄 Trying SeedreamS-3 with fallback parameters...');

        try {
          // Use same user parameters but with fallback adjustments
          const fallbackParams = {
            prompt: prompt.trim(),
            aspect_ratio: aspect_ratio,    // Keep user's choice
            size: size === 'big' ? 'regular' : size,  // Downgrade size if big fails
            guidance_scale: guidance_scale,
            seed: Math.floor(Math.random() * 1000000)  // New random seed
          };

          console.log('📋 Fallback parameters:', fallbackParams);

          const fallbackOutput = await replicate.run("bytedance/seedream-3", {
            input: fallbackParams
          });

          const fallbackImageUrl = Array.isArray(fallbackOutput) ? fallbackOutput[0] : fallbackOutput;

          console.log('✅ Fallback generation successful');

          res.json({
            imageUrl: fallbackImageUrl,
            prompt: prompt.trim(),
            timestamp: new Date().toISOString(),
            model: 'seedream-3-fallback',
            parameters: fallbackParams,
            success: true
          });

        } catch (fallbackError) {
          console.error('❌ Fallback also failed:', fallbackError);
          throw replicateError; // Throw original error
        }
      } else {
        throw replicateError;
      }
    }

  } catch (error) {
    console.error('❌ Generation failed:', error);

    // Determine error type and status code
    let statusCode = 500;
    let errorMessage = 'Image generation failed';
    let errorDetails = error.message;

    if (error.message?.includes('auth') || error.message?.includes('token')) {
      statusCode = 401;
      errorMessage = 'Authentication failed';
      errorDetails = 'Invalid or missing Replicate API token';
    } else if (error.message?.includes('not found')) {
      statusCode = 404;
      errorMessage = 'Model not found';
      errorDetails = 'The SeedreamS-3 model is not available';
    } else if (error.message?.includes('rate limit')) {
      statusCode = 429;
      errorMessage = 'Rate limit exceeded';
      errorDetails = 'Too many requests. Please wait and try again.';
    } else if (error.message?.includes('insufficient credits')) {
      statusCode = 402;
      errorMessage = 'Insufficient credits';
      errorDetails = 'Not enough Replicate credits to generate image';
    }

    res.status(statusCode).json({
      error: errorMessage,
      details: errorDetails,
      timestamp: new Date().toISOString(),
      success: false
    });
  }
});

// Python script to add DPI metadata using PIL
const createDPIProcessorScript = () => {
  return `
import sys
import json
import base64
from PIL import Image
import io

try:
    input_data = json.loads(sys.stdin.read())
    image_b64 = input_data['image']

    # Decode base64
    if ',' in image_b64:
        image_b64 = image_b64.split(',')[1]
    image_data = base64.b64decode(image_b64)

    # Open image with PIL
    img = Image.open(io.BytesIO(image_data))

    # Convert to RGB if needed
    if img.mode in ('RGBA', 'LA', 'P'):
        if img.mode == 'RGBA' or img.mode == 'LA':
            # Create white background
            background = Image.new('RGB', img.size, (255, 255, 255))
            if img.mode == 'RGBA':
                background.paste(img, mask=img.split()[-1])
            else:
                background.paste(img)
            img = background
        else:
            img = img.convert('RGB')
    elif img.mode != 'RGB':
        img = img.convert('RGB')

    # Save with 300 DPI
    output = io.BytesIO()
    img.save(output, format='JPEG', quality=95, optimize=True, dpi=(300, 300))

    # Return base64 result
    result = base64.b64encode(output.getvalue()).decode('utf-8')
    print(json.dumps({'success': True, 'image': result}))

except Exception as e:
    print(json.dumps({'success': False, 'error': str(e)}))
    sys.exit(1)
`;
};

// Download proxy endpoint to add 300 DPI metadata to images
app.post('/api/download-with-dpi', async (req, res) => {
  try {
    const { imageUrl, filename } = req.body;

    if (!imageUrl) {
      return res.status(400).json({ error: 'Image URL required' });
    }

    console.log(`📥 Downloading and processing image with 300 DPI: ${imageUrl}`);

    // Fetch the image from the URL
    const imageResponse = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      timeout: 30000
    });

    const imageBuffer = Buffer.from(imageResponse.data);
    const imageB64 = imageBuffer.toString('base64');

    // Use Python PIL to set DPI (most reliable method)
    const python = spawn('python3', ['-c', createDPIProcessorScript()]);

    let stdout = '';
    let stderr = '';

    python.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    python.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    python.on('close', (code) => {
      if (code === 0) {
        try {
          const result = JSON.parse(stdout.trim());
          if (result.success) {
            const processedBuffer = Buffer.from(result.image, 'base64');

            // Set appropriate headers
            const safeFileName = filename ? safeFilename(filename) : 'artwork.jpg';
            res.set({
              'Content-Type': 'image/jpeg',
              'Content-Disposition': `attachment; filename="${safeFileName}"`,
              'X-DPI-Processing': 'true',
              'X-DPI-Value': '300'
            });

            res.send(processedBuffer);
            console.log(`✅ Image processed and sent with 300 DPI: ${safeFileName}`);
          } else {
            console.error('❌ Python processing failed:', result.error);
            res.status(500).json({ error: 'Image processing failed', details: result.error });
          }
        } catch (parseError) {
          console.error('❌ Failed to parse Python output:', parseError);
          res.status(500).json({ error: 'Processing output parse failed' });
        }
      } else {
        console.error('❌ Python process failed:', stderr);
        res.status(500).json({ error: 'Python process failed', details: stderr });
      }
    });

    // Send input to Python
    python.stdin.write(JSON.stringify({ image: imageB64 }));
    python.stdin.end();

  } catch (error) {
    console.error('❌ Download proxy failed:', error.message);
    res.status(500).json({
      error: 'Failed to process image',
      details: error.message
    });
  }
});

app.post('/api/listing-from-image', upload.single('image'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'No image provided' });

    const baseName = safeFilename(path.parse(file.originalname).name);
    const key = process.env.ANTHROPIC_API_KEY;

    // Detect image dimensions and aspect ratio
    let imageMetadata = null;
    let artworkType = 'digital'; // default
    try {
      imageMetadata = await sharp(file.path).metadata();
      const width = imageMetadata.width;
      const height = imageMetadata.height;
      const aspectRatio = width / height;

      console.log(`📐 Image dimensions: ${width}x${height}, aspect ratio: ${aspectRatio.toFixed(2)}`);

      // Determine artwork type based on aspect ratio
      // 16:9 = 1.778, 3:4 = 0.75 (used for wall art, close to 4:5 = 0.8 / 16x20")
      if (aspectRatio >= 1.6 && aspectRatio <= 1.9) {
        artworkType = 'tv'; // 16:9 for TV artwork
        console.log('🖼️ Detected TV Artwork (16:9)');
      } else if (aspectRatio >= 0.75 && aspectRatio <= 0.85) {
        artworkType = 'wall'; // 3:4 for wall artwork (closest to 16x20" which is 4:5)
        console.log('🖼️ Detected Wall Artwork (3:4 aspect ratio, suitable for 16x20" prints)');
      } else if (aspectRatio < 1) {
        artworkType = 'wall'; // Portrait orientation - default to wall art
        console.log('🖼️ Detected Portrait Wall Artwork');
      } else {
        artworkType = 'tv'; // Landscape orientation - default to TV art
        console.log('🖼️ Detected Landscape Digital Artwork');
      }
    } catch (metaError) {
      console.warn('⚠️ Could not read image metadata:', metaError.message);
    }

    if (key?.startsWith('sk-ant-')) {
      console.log('🔍 Using Claude API for image analysis...');
      try {
        let buffer = fs.readFileSync(file.path);
        if (fs.statSync(file.path).size > 5 * 1024 * 1024) {
          buffer = await sharp(file.path)
            .resize(1024, 1024, { fit: 'inside' })
            .jpeg({ quality: 80 })
            .toBuffer();
        }

        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': key,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json'
          },
          body: JSON.stringify({
            model: 'claude-haiku-4-5',
            max_tokens: 4000,
            messages: [{
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: `STEP 1: First, carefully examine the image I'm providing and describe in detail what you see:
- What is the main subject or scene depicted?
- What style is it (abstract, realistic, minimalist, etc.)?
- What colors are dominant?
- What mood or feeling does it convey?
- What elements, objects, or themes are present?
- Is it seasonal (Christmas, Halloween, etc.) or thematic?

STEP 2: Based on your detailed visual analysis above, create a comprehensive Etsy listing optimized for selling this specific artwork as ${artworkType === 'tv' ? 'Frame TV art and digital displays' : 'printable wall art (16x20") and digital downloads'}.

CRITICAL: The listing MUST be based on the ACTUAL CONTENT you see in the image. Do not create generic content. If you see a Christmas scene, mention Christmas. If you see flowers, mention flowers. Be specific and accurate.

IMPORTANT: This artwork will be sold as a DIGITAL DOWNLOAD for customers to ${artworkType === 'tv' ? 'display on Samsung Frame TV and other digital displays (16:9 aspect ratio)' : 'print at home or professionally (16x20" / 3:4 aspect ratio) or display digitally'}.

Create an Etsy-optimized listing with:

1. **title**: SEO-optimized title (max 140 characters) that describes what's actually in the image. ${artworkType === 'tv' ? 'Must include "Frame TV Art" and "Digital Download".' : 'Must include "Printable Wall Art", "16x20", and "Digital Download".'} Example: ${artworkType === 'tv' ? '"Christmas Winter Scene Frame TV Art Digital Download Festive Holiday Wall Decor"' : '"Christmas Winter Scene Printable Wall Art 16x20 Digital Download Holiday Decor"'}

2. **seoTitle**: Alternative SEO title variation based on the actual image content

3. **shortDescription**: Compelling 2-3 sentence description of what the customer sees in THIS specific artwork and its benefits

4. **description**: Full product description (4-6 paragraphs) including:
   - Eye-catching opening describing THIS SPECIFIC artwork and what it shows
   - What's included (file formats, sizes, resolution)
   - How to use it ${artworkType === 'tv' ? '(Frame TV, digital displays, 16:9 format)' : '(print at 16x20", frame and hang, or display digitally)'}
   - Benefits (instant download, high quality, versatile)
   - Perfect for (specific rooms, occasions based on the image theme, gift ideas)

5. **tags**: Array of exactly 13 Etsy tags based on what's ACTUALLY in the image. Include: ${artworkType === 'tv' ? '"frame tv art", "digital download"' : '"printable wall art", "16x20 print", "digital download"'}, and 11 tags describing the actual content, style, colors, and theme

6. **materials**: What the listing includes ${artworkType === 'tv' ? '(e.g., "Digital file - High-resolution JPG and PNG (16:9 aspect ratio for Frame TV)")' : '(e.g., "Digital file - High-resolution JPG and PNG (16x20 inches, 300 DPI)")'}

7. **suggestedPrice**: Price in USD based on artwork complexity and market value (typically ${artworkType === 'tv' ? '$4.99-$12.99 for TV digital art' : '$6.99-$19.99 for printable wall art'})

8. **shopSection**: Category based on actual content (e.g., "Christmas Art", "Botanical Art", "Abstract Art", "Seasonal Art")

9. **keywords**: Array of 10-15 SEO keywords that describe the ACTUAL image content

10. **targetAudience**: Who would buy THIS specific artwork (2-3 customer personas based on the theme)

11. **colors**: Main colors ACTUALLY visible in the artwork (array of 3-5 specific color names)

12. **style**: Primary style category that matches what you see

Return ONLY valid JSON with all these fields. No markdown, no explanation, just the JSON object. ENSURE all content is based on what you ACTUALLY SEE in the image.`
                },
                {
                  type: 'image',
                  source: {
                    type: 'base64',
                    media_type: 'image/jpeg',
                    data: buffer.toString('base64')
                  }
                }
              ]
            }]
          })
        });

        if (response.ok) {
          const result = await response.json();
          console.log('✅ Claude API response received');
          const text = result.content?.[0]?.text || '';
          console.log('📝 Response text length:', text.length);
          const match = text.match(/\{[\s\S]*\}/);
          if (match) {
            const listing = JSON.parse(match[0]);
            console.log('✅ Successfully parsed listing from Claude response');
            cleanup(file.path);
            return res.json(listing);
          } else {
            console.error('❌ No JSON found in Claude response. Response:', text.substring(0, 500));
          }
        } else {
          const errorBody = await response.text();
          console.error('❌ Claude API request failed:', response.status, errorBody);
        }
      } catch (error) {
        console.error('❌ Claude API error:', error.message);
        console.error('Error details:', error);
      }
    }

    // Enhanced fallback with better Etsy-optimized templates
    const styles = [
      { name: 'Modern Abstract', tags: ['abstract art', 'modern art', 'contemporary art'], section: 'Abstract Art' },
      { name: 'Botanical', tags: ['botanical art', 'plant art', 'nature art'], section: 'Botanical Art' },
      { name: 'Minimalist', tags: ['minimalist art', 'simple art', 'scandinavian art'], section: 'Minimalist Art' },
      { name: 'Geometric', tags: ['geometric art', 'modern geometric', 'pattern art'], section: 'Geometric Art' },
      { name: 'Nature', tags: ['nature art', 'landscape art', 'scenic art'], section: 'Nature Art' }
    ];

    const style = styles[Math.floor(Math.random() * styles.length)];
    const basePrice = artworkType === 'wall' ? Math.floor(Math.random() * 10) + 10 : Math.floor(Math.random() * 8) + 5;
    const price = basePrice + '.99';

    cleanup(file.path);

    // Adaptive templates based on artwork type
    const isTVArt = artworkType === 'tv';
    const baseTitle = isTVArt
      ? `${style.name} Frame TV Art Digital Download Samsung Frame TV Wall Decor 16:9`
      : `${style.name} Printable Wall Art 16x20 Digital Download Modern Home Decor Print`;

    const baseTags = isTVArt
      ? ['frame tv art', 'digital download', 'samsung frame tv']
      : ['printable wall art', '16x20 print', 'digital download'];

    const materials = isTVArt
      ? 'Digital file - High-resolution JPG and PNG (16:9 aspect ratio, 3840x2160px for Frame TV)'
      : 'Digital file - High-resolution JPG and PNG (16x20 inches, 300 DPI, print-ready)';

    const howToUse = isTVArt
      ? 'Simply download the files and display them on your Samsung Frame TV or other digital displays. The 16:9 aspect ratio ensures perfect fit on most TVs and monitors.'
      : 'Download and print at home on your printer, or upload to a professional print service like Costco, Walgreens, or an online printer. Frame in a standard 16x20" frame and hang on your wall. Files are 300 DPI for crisp, gallery-quality prints.';

    const perfectFor = isTVArt
      ? '• Samsung Frame TV owners\n• Living rooms and entertainment areas\n• Modern and contemporary home decor\n• Digital art collectors\n• Smart home enthusiasts'
      : '• Home printing and professional printing\n• Standard 16x20" frames (widely available)\n• Living rooms, bedrooms, offices, nurseries\n• Gallery walls and home decor projects\n• Affordable art for renters and homeowners';

    res.json({
      title: baseTitle,
      seoTitle: `${style.name} Digital Art ${isTVArt ? 'Frame TV' : '16x20 Print'} - Instant Download Wall Art`,
      shortDescription: `Transform your space with this stunning ${style.name.toLowerCase()} digital artwork. Perfect for ${isTVArt ? 'Frame TV and digital displays (16:9)' : 'printing at 16x20" or displaying digitally'}. Instant download, high-resolution files included.`,
      description: `Beautiful ${style.name.toLowerCase()} artwork designed for modern living spaces${isTVArt ? ' and digital displays' : ' and printing'}.

WHAT'S INCLUDED:
• High-resolution digital files ${isTVArt ? '(4K quality - 3840x2160px, 16:9)' : '(16x20 inches, 300 DPI)'}
• Multiple formats: JPG and PNG
• Instant download - no shipping wait
• ${isTVArt ? 'Optimized for Frame TV and digital displays' : 'Print-ready files for home or professional printing'}
• ${isTVArt ? 'Perfect 16:9 aspect ratio for TVs and monitors' : 'Fits standard 16x20" frames'}

HOW TO USE:
${howToUse}

PERFECT FOR:
${perfectFor}

This is a DIGITAL DOWNLOAD only - no physical items will be shipped. Files are delivered instantly after purchase via Etsy's download system.`,
      tags: [
        ...baseTags,
        'wall art',
        ...style.tags,
        'instant download',
        'home decor',
        'modern wall art',
        isTVArt ? '16:9 art' : 'printable art',
        'digital art print'
      ].slice(0, 13),
      materials: materials,
      suggestedPrice: price,
      shopSection: style.section,
      keywords: [
        ...(isTVArt ? ['frame tv art', 'samsung frame tv', '16:9 digital art'] : ['printable wall art', '16x20 print', 'wall art print']),
        'digital download art',
        style.name.toLowerCase() + ' art',
        'instant download',
        'home decor',
        'wall art digital',
        isTVArt ? '4k artwork' : 'printable decor',
        'modern home decor'
      ],
      targetAudience: isTVArt
        ? 'Frame TV owners, smart home enthusiasts, digital art collectors, modern home decorators'
        : 'DIY home decorators, print-at-home enthusiasts, gallery wall creators, budget-conscious decorators',
      colors: ['Multi-color'],
      style: style.name
    });
  } catch (error) {
    cleanup(req.file?.path);
    res.status(500).json({ error: 'Listing generation failed' });
  }
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '2.0.0-enhanced',
    psdProcessor: psdProcessorPath ? 'enhanced-available' : 'unavailable',
    features: {
      enhancedPsdProcessing: true,
      workingLogicIntegrated: true,
      multiMethodDetection: true,
      improvedPlacement: true
    }
  });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🎨 Aurelia Studio v2.0 Enhanced running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV}`);
  console.log(`🔑 Replicate API: ${process.env.REPLICATE_API_TOKEN ? '✓ Configured' : '✗ Missing'}`);
  console.log(`🔑 Anthropic API: ${process.env.ANTHROPIC_API_KEY ? '✓ Configured' : '✗ Missing'}`);
  console.log(`🐍 Enhanced PSD Processor: ${psdProcessorPath ? '✓ Available' : '✗ Unavailable'}`);
  console.log(`✨ Enhanced Features: Multi-method detection, Working logic integration, Improved placement`);
  console.log(`📁 Data directory: ${DATA_DIR}`);
});
