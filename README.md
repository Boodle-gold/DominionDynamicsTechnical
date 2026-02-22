# Baltic Sea Shipping and Boat tracker for Dominion Dynamics Technical
Real-time visualization of vessel traffic in the Baltic Sea, built with **React + Mapbox GL JS** (frontend) and **Django + Channels** (backend).

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
