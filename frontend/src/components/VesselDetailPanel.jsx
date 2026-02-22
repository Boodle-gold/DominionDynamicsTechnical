import React from 'react';
import { getWeightCategory, formatTonnage, SHIP_TYPE_LABELS, SHIP_TYPE_ICONS } from '../utils/colors.js';

export default function VesselDetailPanel({ vessel, onClose, onViewHistory, onDeployDrone, showingHistory }) {
    if (!vessel) return null;

    const category = getWeightCategory(vessel.weight_tonnage || 0);

    return (
        <div className="detail-panel">
            <div className="detail-header" style={{ position: 'relative' }}>
                <button className="close-btn" onClick={onClose}>X</button>
                <div className="detail-vessel-type">
                    {SHIP_TYPE_LABELS[vessel.ship_type] || vessel.ship_type}
                </div>
                <h2 className="detail-vessel-name">{vessel.name}</h2>
            </div>

            <div className="detail-body">
                <div className="detail-grid">
                    <div className="detail-stat">
                        <div className="detail-stat-label">Speed</div>
                        <div className="detail-stat-value">
                            {vessel.speed != null ? `${vessel.speed.toFixed(1)} kn` : '—'}
                        </div>
                    </div>
                    <div className="detail-stat">
                        <div className="detail-stat-label">Heading</div>
                        <div className="detail-stat-value">
                            {vessel.heading != null ? `${Math.round(vessel.heading)}°` : '—'}
                        </div>
                    </div>

                    <div className="detail-stat">
                        <div className="detail-stat-label">MMSI</div>
                        <div className="detail-stat-value" style={{ fontSize: 13 }}>
                            {vessel.mmsi}
                        </div>
                    </div>
                    <div className="detail-stat">
                        <div className="detail-stat-label">Length</div>
                        <div className="detail-stat-value">
                            {vessel.length ? `${vessel.length}m` : '—'}
                        </div>
                    </div>
                    <div className="detail-stat">
                        <div className="detail-stat-label">Width</div>
                        <div className="detail-stat-value">
                            {vessel.width ? `${vessel.width}m` : '—'}
                        </div>
                    </div>
                </div>

                {vessel.destination && (
                    <div className="detail-stat" style={{ marginBottom: 12 }}>
                        <div className="detail-stat-label">Destination</div>
                        <div className="detail-stat-value" style={{ fontSize: 14 }}>
                            {vessel.destination}
                        </div>
                    </div>
                )}

                {vessel.flag && (
                    <div className="detail-stat" style={{ marginBottom: 12 }}>
                        <div className="detail-stat-label">Flag</div>
                        <div className="detail-stat-value" style={{ fontSize: 14 }}>
                            {vessel.flag}
                        </div>
                    </div>
                )}

                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 16, fontFamily: 'var(--font-mono)' }}>
                    {vessel.latitude?.toFixed(5)}, {vessel.longitude?.toFixed(5)}
                </div>

                <div className="detail-actions">
                    <button
                        className={`btn ${showingHistory ? 'btn-danger' : 'btn-secondary'}`}
                        onClick={onViewHistory}
                    >
                        {showingHistory ? 'Hide Trail' : 'View History'}
                    </button>
                    <button className="btn btn-primary" onClick={onDeployDrone}>
                        Deploy Drone
                    </button>
                </div>
            </div>
        </div>
    );
}
