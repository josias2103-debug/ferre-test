// js/app.js

// Utility function for debouncing
function debounce(func, delay) {
    let timeout;
    return function(...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), delay);
    };
}

import CloudService from './cloud-service.js';
import AIService from './ai-service.js';
import DB from './db.js';
import { Templates } from './templates.js';

const { createApp, reactive, computed, onMounted, ref, watch, nextTick } = Vue;

createApp({
    setup() {
        const estado = reactive({
            vistaActual: 'dashboard',
            productos: [],
            carrito: [],
            busqueda: '',
            tasaBCV: 1, 
            tasaBinance: 1, // NUEVA PROPIEDAD
            online: navigator.onLine,
            sincronizando: false,
            config: { template: 'termico', EMPRESA_NOMBRE: '', EMPRESA_RIF: '', EMPRESA_LOGO_URL: '', CORRELATIVO: 1000, GROQ_API_KEY: '' },
            
            // Modales
            modalPagoAbierto: false,
            modalPresupuestoAbierto: false,
            scannerAbierto: false,
            modalProductoAbierto: false,
            modalConfigAbierto: false,
            modalAdminAbierto: false,
            modalIAAbierto: false,
            escanearParaInput: false,
            deferredPrompt: null // Captura el evento de instalación
        });

        // --- SISTEMA INSTALACIÓN PWA ---
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            estado.deferredPrompt = e;
        });

        const instalarApp = async () => {
            if (!estado.deferredPrompt) return;
            estado.deferredPrompt.prompt();
            const { outcome } = await estado.deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                estado.deferredPrompt = null;
            }
        };

        // --- SISTEMA ADMIN ---
        const clicksLogo = ref(0);
        const adminAutenticado = ref(false);
        const adminPass = ref('');
        const tempApiUrl = ref(localStorage.getItem('DYNAMIC_API_URL') || '');
        const licenciaEstado = ref(true);

        // --- SISTEMA IA ---
        const chatIA = ref([{ role: 'assistant', content: '¡Hola! Soy tu asistente. ¿En qué te ayudo hoy?' }]);
        const preguntaIA = ref('');
        const iaCargando = ref(false);

        // --- RESTO DE VARIABLES ---
        const historialVentas = ref([]); 
        const historialPresupuestos = ref([]);
        const reportes = reactive({ kpis: { ingresos: 0, costos: 0, ganancias: 0, margen: 0 }, graficaData: { labels: [], data: [] } });
        const clienteState = reactive({ tipo: 'generico', datos: { nombre: '', documento: '' } });
        let chartInstance = null;
        const nuevoProducto = reactive({ nombre: '', sku: '', categoria: '', precio: 0, costo: 0, stock: 0, stock_min: 5 });
        const pagoState = reactive({ metodosAgregados: [], metodoSeleccionado: 'Efectivo USD', bancoSeleccionado: '', referenciaInput: '', titularInput: '', montoInput: 0, monedaInput: 'USD' });
        const presupuestoState = reactive({ moneda: 'USD', tipoTasa: 'BCV' });
        const metodos = ['Efectivo USD', 'Efectivo VES', 'Pago Movil', 'Zelle', 'Punto de Venta'];
        const bancos = ['Banesco', 'Banco de Venezuela', 'Mercantil', 'BBVA Provincial', 'BNC', 'BOD', 'Bancaribe', 'Tesoro', 'Bicentenario'];

        // --- COMPUTADOS ---
        const productosFiltrados = computed(() => {
            if (!estado.busqueda) return estado.productos;
            const q = estado.busqueda.toLowerCase();
            return estado.productos.filter(p => p.nombre.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q));
        });
        const totalCarritoUSD = computed(() => estado.carrito.reduce((acc, item) => acc + (item.precio * item.cantidad), 0));
        const totalCarritoVES = computed(() => totalCarritoUSD.value * estado.tasaBCV);
        const totalPagadoUSD = computed(() => {
            return pagoState.metodosAgregados.reduce((acc, p) => acc + (p.moneda === 'VES' ? p.monto / estado.tasaBCV : p.monto), 0);
        });
        const restanteUSD = computed(() => {
            return Math.max(0, totalCarritoUSD.value - totalPagadoUSD.value);
        });
        const restanteVES = computed(() => restanteUSD.value * estado.tasaBCV);

        const sugerenciasProducto = computed(() => {
            if (!nuevoProducto.nombre || nuevoProducto.nombre.length < 2) return [];
            const term = nuevoProducto.nombre.toLowerCase();
            return estado.productos.filter(p => p.nombre.toLowerCase().includes(term) && p.nombre.toLowerCase() !== term).slice(0, 5);
        });

        const seleccionarProductoExistente = (p) => {
            nuevoProducto.nombre = p.nombre;
            nuevoProducto.sku = p.sku;
            nuevoProducto.categoria = p.categoria;
            nuevoProducto.precio = p.precio;
            nuevoProducto.costo = p.costo;
            nuevoProducto.stock_min = p.stock_min;
            nuevoProducto.stock = 0; // Se resetea para que ingrese la cantidad a sumar
        };

        // --- LIFECYCLE ---
        onMounted(() => {
            window.addEventListener('online', () => { estado.online = true; CloudService.processSyncQueue(); });
            window.addEventListener('offline', () => estado.online = false);
            
            const local = CloudService.obtenerLocal();
            estado.productos = local.productos || [];
            estado.tasaBCV = local.tasa || 1;
            estado.tasaBinance = local.tasaBinance || 1; // ACTUALIZAR
            if(local.config) Object.assign(estado.config, local.config);

            syncInmediato();
        });

        const syncInmediato = async () => {
            // Cargar local primero para rapidez
            const local = CloudService.obtenerLocal();
            if (local.productos.length > 0) estado.productos = local.productos;
            estado.tasaBCV = local.tasa || 1; // ACTUALIZAR
            estado.tasaBinance = local.tasaBinance || 1; // ACTUALIZAR
            
            // Intentar actualizar de la nube
            try {
                const data = await CloudService.fetchInventario();
                if (data && data.productos) {
                    estado.productos = data.productos;
                    estado.tasaBCV = data.tasa;
                    estado.tasaBinance = data.tasaBinance; // ACTUALIZAR
                    if(data.config) Object.assign(estado.config, data.config);
                }
            } catch (e) {
                console.warn("Sin conexión, usando datos locales");
            }
            cargarDashboard();
        };

        // --- SEGURIDAD Y ADMIN ---
        const contarClicksLogo = () => {
            clicksLogo.value++;
            if (clicksLogo.value >= 3) {
                estado.modalAdminAbierto = true;
                clicksLogo.value = 0;
            }
            setTimeout(() => clicksLogo.value = 0, 2000);
        };

        const loginAdmin = async () => {
            if (adminPass.value === 'ferre123') { // Validación local rápida
                adminAutenticado.value = true;
                adminPass.value = '';
            } else {
                alert("Contraseña Incorrecta");
            }
        };

        const actualizarUrlApi = () => {
            if (tempApiUrl.value.includes('script.google.com')) {
                localStorage.setItem('DYNAMIC_API_URL', tempApiUrl.value);
                alert("URL de conexión actualizada. La app se reiniciará.");
                location.reload();
            } else {
                alert("URL no válida");
            }
        };

        const alternarLicencia = () => {
            licenciaEstado.value = !licenciaEstado.value;
            CloudService.registrarAccion('guardarConfig', { clave: 'LICENCIA_ACTIVA', valor: licenciaEstado.value ? 'SI' : 'NO' });
        };

        const cerrarAdmin = () => {
            adminAutenticado.value = false;
            estado.modalAdminAbierto = false;
        };

        const resetFabrica = async () => {
            if (!confirm("PELIGRO: Esto borrará TODOS los datos locales, caché y reiniciará la aplicación como si fuera nueva. ¿Continuar?")) return;
            
            try {
                // 1. Borrar LocalStorage
                localStorage.clear();
                
                // 2. Borrar Cachés
                if ('caches' in window) {
                    const keys = await caches.keys();
                    await Promise.all(keys.map(key => caches.delete(key)));
                }

                // 3. Desregistrar Service Worker
                if ('serviceWorker' in navigator) {
                    const registrations = await navigator.serviceWorker.getRegistrations();
                    await Promise.all(registrations.map(r => r.unregister()));
                }

                alert("Limpieza completada. La aplicación se reiniciará.");
                window.location.reload(true);
            } catch (e) {
                alert("Error al limpiar: " + e.message);
                window.location.reload();
            }
        };

        // --- IA LOGIC ---
        const abrirIA = () => { estado.modalIAAbierto = true; };
        const enviarAI = async () => {
            if (!preguntaIA.value || iaCargando.value) return;
            const q = preguntaIA.value;
            chatIA.value.push({ role: 'user', content: q });
            preguntaIA.value = '';
            iaCargando.value = true;

            const r = await AIService.preguntar(q, estado.productos, estado.config.GROQ_API_KEY);
            chatIA.value.push({ role: 'assistant', content: r });
            iaCargando.value = false;
            
            nextTick(() => {
                const c = document.getElementById('chatContainer');
                c.scrollTop = c.scrollHeight;
            });
        };

        // --- MÉTODOS NEGOCIO (Resumidos) ---
        const agregarAlCarrito = (p) => {
            if (p.stock <= 0) return alert("Sin Stock");
            const idx = estado.carrito.findIndex(i => i.id === p.id);
            if (idx !== -1) { if (estado.carrito[idx].cantidad >= p.stock) return; estado.carrito[idx].cantidad++; }
            else { estado.carrito.push({ ...p, cantidad: 1 }); }
        };

        const ajustarCantidad = (index, delta) => {
            const item = estado.carrito[index];
            const nuevaCantidad = item.cantidad + delta;

            if (nuevaCantidad <= 0) {
                // Eliminar del carrito si la cantidad llega a 0
                estado.carrito.splice(index, 1);
            } else {
                // Verificar Stock
                const prodOriginal = estado.productos.find(p => p.id === item.id);
                if (prodOriginal && nuevaCantidad > prodOriginal.stock) {
                    return alert("No hay suficiente stock disponible.");
                }
                item.cantidad = nuevaCantidad;
            }
        };

        const cambiarVista = (v) => {
            estado.vistaActual = v;
            if (v === 'dashboard') cargarDashboard();
            if (v === 'ventas') cargarHistorial();
            if (v === 'presupuestos') cargarHistorialPresupuestos();
        };
        const cargarHistorialPresupuestos = async () => {
            const data = await CloudService.obtenerPresupuestos();
            if (data) historialPresupuestos.value = data;
        };
        const abrirModalPresupuesto = () => {
            if (estado.carrito.length === 0) return alert("El carrito está vacío.");
            estado.modalPresupuestoAbierto = true;
        };
        const generarPresupuesto = async () => {
            const idTicket = 'P-' + Date.now().toString().slice(-6); // ID Simple
            
            // Determinar tasa a usar
            const tasaUsada = presupuestoState.tipoTasa === 'Binance' ? estado.tasaBinance : estado.tasaBCV;

            const presupuesto = {
                id_ticket: idTicket,
                fecha: new Date().toLocaleString(),
                total: totalCarritoUSD.value,
                tasa: tasaUsada,
                tasa_binance: estado.tasaBinance, // Guardamos ambas por referencia histórica
                moneda: presupuestoState.moneda,
                items: JSON.parse(JSON.stringify(estado.carrito)),
                cliente: clienteState.tipo === 'personalizado' ? {...clienteState.datos} : { nombre: 'CLIENTE GENERAL' },
                config: {...estado.config}
            };

            imprimirPresupuesto(presupuesto);
            CloudService.registrarAccion('registrarPresupuesto', presupuesto);
            estado.carrito = []; 
            estado.modalPresupuestoAbierto = false;
        };
        const imprimirPresupuesto = (p) => {
            try {
                const iframe = document.getElementById('printFrame');
                const doc = iframe.contentWindow.document;
                const html = Templates.css + (estado.config.template === 'carta' ? Templates.presupuestoCarta(p) : Templates.presupuestoTermico(p));
                doc.open(); doc.write(html); doc.close();
                iframe.contentWindow.focus(); 
                setTimeout(() => iframe.contentWindow.print(), 500);
            } catch (e) { alert("Error al imprimir presupuesto"); }
        };
        const cargarPresupuestoAlCarrito = (p) => {
            if (estado.carrito.length > 0) {
                if (!confirm("El carrito actual se borrará. ¿Continuar?")) return;
            }
            estado.carrito = [];
            p.items.forEach(item => {
                // Verificar si existe el producto en el inventario actual para traer el precio actualizado?
                // Mejor usar los datos del presupuesto o buscar el ID para validar stock.
                const prodInventario = estado.productos.find(x => x.id === item.id);
                if (prodInventario) {
                    estado.carrito.push({ ...prodInventario, cantidad: item.cantidad });
                } else {
                    // Si no existe (borrado), agregamos el item tal cual venia
                    estado.carrito.push({ ...item });
                }
            });
            estado.vistaActual = 'pos';
            alert("Presupuesto cargado al carrito.");
        };

        const procesarVentaFinal = async () => {
            if (restanteUSD.value > 0.01) return alert(`Faltan $${restanteUSD.value.toFixed(2)}`);
            
            // Generar correlativo
            const correlativoActual = parseInt(estado.config.CORRELATIVO) || 1000;
            const nuevoCorrelativo = correlativoActual + 1;
            const idTicket = 'T-' + String(correlativoActual).padStart(6, '0');

            // Actualizar config local y nube
            estado.config.CORRELATIVO = nuevoCorrelativo;
            CloudService.registrarAccion('guardarConfig', { clave: 'CORRELATIVO', valor: nuevoCorrelativo });

            const ventaFinal = {
                id_ticket: idTicket,
                fecha: new Date().toLocaleString(),
                total: totalCarritoUSD.value, tasa: estado.tasaBCV,
                items: JSON.parse(JSON.stringify(estado.carrito)),
                pagos: JSON.parse(JSON.stringify(pagoState.metodosAgregados)),
                cliente: clienteState.tipo === 'personalizado' ? {...clienteState.datos} : null,
                config: {...estado.config}
            };
            ventaFinal.items.forEach(item => DB.updateLocalStock(item.id, item.cantidad));
            estado.productos = DB.get('inventario_local');
            imprimirRecibo(ventaFinal);
            CloudService.registrarAccion('registrarVenta', ventaFinal);
            estado.carrito = []; estado.modalPagoAbierto = false;
        };
        const cargarDashboard = async () => {
            const stats = await CloudService.obtenerEstadisticas();
            if (stats && stats.kpis) { Object.assign(reportes.kpis, stats.kpis); if (stats.grafica) reportes.graficaData = stats.grafica; renderizarGrafica(); }
        };
        const cargarHistorial = async () => {
            const data = await CloudService.obtenerVentas();
            if (data) historialVentas.value = data;
        };
        const renderizarGrafica = () => {
            if (estado.vistaActual !== 'dashboard') return;
            nextTick(() => {
                const ctx = document.getElementById('ventasChart');
                if (!ctx || !reportes.graficaData.labels) return;
                if (chartInstance) chartInstance.destroy();
                chartInstance = new Chart(ctx, { type: 'bar', data: { labels: reportes.graficaData.labels, datasets: [{ label: 'Ventas (USD)', data: reportes.graficaData.data, backgroundColor: '#137fec', borderRadius: 6 }] } });
            });
        };
        const imprimirRecibo = (v) => {
            try {
                // Asegurar tipos de datos para evitar crash en templates
                const ventaSegura = {
                    ...v,
                    total: parseFloat(v.total) || 0,
                    tasa: parseFloat(v.tasa) || 1,
                    items: (v.items || []).map(i => ({
                        ...i,
                        cantidad: parseFloat(i.cantidad) || 0,
                        precio: parseFloat(i.precio) || 0
                    }))
                };

                const iframe = document.getElementById('printFrame');
                if (!iframe) return alert("Error: No se encuentra el marco de impresión.");
                
                const doc = iframe.contentWindow.document;
                const html = Templates.css + (estado.config.template === 'carta' ? Templates.carta(ventaSegura) : Templates.termico(ventaSegura));
                
                doc.open(); 
                doc.write(html); 
                doc.close();
                
                iframe.contentWindow.focus(); 
                setTimeout(() => {
                    iframe.contentWindow.print();
                }, 500);
            } catch (e) {
                console.error("Error al imprimir:", e);
                alert("Error al generar el recibo. Revise la consola.");
            }
        };
        const iniciarScanner = () => {
            estado.scannerAbierto = true;
            setTimeout(() => {
                const h = new Html5Qrcode("reader");
                h.start({ facingMode: "environment" }, { fps: 10, qrbox: 250 }, (t) => {
                    const p = estado.productos.find(prod => prod.sku === t); if (p) agregarAlCarrito(p);
                    h.stop(); estado.scannerAbierto = false;
                }, () => {}).catch(e => console.log(e));
            }, 100);
        };

        const resetFormularioPago = () => {
            pagoState.metodosAgregados = []; pagoState.metodoSeleccionado = 'Efectivo USD';
            pagoState.montoInput = totalCarritoUSD.value; pagoState.monedaInput = 'USD';
        };
        const cambiarMetodo = () => {
            if (['Pago Movil', 'Punto de Venta', 'Efectivo VES'].includes(pagoState.metodoSeleccionado)) {
                pagoState.monedaInput = 'VES'; pagoState.montoInput = parseFloat((restanteUSD.value * estado.tasaBCV).toFixed(2));
            } else { pagoState.monedaInput = 'USD'; pagoState.montoInput = parseFloat(restanteUSD.value.toFixed(2)); }
        };

        const abrirModalPago = () => {
            if (estado.carrito.length === 0) return alert("El carrito está vacío.");
            resetFormularioPago();
            estado.modalPagoAbierto = true;
        };

        const agregarPagoParcial = () => {
            if (pagoState.montoInput <= 0) return;
            pagoState.metodosAgregados.push({ 
                metodo: pagoState.metodoSeleccionado, 
                monto: parseFloat(pagoState.montoInput), 
                moneda: pagoState.monedaInput,
                banco: pagoState.bancoSeleccionado,
                referencia: pagoState.referenciaInput,
                titular: pagoState.titularInput
            });
            pagoState.montoInput = 0; 
            pagoState.referenciaInput = '';
            pagoState.titularInput = '';
            pagoState.bancoSeleccionado = '';
            setTimeout(() => cambiarMetodo(), 100); 
        };

        const guardarProducto = async () => {
            if (!nuevoProducto.nombre || !nuevoProducto.sku) return alert("Nombre y SKU son obligatorios");
            
            // Verificar si existe (para sumar stock o alertar)
            const existente = estado.productos.find(p => p.sku === nuevoProducto.sku);
            if (existente) {
                if (confirm(`El producto ${existente.nombre} ya existe. ¿Deseas sumar al stock actual?`)) {
                    existente.stock += nuevoProducto.stock;
                    // Actualizar precio/costo si cambiaron
                    existente.precio = nuevoProducto.precio > 0 ? nuevoProducto.precio : existente.precio;
                    existente.costo = nuevoProducto.costo > 0 ? nuevoProducto.costo : existente.costo;
                    CloudService.registrarAccion('actualizarStock', { id: existente.id, cantidad: nuevoProducto.stock, precio: existente.precio, costo: existente.costo });
                }
            } else {
                const prod = {
                    id: Date.now().toString(),
                    ...nuevoProducto
                };
                estado.productos.push(prod);
                CloudService.registrarAccion('crearProducto', prod);
            }
            
            // Reset y cerrar
            Object.keys(nuevoProducto).forEach(key => nuevoProducto[key] = (key === 'stock_min' ? 5 : (typeof nuevoProducto[key] === 'number' ? 0 : '')));
            estado.modalProductoAbierto = false;
            alert("Producto Guardado Correctamente");
        };

        const formatCurrency = (value) => {
            return new Intl.NumberFormat('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
        };

        return {
            estado, chatIA, preguntaIA, iaCargando, adminAutenticado, adminPass, tempApiUrl, licenciaEstado, clicksLogo,
            nuevoProducto, pagoState, presupuestoState, clienteState, metodos, bancos, reportes, historialVentas, historialPresupuestos,
            productosFiltrados, totalCarritoUSD, totalCarritoVES, restanteUSD, totalPagadoUSD, restanteVES, sugerenciasProducto,
            agregarAlCarrito, iniciarScanner, syncInmediato, cambiarVista, enviarAI, abrirIA,
            contarClicksLogo, loginAdmin, actualizarUrlApi, alternarLicencia, cerrarAdmin, resetFabrica, instalarApp,
            confirmarEliminacion: (p) => { if(confirm("Eliminar?")) { estado.productos = estado.productos.filter(i => i.id !== p.id); CloudService.registrarAccion('eliminarProducto', p.id); } },
            guardarConfiguracion: async () => { 
                // Guardar localmente primero para persistencia inmediata
                DB.save('config_empresa', estado.config);
                DB.save('tasa_binance', estado.tasaBinance);

                // Sincronizar con la nube
                Object.keys(estado.config).forEach(k => CloudService.registrarAccion('guardarConfig', { clave: k, valor: estado.config[k] })); 
                CloudService.registrarAccion('guardarConfig', { clave: 'TASA_BINANCE', valor: estado.tasaBinance }); // Guardar la tasa Binance
                
                alert("Configuración guardada localmente y en cola de sincronización."); 
                estado.modalConfigAbierto = false; 
            },
            procesarVentaFinal, anularVentaAccion: (v) => { CloudService.registrarAccion('anularVenta', v.id); v.estado = 'ANULADO'; v.items.forEach(i => DB.updateLocalStock(i.id, -i.cantidad)); estado.productos = DB.get('inventario_local'); },
            verTicketHistorial: (v) => imprimirRecibo({...v, config: estado.config}),
            verTicketPresupuesto: (p) => imprimirPresupuesto({...p, config: estado.config}), // Nuevo
            cambiarMetodo, agregarPagoParcial, eliminarPago: (i) => { pagoState.metodosAgregados.splice(i, 1); cambiarMetodo(); },
            abrirModalPago, abrirModalPresupuesto, generarPresupuesto, cargarHistorialPresupuestos, cargarPresupuestoAlCarrito, // Nuevos
            ajustarCantidad, guardarProducto, formatCurrency, seleccionarProductoExistente
        };
    }
}).mount('#app');
