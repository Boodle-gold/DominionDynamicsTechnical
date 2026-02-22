import { useState, useEffect, useCallback } from 'react';
import { API_BASE } from '../services/api';

export function usePorts() {
    const [ports, setPorts] = useState([]);
    const [selectedPortId, setSelectedPortId] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchPorts = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`${API_BASE}/ports/`);
            if (!response.ok) {
                throw new Error(`Error fetching ports: ${response.statusText}`);
            }
            const data = await response.json();
            // Data might be paginated, so handle `.results` or raw array
            const portsData = data.results ? data.results : data;
            setPorts(portsData);
        } catch (err) {
            console.error(err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPorts();
    }, [fetchPorts]);

    const selectedPort = ports.find(p => p.id === selectedPortId);

    return {
        ports,
        selectedPort,
        selectedPortId,
        setSelectedPortId,
        loading,
        error,
        refreshPorts: fetchPorts
    };
}
