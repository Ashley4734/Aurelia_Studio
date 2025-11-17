# Aurelia Studio v2

Professional digital art workflow platform for mockups, packaging, generation, and listing automation.

## Features

- **Mockups**: Transform artwork with professional mockups using PSD files
  - Multi-artwork batch processing
  - Smart layer detection
  - Mockup library management
  - ZIP export functionality

- **Package**: Create print-ready packages
  - 4K display versions
  - Multiple print sizes (24x32", 16x20")
  - 300 DPI for professional printing
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

### Environment Variables

Create a `.env` file in the root directory:

```env
# Required for AI generation
REPLICATE_API_TOKEN=your_replicate_token_here

# Optional for listing generation
ANTHROPIC_API_KEY=your_anthropic_key_here

# Optional configuration
PORT=3000
DATA_DIR=/data
NODE_ENV=production
```

### Installation

#### Using Docker (Recommended)

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

### PSD Processing Issues
- Ensure Python dependencies are installed: `pip install psd-tools pillow`
- Check PSD file has proper smart layers
- Verify layer names contain keywords like "design", "artwork", or "logo"

### AI Generation Errors
- Verify `REPLICATE_API_TOKEN` is set correctly
- Check you have credits in your Replicate account
- Review browser console and server logs for details

### Image Upload Failures
- Check file size limits (max 50MB)
- Verify file format is supported
- Ensure sufficient disk space in data directory

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
