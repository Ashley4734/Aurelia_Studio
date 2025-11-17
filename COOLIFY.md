# Deploying Aurelia Studio v2 on Coolify

This guide provides step-by-step instructions for deploying Aurelia Studio on Coolify.

## Prerequisites

Before you begin, ensure you have:

1. A Coolify instance running (self-hosted or managed)
2. A Replicate API token (required for AI generation features)
3. (Optional) An Anthropic API key for enhanced listing generation

## Step-by-Step Deployment

### 1. Create New Application in Coolify

1. Log in to your Coolify dashboard
2. Click **"+ New"** → **"Application"**
3. Select **"Public Repository"** or connect your GitHub account
4. Enter the repository URL or select this repository
5. Choose the branch you want to deploy (typically `main` or `master`)
6. Give your application a name (e.g., `aurelia-studio`)

### 2. Configure Build Settings

Coolify will automatically detect the Dockerfile. Verify:

- **Build Pack:** Docker
- **Dockerfile Location:** `./Dockerfile` (root directory)
- **Port:** 3000

### 3. Configure Environment Variables

Navigate to **Application > Environment Variables** and add the following:

#### Required Variables

| Variable | Value | Description |
|----------|-------|-------------|
| `REPLICATE_API_TOKEN` | Your Replicate token | Required for AI image generation. Get from: https://replicate.com/account/api-tokens |

#### Optional Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `ANTHROPIC_API_KEY` | None | Enhances listing generation with AI. Get from: https://console.anthropic.com/ |
| `PORT` | 3000 | Server port (usually leave as default) |
| `NODE_ENV` | production | Node environment |
| `DATA_DIR` | /data | Data storage directory (must match volume mount) |

**How to add variables:**
1. Click **"+ Add"** in Environment Variables section
2. Enter variable name (e.g., `REPLICATE_API_TOKEN`)
3. Enter variable value
4. Click **"Save"**
5. Repeat for each variable

### 4. Configure Persistent Storage

**Important:** Without persistent storage, uploaded mockups and processed images will be lost on redeployment.

1. Navigate to **Application > Storages**
2. Click **"+ Add"**
3. Configure the volume:
   - **Name:** `aurelia-data` (or any name you prefer)
   - **Source:** Create a new volume
   - **Destination (Mount Path):** `/data`
   - **Type:** Persistent Volume
4. Click **"Save"**

This ensures all data in `/data` persists across deployments and container restarts.

### 5. Configure Health Check (Recommended)

1. Navigate to **Application > Health Check**
2. Enable health check
3. Configure:
   - **Method:** GET
   - **Path:** `/api/health`
   - **Port:** 3000 (or your custom PORT)
   - **Interval:** 30s
   - **Timeout:** 10s
   - **Retries:** 3
4. Click **"Save"**

