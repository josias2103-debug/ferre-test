// js/cloud-service.js
import DB from './db.js';

// URL POR DEFECTO
const DEFAULT_API_URL = "https://script.google.com/macros/s/AKfycbzho4jP4vdcYXrJQU5jJpDHs41srSlc-Lp4XSBJRD66J5EQyIqMZH1_4vNN02zaqEpkmg/exec";

// OBTENER URL ACTUAL (Dinamica desde Admin)
function getApiUrl() {
    return localStorage.getItem('DYNAMIC_API_URL') || DEFAULT_API_URL;
}

// Helper para fetch con Timeout
async function fetchWithTimeout(url, options = {}, timeout = 8000) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
        const response = await fetch(url, { ...options, signal: controller.signal });
        clearTimeout(id);
        return response;
    } catch (e) {
        clearTimeout(id);
        throw e;
    }
}

const CloudService = {
    isSyncing: false,

    async fetchInventario() {
        try {
            const API_URL = getApiUrl();
            const response = await fetchWithTimeout(API_URL, {
                method: 'POST',
                body: JSON.stringify({ action: 'obtenerInventario' })
            });
            const result = await response.json();
            if (result && result.status === 'success') {
                DB.save('inventario_local', result.data);
                DB.save('tasa_bcv', result.tasa_bcv);
                DB.save('tasa_binance', result.tasa_binance); // NUEVO: Guardar tasa de Binance
                if (result.config) DB.save('config_empresa', result.config);
                return { productos: result.data, tasa: result.tasa_bcv, tasaBinance: result.tasa_binance, config: result.config }; // NUEVO: Retornar tasa de Binance
            }
        } catch (e) {
            console.warn("[Cloud] Usando caché local");
        }
        return this.obtenerLocal();
    },

    obtenerLocal() {
        return {
            productos: DB.get('inventario_local', []),
            tasa: parseFloat(DB.get('tasa_bcv', 1)),
            tasaBinance: parseFloat(DB.get('tasa_binance', 1)), // NUEVO: Obtener tasa de Binance
            config: DB.get('config_empresa', { template: 'termico' }),
            ventas: DB.get('ventas_recientes', [])
        };
    },

    async processSyncQueue() {
        if (this.isSyncing) return;
        this.isSyncing = true;
        const API_URL = getApiUrl();

        while (true) {
            const queue = DB.getSyncQueue();
            if (queue.length === 0) break;

            const task = queue[0]; // Process one by one FIFO

            try {
                const payload = {
                    action: task.action,
                    ...(task.action === 'registrarVenta' ? { venta: task.data } : {}),
                    ...(task.action === 'crearProducto' ? { producto: task.data } : {}),
                    ...(task.action === 'eliminarProducto' ? { id: task.data } : {}),
                    ...(task.action === 'guardarConfig' ? { clave: task.data.clave, valor: task.data.valor } : {}),
                    ...(task.action === 'anularVenta' ? { id_ticket: task.data } : {}),
                    ...(task.action === 'registrarPresupuesto' ? { presupuesto: task.data } : {}),
                    ...(task.action === 'actualizarStock' ? { datos: task.data } : {})
                };

                const response = await fetchWithTimeout(API_URL, {
                    method: 'POST',
                    body: JSON.stringify(payload)
                }, 15000);
                
                const result = await response.json();
                if (result && result.status === 'success') {
                    DB.removeSyncTask(task.id);
                } else {
                     // If server returns error, maybe break or retry? 
                     // For now, let's keep it simple: if it fails, we break to avoid infinite loop on bad task, 
                     // or we can skip it. But breaking is safer to avoid spamming.
                     console.error(`[Cloud] Server Error: ${result.message}`);
                     break; 
                }
            } catch (e) {
                console.error(`[Cloud] Fallo temporal: ${task.action}`, e);
                break; // Stop syncing on network error
            }
        }
        this.isSyncing = false;
    },

    async registrarAccion(action, data) {
        DB.pushSyncTask(action, data);
        this.processSyncQueue();
    },

    async obtenerVentas() {
        try {
            const API_URL = getApiUrl();
            const r = await fetchWithTimeout(API_URL, {
                method: 'POST',
                body: JSON.stringify({ action: 'obtenerVentas' })
            });
            const res = await r.json();
            if (res && res.status === 'success') {
                DB.save('ventas_recientes', res.data);
                return res.data;
            }
        } catch(e) { }
        return DB.get('ventas_recientes', []);
    },

    async obtenerPresupuestos() {
        try {
            const API_URL = getApiUrl();
            const r = await fetchWithTimeout(API_URL, {
                method: 'POST',
                body: JSON.stringify({ action: 'obtenerPresupuestos' })
            });
            const res = await r.json();
            if (res && res.status === 'success') {
                DB.save('presupuestos_recientes', res.data);
                return res.data;
            }
        } catch(e) { }
        return DB.get('presupuestos_recientes', []);
    },

    async obtenerEstadisticas() {
        try {
            const API_URL = getApiUrl();
            const r = await fetchWithTimeout(API_URL, {
                method: 'POST',
                body: JSON.stringify({ action: 'obtenerEstadisticas' })
            }, 5000);
            const res = await r.json();
            if (res && res.status === 'success') {
                DB.save('last_stats', res);
                return res;
            }
        } catch(e) { }
        return DB.get('last_stats', null);
    }
};

export default CloudService;