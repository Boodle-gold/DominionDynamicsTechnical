import React, { useState, useRef, useEffect } from 'react';
import { getWeightCategory } from '../utils/colors.js';
import { updateZone } from '../services/api.js';

export default function Sidebar({
    vesselList,
    selectedVesselId,
    onSelectVessel,
    vesselInZone,
    zones,
    onDeleteZone,
    onRenameZone,
    alerts,
    readAlertIds,
    onMarkAlertRead,
    onMarkAllAlertsRead,
}) {
    const [activeTab, setActiveTab] = useState('vessels');

    const unreadCount = (alerts || []).filter(a => !readAlertIds?.has(a.id)).length;

    return (
        <div className="sidebar">
            <div className="sidebar-tabs">
                <button
                    className={`sidebar-tab ${activeTab === 'vessels' ? 'active' : ''}`}
                    onClick={() => setActiveTab('vessels')}
                >
                    Vessels ({vesselList.length})
                </button>
                <button
                    className={`sidebar-tab ${activeTab === 'zones' ? 'active' : ''}`}
                    onClick={() => setActiveTab('zones')}
                >
                    Zones ({zones.length})
                </button>
                <button
                    className={`sidebar-tab ${activeTab === 'alerts' ? 'active' : ''}`}
                    onClick={() => setActiveTab('alerts')}
                >
                    Alerts
                    {unreadCount > 0 && (
                        <span className="alert-badge">{unreadCount}</span>
                    )}
                </button>
            </div>

            <div className="sidebar-content">
                {activeTab === 'vessels' && (
                    <VesselTab
                        vesselList={vesselList}
                        selectedVesselId={selectedVesselId}
                        onSelectVessel={onSelectVessel}
                        vesselInZone={vesselInZone}
                    />
                )}
                {activeTab === 'zones' && (
                    <ZoneTab
                        zones={zones}
                        onDeleteZone={onDeleteZone}
                        onRenameZone={onRenameZone}
                    />
                )}
                {activeTab === 'alerts' && (
                    <AlertTab
                        alerts={alerts}
                        readAlertIds={readAlertIds}
                        onMarkRead={onMarkAlertRead}
                        onMarkAllRead={onMarkAllAlertsRead}
                        onSelectVessel={onSelectVessel}
                    />
                )}
            </div>
        </div>
    );
}

/* ── Vessel Tab ────────────────────────────────────────────── */

function VesselTab({ vesselList, selectedVesselId, onSelectVessel, vesselInZone }) {
    const [search, setSearch] = useState('');

    const filtered = vesselList.filter(v =>
        v.name?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <>
            <input
                type="text"
                placeholder="Search vessels..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="sidebar-search"
            />
            {filtered.length === 0 ? (
                <div className="empty-state">
                    <div className="icon">--</div>
                    <p>No vessels found</p>
                </div>
            ) : (
                filtered.sort((a, b) => {
                    const aName = (a.name || '').toLowerCase();
                    const bName = (b.name || '').toLowerCase();
                    const aUnnamed = !aName || aName === 'other';
                    const bUnnamed = !bName || bName === 'other';

                    if (aUnnamed && !bUnnamed) return 1;
                    if (!aUnnamed && bUnnamed) return -1;
                    return aName.localeCompare(bName);
                }).map(v => (
                    <div
                        key={v.id}
                        className={`vessel-list-item ${v.id === selectedVesselId ? 'selected' : ''} ${vesselInZone.has(v.id) ? 'in-zone' : ''}`}
                        onClick={() => onSelectVessel(v.id)}
                    >
                        <div className="vessel-info">
                            <div className="vessel-name">
                                {v.name}
                            </div>
                            <div className="vessel-meta">
                                <span>{v.ship_type}</span>
                                {v.destination && <span>→ {v.destination}</span>}
                            </div>
                        </div>
                        <div className="vessel-speed">
                            {v.speed != null ? `${v.speed.toFixed(1)}kn` : ''}
                        </div>
                    </div>
                ))
            )}
        </>
    );
}

/* ── Zone Tab (inline rename) ──────────────────────────────── */

function ZoneTab({ zones, onDeleteZone, onRenameZone }) {
    if (zones.length === 0) {
        return (
            <div className="zone-draw-hint">
                <div className="icon">+</div>
                <p>Use the polygon tool on the map to draw zones.</p>
                <p style={{ marginTop: 8, fontSize: 11, color: 'var(--text-muted)' }}>
                    Vessels entering a zone will turn red and trigger an alert.
                </p>
            </div>
        );
    }

    return zones.map(z => (
        <ZoneItem key={z.id} zone={z} onDelete={onDeleteZone} onRename={onRenameZone} />
    ));
}

