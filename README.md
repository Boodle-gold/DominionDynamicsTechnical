# NYC Harbor Vessel Tracker

> **Dominion Dynamics Technical Assessment — Problem 1: Map-based Data Visualization**

Real-time visualization of vessel traffic in New York City Harbor, built with **React + Mapbox GL JS** (frontend) and **Django + Channels** (backend).

![Architecture](https://img.shields.io/badge/Architecture-Full_Stack-blue)
![Frontend](https://img.shields.io/badge/Frontend-React_+_Mapbox_GL_JS-61DAFB)
![Backend](https://img.shields.io/badge/Backend-Django_+_Channels-092E20)

---

## Features

### Core Requirements ✅
- **Real-time vessel tracking** — AIS data ingestion from [aisstream.io](https://aisstream.io) (WebSocket), with fallback movement simulation for demo reliability
- **Interactive map** — Mapbox GL JS with dark maritime theme, vessel markers color-coded by weight (tonnage)
- **Vessel detail panel** — Click any vessel for name, type, speed, heading, weight, flag, coordinates, and destination
- **Historical path visualization** — View trail breadcrumbs of a vessel's recent route
- **Interactive polygon zones** — Draw geofence zones on the map; vessels entering a zone turn red and trigger alerts
- **Zone alerts** — Toast notifications when vessels enter/exit zones, with alert history panel

### Beyond Requirements 🚀
- **Simulated drone deployment** — "Deploy Drone" from vessel detail panel; animated flight from Governors Island to vessel with observe/return cycle
- **WebSocket architecture** — Full duplex real-time communication (Django Channels → React)
- **Premium dark UI** — Glassmorphism panels, micro-animations, JetBrains Mono for data
- **Vessel search** — Filter sidebar by vessel name
- **Weight-based color coding** — Light (cyan) < 1K GT, Medium (amber) 1K–10K GT, Heavy (red) > 10K GT

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Frontend (React)                     │
│  MapView ─── VesselDetailPanel ─── Sidebar ─── Alerts   │
│      │              │                 │           │      │
│  Mapbox GL JS   useVessels()     useWebSocket()  API    │
└──────┬──────────────┬─────────────────┬──────────┬──────┘
       │              │    WebSocket    │   REST   │
       │              └────────┬────────┘    │     │
┌──────┴───────────────────────┴─────────────┴─────┴──────┐
│                   Backend (Django)                        │
│  DRF ViewSets ─── Channels Consumer ─── Zone Checker    │
│       │                  │                    │          │
│       └──────────┬───────┘                    │          │
│              SQLite DB    ←── AIS Ingestion ──┘          │
│                           ←── Vessel Simulator           │
└─────────────────────────────────────────────────────────┘
```

### Data Flow
1. **AIS Ingestion** (`ingest_ais` command) connects to aisstream.io WebSocket, filters for NYC Harbor bounding box, and writes positions to the database
2. **Vessel Simulator** (`move_vessels` command) moves seeded vessels with realistic patterns as a fallback
3. **Zone Checker** runs on each position update, detecting zone enter/exit events
4. **Django Channels** broadcasts updates to all connected frontends via WebSocket
5. **React** receives updates and re-renders the Mapbox GeoJSON source layers (no DOM markers — maximum performance)

### Key Design Decisions
| Decision | Rationale |
|----------|-----------|
| GeoJSON source layers vs. DOM markers | Much better performance with 15+ moving objects |
| Django Channels (in-memory) | Simplifies deployment; Redis can be swapped in for production |
| Shapely for geo ops | Battle-tested Python geometry library for point-in-polygon |
| Client-side drone animation | Smooth 60fps animation via `requestAnimationFrame` |
| Fallback simulator | Ensures demo always works regardless of AIS feed availability |

### Data Models
- **Vessel** — Identity, type, tonnage, flag, dimensions
- **VesselPosition** — Lat/lng, speed, heading, timestamp (indexed for trail queries)
- **Zone** — Name, GeoJSON polygon, color
- **ZoneAlert** — FK vessel → FK zone, enter/exit type, timestamp
- **DroneSimulation** — Start/current/target positions, status lifecycle

---

## Quick Start

### Prerequisites
- Python 3.9+
- Node.js 18+
- A free [Mapbox access token](https://account.mapbox.com/auth/signup/)
- (Optional) A free [aisstream.io API key](https://aisstream.io) for live AIS data

### 1. Backend Setup
```bash
cd backend

# Install dependencies
pip3 install django djangorestframework django-cors-headers channels daphne websockets shapely

# Run migrations & seed data
python3 manage.py migrate
python3 manage.py seed_vessels

# Start the backend (Daphne ASGI server for WebSocket support)
daphne -b 127.0.0.1 -p 8000 config.asgi:application
```

### 2. Frontend Setup
```bash
cd frontend

# Install dependencies
npm install

# Set your Mapbox token
echo "VITE_MAPBOX_TOKEN=your_token_here" > .env

# Start dev server
npm run dev
```

### 3. Start Vessel Movement (in a separate terminal)
```bash
cd backend

# Option A: Simulated movement (no AIS key needed)
python3 manage.py move_vessels

# Option B: Live AIS data
AIS_API_KEY=your_key python3 manage.py ingest_ais
```

### 4. Open the App
Navigate to **http://localhost:3000**

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/vessels/` | List all vessels with latest position |
| GET | `/api/vessels/:id/` | Vessel detail with recent positions |
| GET | `/api/vessels/:id/history/` | Historical position trail |
| GET | `/api/zones/` | List all zones |
| POST | `/api/zones/` | Create a polygon zone |
| DELETE | `/api/zones/:id/` | Delete a zone |
| GET | `/api/alerts/` | Recent zone alerts |
| POST | `/api/drone/deploy/` | Deploy simulated drone to vessel |
| WS | `/ws/vessels/` | Real-time vessel position updates |

---

## Project Structure

```
├── backend/
│   ├── config/           # Django project settings, ASGI, URLs
│   ├── vessels/
│   │   ├── models.py     # Vessel, VesselPosition, Zone, ZoneAlert, DroneSimulation
│   │   ├── views.py      # DRF ViewSets
│   │   ├── serializers.py
│   │   ├── consumers.py  # Django Channels WebSocket consumer
│   │   ├── routing.py    # WebSocket URL routing
│   │   ├── services/
│   │   │   └── zone_checker.py  # Point-in-polygon zone detection
│   │   └── management/commands/
│   │       ├── seed_vessels.py   # Seed 15 NYC Harbor vessels
│   │       ├── move_vessels.py   # Simulate vessel movement
│   │       └── ingest_ais.py     # Live AIS data ingestion
│   └── db.sqlite3
├── frontend/
│   ├── src/
│   │   ├── App.jsx               # Main orchestrator
│   │   ├── components/
│   │   │   ├── MapView.jsx       # Mapbox GL JS map
│   │   │   ├── VesselDetailPanel.jsx
│   │   │   ├── Sidebar.jsx       # Tabbed vessel/zone/alert panels
│   │   │   ├── AlertPanel.jsx    # Toast notifications
│   │   │   └── DroneAnimation.jsx
│   │   ├── hooks/
│   │   │   ├── useWebSocket.js   # Auto-reconnecting WebSocket
│   │   │   └── useVessels.js     # Vessel state management
│   │   ├── services/api.js       # REST API client
│   │   └── utils/
│   │       ├── colors.js         # Weight-to-color mapping
│   │       └── geo.js            # Point-in-polygon, interpolation
│   └── index.html
└── README.md
```

---

## Tradeoffs & Future Improvements

- **SQLite → PostgreSQL/PostGIS** — For production, PostGIS would enable native spatial queries and better performance for geo operations
- **In-memory channels → Redis** — Redis channel layer for multi-process deployments
- **Historical data cleanup** — Add a periodic task to prune old VesselPosition records
- **Clustering** — Implement marker clustering for zoom levels showing hundreds of vessels
- **Authentication** — Add user accounts for persistent zone configurations
- **Real drone telemetry** — Replace client-side animation with server-driven drone state machine

---

*Built for the Dominion Dynamics Technical Assessment*
