import React from 'react';
import { X, Anchor, MapPin, Shield } from 'lucide-react';

export default function PortDetailPanel({ port, onClose }) {
    if (!port) return null;

    return (
        <div className="detail-panel panel-fade-in glass-panel port-panel">
            <div className="detail-header">
                <div>
                    <h2>{port.name}</h2>
                    <span className="subtitle" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <MapPin size={14} /> {port.country}
                    </span>
                </div>
                <button onClick={onClose} className="icon-btn close-btn">
                    <X size={20} />
                </button>
            </div>

            <div className="detail-content">
                <div className="metadata-grid">
                    <div className="meta-item">
                        <span className="label">UN/LOCODE</span>
                        <span className="value">{port.locode || 'N/A'}</span>
                    </div>
                    <div className="meta-item">
                        <span className="label">HELCOM API ID</span>
                        <span className="value" style={{ fontSize: '0.9em' }}>{port.helcom_id || 'N/A'}</span>
                    </div>
                    <div className="meta-item">
                        <span className="label">Latitude</span>
                        <span className="value">{port.latitude.toFixed(4)}°N</span>
                    </div>
                    <div className="meta-item">
                        <span className="label">Longitude</span>
                        <span className="value">{port.longitude.toFixed(4)}°E</span>
                    </div>
                </div>

                <div className="action-section" style={{ marginTop: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <Shield size={16} color="#00e5ff" />
                        <h3 style={{ margin: 0, fontSize: '14px', color: '#00e5ff' }}>Environmental Status</h3>
                    </div>
                    <p style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.7)', margin: '0 0 12px 0', lineHeight: 1.4 }}>
                        Data sourced securely from the Baltic Marine Environment Protection Commission (HELCOM) open data portal.
                    </p>

                    <div style={{ background: 'rgba(0, 229, 255, 0.1)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(0, 229, 255, 0.2)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)' }}>Water Quality Index</span>
                            <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#00e5ff' }}>Nominal</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)' }}>Traffic Congestion</span>
                            <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#4ade80' }}>Low</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
