// js/templates.js

export const Templates = {
    css: `
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&family=Space+Mono:wght@400;700&display=swap');
            body { font-family: 'Inter', sans-serif; margin: 0; padding: 0; color: #101922; }
            .mono { font-family: 'Space Mono', monospace; }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            .font-bold { font-weight: 800; }
            .uppercase { text-transform: uppercase; }
            .text-xs { font-size: 10px; }
            .text-sm { font-size: 12px; }
            .text-lg { font-size: 18px; }
            .border-b { border-bottom: 1px solid #ddd; }
            .border-t { border-top: 1px solid #ddd; }
            .dashed { border-style: dashed; }
            .py-1 { padding-top: 4px; padding-bottom: 4px; }
            .mb-2 { margin-bottom: 8px; }
            .w-full { width: 100%; }
            table { width: 100%; border-collapse: collapse; }
            th { text-align: left; }
            .logo-print { max-width: 60%; height: auto; max-height: 50px; display: block; margin: 0 auto 5px auto; object-fit: contain; }
            .logo-carta { max-height: 60px; max-width: 150px; object-fit: contain; margin-bottom: 10px; }
        </style>
    `,

    termico: (venta) => {
        const empresa = venta.config || {};
        const cliente = venta.cliente || { nombre: 'CONSUMIDOR FINAL', documento: 'N/A' };
        
        // Logica de Logo
        const logoHtml = empresa.EMPRESA_LOGO_URL 
            ? `<img src="${empresa.EMPRESA_LOGO_URL}" class="logo-print" alt="Logo">` 
            : '';

        return `
        <div style="width: 80mm; padding: 10px; box-sizing: border-box;">
            <div class="text-center mb-2">
                ${logoHtml}
                <h2 class="font-bold text-lg uppercase leading-tight">${empresa.EMPRESA_NOMBRE || 'FERRETERÍA GENERAL'}</h2>
                <p class="text-xs">RIF: ${empresa.EMPRESA_RIF || 'J-00000000-0'}</p>
                <p class="text-xs">${empresa.EMPRESA_DIRECCION || 'Dirección Principal'}</p>
                <p class="text-xs">Tel: ${empresa.EMPRESA_TELEFONO || '0000-0000000'}</p>
            </div>
            
            <div class="border-b dashed mb-2 text-xs mono">
                <div style="display:flex; justify-content:space-between;">
                    <span>Ticket: #${venta.id_ticket}</span>
                    <span>${venta.fecha}</span>
                </div>
            </div>

            <div class="mb-2 text-xs border-b dashed pb-1">
                <p><strong>CLIENTE:</strong> ${cliente.nombre}</p>
                <p><strong>RIF/CI:</strong> ${cliente.documento}</p>
            </div>

            <table class="text-xs w-full mb-2">
                <thead><tr class="border-b"><th class="py-1">Cant</th><th>Desc</th><th class="text-right">Total</th></tr></thead>
                <tbody>
                    ${venta.items.map(item => `
                    <tr>
                        <td class="py-1" valign="top">${item.cantidad}</td>
                        <td class="py-1">${item.nombre}</td>
                        <td class="py-1 text-right">$${(item.precio * item.cantidad).toFixed(2)}</td>
                    </tr>`).join('')}
                </tbody>
            </table>

            <div class="border-t dashed py-1 text-xs">
                <div style="display:flex; justify-content:space-between;"><span>Subtotal USD:</span><span>$${venta.total.toFixed(2)}</span></div>
                <div style="display:flex; justify-content:space-between;"><span>Tasa BCV:</span><span>Bs. ${venta.tasa.toFixed(2)}</span></div>
                <div style="display:flex; justify-content:space-between;" class="font-bold text-lg mt-1">
                    <span>TOTAL:</span>
                    <span>$${venta.total.toFixed(2)}</span>
                </div>
                <div style="display:flex; justify-content:space-between;" class="font-bold text-sm text-center mt-1">
                    <span>(En Bolívares):</span>
                    <span>Bs. ${(venta.total * venta.tasa).toFixed(2)}</span>
                </div>
            </div>

            <div class="text-center mt-4 text-xs">
                <p>¡Gracias por su compra!</p>
            </div>
        </div>
    `},

    carta: (venta) => {
        const empresa = venta.config || {};
        const cliente = venta.cliente || { nombre: 'CONSUMIDOR FINAL', documento: 'N/A', direccion: 'Ciudad' };

        const logoHtml = empresa.EMPRESA_LOGO_URL 
            ? `<img src="${empresa.EMPRESA_LOGO_URL}" class="logo-carta" alt="Logo">` 
            : '';

        return `
        <div style="width: 216mm; padding: 20mm; box-sizing: border-box;">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom: 30px;">
                <div>
                    ${logoHtml}
                    <h1 class="font-bold uppercase" style="font-size: 24px; line-height:1.2;">${empresa.EMPRESA_NOMBRE || 'FERRETERÍA GENERAL'}</h1>
                    <p class="text-sm mt-1">${empresa.EMPRESA_DIRECCION || 'Dirección Principal'}</p>
                    <p class="text-sm">RIF: ${empresa.EMPRESA_RIF || 'J-00000000-0'} | Tel: ${empresa.EMPRESA_TELEFONO || ''}</p>
                </div>
                <div class="text-right">
                    <h2 class="font-bold text-lg" style="color: #666;">NOTA DE ENTREGA</h2>
                    <p class="font-bold text-lg">#${venta.id_ticket}</p>
                    <p>${venta.fecha}</p>
                </div>
            </div>

            <div class="border p-4 mb-6 rounded text-sm" style="background-color: #f9f9f9;">
                <p class="font-bold uppercase mb-1" style="color:#666; font-size:10px;">Datos del Cliente</p>
                <div style="display:flex; justify-content:space-between;">
                    <div>
                        <p><span class="font-bold">Razón Social:</span> ${cliente.nombre}</p>
                        <p><span class="font-bold">RIF/CI:</span> ${cliente.documento}</p>
                    </div>
                    <div>
                        <p><span class="font-bold">Dirección:</span> ${cliente.direccion || 'No registrada'}</p>
                        <p><span class="font-bold">Teléfono:</span> ${cliente.telefono || 'No registrado'}</p>
                    </div>
                </div>
            </div>

            <div class="border-b border-t py-4 mb-8">
                <table class="w-full text-sm">
                    <thead>
                        <tr style="background-color: #f8fafc;">
                            <th class="py-1 p-2">CANT</th>
                            <th class="py-1 p-2">DESCRIPCIÓN</th>
                            <th class="py-1 p-2">PRECIO UNIT</th>
                            <th class="py-1 p-2 text-right">TOTAL</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${venta.items.map(item => `
                        <tr style="border-bottom: 1px solid #eee;">
                            <td class="p-2 text-center">${item.cantidad}</td>
                            <td class="p-2">
                                <span class="font-bold">${item.nombre}</span><br>
                                <span style="color:#666; font-size:10px;">SKU: ${item.sku || 'N/A'}</span>
                            </td>
                            <td class="p-2">$${item.precio.toFixed(2)}</td>
                            <td class="p-2 text-right font-bold">$${(item.precio * item.cantidad).toFixed(2)}</td>
                        </tr>`).join('')}
                    </tbody>
                </table>
            </div>

            <div style="display:flex; justify-content:flex-end;">
                <div style="width: 300px;">
                    <div class="border-t border-b py-2 my-2 font-bold" style="font-size: 16px;">
                        <div style="display:flex; justify-content:space-between;">
                            <span>TOTAL A PAGAR:</span>
                            <span>$${venta.total.toFixed(2)}</span>
                        </div>
                    </div>
                    <div class="text-right text-sm" style="color:#666;">
                        Tasa BCV: Bs. ${venta.tasa.toFixed(2)}<br>
                        <strong>Total en Bs: ${(venta.total * venta.tasa).toFixed(2)}</strong>
                    </div>
                </div>
            </div>
        </div>
    `
    },

    presupuestoTermico: (p) => {
        const empresa = p.config || {};
        const cliente = p.cliente || { nombre: 'CLIENTE GENERAL', documento: '' };
        const esVes = p.moneda === 'VES';
        const simbolo = esVes ? 'Bs.' : '$';
        const factor = esVes ? p.tasa : 1;

        const logoHtml = empresa.EMPRESA_LOGO_URL ? `<img src="${empresa.EMPRESA_LOGO_URL}" class="logo-print" alt="Logo">` : '';

        return `
        <div style="width: 80mm; padding: 10px; box-sizing: border-box;">
            <div class="text-center mb-2">
                ${logoHtml}
                <h2 class="font-bold text-lg uppercase leading-tight">${empresa.EMPRESA_NOMBRE || 'FERRETERÍA'}</h2>
                <p class="text-xs">PRESUPUESTO / COTIZACIÓN</p>
                <p class="text-xs">Válido por 24 horas</p>
            </div>
            
            <div class="border-b dashed mb-2 text-xs mono">
                <div style="display:flex; justify-content:space-between;">
                    <span>#${p.id_ticket}</span>
                    <span>${p.fecha}</span>
                </div>
            </div>

            <div class="mb-2 text-xs border-b dashed pb-1">
                <p><strong>PARA:</strong> ${cliente.nombre}</p>
                ${cliente.documento ? `<p><strong>ID:</strong> ${cliente.documento}</p>` : ''}
            </div>

            <table class="text-xs w-full mb-2">
                <thead><tr class="border-b"><th class="py-1">Cant</th><th>Desc</th><th class="text-right">Total</th></tr></thead>
                <tbody>
                    ${p.items.map(item => `
                    <tr>
                        <td class="py-1" valign="top">${item.cantidad}</td>
                        <td class="py-1">${item.nombre}</td>
                        <td class="py-1 text-right">${simbolo}${(item.precio * item.cantidad * factor).toFixed(2)}</td>
                    </tr>`).join('')}
                </tbody>
            </table>

            <div class="border-t dashed py-1 text-xs">
                <div style="display:flex; justify-content:space-between;" class="font-bold text-lg mt-1">
                    <span>TOTAL ${p.moneda}:</span>
                    <span>${simbolo}${(p.total * factor).toFixed(2)}</span>
                </div>
            </div>
        </div>
        `;
    },

    presupuestoCarta: (p) => {
        const empresa = p.config || {};
        const cliente = p.cliente || { nombre: 'CLIENTE GENERAL', documento: '', direccion: '' };
        const esVes = p.moneda === 'VES';
        const simbolo = esVes ? 'Bs.' : '$';
        const factor = esVes ? p.tasa : 1;

        const logoHtml = empresa.EMPRESA_LOGO_URL ? `<img src="${empresa.EMPRESA_LOGO_URL}" class="logo-carta" alt="Logo">` : '';

        return `
        <div style="width: 216mm; padding: 20mm; box-sizing: border-box;">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom: 30px;">
                <div>
                    ${logoHtml}
                    <h1 class="font-bold uppercase" style="font-size: 24px; line-height:1.2;">${empresa.EMPRESA_NOMBRE || 'FERRETERÍA'}</h1>
                    <p class="text-sm mt-1">PRESUPUESTO FORMAL</p>
                    <p class="text-sm">Fecha: ${p.fecha}</p>
                </div>
                <div class="text-right">
                    <h2 class="font-bold text-lg" style="color: #666;">COTIZACIÓN</h2>
                    <p class="font-bold text-lg">#${p.id_ticket}</p>
                </div>
            </div>

            <div class="border p-4 mb-6 rounded text-sm" style="background-color: #f9f9f9;">
                <p class="font-bold uppercase mb-1" style="color:#666; font-size:10px;">Datos del Cliente</p>
                <div style="display:flex; justify-content:space-between;">
                    <div>
                        <p><span class="font-bold">Nombre:</span> ${cliente.nombre}</p>
                        <p><span class="font-bold">ID:</span> ${cliente.documento}</p>
                    </div>
                    <div>
                        <p><span class="font-bold">Dirección:</span> ${cliente.direccion || '-'}</p>
                    </div>
                </div>
            </div>

            <div class="border-b border-t py-4 mb-8">
                <table class="w-full text-sm">
                    <thead>
                        <tr style="background-color: #f8fafc;">
                            <th class="py-1 p-2">CANT</th>
                            <th class="py-1 p-2">DESCRIPCIÓN</th>
                            <th class="py-1 p-2">PRECIO UNIT</th>
                            <th class="py-1 p-2 text-right">TOTAL</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${p.items.map(item => `
                        <tr style="border-bottom: 1px solid #eee;">
                            <td class="p-2 text-center">${item.cantidad}</td>
                            <td class="p-2">
                                <span class="font-bold">${item.nombre}</span><br>
                                <span style="color:#666; font-size:10px;">SKU: ${item.sku || 'N/A'}</span>
                            </td>
                            <td class="p-2">${simbolo}${(item.precio * factor).toFixed(2)}</td>
                            <td class="p-2 text-right font-bold">${simbolo}${(item.precio * item.cantidad * factor).toFixed(2)}</td>
                        </tr>`).join('')}
                    </tbody>
                </table>
            </div>

            <div style="display:flex; justify-content:flex-end;">
                <div style="width: 300px;">
                    <div class="border-t border-b py-2 my-2 font-bold" style="font-size: 16px;">
                        <div style="display:flex; justify-content:space-between;">
                            <span>TOTAL (${p.moneda}):</span>
                            <span>${simbolo}${(p.total * factor).toFixed(2)}</span>
                        </div>
                    </div>
                    <div class="text-right text-xs" style="color:#666; margin-top:10px;">
                        Nota: Los precios están sujetos a cambios sin previo aviso.<br>
                        Validez de la oferta: 24 Horas.
                    </div>
                </div>
            </div>
        </div>
        `;
    }
};