The health check endpoint returns:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "version": "2.0.0-enhanced",
  "psdProcessor": "enhanced-available",
  "features": {
    "enhancedPsdProcessing": true,
    "workingLogicIntegrated": true,
    "multiMethodDetection": true,
    "improvedPlacement": true
  }
}
```

### 6. Configure Domain (Optional)

1. Navigate to **Application > Domains**
2. Add your custom domain or use the Coolify-provided subdomain
3. Coolify will automatically provision SSL certificates via Let's Encrypt

### 7. Deploy

1. Review all settings
2. Click **"Deploy"** button
3. Monitor the build logs in real-time
4. Wait for deployment to complete (typically 3-5 minutes)

### 8. Verify Deployment

After deployment completes:

1. **Check Health Endpoint:**
   ```bash
   curl https://your-domain.com/api/health
   ```
   You should see a healthy status response.

2. **Verify Environment Variables:**
   Check the health response for:
   - `"psdProcessor": "enhanced-available"` - Python processor is working
   - Check application logs for API key detection messages

3. **Test Features:**
   - Navigate to your domain
   - Test file uploads in Mockups tab
   - Test AI generation (requires REPLICATE_API_TOKEN)
   - Test listing generation

## Environment Variable Reference

### REPLICATE_API_TOKEN (Required)

**Purpose:** Enables AI-powered image generation in the "Generate" tab

**How to get:**
1. Go to https://replicate.com
2. Sign up or log in
3. Navigate to Account > API Tokens
4. Create a new token or copy existing one
5. Add to Coolify environment variables

**Format:** String (e.g., `r8_...`)

**Testing:**
- Navigate to Generate tab
- Enter a prompt and click Generate
- If token is invalid, you'll see an authentication error

### ANTHROPIC_API_KEY (Optional)

**Purpose:** Enables AI-powered listing generation in the "Listing" tab

**How to get:**
1. Go to https://console.anthropic.com
2. Sign up or log in
3. Navigate to API Keys
4. Create a new key
5. Add to Coolify environment variables

**Format:** String starting with `sk-ant-`

**Note:** If not provided, the app uses template-based listing generation

### PORT (Optional)

**Purpose:** Specifies the port the server listens on

**Default:** 3000

**Note:** Coolify handles port mapping automatically, so you usually don't need to change this

### NODE_ENV (Optional)

**Purpose:** Sets Node.js environment mode

**Default:** production

**Options:** `production`, `development`

**Note:** Always use `production` for Coolify deployments

### DATA_DIR (Optional)

**Purpose:** Specifies where uploaded and processed files are stored

**Default:** `/data`

**Note:** Must match the persistent volume mount destination

## Persistent Storage Structure

The `/data` directory contains:

```
/data/
├── uploads/    # Temporary uploaded files
├── mockups/    # Saved mockup library (preserved)
├── output/     # Processed outputs
└── temp/       # Temporary processing files
```

**Important:** Only configure ONE persistent volume mounted to `/data`. The application creates subdirectories automatically.

## Updating Environment Variables

To update environment variables after initial deployment:

1. Navigate to **Application > Environment Variables**
2. Edit the variable value
3. Click **"Save"**
4. **Redeploy the application** for changes to take effect
5. Click **"Deploy"** button

**Note:** Simply changing environment variables does not restart the application. You must redeploy.

## Scaling and Performance

### Resource Recommendations

**Minimum:**
- CPU: 1 core
- RAM: 512 MB
- Storage: 2 GB

**Recommended (for production):**
- CPU: 2 cores
- RAM: 2 GB
- Storage: 10 GB or more (depending on mockup library size)

### Performance Tips

1. **Persistent Volume:** Use SSD-backed volumes for better I/O performance
2. **Memory:** Increase RAM if processing large PSD files (>100MB)
3. **CPU:** More cores = faster batch processing
4. **Network:** Ensure good connectivity to Replicate API for AI generation

## Monitoring and Logs

### Viewing Logs

1. Navigate to **Application > Logs**
2. View real-time logs or historical logs
3. Look for:
   - `✓` symbols indicate successful operations
   - `✗` symbols indicate errors
   - Environment variable detection on startup

### Key Log Messages on Startup

```
🎨 Aurelia Studio v2.0 Enhanced running on port 3000
📊 Environment: production
🔑 Replicate API: ✓ Configured (or ✗ Missing)
🔑 Anthropic API: ✓ Configured (or ✗ Missing)
🐍 Enhanced PSD Processor: ✓ Available
📁 Data directory: /data
```

### Common Log Patterns

**Successful PSD Processing:**
```
🎨 Starting enhanced mockup processing...
🐍 Attempting Enhanced Python PSD processing...
✓ Enhanced Python processing succeeded with method: enhanced_psd_tools
```

**Missing API Token:**
```
❌ REPLICATE_API_TOKEN not configured
```

## Troubleshooting

### Build Failures

**Problem:** Build fails during deployment

**Solutions:**
- Check build logs for specific error
- Ensure Dockerfile is in repository root
- Verify repository branch is correct
- Try rebuilding from scratch

### Application Won't Start

**Problem:** Application deploys but won't start

**Solutions:**
1. Check application logs for errors
2. Verify environment variables are set correctly
3. Ensure persistent volume is mounted to `/data`
4. Check health check is configured correctly

### Environment Variables Not Working

**Problem:** Variables set but application doesn't detect them

**Solutions:**
1. Verify variable names are EXACT (case-sensitive)
2. Redeploy after changing variables
3. Check logs for environment variable detection messages
4. Don't use quotes around values in Coolify

### Data Loss After Redeployment

**Problem:** Mockup library disappears after redeployment

**Solutions:**
1. Verify persistent volume is configured in Storages
2. Check volume is mounted to `/data` (not `/data/mockups`)
3. Ensure volume source is persistent (not ephemeral)
4. Check volume permissions

### AI Generation Not Working

**Problem:** Generate tab shows errors

**Solutions:**
1. Verify `REPLICATE_API_TOKEN` is set correctly
2. Check Replicate account has credits: https://replicate.com/account
3. Test token with health endpoint
4. Review browser console for specific error messages

### Health Check Failing

**Problem:** Health check shows as unhealthy

**Solutions:**
1. Verify health check path is `/api/health` (with leading slash)
2. Ensure port matches `PORT` environment variable (default 3000)
3. Check application is actually running (view logs)
4. Increase health check timeout if needed

## Security Considerations

### API Keys

- **Never commit API keys** to the repository
- Always add them via Coolify environment variables
- Rotate keys periodically
- Use separate keys for staging/production if applicable

### Data Privacy

- Uploaded files are stored in `/data/uploads`
- Files are processed server-side
- Temporary files are cleaned up after processing
- Consider data retention policies for your use case

### Network Security

- Coolify provides automatic SSL certificates
- Always use HTTPS in production
- Consider IP whitelisting if needed (Coolify feature)
- Monitor access logs for unusual activity

## Backups

### Backing Up Persistent Data

To backup your mockup library and data:

1. Access your Coolify server via SSH
2. Locate the persistent volume (check Coolify settings for exact path)
3. Create a backup:
   ```bash
   docker run --rm \
     -v aurelia-data:/data \
     -v $(pwd):/backup \
     alpine tar czf /backup/aurelia-backup-$(date +%Y%m%d).tar.gz /data
   ```

### Restoring from Backup

```bash
docker run --rm \
  -v aurelia-data:/data \
  -v $(pwd):/backup \
  alpine sh -c "cd / && tar xzf /backup/aurelia-backup-YYYYMMDD.tar.gz"
