import React, { useEffect, useState } from 'react';

/**
 * Toast-style alert notifications that appear when vessels enter/exit zones.
 */
export default function AlertPanel({ alerts }) {
    const [visibleAlerts, setVisibleAlerts] = useState([]);
    const displayedIds = React.useRef(new Set());

    useEffect(() => {
        if (!alerts || alerts.length === 0) return;

        const latest = alerts[alerts.length - 1];
        if (!latest) return;

        if (!displayedIds.current.has(latest.id)) {
            displayedIds.current.add(latest.id);

            // Add to visible alerts
            setVisibleAlerts(prev => [...prev.slice(-4), latest]);

            // Auto-dismiss after 5 seconds without clearing the timeout on subsequent alerts
            setTimeout(() => {
                setVisibleAlerts(prev => prev.filter(a => a.id !== latest.id));
            }, 5000);
        }
    }, [alerts]);

    if (visibleAlerts.length === 0) return null;

    return (
        <div className="alert-container">
            {visibleAlerts.map(alert => (
                <div
                    key={alert.id}
                    className={`alert-toast ${alert.alert_type === 'exit' ? 'exit' : ''}`}
                    onClick={() => setVisibleAlerts(prev => prev.filter(a => a.id !== alert.id))}
                    style={{ cursor: 'pointer' }}
                    title="Click to dismiss"
                >
                    <span className="alert-toast-icon">
                        {alert.alert_type === 'enter' ? 'IN' : 'OUT'}
                    </span>
                    <span className="alert-toast-text">
                        <strong>{alert.vessel_name}</strong>
                        {' '}{alert.alert_type === 'enter' ? 'entered' : 'exited'}{' '}
                        <strong>{alert.zone_name}</strong>
                    </span>
                </div>
            ))}
        </div>
    );
}

