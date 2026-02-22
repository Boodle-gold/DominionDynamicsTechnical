# Dominion Dynamics Technical Documentation

This document provides a comprehensive breakdown of the "Boating in the Baltics" application architecture, file structure, and deployment pipelines.

## 1. System Architecture Overview

The application uses a **decoupled architecture**:
*   **Frontend (Vercel):** A React SPA (Single Page Application) built with Vite. It handles all UI rendering, WebSocket subscriptions, Mapbox GL JS map integration, and user interactions.
*   **Backend (Render):** A Django application running Daphne (an ASGI server) to support both standard REST HTTP requests and persistent WebSockets via Django Channels and Redis.
*   **Database:** A single SQLite database (`db.sqlite3`) for simplicity on the Free Tier, though it resets on deployment because Render Free Web Services have ephemeral filesystems. 

---

## 2. Infrastructure & Deployment Pipelines

### How the Frontend Works (Vercel)
Vercel is optimized for static sites and serverless functions, but does **not** natively support persistent WebSockets. Therefore, the frontend is deployed as a purely static React/Vite bundle. 

1. **Build Process:** When code is pushed to the `main` branch, Vercel detects the Vite project, runs `npm install`, and executes `npm run build`.
2. **Serving:** The resulting static HTML/JS/CSS files are distributed globally across Vercel's Edge Network.
3. **Connecting to Backend:** Because Vercel can't hold WebSocket connections open for the live vessel tracking, the React app uses Environment Variables (`VITE_API_URL` and `VITE_WS_URL`) to securely point all REST and WebSocket traffic directly to the Render backend URL instead of trying to route them through Vercel.

### How the Backend Works (Render)
Render acts as the heavy-lifter. It runs a traditional "always-on" server capable of maintaining thousands of open WebSockets for real-time ship movements.

1. **Build Process (`render.yaml`):** Render reads the blueprint file, spins up a Python 3.13 environment, installs dependencies `pip install -r requirements.txt`, and runs database migrations.
2. **Background Processes:** Render's `startCommand` uses bash background operators (`&`) to simultaneously launch three things in the same container:
    *   `python manage.py ingest_ais &`: Connects to the external AISStream.io feed and continuously pipes live Baltic Sea ship data into the database.
    *   `python manage.py ingest_helcom &`: Parses the static `ports.csv` dataset, deduplicates the ports geographically, filters them to the `BALTIC_BOUNDS`, and populates the database.
    *   `daphne -b 0.0.0.0 -p $PORT config.asgi:application`: Starts the ASGI web server to listen for frontend traffic.
3. **Channels & Redis:** A free Render Redis instance (`channels-redis`) acts as the message broker. When the AIS ingestion script saves a new ship coordinate, it broadcasts a message to the Redis channel layer. Daphne instantly forwards this message through the open WebSockets to all connected Vercel frontend clients.

---

## 3. Frontend Files (`/frontend`)

### Root Configuration
*   `index.html`: The HTML entry point. Contains the `<div id="root">` and imports fonts and Mapbox CSS. Updated with the "Boating in the Baltics" meta description.
*   `package.json` / `package-lock.json`: Defines the Vite/React dependencies, scripts (`npm run dev`), and project name.
*   `vite.config.js`: Vite build configuration.
*   `.env.development`: (Local only) Overrides the Vercel API URLs so local Vite development hits the local `localhost:8000` Django server.

### Application Source (`/frontend/src/`)
*   `main.jsx`: React root renderer. Imports globals.
*   `index.css`: The global stylesheet. Contains the strict black, white, and gray styling, glassmorphism panel aesthetics, Mapbox UI overrides, and custom layout variables.
*   `App.jsx`: The root component. It initializes the WebSocket hook, fetches initial state (ports, vessels, zones, alerts), handles selection state, and coordinates the layout between the Map, Sidebar, and detail panels. It also contains the header branding.

