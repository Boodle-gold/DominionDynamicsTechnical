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

            <div className="detail-content" style={{ padding: '4px 12px 12px 12px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                <div className="action-section" style={{ marginTop: '24px', marginBottom: '24px' }}>
                    <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '16px', borderRadius: '4px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>Water Quality</span>
                            <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#ffffff' }}>Nominal</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>Traffic Congestion</span>
                            <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#ffffff' }}>Low</span>
                        </div>
                    </div>
                </div>

                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 'auto', marginBottom: 4, fontFamily: 'var(--font-mono)' }}>
                    {port.latitude?.toFixed(5)}, {port.longitude?.toFixed(5)}
                </div>
            </div>
        </div>
    );
}
