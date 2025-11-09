# 🚨 Disaster Response Australia (DRAU)

Australian Disaster Response System - Government-side Management Platform and Public Emergency Assistance System

## 📋 Project Overview

Disaster Response Australia is a disaster response management platform that provides rapid disaster response information and data visualization. The platform serves two main roles:

- **Commander**: Interactively define and mark regional privacy waivers, manage disaster areas
- **Responder**: Retrieve detailed information about specific areas, access map-based facility and route visualization

Additionally, the system provides:
- **Public Emergency SOS**: Allows the public to quickly send distress signals during emergencies
- **Real-time Map Visualization**: Interactive Google Maps-based mapping with drawing, annotation, and heatmap capabilities
- **Population Data Analysis**: Display affected population data in disaster areas

## 🏗️ Technology Architecture

### Frontend Stack
- **Framework**: Next.js 15.5.3 (App Router)
- **Language**: TypeScript 5
- **UI**: React 19.1.0, Tailwind CSS 4
- **Maps**: Google Maps JavaScript API + Terra-Draw
- **Authentication**: Firebase Authentication
- **Package Manager**: pnpm

### Testing
- **Unit Tests**: Jest + React Testing Library
- **E2E Tests**: Playwright
- **Code Quality**: ESLint

### Deployment
- **Containerization**: Docker (Multi-stage build)
- **Runtime**: Node.js 18 (Alpine)

## 🚀 Quick Start

### Prerequisites
- Node.js 18 or higher
- pnpm (recommended) or npm
- Google Maps API Key (with Maps, Places, and Geocoding APIs enabled)
- Docker (for containerized deployment)

### Local Development Setup

#### 1. Clone the Project
```bash
git clone <repository-url>
cd disaster-response-australia/disaster-response-australia
```

#### 2. Install Dependencies
```bash
pnpm install
# or
npm install
```

#### 3. Configure Environment Variables
Create a `.env.local` file (based on `.env.example`):

```bash
cp .env.example .env.local
```

Edit `.env.local` and fill in the required configuration:

```env
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=your_mapbox_token
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:5000
```

#### 4. Start Development Server
```bash
pnpm dev
# or
npm run dev
```

