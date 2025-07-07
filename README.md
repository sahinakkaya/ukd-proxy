
# UKD Calculator Proxy

**The whole project is vibe coded with [Claude](https://claude.ai).** 

A web proxy server that adds UKD (Turkish Chess Rating) calculations to chess-results.com pages. Browse chess tournaments with automatic rating change calculations displayed inline.


## Features

- 🧮 **Automatic UKD Calculations**: Adds expected scores and rating changes to player result pages
- 📱 **Universal Access**: Works on any device without browser extension installation
- 🌐 **Seamless Browsing**: Navigate chess-results.com normally with enhanced data
- 🔍 **Smart Detection**: Automatically detects different table formats and rating columns
- ⚡ **Fast Performance**: Caches pages and optimizes for speed
- 🎯 **Forfeit Handling**: Properly handles forfeits and byes (no rating impact)

## Quick Start

### Development
```bash
npm install
npm start
```

Visit `http://localhost:3000` and enter a chess-results.com URL.

### Docker Development
```bash
# Build and run with Docker Compose
docker-compose up --build

# Or build and run manually
docker build -t ukd-proxy .
docker run -p 3000:3000 ukd-proxy
```

## Deployment

### Automatic Deployment with GitHub Actions

1. **Push to GitHub**: The repository includes GitHub Actions workflow that automatically:
   - Tests the application
   - Builds Docker image
   - Pushes to GitHub Container Registry (`ghcr.io`)

2. **Setup**: 
   - Push your code to a GitHub repository
   - GitHub Actions will automatically build and push Docker images
   - Images are available at: `ghcr.io/your-username/ukd-calc:latest`

### Production Deployment Options

#### Option 1: Docker Compose (Recommended)
```bash
# Pull and run the latest image
docker-compose -f docker-compose.production.yml up -d

# Or with custom domain setup (requires Traefik)
docker-compose up -d
```

#### Option 2: Direct Docker Run
```bash
# Pull the latest image
docker pull ghcr.io/your-username/ukd-calc:latest

# Run the container
docker run -d \
  --name ukd-proxy \
  -p 3000:3000 \
  --restart unless-stopped \
  ghcr.io/your-username/ukd-calc:latest
```

#### Option 3: Deploy to Cloud Platforms

**Railway**:
1. Connect your GitHub repository
2. Railway will auto-detect Dockerfile
3. Deploy automatically on push

**DigitalOcean App Platform**:
1. Create new app from Docker Hub
2. Use image: `ghcr.io/your-username/ukd-calc:latest`
3. Set port to 3000

**AWS ECS/Fargate**:
1. Push image to ECR or use GitHub Container Registry
2. Create ECS service with the image
3. Configure load balancer

#### Environment Variables
- `PORT`: Server port (default: 3000)
- `NODE_ENV`: Environment (production/development)
- `BASE_URL`: Full base URL for the proxy (e.g., `https://ukd.sahinakkaya.dev`). If not set, auto-detects from request headers.

## Usage

### Landing Page
Visit your deployed URL (e.g., `https://ukd.sahinakkaya.dev`) and enter any chess-results.com URL.

### Direct Access
Use the proxy directly with URL parameters:
```
https://ukd.sahinakkaya.dev?page=chess-results.com/tnr123456.aspx?lan=1&art=9&snr=123
```

### Example URLs
- Player results: `?page=chess-results.com/tnr123456.aspx?lan=1&art=9&snr=123`
- Tournament page: `?page=chess-results.com/tnr123456.aspx`
- Turkish tournament: `?page=chess-results.com/tnr123456.aspx?lan=1&art=20&turdet=YES`

## How It Works

1. **Proxy Request**: User enters chess-results.com URL
2. **Fetch Original**: Server fetches the original page from chess-results.com
3. **Parse & Calculate**: Extracts tournament data and calculates UKD changes
4. **Enhance HTML**: Adds calculation columns and summary boxes
5. **Rewrite Links**: Converts all links to go through the proxy
6. **Serve**: Returns the enhanced page to the user

## Technical Features

### Rating System Support
- **UKD**: Turkish national rating (preferred)
- **RtgN**: National rating (second choice)
- **ELO**: International ELO rating
- **RTG**: General rating
- **RtgI**: International rating (lowest priority)

### Table Format Support
- Turkish pages (Tur, Sonuç columns)
- English pages (Rd., Res. columns)
- Multiple rating columns (automatically selects best available)
- Nested result tables
- Forfeit detection (- 1K, - 0K, etc.)

### UKD Calculation Features
- Proper K-factor calculation based on rating level
- Unrated opponent handling (assumes 350-point difference)
- Forfeit exclusion (no rating impact)
- Expected score calculation using official lookup tables

## Project Structure

```
ukd-calc/
├── server.js              # Main Express server
├── package.json           # Dependencies and scripts
├── lib/
│   ├── ukd-calculator.js   # Core UKD calculation logic
│   ├── fetcher.js         # Page fetching with caching
│   ├── html-modifier.js    # HTML parsing and UKD injection
│   └── link-rewriter.js    # URL rewriting for proxy
├── views/
│   └── landing.ejs        # Landing page template
└── public/
    └── styles.css         # Additional CSS styles
```

## API

### GET /?page={url}
Proxies a chess-results.com page with UKD calculations added.

**Parameters:**
- `page`: URL-encoded chess-results.com URL

**Example:**
```
GET /?page=chess-results.com/tnr123456.aspx?lan=1&art=9&snr=123
```

### POST /
Accepts form data from landing page and redirects to GET request.

**Body:**
- `url`: chess-results.com URL

### GET /health
Returns server health status.

## Development

### Running locally
```bash
npm run dev  # Uses nodemon for auto-restart
```

### Testing with real URLs
1. Start the server: `npm start`
2. Visit: `http://localhost:3000`
3. Enter a chess-results.com player page URL
4. Verify UKD calculations appear correctly

## Deployment Notes

- The server caches fetched pages for 5 minutes to reduce load on chess-results.com
- All links are automatically rewritten to go through the proxy
- CSS and JavaScript assets are properly proxied
- The server handles both Turkish and English chess-results.com pages

## Docker Commands Quick Reference

```bash
# Development
docker-compose up --build              # Build and run locally
docker-compose down                    # Stop and remove containers

# Production
docker-compose -f docker-compose.production.yml pull  # Pull latest image
docker-compose -f docker-compose.production.yml up -d # Run in background

# Manual Docker commands
docker build -t ukd-proxy .           # Build image
docker run -p 3000:3000 ukd-proxy     # Run container
docker logs ukd-proxy                 # View logs
docker stop ukd-proxy                 # Stop container
```

## GitHub Actions Workflow

The repository includes a complete CI/CD pipeline:

1. **Test**: Runs on every push/PR
   - Installs dependencies
   - Runs tests (if any)
   - Verifies server starts correctly

2. **Build**: On successful test
   - Builds Docker image
   - Pushes to GitHub Container Registry
   - Tags with branch name and 'latest'

3. **Deploy**: On main branch
   - Provides deployment instructions
   - Image ready for production use

## License

MIT License - feel free to use and modify!
