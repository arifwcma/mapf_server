# Wimmera Spectral - Mobile Server

Backend server for the Wimmera Spectral mobile application. Provides API endpoints for parcel data, vegetation index calculations, and share functionality.

## Prerequisites

- Node.js >= 18.0.0
- Google Earth Engine service account credentials

## Setup

1. Install dependencies:
```bash
npm install
```

2. Ensure the service account file is in place:
```
sensitive_resources/service-account.json
```

## Running the Server

Development mode (with auto-reload):
```bash
npm run dev
```

Production mode:
```bash
npm start
```

The server runs on port 3002 by default. Set the `PORT` environment variable to change it.

## API Endpoints

### Fields

**GET /api/fields/geojson**
- Query params: `bbox` (required), `zoom` (required)
- Returns GeoJSON FeatureCollection of parcels within the bounding box

### Index Data

**GET/POST /api/index/area/month**
- Get average vegetation index value for an area for a specific month
- Params: `year`, `month`, `bbox`, `cloud` (optional), `geometry` (optional), `index` (optional)

**GET/POST /api/index/average**
- Get tile URL or thumbnail URL for vegetation index overlay
- Params: `start`, `end`, `bbox`, `cloud` (optional), `geometry` (optional), `index` (optional), `thumbnail` (optional), `dimensions` (optional)

### Share

**POST /api/share/save**
- Save application state and get a share token
- Body: JSON object with state data

**GET /api/share/:token**
- Retrieve saved state by token

### Health Check

**GET /health**
- Returns server status

## Supported Indices

- NDVI (Normalized Difference Vegetation Index)
- EVI (Enhanced Vegetation Index)
- SAVI (Soil-Adjusted Vegetation Index)
- OSAVI (Optimized Soil-Adjusted Vegetation Index)
- GNDVI (Green Normalized Difference Vegetation Index)
- NDSI (Normalized Difference Snow Index)
- ARVI (Atmospherically Resistant Vegetation Index)
- NDWI (Normalized Difference Water Index)
- MNDWI (Modified Normalized Difference Water Index)

## Data Sources

- **Sentinel-2** (dates >= January 2019): High resolution (10m)
- **MODIS** (dates < January 2019): Lower resolution (250-500m)