function ZoneItem({ zone, onDelete, onRename }) {
    const [editing, setEditing] = useState(false);
    const [name, setName] = useState(zone.name);
    const inputRef = useRef(null);

    useEffect(() => {
        if (editing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [editing]);

    const save = async () => {
        setEditing(false);
        const trimmed = name.trim();
        if (trimmed && trimmed !== zone.name) {
            try {
                await updateZone(zone.id, { name: trimmed });
                onRename?.();
            } catch (err) {
                setName(zone.name); // revert on error
            }
        } else {
            setName(zone.name);
        }
    };

    return (
        <div className="zone-item">
            <div className="zone-color-dot" style={{ background: zone.color || '#ff9500' }} />
            <div className="zone-info">
                {editing ? (
                    <input
                        ref={inputRef}
                        className="zone-name-input"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        onBlur={save}
                        onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') { setName(zone.name); setEditing(false); } }}
                    />
                ) : (
                    <div
                        className="zone-name zone-name-editable"
                        onClick={() => setEditing(true)}
                        title="Click to rename"
                    >
                        {zone.name}
                    </div>
                )}
                <div className="zone-meta">Created {new Date(zone.created_at).toLocaleString()}</div>
            </div>
            <button className="btn btn-danger btn-small" onClick={() => onDelete(zone.id)}>
                X
            </button>
        </div>
    );
}

/* ── Alert Dashboard ───────────────────────────────────────── */

function AlertTab({ alerts, readAlertIds, onMarkRead, onMarkAllRead, onSelectVessel }) {
    const [filter, setFilter] = useState('all'); // 'all' | 'enter' | 'exit'
    const [sortNewest, setSortNewest] = useState(true);

    if (!alerts || alerts.length === 0) {
        return (
            <div className="empty-state">
                <div className="icon">--</div>
                <p>No alerts yet. Draw a zone and wait for vessels to enter it.</p>
            </div>
        );
    }

    let filtered = alerts;
    if (filter !== 'all') {
        filtered = alerts.filter(a => a.alert_type === filter);
    }

    const sorted = [...filtered].sort((a, b) => {
        const ta = new Date(a.timestamp).getTime();
        const tb = new Date(b.timestamp).getTime();
        return sortNewest ? tb - ta : ta - tb;
    });

    const unreadCount = sorted.filter(a => !readAlertIds?.has(a.id)).length;

    return (
        <>
            {/* Toolbar */}
            <div className="alert-toolbar">
                <div className="alert-filters">
                    <button
                        className={`alert-filter-btn ${filter === 'all' ? 'active' : ''}`}
                        onClick={() => setFilter('all')}
                    >
                        All
                    </button>
                    <button
                        className={`alert-filter-btn ${filter === 'enter' ? 'active' : ''}`}
                        onClick={() => setFilter('enter')}
                    >
                        Enter
                    </button>
                    <button
                        className={`alert-filter-btn ${filter === 'exit' ? 'active' : ''}`}
                        onClick={() => setFilter('exit')}
                    >
                        Exit
                    </button>
                </div>
                <div className="alert-actions">
                    <button
                        className="alert-sort-btn"
                        onClick={() => setSortNewest(!sortNewest)}
                        title={sortNewest ? 'Newest first' : 'Oldest first'}
                    >
                        {sortNewest ? 'Newest' : 'Oldest'}
                    </button>
                    {unreadCount > 0 && (
                        <button className="alert-mark-all-btn" onClick={onMarkAllRead}>
                            Mark all read
                        </button>
                    )}
                </div>
            </div>

            {/* Alert list */}
            {sorted.length === 0 ? (
                <div className="empty-state" style={{ paddingTop: 24 }}>
                    <p>No {filter} alerts</p>
                </div>
            ) : (
                sorted.map(a => {
                    const isUnread = !readAlertIds?.has(a.id);
                    return (
                        <div
                            key={a.id}
                            className={`alert-item ${isUnread ? 'alert-unread' : 'alert-read'} alert-type-${a.alert_type}`}
                            onClick={() => {
                                onSelectVessel?.(a.vessel, 13);
                                if (isUnread) onMarkRead?.(a.id);
                            }}
                        >
                            <div className="alert-type-indicator">
                                {a.alert_type === 'enter' ? 'IN' : 'OUT'}
                            </div>
                            <div className="alert-item-body">
                                <div className="alert-item-title">
                                    {a.vessel_name}
                                    {isUnread && <span className="alert-new-dot" />}
                                </div>
                                <div className="alert-item-detail">
                                    {a.alert_type === 'enter' ? 'Entered' : 'Exited'} {a.zone_name}
                                </div>
                            </div>
                            <div className="alert-item-time">
                                {formatAlertTime(a.timestamp)}
                            </div>
                        </div>
                    );
                })
            )}
        </>
    );
}

function formatAlertTime(ts) {
    const d = new Date(ts);
    const now = new Date();
    const diffMs = now - d;
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    return d.toLocaleDateString();
}


