import { useState, useCallback } from 'react';

/**
 * Vessel state management hook.
 * Manages the vessels map, selected vessel, and applies WebSocket updates.
 */
export function useVessels() {
    const [vessels, setVessels] = useState({});
    const [selectedVesselId, setSelectedVesselId] = useState(null);
    const [vesselInZone, setVesselInZone] = useState(new Set());

    /**
     * Handle incoming WebSocket messages.
     */
    const handleWSMessage = useCallback((data) => {
        switch (data.type) {
            case 'initial_data':
                // Load all vessels from initial message
                const vesselMap = {};
                (data.vessels || []).forEach(v => {
                    vesselMap[v.id] = v;
                });
                setVessels(vesselMap);
                break;

            case 'vessel_update':
                // Update positions for specific vessels
                setVessels(prev => {
                    const next = { ...prev };
                    (data.vessels || []).forEach(v => {
                        next[v.id] = { ...next[v.id], ...v };
                    });
                    return next;
                });
                break;

            case 'zone_alert':
                if (data.alert) {
                    const { vessel_id, alert_type } = data.alert;
                    setVesselInZone(prev => {
                        const next = new Set(prev);
                        if (alert_type === 'enter') {
                            next.add(vessel_id);
                        } else {
                            next.delete(vessel_id);
                        }
                        return next;
                    });
                }
                break;

            default:
                break;
        }
    }, []);

    const selectedVessel = selectedVesselId ? vessels[selectedVesselId] : null;
    const vesselList = Object.values(vessels).sort((a, b) =>
        (a.name || '').localeCompare(b.name || '')
    );

    return {
        vessels,
        vesselList,
        selectedVessel,
        selectedVesselId,
        setSelectedVesselId,
        vesselInZone,
        handleWSMessage,
    };
}

