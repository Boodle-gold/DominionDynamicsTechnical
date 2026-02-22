import React, { useState, useEffect, useCallback } from 'react';
import MapView from './components/MapView.jsx';
import VesselDetailPanel from './components/VesselDetailPanel.jsx';
import Sidebar from './components/Sidebar.jsx';
import AlertPanel from './components/AlertPanel.jsx';
import { DroneStatusBar, useDrone, DRONE_BASE } from './components/DroneAnimation.jsx';
import { useWebSocket } from './hooks/useWebSocket.js';
import { useVessels } from './hooks/useVessels.js';
import { fetchVessels, fetchVesselHistory, fetchZones, deleteZone as apiDeleteZone, deployDrone as apiDeployDrone, fetchAlerts } from './services/api.js';

export default function App() {
    const {
        vessels,
        vesselList,
        selectedVessel,
        selectedVesselId,
        setSelectedVesselId,
        vesselInZone,
        handleWSMessage,
    } = useVessels();

    const { connected } = useWebSocket(handleWSMessage);

    const [zones, setZones] = useState([]);
    const [alerts, setAlerts] = useState([]);
    const [readAlertIds, setReadAlertIds] = useState(new Set());
    const [historyTrail, setHistoryTrail] = useState(null);
    const [showingHistory, setShowingHistory] = useState(false);
    const { droneState, deployDrone, dismissDrone } = useDrone();

    // Load zones and deposits on mount
    useEffect(() => {
        loadZones();
        loadAlerts();
    }, []);


    // Poll alerts periodically
    useEffect(() => {
        const timer = setInterval(loadAlerts, 5000);
        return () => clearInterval(timer);
    }, []);

    const loadZones = async () => {
        try {
            const data = await fetchZones();
            setZones(data.results || data);
        } catch (err) {
            console.error('Failed to load zones:', err);
        }
    };

    const loadAlerts = async () => {
        try {
            const data = await fetchAlerts();
            setAlerts(data.results || data);
        } catch (err) {
            // Alerts endpoint might return paginated or list
        }
    };

    const [focusZoomLevel, setFocusZoomLevel] = useState(6);

    const handleSelectVessel = useCallback((id, zoom = 6) => {
        setSelectedVesselId(id);
        setFocusZoomLevel(zoom);
        setHistoryTrail(null);
        setShowingHistory(false);
    }, [setSelectedVesselId]);

    const handleCloseDetail = useCallback(() => {
        setSelectedVesselId(null);
        setHistoryTrail(null);
        setShowingHistory(false);
    }, [setSelectedVesselId]);

    const handleViewHistory = useCallback(async () => {
        if (showingHistory) {
            setHistoryTrail(null);
            setShowingHistory(false);
            return;
        }

        if (!selectedVesselId) return;
        try {
            const positions = await fetchVesselHistory(selectedVesselId);
            setHistoryTrail(positions);
            setShowingHistory(true);
        } catch (err) {
            console.error('Failed to load history:', err);
        }
    }, [selectedVesselId, showingHistory]);

    const handleDeployDrone = useCallback(async () => {
        if (!selectedVessel) return;

        try {
            await apiDeployDrone(selectedVessel.id);
        } catch (err) {
            console.error('API drone deploy failed:', err);
        }

        deployDrone(
            DRONE_BASE.lat, DRONE_BASE.lng,
            selectedVessel.latitude, selectedVessel.longitude,
            selectedVessel.name
        );
    }, [selectedVessel, deployDrone]);

    const handleDeleteZone = useCallback(async (zoneId) => {
        try {
            await apiDeleteZone(zoneId);
            setZones(prev => prev.filter(z => z.id !== zoneId));
        } catch (err) {
            console.error('Failed to delete zone:', err);
        }
    }, []);

    const handleZoneCreated = useCallback(() => {
        loadZones();
    }, []);

    const handleRenameZone = useCallback(() => {
        loadZones();
    }, []);

    const handleMarkAlertRead = useCallback((alertId) => {
        setReadAlertIds(prev => new Set([...prev, alertId]));
    }, []);

    const handleMarkAllAlertsRead = useCallback(() => {
        setReadAlertIds(new Set((alerts || []).map(a => a.id)));
    }, [alerts]);

    return (
        <>
            <header className="app-header">
                <div className="logo">
                    <svg viewBox="0 0 100 100" className="logo-svg" fill="currentColor">
                        <polygon points="8,8 8,68 68,38" />
                        <polygon points="92,32 92,92 32,62" />
                    </svg>
                    <div className="logo-text">
                        <div className="logo-line">DOMINION</div>
                        <div className="logo-line">DYNAMICS</div>
                    </div>
                </div>
                <div className="status-indicator">
                    <div className={`status-dot ${connected ? '' : 'disconnected'}`} />
                    <span>{connected ? 'Live' : 'Reconnecting...'}</span>
                </div>
                <div className="vessel-count">
                    {vesselList.length} vessels
                </div>
            </header>

            <div className="app-container">
                <MapView
                    vessels={vessels}
                    selectedVesselId={selectedVesselId}
                    focusZoomLevel={focusZoomLevel}
                    onSelectVessel={handleSelectVessel}
                    vesselInZone={vesselInZone}
                    zones={zones}
                    onZoneCreated={handleZoneCreated}
                    historyTrail={historyTrail}
                    droneState={droneState}
                />

                <Sidebar
                    vesselList={vesselList}
                    selectedVesselId={selectedVesselId}
                    onSelectVessel={handleSelectVessel}
                    vesselInZone={vesselInZone}
                    zones={zones}
                    onDeleteZone={handleDeleteZone}
                    onRenameZone={handleRenameZone}
                    alerts={alerts}
                    readAlertIds={readAlertIds}
                    onMarkAllAlertsRead={handleMarkAllAlertsRead}
                />
            </div>

            {selectedVessel && (
                <VesselDetailPanel
                    vessel={selectedVessel}
                    onClose={handleCloseDetail}
                    onViewHistory={handleViewHistory}
                    onDeployDrone={handleDeployDrone}
                    showingHistory={showingHistory}
                />
            )}

            <AlertPanel alerts={alerts} />
            <DroneStatusBar droneState={droneState} onDismiss={dismissDrone} />
        </>
    );
}