### Components (`/frontend/src/components/`)
*   `MapView.jsx`: The core map interface relying on `react-map-gl`. Handles rendering the GeoJSON layers, the white SVG Anchor port icons, live vessel arrows, drawn polygon zones, and clicking interactions.
*   `Sidebar.jsx`: The right-sided dashboard. Contains tabs for searching/filtering the live vessel list, viewing saved tracking zones, and reading alerts.
*   `VesselDetailPanel.jsx`: Slide-out panel showing specific ship data (Speed, Heading, MMSI, dimensions).
*   `PortDetailPanel.jsx`: Slide-out panel showing cleanly formatted stationary port data (Latitude/Longitude, Water Quality, Traffic Congestion).
*   `AlertPanel.jsx`: Centralized popup system for system warnings (e.g., vessel entered/exited a tracking zone).
*   `DroneAnimation.jsx`: Manages the complex state, math, and Mapbox layer rendering for the animated quadrotor drone that flies from Föglö Island to intercept specific vessels.

### Hooks, Utils & Services
*   `hooks/useWebSocket.js`: Manages the persistent WebSocket connection, auto-reconnecting on drops and triggering React state updates when live AIS data arrives.
*   `hooks/useVessels.js`: React hook to seamlessly merge initial REST API vessel data with the continuous stream of WebSocket updates.
*   `hooks/usePorts.js`: Simple hook to fetch and intelligently cache the static HELCOM port data from the Django API.
*   `services/api.js`: Wrapper around `fetch()` for all REST HTTP requests to the Django backend.
*   `utils/geo.js`: Math utility to calculate bearing/trajectory angles for the drone animation.
*   `utils/colors.js`: Standardizes vessel types and tonnage formatting.

---

## 4. Backend Files (`/backend`)

### Core Configuration (`/backend/config/`)
*   `settings.py`: The heart of Django. Configures the database (SQLite), Channel Layers (Redis via `REDIS_URL`), Allowed Hosts/CORS for Vercel, and custom bounding boxes like `BALTIC_BOUNDS`.
*   `urls.py`: Maps core domain routes to the `vessels` app.
*   `asgi.py`: The asynchronous server entrypoint for Daphne (handles both HTTP and WebSockets).
*   `wsgi.py`: Traditional synchronous server entrypoint (unused in this ASGI setup).

### Vessels Application (`/backend/vessels/`)
*   `models.py`: Defines the database schema: `Vessel`, `VesselHistory` (trail data), `Zone` (polygons), `Alert` (geo-fence triggers), and `Port` (HELCOM data).
*   `views.py`: Standard Django REST Framework views to handle HTTP requests (e.g., fetching lists of vessels, creating a new zone polygon, fetching ports).
*   `urls.py`: Routes specific REST API endpoints to the views.
*   `serializers.py`: Converts complex Python models (like a `Vessel` or a geometric `Zone`) into JSON for the frontend.
*   `consumers.py`: The Django Channels equivalent of a view. Handles the WebSocket lifecycle: accepting connections, adding clients to the "vessel_updates" Redis group, and pushing JSON updates to them.
*   `routing.py`: Maps the `/ws/vessels/` URL specifically to the WebSocket Consumer.

### Background Ingestion (`/backend/vessels/management/commands/`)
*   `ingest_ais.py`: Opens an external WebSocket to AISStream.io, filtering for ships inside `BALTIC_BOUNDS`. When a message arrives, it saves it to the SQLite `Vessel` database table, checks if the ship triggered any geo-fence `Zone` alerts, and broadcasts the live movement over Redis to the frontend via Django Channels.
*   `ingest_helcom.py`: A script that parses the static `vessels/data/ports.csv` library, mathematically calculates centroids to deduplicate heavily localized markers, filters the points through the `BALTIC_BOUNDS`, and populates the `Port` table. 
*   `clear_vessels.py`: Utility to wipe old vessel data.