```

## Advanced Configuration

### Custom Build Args

If you need to customize the Docker build:

1. Navigate to **Application > Build**
2. Add build arguments as needed
3. Redeploy

### Multiple Environments

To run staging and production environments:

1. Create two separate applications in Coolify
2. Use different branches (e.g., `develop` for staging, `main` for production)
3. Use different environment variables (separate API keys)
4. Use different domains

### Resource Limits

To set resource limits:

1. Navigate to **Application > Resources**
2. Configure CPU and memory limits
3. Monitor usage and adjust as needed

## Getting Help

If you encounter issues:

1. Check application logs in Coolify dashboard
2. Review this troubleshooting guide
3. Check the main [README.md](README.md) for general documentation
4. Review the [.env.example](.env.example) for environment variable details
5. Test the health endpoint: `https://your-domain.com/api/health`

## Quick Reference

### Essential URLs

- **Health Check:** `https://your-domain.com/api/health`
- **Replicate Dashboard:** https://replicate.com/account
- **Anthropic Console:** https://console.anthropic.com/

### Essential Commands

**View Health Status:**
```bash
curl https://your-domain.com/api/health | jq
```

**Test API Connectivity:**
```bash
# Test app is responding
curl -I https://your-domain.com

# Test health endpoint
curl https://your-domain.com/api/health
```

### Environment Variable Checklist

- [ ] `REPLICATE_API_TOKEN` set (required)
- [ ] `ANTHROPIC_API_KEY` set (optional)
- [ ] `PORT` set if using custom port
- [ ] `NODE_ENV` set to `production`
- [ ] Persistent volume mounted to `/data`
- [ ] Health check configured
- [ ] Domain configured with SSL
- [ ] Application deployed successfully

---

**Aurelia Studio v2** - Optimized for Coolify Deployment
