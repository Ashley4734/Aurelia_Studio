# Aurelia Studio v2

Professional digital art workflow platform for mockups, packaging, generation, and listing automation.

## Features

- **Mockups**: Transform artwork with professional mockups using PSD files
  - Multi-artwork batch processing
  - Smart layer detection
  - Mockup library management
  - ZIP export functionality

- **Package**: Create digital art packages for Frame TV
  - High-resolution 4K display versions (3840 × 2160 px, 16:9 ratio)
  - Perfectly sized for The Frame TV and other 4K displays
  - Installation guides included

- **Generate**: AI-powered art creation using SeedreamS-3
  - Batch prompt processing
  - Customizable aspect ratios
  - Multiple size options
  - Advanced guidance controls

- **Listing**: Auto-generate product listings
  - AI-powered descriptions
  - Automatic tagging
  - Price suggestions
  - Shop section recommendations

## Technology Stack

### Frontend
- React 18
- Framer Motion for animations
- Tailwind CSS for styling
- React Dropzone for file uploads
- React Hot Toast for notifications

### Backend
- Node.js with Express
- Sharp for image processing
- Python with psd-tools for PSD manipulation
- Replicate API for AI generation
- Anthropic Claude API for listing generation

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3+
- Docker (optional)
- For production: Coolify instance (recommended)

### Environment Variables

The application requires environment variables for API integrations. See [.env.example](.env.example) for the complete list.

**For Coolify deployments:** Add environment variables through the Coolify dashboard (see [COOLIFY.md](COOLIFY.md) for detailed instructions).

**For local development:** Create a `.env` file in the root directory:

```env
# Required for AI generation
REPLICATE_API_TOKEN=your_replicate_token_here

# Optional for listing generation
ANTHROPIC_API_KEY=your_anthropic_key_here

# Optional configuration
PORT=3000
DATA_DIR=/data
NODE_ENV=production
# Required for secured API access
API_KEY=choose_a_strong_key
```

### API hardening

All `/api/*` routes require an API key. Set `API_KEY` on the server and include it on every request via the `x-api-key` header or a `Bearer` token. Requests missing or using the wrong key are rejected before any route handlers run, ensuring that even CORS-preflighted calls are protected.

Simple, in-memory rate limiting now guards the platform (default 120 requests / 15 minutes per client) with tighter buckets on heavy routes such as PSD processing and AI generation. JSON bodies are capped at 10 MB and uploads at 25 MB to avoid oversized payloads.

### PSD processor

The inline Python script was promoted into a versioned module at `backend/psd_processor/main.py`. It validates input, enforces a hard timeout via signals, and falls back to an image compositor when `psd-tools` is unavailable. Logging is emitted to stdout for easier observability.

### Installation

#### Using Coolify (Recommended for Production)

**→ See [COOLIFY.md](COOLIFY.md) for complete step-by-step deployment guide.**

Coolify provides the easiest deployment experience with automatic SSL, persistent storage, and environment variable management.

**Quick Start:**

1. **Connect Repository**
   - In Coolify dashboard, create a new Application
   - Connect this GitHub repository
   - Select the branch you want to deploy

2. **Configure Environment Variables**

   Navigate to Application > Environment Variables and add:

   **Required:**
   - `REPLICATE_API_TOKEN` - Your Replicate API token from https://replicate.com/account/api-tokens

   **Optional:**
   - `ANTHROPIC_API_KEY` - Your Anthropic API key from https://console.anthropic.com/
   - `PORT` - Custom port (default: 3000)
   - `NODE_ENV` - Set to `production`
   - `DATA_DIR` - Custom data directory (default: /data)

3. **Configure Persistent Storage**

   In Application > Storages, add a persistent volume:
   - **Source:** Create a new volume (e.g., `aurelia-data`)
   - **Destination:** `/data`
   - This ensures your mockup library and uploads persist across deployments

4. **Configure Health Check** (Optional but Recommended)

   In Application > Health Check:
   - **Path:** `/api/health`
   - **Port:** `3000` (or your custom PORT)
   - **Interval:** 30s

5. **Deploy**
   - Click "Deploy" and Coolify will build and start your application
   - Access your app at the provided URL

**Notes:**
- Coolify automatically handles SSL certificates
- No need to manually create `.env` files - all configuration is via the dashboard
- The health check endpoint returns application status and feature availability

#### Using Docker (Alternative)

```bash
# Build the image
docker build -t aurelia-studio .

# Run the container
docker run -p 3000:3000 \
  -e REPLICATE_API_TOKEN=your_token \
  -e ANTHROPIC_API_KEY=your_key \
  -v $(pwd)/data:/data \
  aurelia-studio
```

#### Manual Installation

1. **Install Frontend Dependencies**
```bash
cd frontend
npm install
npm run build
cd ..
```

2. **Install Backend Dependencies**
```bash
cd backend
npm install
```

3. **Install Python Dependencies**
```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install pillow numpy psd-tools
```