Open your browser and visit [http://localhost:3000](http://localhost:3000)

## 🐳 Docker Deployment

### Local Docker Build and Run

#### 1. Build Docker Image
```bash
docker build \
  --build-arg NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_api_key \
  --build-arg NEXT_PUBLIC_API_BASE_URL=https://your-backend-url \
  -t disaster-response-australia:latest \
  .
```

#### 2. Run Docker Container
```bash
docker run -p 3000:3000 disaster-response-australia:latest
```

Access the application at [http://localhost:3000](http://localhost:3000)

#### 3. Using Environment Variable File (Recommended)

Create a build args file:
```bash
# Build with multiple args
docker build \
  --build-arg NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_api_key \
  --build-arg NEXT_PUBLIC_API_BASE_URL=https://your-backend-url.run.app \
  -t disaster-response-australia:latest \
  .

# Run container
docker run -p 3000:3000 disaster-response-australia:latest
```

### Docker Compose (Optional)

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  frontend:
    build:
      context: .
      args:
        NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: ${NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}
        NEXT_PUBLIC_API_BASE_URL: ${NEXT_PUBLIC_API_BASE_URL}
    ports:
      - "3000:3000"
    restart: unless-stopped
```

Run:
```bash
docker-compose up -d
```

## 📁 Project Structure

```
disaster-response-australia/
├── src/
│   ├── app/
│   │   ├── page.tsx                    # Homepage/Dashboard
│   │   ├── layout.tsx                  # Global layout
│   │   ├── globals.css                 # Global styles
│   │   │
│   │   ├── components/                 # Reusable components
│   │   │   ├── LoginModal.tsx          # Login modal
│   │   │   ├── map.tsx                 # Map component
│   │   │   ├── MapCore.tsx             # Map core logic
│   │   │   └── TextOverlay.ts          # Text overlay
│   │   │
│   │   ├── management/                 # Management page (Commander)
│   │   │   └── page.tsx                # Disaster area management
│   │   │
│   │   ├── console/                    # Console page (Responder)
│   │   │   └── page.tsx                # Responder console
│   │   │
│   │   ├── sos/                        # Emergency SOS system
│   │   │   └── page.tsx                # SOS entry page
│   │   │
│   │   ├── userLogin/                  # Emergency information entry
│   │   │   └── page.tsx                # Location and emergency info form
│   │   │
│   │   ├── confirmation/               # Confirmation page
│   │   │   └── page.tsx                # Help request confirmation
│   │   │
│   │   ├── firebase/                   # Firebase configuration
│   │   │   └── client.tsx              # Firebase client
│   │   │
│   │   └── services/                   # API services
│   │       └── populationApi.ts        # Population data API
│   │
│   └── __tests__/                      # Unit tests
│       ├── dashboard-page.test.tsx
│       ├── management-page.test.tsx
│       ├── console-page.test.tsx
│       └── ...
│
├── tests/                              # E2E tests
│   └── e2e/
│       ├── login.spec.ts
│       ├── map.spec.ts
│       └── theme.spec.ts
│
├── public/                             # Static assets
│   ├── logo.svg
│   ├── ambulance.svg
│   └── ...
│
├── Dockerfile                          # Docker build configuration
├── docker-compose.yml                  # Docker Compose config (optional)
│
├── package.json                        # Project dependencies
├── tsconfig.json                       # TypeScript configuration
├── next.config.ts                      # Next.js configuration
├── tailwind.config.ts                  # Tailwind CSS configuration
├── jest.config.ts                      # Jest configuration
├── playwright.config.ts                # Playwright configuration
│
├── .env.example                        # Environment variables template
└── README.md                           # Project documentation
```

## 🎯 Main Features

### 1. Dashboard (`/`)
- Real-time statistics display
- Active disaster area count
- Estimated affected population
- GPS-sharing survivors total
- Latest release information
- Interactive map view

### 2. Management System (`/management`)
**Commander-exclusive features**:
- Create disaster areas (draw polygons, rectangles, circles, freehand)
- Manage disaster area status (active/resolved)
- View survivor help reports
- Add text annotations on map
- Population data heatmap visualization
- Resolve disaster areas

### 3. Responder Console (`/console`)
**Responder-exclusive features**:
- Select disaster zones
- View device statistics
- Estimated affected population
- Geofence alerts
- Quick status markers (Safe/Medical/SOS)

### 4. Emergency SOS System (`/sos` → `/userLogin` → `/confirmation`)
**Public access**:
- One-click SOS button
- Three location input methods:
  - Google Places address search
  - GPS auto-location
  - Manual coordinate entry
- Emergency level selection (High/Medium/Low)
- Optional title and description
- Confirmation page showing rescue status

### 5. User Authentication
- Firebase email/password login
- Token-based session management
- Automatic token verification
- Sign out functionality

## 🛠️ Available Scripts

```bash
# Development
pnpm dev              # Start development server

# Build
pnpm build            # Production build

# Start
pnpm start            # Start production server

# Testing
pnpm test             # Run unit tests
pnpm test:cov         # Run tests with coverage report
pnpm e2e              # Run E2E tests
pnpm e2e:report       # Run E2E tests with HTML report

# Code Quality
pnpm lint             # Run ESLint checks
```

## 🔧 Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Google Maps API key | `AIza...` |
| `NEXT_PUBLIC_API_BASE_URL` | Backend API base URL | `https://api.example.com` |

### Optional Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` | Mapbox access token | `pk.eyJ...` |

### Google Maps API Requirements
Enable the following APIs in Google Cloud Console:
- Maps JavaScript API
- Places API
- Geocoding API

## 🌐 API Integration

The frontend communicates with the backend through the following endpoints:

### Authentication
- `GET /api/v1/users/verify-token` - Verify JWT token

### Disaster Areas
- `GET /api/v1/disaster_areas?status=active` - Get disaster area list
- `POST /api/v1/disaster_areas` - Create new disaster area
- `PATCH /api/v1/disaster_areas/{id}` - Update disaster area status

### Survivor Reports
- `GET /api/v1/survivor_reports` - Get help report list
- `POST /api/v1/survivor_reports` - Create new help report
- `DELETE /api/v1/survivor_reports/{id}` - Resolve help report

### Population Data
- `POST /api/v1/population_data` - Get area population data

All requests require the following header:
```
Authorization: Bearer {token}
```

## 🎨 Design Features

### Theme Support
- Automatic system dark/light mode adaptation
- Custom color scheme:
  - Primary: Deep blue (#0C1E3B)
  - Accent: Red (for emergency SOS)
  - Success: Green
  - Warning: Orange/Yellow

### Responsive Design
- Mobile-first design
- Optimized layouts for tablet and desktop
- Touch-friendly interactive elements

## 📝 Development Guidelines

### Branch Management (GitHub Flow)
- `main` - Main branch, always in deployable state
- `feature/<feature-name>` - New feature development
- `fix/<issue-description>` - Bug fixes
- `chore/<task>` - Build/dependency updates
- `docs/<documentation>` - Documentation changes
- `test/<testing>` - Test-related changes

### Commit Convention (Conventional Commits)
```
<type>(<scope>): <subject>

Examples:
feat(auth): add email login support
fix(map): resolve marker clustering bug
chore(deps): upgrade next to 15.5.3
docs(readme): update deployment guide
test(api): add population API tests
```

### Pull Request Requirements
- Pass all linting checks
- Pass all unit tests
- At least one team member review approval
- Address a single feature or issue
- Clear description and testing evidence

## 🧪 Testing

### Running Tests
```bash
# Unit tests
pnpm test

# Unit tests with coverage
pnpm test:cov

# E2E tests
pnpm e2e

# E2E tests with HTML report
pnpm e2e:report
```

### Test Coverage
The project includes comprehensive tests:
- Component unit tests (React Testing Library)
- Page integration tests
- E2E user flow tests (Playwright)
- API service tests

## 🔒 Security Considerations

1. **Environment Variables**: Never commit `.env.local` or files containing sensitive information to Git
2. **API Keys**: Manage using environment variables, use Secret Manager in Cloud Build
3. **Authentication**: All sensitive operations require Firebase authentication
4. **CORS**: Ensure backend properly configures CORS policies
5. **Token Management**: Tokens stored in HttpOnly cookies, regularly verified

## 🐛 Troubleshooting

### Common Issues

**Issue: Map fails to load**
- Check if `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is correctly set
- Confirm Google Maps APIs are enabled (Maps, Places, Geocoding)
- Check browser console for API key restriction errors

**Issue: Login fails**
- Check Firebase configuration is correct
- Confirm backend API address is correct
- Check network connection and CORS settings

**Issue: Docker build fails**
- Confirm all required build args are passed
- Check Docker version compatibility
- Review build logs for detailed error information

**Issue: Backend API connection fails**
- Check if `NEXT_PUBLIC_API_BASE_URL` is correct
- Confirm backend service is running
- Check firewall and network configuration
