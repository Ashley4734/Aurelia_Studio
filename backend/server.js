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

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'build')));

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, DIRS.uploads),
    filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
  }),
  limits: { fileSize: 50 * 1024 * 1024 }
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

// ENHANCED Python PSD processor script with YOUR WORKING LOGIC
const createPSDProcessor = () => {
  const pythonScript = `
import sys
import json
import base64
import logging
import traceback
from PIL import Image, ImageOps
import io
import os

# Configure logging to match the working version
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

try:
    from psd_tools import PSDImage
    PSD_TOOLS_AVAILABLE = True
    logger.info("✅ psd-tools available")
except ImportError:
    PSD_TOOLS_AVAILABLE = False
    logger.warning("⚠️ psd-tools not available")

def safe_base64_decode(data):
    """Safely decode base64 data, handling data URLs"""
    try:
        if ',' in data:
            data = data.split(',')[1]
        return base64.b64decode(data)
    except Exception as e:
        raise ValueError(f"Base64 decode failed: {str(e)}")

def process_with_enhanced_psd_tools(psd_data, artwork_data, filename):
    """Enhanced PSD processing with WORKING LOGIC from your version"""
    if not PSD_TOOLS_AVAILABLE:
        raise ImportError("psd-tools not available")

    try:
        logger.info(f"🔍 Processing PSD: {filename}")

        # Load PSD - EXACTLY like your working version
        psd = PSDImage.open(io.BytesIO(psd_data))
        logger.info(f"✅ PSD opened successfully. Size: {psd.width}x{psd.height}, Layers: {len(psd)}")

        # Load artwork - with YOUR working mode handling
        artwork = Image.open(io.BytesIO(artwork_data))
        if artwork.mode in ('RGBA', 'LA', 'P'):
            # Keep RGBA if available for transparency, otherwise convert to RGB
            if artwork.mode == 'P' and 'transparency' in artwork.info:
                artwork = artwork.convert('RGBA')
            elif artwork.mode in ('RGBA', 'LA'):
                pass  # Keep as is
            else:
                artwork = artwork.convert('RGB')
        logger.info(f"📷 Artwork loaded: {artwork.size}, Mode: {artwork.mode}")

        # Enhanced smart object detection - USING YOUR WORKING APPROACH
        smart_layer = None
        smart_bounds = None
        detection_method = "none"

        def find_smart_objects(group, path=""):
            """ENHANCED smart object detection - BASED ON YOUR WORKING VERSION"""
            nonlocal smart_layer, smart_bounds, detection_method

            for layer in group:
                layer_path = f"{path}/{layer.name}" if path else layer.name
                logger.info(f"🔍 Checking layer: {layer_path}")

                # Skip invisible layers for efficiency
                if hasattr(layer, 'visible') and not layer.visible:
                    logger.info(f"  ⏭️ Skipping invisible layer: {layer.name}")
                    continue

                # METHOD 1: Name-based detection (HIGHEST PRIORITY - YOUR WORKING METHOD)
                target_names = [
                    'design', 'artwork', 'logo', 'mockup', 'replace', 'smart object',
                    'your design', 'add design', 'place design', 'design here',
                    'insert', 'content', 'image', 'photo', 'graphic', 'placeholder',
                    'your artwork', 'add artwork', 'place artwork', 'artwork here',
                    'your logo', 'add logo', 'place logo', 'logo here'
                ]

                layer_name_lower = layer.name.lower().strip()

                for target in target_names:
                    if target in layer_name_lower:
                        logger.info(f"✅ FOUND TARGET LAYER by name match: '{layer.name}' contains '{target}'")
                        smart_layer = layer
                        smart_bounds = (layer.left, layer.top, layer.right, layer.bottom)
                        detection_method = f"name_match_{target}"
                        logger.info(f"✅ Layer bounds: {smart_bounds}")
                        return True  # IMMEDIATE RETURN - KEY TO YOUR WORKING VERSION

                # METHOD 2: Smart Object by layer kind
                if hasattr(layer, 'kind'):
                    kind_str = str(layer.kind).lower()
                    if 'smart' in kind_str:
                        logger.info(f"✅ Found smart object by kind: {layer_path} - Kind: {layer.kind}")
                        smart_layer = layer
                        smart_bounds = (layer.left, layer.top, layer.right, layer.bottom)
                        detection_method = "smart_object_kind"
                        return True

                # METHOD 3: Text content for design indicators
                if hasattr(layer, 'text') and layer.text:
                    text_lower = layer.text.lower()
                    text_keywords = [
                        'design', 'artwork', 'logo', 'replace', 'add your', 'insert',
                        'place here', 'your design here', 'add design here'
                    ]
                    for keyword in text_keywords:
                        if keyword in text_lower:
                            logger.info(f"✅ Found design placeholder text: {layer_path} - Text: '{layer.text}' contains '{keyword}'")
                            smart_layer = layer
                            smart_bounds = (layer.left, layer.top, layer.right, layer.bottom)
                            detection_method = f"text_match_{keyword}"
                            return True

                # METHOD 4: Tagged blocks for smart objects (PSD technical detection)
                if hasattr(layer, '_tagged_blocks'):
                    for block in layer._tagged_blocks:
                        if hasattr(block, 'key'):
                            block_key = str(block.key)
                            if 'SoLd' in block_key or 'smart' in block_key.lower():
                                logger.info(f"✅ Found smart object by tagged block: {layer_path} - Block key: {block_key}")
                                smart_layer = layer
                                smart_bounds = (layer.left, layer.top, layer.right, layer.bottom)
                                detection_method = f"tagged_block_{block_key}"
                                return True

                # Recurse into groups (layer folders)
                if hasattr(layer, '__iter__') and hasattr(layer, 'name'):
                    try:
                        if find_smart_objects(layer, layer_path):
                            return True  # Propagate the immediate return
                    except Exception as e:
                        logger.warning(f"Error recursing into group {layer_path}: {e}")

            return False

        # Run detection with YOUR WORKING SEQUENCE
        logger.info("🔍 Starting enhanced smart object search...")

        # First try name/type/text detection
        if not find_smart_objects(psd):
            logger.info("⚠️ No smart object found by name/type, trying geometric analysis...")

            # Geometric analysis fallback - YOUR WORKING FALLBACK APPROACH
            candidates = []

            def collect_candidates(layers, path=""):
                for layer in layers:
                    layer_path = f"{path}/{layer.name}" if path else layer.name

                    if hasattr(layer, 'left') and hasattr(layer, 'right'):
                        width = layer.right - layer.left
                        height = layer.bottom - layer.top
                        area = width * height

                        # Look for reasonably sized rectangular layers - YOUR WORKING CRITERIA
                        if 10000 < area < 2000000:  # Between ~100x100 and ~1414x1414
                            aspect_ratio = width / height if height > 0 else 0
                            # Common aspect ratios for design elements
                            if 0.5 <= aspect_ratio <= 2.0:
                                candidates.append({
                                    'layer': layer,
                                    'bounds': (layer.left, layer.top, layer.right, layer.bottom),
                                    'area': area,
                                    'aspect_ratio': aspect_ratio,
                                    'name': layer.name,
                                    'path': layer_path
                                })
                                logger.info(f"🎯 Geometric candidate: {layer_path} ({width}x{height}, area={area}, ratio={aspect_ratio:.2f})")

                    # Recurse into groups
                    if hasattr(layer, '__iter__') and hasattr(layer, 'name'):
                        try:
                            collect_candidates(layer, layer_path)
                        except:
                            pass

            collect_candidates(psd)

            if candidates:
                # Sort by area (largest first) - YOUR WORKING APPROACH
                candidates.sort(key=lambda x: x['area'], reverse=True)
                best = candidates[0]

                smart_layer = best['layer']
                smart_bounds = best['bounds']
                detection_method = f"geometric_largest_area_{best['area']}"
                logger.info(f"📐 Selected largest suitable layer: {best['name']} (area: {best['area']})")

        # Process the replacement - USING YOUR WORKING REPLACEMENT LOGIC
        if smart_layer and smart_bounds:
            logger.info(f"🎯 TARGET FOUND! Layer: '{smart_layer.name}', Method: {detection_method}")
            logger.info(f"📐 Bounds: {smart_bounds}")

            # Get the original PSD as base - YOUR WORKING METHOD
            base_image = psd.composite()
            result = base_image.copy()

            # Calculate the area to replace - YOUR WORKING CALCULATION
            left, top, right, bottom = smart_bounds
            replacement_width = right - left
            replacement_height = bottom - top

            logger.info(f"📐 Replacement area: {replacement_width}x{replacement_height}")

            if replacement_width > 0 and replacement_height > 0:
                # YOUR WORKING RESIZE LOGIC - EXACTLY AS YOU HAVE IT
                artwork_ratio = artwork.width / artwork.height
                replacement_ratio = replacement_width / replacement_height

                if artwork_ratio > replacement_ratio:
                    # Artwork is wider, fit to height and crop width
                    new_height = replacement_height
                    new_width = int(replacement_height * artwork_ratio)
                    crop_x = (new_width - replacement_width) // 2
                    crop_y = 0
                else:
                    # Artwork is taller, fit to width and crop height
                    new_width = replacement_width
                    new_height = int(replacement_width / artwork_ratio)
                    crop_x = 0
                    crop_y = (new_height - replacement_height) // 2

                # Resize artwork - YOUR WORKING RESIZE
                artwork_resized = artwork.resize((new_width, new_height), Image.Resampling.LANCZOS)

                # Crop to exact smart object size if needed - YOUR WORKING CROP
                if new_width > replacement_width or new_height > replacement_height:
                    crop_box = (crop_x, crop_y, crop_x + replacement_width, crop_y + replacement_height)
                    artwork_resized = artwork_resized.crop(crop_box)

                # YOUR WORKING PASTE POSITION CALCULATION
                paste_x = max(0, min(left, result.width - replacement_width))
                paste_y = max(0, min(top, result.height - replacement_height))

                logger.info(f"🎨 Placing artwork at: ({paste_x}, {paste_y}) with size: {replacement_width}x{replacement_height}")

                # YOUR WORKING PASTE LOGIC - EXACTLY AS YOU HAVE IT
                if artwork_resized.mode == 'RGBA':
                    result.paste(artwork_resized, (paste_x, paste_y), artwork_resized)
                else:
                    result.paste(artwork_resized, (paste_x, paste_y))

                logger.info("✅ Artwork successfully placed in smart layer!")

                return result
            else:
                logger.warning("❌ Invalid replacement bounds")
                return None
        else:
            logger.info("❌ No suitable layer found")
            return None

    except Exception as e:
        logger.error(f"❌ Error processing PSD: {e}")
        logger.error(traceback.format_exc())
        return None

def process_as_image(mockup_data, artwork_data):
    """Process files as regular images with enhanced placement"""
    try:
        logger.info("🖼️ Processing as regular images...")

        # Load images
        mockup = Image.open(io.BytesIO(mockup_data))
        artwork = Image.open(io.BytesIO(artwork_data))

        # Ensure RGBA for proper compositing
        if mockup.mode != 'RGBA':
            mockup = mockup.convert('RGBA')
        if artwork.mode != 'RGBA':
            artwork = artwork.convert('RGBA')

        # Resize artwork to 70% of mockup size (more realistic than full size)
        mockup_width, mockup_height = mockup.size
        target_width = int(mockup_width * 0.7)
        target_height = int(mockup_height * 0.7)

        # Use same aspect ratio logic as PSD processing
        artwork_ratio = artwork.width / artwork.height
        target_ratio = target_width / target_height

        if artwork_ratio > target_ratio:
            # Artwork is wider, fit to height and crop width
            new_height = target_height
            new_width = int(target_height * artwork_ratio)
            crop_x = (new_width - target_width) // 2
            crop_y = 0
        else:
            # Artwork is taller, fit to width and crop height
            new_width = target_width
            new_height = int(target_width / artwork_ratio)
            crop_x = 0
            crop_y = (new_height - target_height) // 2

        # Resize and crop
        artwork_resized = artwork.resize((new_width, new_height), Image.Resampling.LANCZOS)

        if new_width > target_width or new_height > target_height:
            crop_box = (crop_x, crop_y, crop_x + target_width, crop_y + target_height)
            artwork_resized = artwork_resized.crop(crop_box)

        # Center the artwork
        x = (mockup_width - target_width) // 2
        y = (mockup_height - target_height) // 2

        # Composite
        result = mockup.copy()
        result.paste(artwork_resized, (x, y), artwork_resized)

        logger.info("✅ Image processing completed successfully!")
        return result

    except Exception as e:
        logger.error(f"❌ Image processing failed: {e}")
        raise Exception(f"Image processing failed: {str(e)}")

def main():
    try:
        # Read input from stdin
        input_data = json.loads(sys.stdin.read())

        mockup_b64 = input_data['mockup']
        artwork_b64 = input_data['artwork']
        filename = input_data.get('filename', 'unknown')

        # Decode base64 data
        mockup_data = safe_base64_decode(mockup_b64)
        artwork_data = safe_base64_decode(artwork_b64)

        result_image = None
        processing_method = "unknown"

        # Try PSD processing first if filename suggests PSD
        if filename.lower().endswith('.psd'):
            try:
                result_image = process_with_enhanced_psd_tools(mockup_data, artwork_data, filename)
                if result_image:
                    processing_method = "enhanced_psd_tools"
                else:
                    raise Exception("PSD processing returned None")
            except Exception as psd_error:
                logger.error(f"Enhanced PSD processing failed: {psd_error}")
                # Fall back to image processing
                try:
                    result_image = process_as_image(mockup_data, artwork_data)
                    processing_method = "image_fallback"
                except Exception as img_error:
                    raise Exception(f"Both PSD and image processing failed. PSD: {psd_error}, Image: {img_error}")
        else:
            # Process as regular image
            result_image = process_as_image(mockup_data, artwork_data)
            processing_method = "image"

        if result_image is None:
            raise Exception("No processing method succeeded")

        # Convert to JPEG - YOUR WORKING OUTPUT CONVERSION
        if result_image.mode == 'RGBA':
            # Create white background for RGBA images
            background = Image.new('RGB', result_image.size, (255, 255, 255))
            background.paste(result_image, mask=result_image.split()[-1])
            result_image = background
        elif result_image.mode != 'RGB':
            result_image = result_image.convert('RGB')

        # Save to buffer with 300 DPI
        output_buffer = io.BytesIO()
        result_image.save(output_buffer, format='JPEG', quality=90, optimize=True, dpi=(300, 300))

        # Return base64 encoded result
        result_b64 = base64.b64encode(output_buffer.getvalue()).decode('utf-8')

        output = {
            'success': True,
            'result': result_b64,
            'method': processing_method,
            'size': {
                'width': result_image.size[0],
                'height': result_image.size[1]
            }
        }

        logger.info(f"✅ Processing completed successfully using method: {processing_method}")
        print(json.dumps(output))

    except Exception as e:
        logger.error(f"❌ Processing failed: {e}")
        error_output = {
            'success': False,
            'error': str(e),
            'type': type(e).__name__
        }
        print(json.dumps(error_output))
        sys.exit(1)

if __name__ == '__main__':
    main()
`;

  const scriptPath = path.join(DIRS.temp, 'enhanced_psd_processor.py');
  fs.writeFileSync(scriptPath, pythonScript);
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

    python.on('close', (code) => {
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
app.post('/api/process-psd', async (req, res) => {
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

app.post('/api/generate', async (req, res) => {
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
