import { useState, useEffect, useRef, useCallback } from 'react';
import { interpolate, haversineDistance, bearing } from '../utils/geo.js';

/**
 * Drone animation hook — handles the animation of a drone
 * from Föglö Island base to target vessel position, with visible orbit on arrival.
 * Dismiss sends it back along the path, erasing the trail as it returns.
 */

// Föglö Island, Åland — drone base location
export const DRONE_BASE = { lat: 60.0167, lng: 20.3833 };

const DRONE_SPEED_KMH = 150;          // slower, more realistic observation drone
const MIN_TRANSIT_MS = 4000;         // floor so short trips are still visible
const MAX_TRANSIT_MS = 90000;        // cap so far trips aren't tedious
const ORBIT_RADIUS = 0.005;        // ~500 m in degrees
const ORBIT_PERIOD_MS = 4000;         // full circle every 4 s

export function useDrone() {
    const [droneState, setDroneState] = useState(null);
    const animFrameRef = useRef(null);

    const deployDrone = useCallback((startLat, startLng, targetLat, targetLng, vesselName) => {
        // Cancel any existing animation
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);

        const start = [startLng, startLat];
        const end = [targetLng, targetLat];

        // Distance-based travel time at DRONE_SPEED_KMH
        const distKm = haversineDistance(startLat, startLng, targetLat, targetLng);
        const rawMs = (distKm / DRONE_SPEED_KMH) * 3_600_000;
        const duration = Math.max(MIN_TRANSIT_MS, Math.min(MAX_TRANSIT_MS, rawMs));

        const heading = bearing(startLat, startLng, targetLat, targetLng);
        const startTime = performance.now();

        setDroneState({
            vesselName,
            status: 'in_transit',
            position: { lat: startLat, lng: startLng },
            heading,
            // Store base + target for flight path rendering
            baseLat: startLat,
            baseLng: startLng,
            targetLat,
            targetLng,
            // pathProgress: 1 = full path visible, shrinks to 0 on return
            pathProgress: 1,
        });

        function animate(now) {
            const elapsed = now - startTime;
            const t = Math.min(elapsed / duration, 1);
            // Ease-in-out
            const eased = t < 0.5
                ? 2 * t * t
                : -1 + (4 - 2 * t) * t;

            const [lng, lat] = interpolate(start, end, eased);
            const hdg = bearing(lat, lng, targetLat, targetLng);

            setDroneState(prev => ({
                ...prev,
                position: { lat, lng },
                heading: hdg,
                status: t >= 1 ? 'orbiting' : 'in_transit',
            }));

            if (t < 1) {
                animFrameRef.current = requestAnimationFrame(animate);
            } else {
                // Transition to orbit
                startOrbit(targetLat, targetLng, vesselName, startLat, startLng);
            }
        }

        animFrameRef.current = requestAnimationFrame(animate);
    }, []);

    const startOrbit = useCallback((centerLat, centerLng, vesselName, baseLat, baseLng) => {
        const orbitStart = performance.now();

        function orbit(now) {
            const elapsed = now - orbitStart;
            const angle = ((elapsed % ORBIT_PERIOD_MS) / ORBIT_PERIOD_MS) * Math.PI * 2;

            const lat = centerLat + ORBIT_RADIUS * Math.cos(angle);
            const lng = centerLng + ORBIT_RADIUS * Math.sin(angle);

            // Face toward the vessel (center of orbit)
            const hdg = bearing(lat, lng, centerLat, centerLng);

            setDroneState(prev => ({
                ...prev,
                position: { lat, lng },
                heading: hdg,
                status: 'orbiting',
            }));

            animFrameRef.current = requestAnimationFrame(orbit);
        }

        animFrameRef.current = requestAnimationFrame(orbit);
    }, []);

    const dismissDrone = useCallback(() => {
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);

        // Read current state to get coords for return trip
        setDroneState(prev => {
            if (!prev) return null;

            const { position, baseLat, baseLng, vesselName } = prev;

            // Start return animation (current position → base)
            const start = [position.lng, position.lat];
            const end = [baseLng, baseLat];
            const distKm = haversineDistance(position.lat, position.lng, baseLat, baseLng);
            const rawMs = (distKm / DRONE_SPEED_KMH) * 3_600_000;
            const duration = Math.max(MIN_TRANSIT_MS, Math.min(MAX_TRANSIT_MS, rawMs));
            const startTime = performance.now();

            function animateReturn(now) {
                const elapsed = now - startTime;
                const t = Math.min(elapsed / duration, 1);
                const eased = t < 0.5
                    ? 2 * t * t
                    : -1 + (4 - 2 * t) * t;

                const [lng, lat] = interpolate(start, end, eased);
                const hdg = bearing(lat, lng, baseLat, baseLng);

                if (t >= 1) {
                    // Arrived at base — clear everything
                    setDroneState(null);
                    return;
                }

                setDroneState(prev2 => prev2 ? ({
                    ...prev2,
                    position: { lat, lng },
                    heading: hdg,
                    status: 'returning',
                    // Shrink path from target end toward base as drone returns
                    // pathStart moves from target toward base (the drone position)
                    pathProgress: 1 - eased,
                }) : null);

                animFrameRef.current = requestAnimationFrame(animateReturn);
            }

            animFrameRef.current = requestAnimationFrame(animateReturn);

            return {
                ...prev,
                status: 'returning',
                pathProgress: 1,
            };
        });
    }, []);

    useEffect(() => {
        return () => {
            if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        };
    }, []);

    return { droneState, deployDrone, dismissDrone };
}

/**
 * Drone status bar component displayed during active drone missions.
 */
export function DroneStatusBar({ droneState, onDismiss }) {
    if (!droneState) return null;

    const statusLabels = {
        in_transit: 'In Transit',
        orbiting: 'Orbiting',
        returning: 'Returning',
    };

    return (
        <div className="drone-status-bar">
            <span className="drone-status-icon">
                <svg width="22" height="22" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <line x1="24" y1="10" x2="24" y2="38" stroke="currentColor" strokeWidth="2.5" />
                    <line x1="10" y1="24" x2="38" y2="24" stroke="currentColor" strokeWidth="2.5" />
                    <circle cx="24" cy="24" r="4" fill="currentColor" />
                    <circle cx="10" cy="10" r="6" stroke="currentColor" strokeWidth="2" fill="none" />
                    <circle cx="38" cy="10" r="6" stroke="currentColor" strokeWidth="2" fill="none" />
                    <circle cx="10" cy="38" r="6" stroke="currentColor" strokeWidth="2" fill="none" />
                    <circle cx="38" cy="38" r="6" stroke="currentColor" strokeWidth="2" fill="none" />
                </svg>
            </span>
            <span className="drone-status-text">
                <strong>{statusLabels[droneState.status] || droneState.status}</strong>
                {' → '}{droneState.vesselName}
            </span>
            {droneState.status !== 'returning' && (
                <button className="btn btn-small btn-danger" onClick={onDismiss}>
                    Dismiss
                </button>
            )}
        </div>
    );
}

