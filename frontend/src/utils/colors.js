/**
 * Speed-based vessel coloring and display utilities.
 */

/**
 * Get color for a vessel based on speed (knots).
 *   0–1 kn  → stationary (cool blue-gray)
 *   1–5 kn  → slow (cyan)
 *   5–12 kn → moderate (amber)
 *   >12 kn  → fast (red-orange)
 */
export function getVesselColor(speedKnots) {
    const spd = parseFloat(speedKnots) || 0;
    if (spd <= 1) return '#7a8ba8';   // stationary — muted blue-gray
    if (spd <= 5) return '#00e5ff';   // slow — cyan
    if (spd <= 12) return '#ffab40';  // moderate — amber
    return '#ff1744';                  // fast — red
}

/**
 * Speed category label for legend / sidebar.
 */
export function getSpeedLabel(speedKnots) {
    const spd = parseFloat(speedKnots) || 0;
    if (spd <= 1) return 'Stationary';
    if (spd <= 5) return 'Slow';
    if (spd <= 12) return 'Moderate';
    return 'Fast';
}

/**
 * Human-readable ship type labels.
 */
const SHIP_TYPE_LABELS = {
    cargo: 'Cargo',
    tanker: 'Tanker',
    passenger: 'Passenger',
    tug: 'Tug',
    fishing: 'Fishing',
    military: 'Military',
    pleasure: 'Pleasure',
    other: 'Other',
};

export { SHIP_TYPE_LABELS };

export const SHIP_TYPE_ICONS = {
    cargo: 'C',
    tanker: 'T',
    passenger: 'P',
    tug: 'TG',
    fishing: 'F',
    military: 'M',
    pleasure: 'PL',
    other: 'V',
};

export function getShipTypeLabel(type) {
    return SHIP_TYPE_LABELS[type] || SHIP_TYPE_LABELS.other;
}

// Backward-compat aliases used by Sidebar/VesselDetailPanel
export const getWeightCategory = getSpeedLabel;
export const formatTonnage = (t) => `${parseFloat(t || 0).toLocaleString()} GT`;

