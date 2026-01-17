// js/db.js

const DB = {
    // --- PERSISTENCIA BÁSICA ---
    save(key, data) {
        localStorage.setItem(key, JSON.stringify(data));
    },

    get(key, defaultValue = null) {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : defaultValue;
    },

    // --- COLA DE SINCRONIZACIÓN ---
    // Guarda tareas como: { action: 'registrarVenta', data: {...}, id: timestamp }
    pushSyncTask(action, data) {
        const queue = this.get('sync_queue', []);
        queue.push({
            id: Date.now() + Math.random(),
            action,
            data,
            timestamp: new Date().toISOString()
        });
        this.save('sync_queue', queue);
        console.log(`[DB] Tarea añadida a cola: ${action}`);
    },

    getSyncQueue() {
        return this.get('sync_queue', []);
    },

    removeSyncTask(id) {
        const queue = this.getSyncQueue();
        const filtered = queue.filter(task => task.id !== id);
        this.save('sync_queue', filtered);
    },

    // --- MANEJO DE INVENTARIO LOCAL ---
    updateLocalStock(productId, cantidadRestar) {
        const productos = this.get('inventario_local', []);
        const idx = productos.findIndex(p => p.id === productId);
        if (idx !== -1) {
            productos[idx].stock -= cantidadRestar;
            this.save('inventario_local', productos);
            return productos[idx];
        }
        return null;
    }
};

export default DB;
