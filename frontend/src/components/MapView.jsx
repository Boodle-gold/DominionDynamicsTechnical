import React, { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';
import { getVesselColor } from '../utils/colors.js';
import { createZone } from '../services/api.js';
import { DRONE_BASE } from './DroneAnimation.jsx';

// You'll need a Mapbox token — set VITE_MAPBOX_TOKEN in a .env file
mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || '';

const ARCTIC_CENTER = [20, 59];
const ARCTIC_ZOOM = 4;



export default function MapView({
    vessels,
    selectedVesselId,
    focusZoomLevel,
    onSelectVessel,
    vesselInZone,
    zones,
    onZoneCreated,
    historyTrail,
    droneState,
}) {
    const mapContainerRef = useRef(null);
    const mapRef = useRef(null);
    const drawRef = useRef(null);
    const markersRef = useRef({});
    const [mapLoaded, setMapLoaded] = useState(false);

    // Initialize map
    useEffect(() => {
        if (mapRef.current) return;

        const map = new mapboxgl.Map({
            container: mapContainerRef.current,
            style: 'mapbox://styles/mapbox/dark-v11',
            center: ARCTIC_CENTER,
            zoom: ARCTIC_ZOOM,
            pitch: 0,
            bearing: 0,
            antialias: true,
            projection: 'globe',
        });

        // Globe atmosphere styling
        map.on('style.load', () => {
            map.setFog({
                color: 'rgb(10, 14, 23)',
                'high-color': 'rgb(20, 30, 60)',
                'horizon-blend': 0.08,
                'space-color': 'rgb(5, 5, 15)',
                'star-intensity': 0.6,
            });
        });

        // Add navigation controls
        map.addControl(new mapboxgl.NavigationControl(), 'bottom-right');

        // Add draw controls for zones
        const draw = new MapboxDraw({
            displayControlsDefault: false,
            controls: {
                polygon: true,
                trash: false,
            },
            defaultMode: 'simple_select',
            styles: [
                {
                    id: 'gl-draw-polygon-fill',
                    type: 'fill',
                    filter: ['all', ['==', '$type', 'Polygon'], ['!=', 'mode', 'static']],
                    paint: {
                        'fill-color': '#ff9500',
                        'fill-outline-color': '#ff9500',
                        'fill-opacity': 0.15,
                    },
                },
                {
                    id: 'gl-draw-polygon-stroke',
                    type: 'line',
                    filter: ['all', ['==', '$type', 'Polygon'], ['!=', 'mode', 'static']],
                    paint: {
                        'line-color': '#ff9500',
                        'line-width': 2,
                    },
                },
                {
                    id: 'gl-draw-polygon-point',
                    type: 'circle',
                    filter: ['all', ['==', '$type', 'Point'], ['==', 'meta', 'vertex']],
                    paint: {
                        'circle-radius': 5,
                        'circle-color': '#ff9500',
                    },
                },
                {
                    id: 'gl-draw-polygon-midpoint',
                    type: 'circle',
                    filter: ['all', ['==', '$type', 'Point'], ['==', 'meta', 'midpoint']],
                    paint: {
                        'circle-radius': 3,
                        'circle-color': '#ff9500',
                    },
                },
            ],
        });

        map.addControl(draw, 'top-right');
        drawRef.current = draw;

        // Handle zone creation
        map.on('draw.create', async (e) => {
            const feature = e.features[0];
            if (feature.geometry.type === 'Polygon') {
                // Auto-name: Zone A, Zone B, etc.
                const letter = String.fromCharCode(65 + (zones?.length || 0) % 26);
                const name = `Zone ${letter}`;
                try {
                    await createZone({
                        name,
                        polygon: feature.geometry,
                        color: '#ff9500',
                    });
                    onZoneCreated?.();
                } catch (err) {
                    console.error('Failed to create zone:', err);
                }
                // Remove from draw - we'll render via source
                draw.deleteAll();
            }
        });

        map.on('load', () => {
            // Create arrow icon for vessels
            const size = 32;
            const canvas = document.createElement('canvas');
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext('2d');
            // Draw an upward-pointing triangle (will be rotated by heading)
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.moveTo(size / 2, 2);           // top point
            ctx.lineTo(size - 4, size - 4);    // bottom right
            ctx.lineTo(size / 2, size - 10);   // notch
            ctx.lineTo(4, size - 4);           // bottom left
            ctx.closePath();
            ctx.fill();
            const imageData = ctx.getImageData(0, 0, size, size);
            map.addImage('vessel-arrow', imageData, { sdf: true });

            // Add vessel source
            map.addSource('vessels', {
                type: 'geojson',
                data: { type: 'FeatureCollection', features: [] },
            });

            // Vessel arrows — symbol layer with rotation
            map.addLayer({
                id: 'vessel-arrows',
                type: 'symbol',
                source: 'vessels',
                layout: {
                    'icon-image': 'vessel-arrow',
                    'icon-size': [
                        'interpolate', ['linear'], ['zoom'],
                        1, 0.25,
                        4, 0.4,
                        8, 0.55,
                        14, 0.7,
                        18, 1.0,
                    ],
                    'icon-rotate': ['get', 'heading'],
                    'icon-rotation-alignment': 'map',
                    'icon-allow-overlap': true,
                    'icon-ignore-placement': true,
                },
                paint: {
                    'icon-color': ['get', 'color'],
                    'icon-halo-color': [
                        'case',
                        ['get', 'inZone'], '#ff3b5c',
                        ['get', 'selected'], '#ffffff',
                        'rgba(0,0,0,0.6)',
                    ],
                    'icon-halo-width': 1.5,
                    'icon-opacity': 0.95,
                },
            });

            // Vessel labels
            map.addLayer({
                id: 'vessel-labels',
                type: 'symbol',
                source: 'vessels',
                layout: {
                    'text-field': ['get', 'name'],
                    'text-font': ['DIN Pro Medium', 'Arial Unicode MS Regular'],
                    'text-size': 11,
                    'text-offset': [0, 1.8],
                    'text-anchor': 'top',
                    'text-max-width': 10,
                    'text-allow-overlap': false,
                },
                paint: {
                    'text-color': '#e8ecf4',
                    'text-halo-color': '#0a0e17',
                    'text-halo-width': 1.5,
                },
                minzoom: 5,
            });

            // History trail source+layer
            map.addSource('history-trail', {
                type: 'geojson',
                data: { type: 'FeatureCollection', features: [] },
            });

            map.addLayer({
                id: 'history-trail-line',
                type: 'line',
                source: 'history-trail',
                paint: {
                    'line-color': '#ffffff',
                    'line-width': 3,
                    'line-opacity': 0.7,
                    'line-dasharray': [2, 2],
                },
            });

            // Zone source+layer
            map.addSource('zones-fill', {
                type: 'geojson',
                data: { type: 'FeatureCollection', features: [] },
            });

            map.addLayer({
                id: 'zones-fill-layer',
                type: 'fill',
                source: 'zones-fill',
                paint: {
                    'fill-color': ['get', 'color'],
                    'fill-opacity': 0.12,
                },
            });

            map.addLayer({
                id: 'zones-outline-layer',
                type: 'line',
                source: 'zones-fill',
                paint: {
                    'line-color': ['get', 'color'],
                    'line-width': 2,
                    'line-opacity': 0.8,
                },
            });

            // Zone labels
            map.addLayer({
                id: 'zones-label-layer',
                type: 'symbol',
                source: 'zones-fill',
                layout: {
                    'text-field': ['get', 'name'],
                    'text-font': ['DIN Pro Bold', 'Arial Unicode MS Bold'],
                    'text-size': 13,
                },
                paint: {
                    'text-color': '#ff9500',
                    'text-halo-color': '#0a0e17',
                    'text-halo-width': 2,
                },
            });

            // ── Drone icon (quadrotor silhouette) ────────────
            const droneSize = 48;
            const dc = document.createElement('canvas');
            dc.width = droneSize;
            dc.height = droneSize;
            const dctx = dc.getContext('2d');
            const cx = droneSize / 2;
            const cy = droneSize / 2;
            const armLen = 16;
            const rotorR = 7;

            // Arms (X shape)
            dctx.strokeStyle = '#ffffff';
            dctx.lineWidth = 2.5;
            dctx.lineCap = 'round';
            [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([dx, dy]) => {
                dctx.beginPath();
                dctx.moveTo(cx, cy);
                dctx.lineTo(cx + dx * armLen, cy + dy * armLen);
                dctx.stroke();
            });

            // Center body
            dctx.fillStyle = '#aaaaaa';
            dctx.beginPath();
            dctx.arc(cx, cy, 4, 0, Math.PI * 2);
            dctx.fill();

            // Rotors (circles at arm tips)
            dctx.strokeStyle = '#ffffff';
            dctx.lineWidth = 1.5;
            [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([dx, dy]) => {
                dctx.beginPath();
                dctx.arc(cx + dx * armLen, cy + dy * armLen, rotorR, 0, Math.PI * 2);
                dctx.stroke();
            });

            // Front indicator (small triangle at top)
            dctx.fillStyle = '#ffffff';
            dctx.beginPath();
            dctx.moveTo(cx, cy - 7);
            dctx.lineTo(cx - 3, cy - 3);
            dctx.lineTo(cx + 3, cy - 3);
            dctx.closePath();
            dctx.fill();

            map.addImage('drone-icon', { width: droneSize, height: droneSize, data: dctx.getImageData(0, 0, droneSize, droneSize).data });

            // Drone source+layer
            map.addSource('drone', {
                type: 'geojson',
                data: { type: 'FeatureCollection', features: [] },
            });

            // Pulse ring (keep as circle)
            map.addLayer({
                id: 'drone-pulse',
                type: 'circle',
                source: 'drone',
                paint: {
                    'circle-radius': 22,
                    'circle-color': 'transparent',
                    'circle-stroke-width': 2,
                    'circle-stroke-color': '#ffffff',
                    'circle-stroke-opacity': 0.4,
                },
            });

            // Drone icon symbol layer
            map.addLayer({
                id: 'drone-marker',
                type: 'symbol',
                source: 'drone',
                layout: {
                    'icon-image': 'drone-icon',
                    'icon-size': [
                        'interpolate', ['linear'], ['zoom'],
                        1, 0.5,
                        6, 0.7,
                        12, 1.0,
                    ],
                    'icon-rotate': ['get', 'heading'],
                    'icon-rotation-alignment': 'map',
                    'icon-allow-overlap': true,
                    'icon-ignore-placement': true,
                },
            });

            // ── Drone base icon (simple house) ────────────
            const baseSize = 40;
            const bc = document.createElement('canvas');
            bc.width = baseSize;
            bc.height = baseSize;
            const bctx = bc.getContext('2d');
            const bcx = baseSize / 2;

            // House body (rectangle)
            bctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            bctx.strokeStyle = '#ffffff';
            bctx.lineWidth = 2;
            bctx.beginPath();
            bctx.rect(bcx - 10, 20, 20, 14);
            bctx.fill();
            bctx.stroke();

            // Roof (triangle)
            bctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
            bctx.beginPath();
            bctx.moveTo(bcx, 6);
            bctx.lineTo(bcx - 14, 21);
            bctx.lineTo(bcx + 14, 21);
            bctx.closePath();
            bctx.fill();
            bctx.stroke();

            // Door (small rect)
            bctx.fillStyle = '#ffffff';
            bctx.fillRect(bcx - 3, 26, 6, 8);

            map.addImage('drone-base-icon', { width: baseSize, height: baseSize, data: bctx.getImageData(0, 0, baseSize, baseSize).data });

            // Drone base marker source+layer
            map.addSource('drone-base', {
                type: 'geojson',
                data: { type: 'FeatureCollection', features: [] },
            });

            map.addLayer({
                id: 'drone-base-marker',
                type: 'symbol',
                source: 'drone-base',
                layout: {
                    'icon-image': 'drone-base-icon',
                    'icon-size': [
                        'interpolate', ['linear'], ['zoom'],
                        1, 0.5,
                        6, 0.8,
                        12, 1.0,
                    ],
                    'icon-allow-overlap': true,
                    'icon-ignore-placement': true,
                },
            });



            // Drone flight path source+layer
            map.addSource('drone-path', {
                type: 'geojson',
                data: { type: 'FeatureCollection', features: [] },
            });

            map.addLayer({
                id: 'drone-path-line',
                type: 'line',
                source: 'drone-path',
                paint: {
                    'line-color': '#ffffff',
                    'line-width': 2,
                    'line-opacity': 0.5,
                    'line-dasharray': [4, 4],
                },
            });

            // Click handler for vessels
            map.on('click', 'vessel-arrows', (e) => {
                const feature = e.features[0];
                if (feature) {
                    onSelectVessel?.(feature.properties.vesselId);
                }
            });

            // Hover cursor
            map.on('mouseenter', 'vessel-arrows', () => {
                map.getCanvas().style.cursor = 'pointer';
            });
            map.on('mouseleave', 'vessel-arrows', () => {
                map.getCanvas().style.cursor = '';
            });

            setMapLoaded(true);
        });

        mapRef.current = map;

        return () => {
            map.remove();
            mapRef.current = null;
        };
    }, []);

    // Update vessel markers on map
    useEffect(() => {
        if (!mapLoaded || !mapRef.current) return;
        const map = mapRef.current;
        const source = map.getSource('vessels');
        if (!source) return;

        const features = Object.values(vessels)
            .filter(v => v.latitude && v.longitude)
            .map(v => {
                // AIS heading 511 = "not available"; fall back to COG
                // For stationary vessels (< 0.1 kn), keep last known heading or 0
                let heading = v.heading;
                if (heading === 511 || heading == null) {
                    heading = (v.speed || 0) >= 0.1 ? (v.course || 0) : 0;
                }
                return {
                    type: 'Feature',
                    geometry: {
                        type: 'Point',
                        coordinates: [v.longitude, v.latitude],
                    },
                    properties: {
                        vesselId: v.id,
                        name: v.name,
                        color: getVesselColor(v.speed || 0),
                        heading,
                        selected: v.id === selectedVesselId,
                        inZone: vesselInZone.has(v.id),
                    },
                };
            });

        source.setData({ type: 'FeatureCollection', features });
    }, [vessels, selectedVesselId, vesselInZone, mapLoaded]);

    // Pan to selected vessel
    useEffect(() => {
        if (!mapLoaded || !mapRef.current || !selectedVesselId) return;
        const v = vessels[selectedVesselId];
        if (v && v.latitude && v.longitude) {
            mapRef.current.flyTo({
                center: [v.longitude, v.latitude],
                zoom: focusZoomLevel || 6,
                essential: true,
                duration: 1500,
            });
        }
    }, [selectedVesselId, focusZoomLevel, mapLoaded]);

    // Update zones on map
    useEffect(() => {
        if (!mapLoaded || !mapRef.current) return;
        const map = mapRef.current;
        const source = map.getSource('zones-fill');
        if (!source) return;

        const features = (zones || []).map(z => ({
            type: 'Feature',
            geometry: z.polygon,
            properties: {
                name: z.name,
                color: z.color || '#ff9500',
            },
        }));

        source.setData({ type: 'FeatureCollection', features });
    }, [zones, mapLoaded]);

    // Update history trail
    useEffect(() => {
        if (!mapLoaded || !mapRef.current) return;
        const map = mapRef.current;
        const source = map.getSource('history-trail');
        if (!source) return;

        if (historyTrail && historyTrail.length > 1) {
            const coordinates = historyTrail.map(p => [p.longitude, p.latitude]);
            source.setData({
                type: 'FeatureCollection',
                features: [{
                    type: 'Feature',
                    geometry: { type: 'LineString', coordinates },
                }],
            });
        } else {
            source.setData({ type: 'FeatureCollection', features: [] });
        }
    }, [historyTrail, mapLoaded]);

    // Update drone position + heading + path + base
    useEffect(() => {
        if (!mapLoaded || !mapRef.current) return;
        const map = mapRef.current;
        const droneSource = map.getSource('drone');
        const pathSource = map.getSource('drone-path');
        const baseSource = map.getSource('drone-base');
        if (!droneSource) return;

        if (droneState?.position) {
            // Drone icon
            droneSource.setData({
                type: 'FeatureCollection',
                features: [{
                    type: 'Feature',
                    geometry: {
                        type: 'Point',
                        coordinates: [droneState.position.lng, droneState.position.lat],
                    },
                    properties: {
                        heading: droneState.heading || 0,
                    },
                }],
            });

            // Flight path line (dynamic from drone to destination)
            if (pathSource && droneState.position && droneState.targetLat != null) {
                let pathCoords = null;
                if (droneState.status === 'in_transit') {
                    pathCoords = [
                        [droneState.position.lng, droneState.position.lat],
                        [droneState.targetLng, droneState.targetLat],
                    ];
                } else if (droneState.status === 'returning') {
                    pathCoords = [
                        [droneState.position.lng, droneState.position.lat],
                        [droneState.baseLng, droneState.baseLat],
                    ];
                }

                if (pathCoords) {
                    pathSource.setData({
                        type: 'FeatureCollection',
                        features: [{
                            type: 'Feature',
                            geometry: {
                                type: 'LineString',
                                coordinates: pathCoords,
                            },
                        }],
                    });
                } else {
                    pathSource.setData({ type: 'FeatureCollection', features: [] });
                }
            }

            // Base marker
            if (baseSource && droneState.baseLat != null) {
                baseSource.setData({
                    type: 'FeatureCollection',
                    features: [{
                        type: 'Feature',
                        geometry: {
                            type: 'Point',
                            coordinates: [droneState.baseLng, droneState.baseLat],
                        },
                    }],
                });
            }
        } else {
            droneSource.setData({ type: 'FeatureCollection', features: [] });
            if (pathSource) pathSource.setData({ type: 'FeatureCollection', features: [] });
            if (baseSource) baseSource.setData({ type: 'FeatureCollection', features: [] });
        }
    }, [droneState, mapLoaded]);

    // Fly to selected vessel
    useEffect(() => {
        if (!mapLoaded || !mapRef.current || !selectedVesselId) return;
        const vessel = vessels[selectedVesselId];
        if (vessel?.latitude && vessel?.longitude) {
            mapRef.current.flyTo({
                center: [vessel.longitude, vessel.latitude],
                zoom: 8,
                duration: 1500,
            });
        }
    }, [selectedVesselId, mapLoaded]);

    return (
        <div className="map-container" ref={mapContainerRef}>
            {!mapLoaded && (
                <div className="loading-overlay">
                    <div className="loading-spinner" />
                    <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Loading map...</span>
                </div>
            )}
            <div className="map-legend">
                <div className="legend-title">Vessels</div>
                <div className="legend-item">
                    <div className="legend-dot" style={{ background: '#7a8ba8' }} />
                    <span>Stationary</span>
                </div>
                <div className="legend-item">
                    <div className="legend-dot" style={{ background: '#00e5ff' }} />
                    <span>Slow (1–5 kn)</span>
                </div>
                <div className="legend-item">
                    <div className="legend-dot" style={{ background: '#ffab40' }} />
                    <span>Moderate (5–12 kn)</span>
                </div>
                <div className="legend-item">
                    <div className="legend-dot" style={{ background: '#ff1744' }} />
                    <span>Fast (&gt;12 kn)</span>
                </div>

            </div>
        </div>
    );
}