4. **Start the Server**
```bash
cd backend
node server.js
```

5. **Access the Application**
Open http://localhost:3000 in your browser

## API Endpoints

### Mockup Processing
- `POST /api/process-psd` - Process PSD mockup with artwork
- `POST /api/save-mockups` - Save mockups to library
- `GET /api/mockups` - List saved mockups
- `GET /api/mockup/:id` - Retrieve specific mockup

### Image Processing
- `POST /api/package-artwork` - Create print-ready package
- `POST /api/create-zip` - Create ZIP archive of images

### AI Features
- `POST /api/generate` - Generate artwork using AI
- `POST /api/listing-from-image` - Generate product listing from image

### System
- `GET /api/health` - Health check endpoint

## Architecture

### PSD Processing Pipeline

1. **Multi-Method Detection**
   - Name-based detection (design, artwork, logo, etc.)
   - Smart object detection by layer kind
   - Text content analysis
   - Tagged block detection
   - Geometric analysis fallback

2. **Image Processing**
   - Aspect ratio preservation
   - LANCZOS resampling for quality
   - Transparency handling
   - Center-based positioning

3. **Fallback System**
   - Enhanced Python processor (primary)
   - Sharp-based processor (fallback)
   - Error recovery mechanisms

## Development

### Project Structure

```
aurelia-studio/
├── frontend/          # React frontend application
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── App.js
│   │   └── index.js
│   └── package.json
├── backend/           # Express backend server
│   ├── server.js
│   └── package.json
├── Dockerfile         # Production Docker image
├── .gitignore
├── .dockerignore
└── README.md
```

### Frontend Development

```bash
cd frontend
npm start  # Starts development server on port 3000
```

### Backend Development

```bash
cd backend
npm run dev  # If you add nodemon to package.json
# or
node server.js
```

## Configuration

### Data Storage

By default, data is stored in the `/data` directory:
- `/data/uploads` - Temporary uploaded files
- `/data/mockups` - Saved mockup library
- `/data/output` - Processed outputs
- `/data/temp` - Temporary processing files

### Image Formats

**Supported Input Formats:**
- PSD (Photoshop Document)
- JPG/JPEG
- PNG
- WebP

**Output Formats:**
- JPG (mockup processing)
- PNG (4K display versions)
- ZIP (batch downloads)

## API Keys

### Replicate API (Required for AI Generation)
1. Sign up at https://replicate.com
2. Get your API token from account settings
3. Add to `.env` as `REPLICATE_API_TOKEN`

### Anthropic API (Optional for Listing Generation)
1. Sign up at https://anthropic.com
2. Get your API key
3. Add to `.env` as `ANTHROPIC_API_KEY`

## Troubleshooting

### Coolify Deployment Issues

**Application won't start:**
- Check Coolify build logs for errors
- Verify all required environment variables are set
- Ensure `REPLICATE_API_TOKEN` is provided (required for Generate tab)
- Check that persistent volume is properly mounted to `/data`

**Environment variables not working:**
- Environment variables must be added through Coolify dashboard, not `.env` files
- After adding/changing variables, redeploy the application
- Verify variables are set correctly (no typos in names)

**Data loss after redeployment:**
- Ensure persistent volume is configured and mounted to `/data`
- Check volume source is persistent (not ephemeral)
- Verify volume permissions allow writing

**Health check failing:**
- Ensure health check path is `/api/health` (not just `/health`)
- Verify port is 3000 or matches your custom `PORT` variable
- Check application logs for startup errors

### PSD Processing Issues
- Ensure Python dependencies are installed: `pip install psd-tools pillow`
- Check PSD file has proper smart layers
- Verify layer names contain keywords like "design", "artwork", or "logo"

### AI Generation Errors
- Verify `REPLICATE_API_TOKEN` is set correctly in Coolify environment variables
- Check you have credits in your Replicate account at https://replicate.com/account
- Review browser console and server logs for details
- Test the health endpoint (`/api/health`) to see if the token is detected

### Listing Generation Issues
- `ANTHROPIC_API_KEY` is optional - app works without it using templates
- If provided, verify the key starts with `sk-ant-`
- Check Anthropic account has available credits

### Image Upload Failures
- Check file size limits (max 50MB)
- Verify file format is supported (PSD, JPG, PNG, WebP)
- Ensure sufficient disk space in data directory
- For Coolify: verify persistent volume has enough space

## Performance

- PSD processing: ~2-5 seconds per mockup
- AI generation: ~10-30 seconds per image (depends on Replicate)
- Package creation: ~5-10 seconds
- Supports batch processing of multiple artworks × mockups

## License

MIT License - See LICENSE file for details

## Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## Support

For issues and questions:
- Check the troubleshooting section
- Review server logs for error details
- Open an issue on GitHub

## Credits

Built with:
- React and Framer Motion
- Express and Sharp
- PSD Tools
- Replicate AI (SeedreamS-3)
- Anthropic Claude

---

**Aurelia Studio v2.0** - Professional Digital Art Workflow Platform
