/**
 * REST API client for the Django backend.
 */

// Use environment variable if provided (for Vercel deployment), else fallback to default proxy
const API_BASE = import.meta.env.VITE_API_URL || '/api';

async function request(path, options = {}) {
    const url = `${API_BASE}${path}`;
    const res = await fetch(url, {
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
        ...options,
    });

    if (!res.ok) {
        const error = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(error.detail || error.error || 'API Error');
    }

    if (res.status === 204) return {};
    return res.json();
}

// Vessel endpoints
export const fetchVessels = () => request('/vessels/');
export const fetchVessel = (id) => request(`/vessels/${id}/`);
export const fetchVesselHistory = (id, limit = 200) =>
    request(`/vessels/${id}/history/?limit=${limit}`);

// Zone endpoints
export const fetchZones = () => request('/zones/');
export const createZone = (data) =>
    request('/zones/', { method: 'POST', body: JSON.stringify(data) });
export const updateZone = (id, data) =>
    request(`/zones/${id}/`, { method: 'PATCH', body: JSON.stringify(data) });
export const deleteZone = (id) =>
    request(`/zones/${id}/`, { method: 'DELETE' }).catch(() => ({}));

// Alert endpoints
export const fetchAlerts = (limit = 50) => request(`/alerts/?limit=${limit}`);

// Drone endpoints
export const deployDrone = (vesselId) =>
    request('/drone/deploy/', {
        method: 'POST',
        body: JSON.stringify({ vessel_id: vesselId }),
    });

export const fetchDrones = () => request('/drone/');


