<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Generador de Cotizaciones DOMKA</title>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/pdfmake.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/vfs_fonts.js"></script>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f8fafc;
            color: #334155;
        }
        .container {
            background-color: white;
            border-radius: 10px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            padding: 30px;
            margin-bottom: 30px;
        }
        h1 {
            color: #F97316;
            text-align: center;
            margin-bottom: 30px;
        }
        .form-group {
            margin-bottom: 20px;
        }
        label {
            display: block;
            margin-bottom: 8px;
            font-weight: 600;
        }
        input, textarea {
            width: 100%;
            padding: 10px;
            border: 1px solid #d1d5db;
            border-radius: 5px;
            font-size: 16px;
        }
        button {
            background-color: #F97316;
            color: white;
            border: none;
            padding: 12px 20px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 16px;
            font-weight: 600;
            transition: background-color 0.3s;
        }
        button:hover {
            background-color: #ea580c;
        }
        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }
        .items-table th, .items-table td {
            border: 1px solid #d1d5db;
            padding: 10px;
            text-align: left;
        }
        .items-table th {
            background-color: #F97316;
            color: white;
        }
        .items-table tr:nth-child(even) {
            background-color: #f9fafb;
        }
        .add-item-btn {
            background-color: #10b981;
            margin-bottom: 20px;
        }
        .add-item-btn:hover {
            background-color: #059669;
        }
        .totals {
            background-color: #f1f5f9;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
        }
        .preview {
            border: 1px dashed #d1d5db;
            padding: 20px;
            border-radius: 5px;
            margin-top: 30px;
            background-color: #f9fafb;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Generador de Cotizaciones DOMKA</h1>
        
        <div class="form-group">
            <label for="cliente">Cliente</label>
            <input type="text" id="cliente" placeholder="Nombre del cliente" value="Cliente Ejemplo S.A.S.">
        </div>
        
        <h2>Ítems de Cotización</h2>
        <button id="agregarItem" class="add-item-btn">+ Agregar Ítem</button>
        
        <table class="items-table">
            <thead>
                <tr>
                    <th>Descripción</th>
                    <th width="100">Cantidad</th>
                    <th width="150">Precio Unitario</th>
                    <th width="150">Subtotal</th>
                    <th width="50">Acción</th>
                </tr>
            </thead>
            <tbody id="itemsBody">
                <tr>
                    <td><input type="text" class="descripcion" placeholder="Descripción del ítem" value="Producto Ejemplo 1"></td>
                    <td><input type="number" class="cantidad" min="1" value="2" onchange="calcularSubtotal(this)"></td>
                    <td><input type="number" class="precio" min="0" value="150000" onchange="calcularSubtotal(this)"></td>
                    <td class="subtotal">$300.000</td>
                    <td><button onclick="eliminarItem(this)" style="background-color: #ef4444;">X</button></td>
                </tr>
                <tr>
                    <td><input type="text" class="descripcion" placeholder="Descripción del ítem" value="Producto Ejemplo 2"></td>
                    <td><input type="number" class="cantidad" min="1" value="1" onchange="calcularSubtotal(this)"></td>
                    <td><input type="number" class="precio" min="0" value="250000" onchange="calcularSubtotal(this)"></td>
                    <td class="subtotal">$250.000</td>
                    <td><button onclick="eliminarItem(this)" style="background-color: #ef4444;">X</button></td>
                </tr>
            </tbody>
        </table>
        
        <div class="totals">
            <div><strong>Subtotal:</strong> <span id="subtotal">$550.000</span></div>
            <div><strong>IVA (19%):</strong> <span id="impuestos">$104.500</span></div>
            <div><strong>TOTAL:</strong> <span id="total">$654.500</span></div>
        </div>
        
        <div class="form-group">
            <label for="notas">Notas</label>
            <textarea id="notas" rows="4" placeholder="Notas adicionales para la cotización">Esta cotización tiene una validez de 30 días. Precios sujetos a cambio sin previo aviso.</textarea>
        </div>
        
        <button onclick="generarPDF()">Generar PDF</button>
    </div>
    
    <div class="container preview">
        <h2>Vista Previa del Documento</h2>
        <p><em>Nota: Esta es solo una simulación de cómo se verá el PDF. Haz clic en "Generar PDF" para crear el documento real.</em></p>
        
        <div style="border: 1px solid #d1d5db; padding: 20px; background-color: white;">
            <div style="text-align: center; color: #F97316; font-size: 20px; font-weight: bold; margin-bottom: 20px;">
                DOMKA - Cotización
            </div>
            
            <div style="margin-bottom: 15px;">
                <strong>Cliente:</strong> <span id="previewCliente">Cliente Ejemplo S.A.S.</span>
            </div>
            
            <div style="font-weight: bold; margin: 15px 0; color: #374151; font-size: 16px;">
                Detalle de Cotización
            </div>
            
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                <thead>
                    <tr style="background-color: #F97316; color: white;">
                        <th style="padding: 10px; text-align: left;">Descripción</th>
                        <th style="padding: 10px; text-align: center; width: 80px;">Cantidad</th>
                        <th style="padding: 10px; text-align: right; width: 120px;">Vlr Unitario</th>
                        <th style="padding: 10px; text-align: right; width: 120px;">Subtotal</th>
                    </tr>
                </thead>
                <tbody id="previewItems">
                    <tr>
                        <td style="padding: 8px 10px; border-bottom: 1px solid #e5e7eb;">Producto Ejemplo 1</td>
                        <td style="padding: 8px 10px; text-align: center; border-bottom: 1px solid #e5e7eb;">2</td>
                        <td style="padding: 8px 10px; text-align: right; border-bottom: 1px solid #e5e7eb;">$150.000</td>
                        <td style="padding: 8px 10px; text-align: right; border-bottom: 1px solid #e5e7eb;">$300.000</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 10px; border-bottom: 1px solid #e5e7eb;">Producto Ejemplo 2</td>
                        <td style="padding: 8px 10px; text-align: center; border-bottom: 1px solid #e5e7eb;">1</td>
                        <td style="padding: 8px 10px; text-align: right; border-bottom: 1px solid #e5e7eb;">$250.000</td>
                        <td style="padding: 8px 10px; text-align: right; border-bottom: 1px solid #e5e7eb;">$250.000</td>
                    </tr>
                </tbody>
            </table>
            
            <div style="font-weight: bold; margin: 15px 0; color: #374151; font-size: 16px;">
                Totales
            </div>
            
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                <tr>
                    <td style="padding: 8px 10px; border-bottom: 1px solid #e5e7eb;">Subtotal</td>
                    <td style="padding: 8px 10px; text-align: right; border-bottom: 1px solid #e5e7eb;">$550.000</td>
                </tr>
                <tr>
                    <td style="padding: 8px 10px; border-bottom: 1px solid #e5e7eb;">IVA (19%)</td>
                    <td style="padding: 8px 10px; text-align: right; border-bottom: 1px solid #e5e7eb;">$104.500</td>
                </tr>
                <tr>
                    <td style="padding: 8px 10px; font-weight: bold;">TOTAL</td>
                    <td style="padding: 8px 10px; text-align: right; font-weight: bold;">$654.500</td>
                </tr>
            </table>
            
            <div style="font-weight: bold; margin: 15px 0; color: #374151; font-size: 16px;">
                Notas
            </div>
            
            <div id="previewNotas">
                Esta cotización tiene una validez de 30 días. Precios sujetos a cambio sin previo aviso.
            </div>
        </div>
    </div>

    <script>
        // Función para calcular el subtotal de un ítem
        function calcularSubtotal(input) {
            const row = input.closest('tr');
            const cantidad = parseFloat(row.querySelector('.cantidad').value) || 0;
            const precio = parseFloat(row.querySelector('.precio').value) || 0;
            const subtotal = cantidad * precio;
            
            row.querySelector('.subtotal').textContent = `$${formatearNumero(subtotal)}`;
            calcularTotales();
            actualizarVistaPrevia();
        }
        
        // Función para formatear números con separadores de miles
        function formatearNumero(num) {
            return num.toLocaleString('es-CO');
        }
        
        // Función para calcular los totales generales
        function calcularTotales() {
            let subtotal = 0;
            document.querySelectorAll('.subtotal').forEach(cell => {
                const valor = parseFloat(cell.textContent.replace('$', '').replace(/\./g, '')) || 0;
                subtotal += valor;
            });
            
            const impuestos = subtotal * 0.19;
            const total = subtotal + impuestos;
            
            document.getElementById('subtotal').textContent = `$${formatearNumero(subtotal)}`;
            document.getElementById('impuestos').textContent = `$${formatearNumero(impuestos)}`;
            document.getElementById('total').textContent = `$${formatearNumero(total)}`;
        }
        
        // Función para eliminar un ítem
        function eliminarItem(button) {
            const row = button.closest('tr');
            row.remove();
            calcularTotales();
            actualizarVistaPrevia();
        }
        
        // Función para agregar un nuevo ítem
        document.getElementById('agregarItem').addEventListener('click', function() {
            const tbody = document.getElementById('itemsBody');
            const newRow = document.createElement('tr');
            newRow.innerHTML = `
                <td><input type="text" class="descripcion" placeholder="Descripción del ítem"></td>
                <td><input type="number" class="cantidad" min="1" value="1" onchange="calcularSubtotal(this)"></td>
                <td><input type="number" class="precio" min="0" value="0" onchange="calcularSubtotal(this)"></td>
                <td class="subtotal">$0</td>
                <td><button onclick="eliminarItem(this)" style="background-color: #ef4444;">X</button></td>
            `;
            tbody.appendChild(newRow);
        });
        
        // Función para actualizar la vista previa
        function actualizarVistaPrevia() {
            document.getElementById('previewCliente').textContent = document.getElementById('cliente').value;
            
            // Actualizar items en vista previa
            const previewItems = document.getElementById('previewItems');
            previewItems.innerHTML = '';
            
            document.querySelectorAll('#itemsBody tr').forEach(row => {
                const descripcion = row.querySelector('.descripcion').value || '';
                const cantidad = row.querySelector('.cantidad').value || '0';
                const precio = parseFloat(row.querySelector('.precio').value) || 0;
                const subtotal = parseFloat(row.querySelector('.subtotal').textContent.replace('$', '').replace(/\./g, '')) || 0;
                
                const newRow = document.createElement('tr');
                newRow.innerHTML = `
                    <td style="padding: 8px 10px; border-bottom: 1px solid #e5e7eb;">${descripcion}</td>
                    <td style="padding: 8px 10px; text-align: center; border-bottom: 1px solid #e5e7eb;">${cantidad}</td>
                    <td style="padding: 8px 10px; text-align: right; border-bottom: 1px solid #e5e7eb;">$${formatearNumero(precio)}</td>
                    <td style="padding: 8px 10px; text-align: right; border-bottom: 1px solid #e5e7eb;">$${formatearNumero(subtotal)}</td>
                `;
                previewItems.appendChild(newRow);
            });
            
            // Actualizar totales en vista previa
            document.getElementById('previewNotas').textContent = document.getElementById('notas').value;
        }
        
        // Función para generar el PDF
        function generarPDF() {
            const nombreCliente = document.getElementById('cliente').value;
            const notas = document.getElementById('notas').value;
            
            // Recopilar items
            const items = [];
            document.querySelectorAll('#itemsBody tr').forEach(row => {
                const descripcion = row.querySelector('.descripcion').value || '';
                const cantidad = parseFloat(row.querySelector('.cantidad').value) || 0;
                const precio = parseFloat(row.querySelector('.precio').value) || 0;
                const subtotal = parseFloat(row.querySelector('.subtotal').textContent.replace('$', '').replace(/\./g, '')) || 0;
                
                items.push({
                    descripcion,
                    cantidad,
                    precio,
                    subtotal
                });
            });
            
            const subtotal = parseFloat(document.getElementById('subtotal').textContent.replace('$', '').replace(/\./g, '')) || 0;
            const impuestos = parseFloat(document.getElementById('impuestos').textContent.replace('$', '').replace(/\./g, '')) || 0;
            const total = parseFloat(document.getElementById('total').textContent.replace('$', '').replace(/\./g, '')) || 0;
            
            const cotizacion = {
                items,
                subtotal,
                impuestos,
                total,
                notas
            };
            
            // Llamar a la función mejorada para generar PDF
            generarPDFCotizacionMejorado(cotizacion, nombreCliente);
        }
        
        // Función mejorada para generar el PDF
        function generarPDFCotizacionMejorado(cotizacion, nombreCliente = "Cliente") {
            const { items = [], subtotal = 0, impuestos = 0, total = 0, notas = "" } = cotizacion;
            
            // Obtener fecha actual
            const ahora = new Date();
            const fecha = ahora.toLocaleDateString('es-CO', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            
            // Construir tabla de ítems
            const tablaItems = [
                [
                    { text: "Descripción", style: "tableHeader" },
                    { text: "Cantidad", style: "tableHeader" },
                    { text: "Vlr Unitario", style: "tableHeader" },
                    { text: "Subtotal", style: "tableHeader" }
                ],
                ...items.map(it => [
                    it.descripcion || "",
                    { text: it.cantidad || 0, alignment: "center" },
                    { text: `$${Number(it.precio || 0).toLocaleString("es-CO")}`, alignment: "right" },
                    { text: `$${Number(it.subtotal || 0).toLocaleString("es-CO")}`, alignment: "right" }
                ])
            ];
            
            const docDefinition = {
                pageSize: 'A4',
                pageMargins: [40, 60, 40, 60],
                header: {
                    margin: [40, 20, 40, 0],
                    columns: [
                        {
                            text: 'DOMKA',
                            fontSize: 18,
                            bold: true,
                            color: '#F97316',
                            alignment: 'left',
                            margin: [0, 0, 0, 5]
                        },
                        {
                            text: 'Cotización',
                            fontSize: 14,
                            bold: true,
                            color: '#374151',
                            alignment: 'right'
                        }
                    ]
                },
                footer: function(currentPage, pageCount) {
                    return {
                        margin: [40, 10, 40, 20],
                        columns: [
                            {
                                text: `Fecha: ${fecha}`,
                                fontSize: 10,
                                color: '#6B7280',
                                alignment: 'left'
                            },
                            {
                                text: `Página ${currentPage} de ${pageCount}`,
                                fontSize: 10,
                                color: '#6B7280',
                                alignment: 'right'
                            }
                        ]
                    };
                },
                content: [
                    {
                        text: `Cotización para: ${nombreCliente}`,
                        style: "cliente",
                        margin: [0, 20, 0, 10]
                    },
                    {
                        text: "Detalle de Cotización",
                        style: "subheader"
                    },
                    {
                        table: {
                            headerRows: 1,
                            widths: ["*", "auto", "auto", "auto"],
                            body: tablaItems
                        },
                        layout: {
                            hLineWidth: function(i, node) {
                                return (i === 0 || i === node.table.body.length) ? 1 : 0.5;
                            },
                            vLineWidth: function(i, node) {
                                return 0;
                            },
                            hLineColor: function(i, node) {
                                return (i === 0 || i === 1 || i === node.table.body.length) ? '#F97316' : '#E5E7EB';
                            },
                            paddingTop: function(i, node) {
                                return 8;
                            },
                            paddingBottom: function(i, node) {
                                return 8;
                            }
                        }
                    },
                    { text: " ", margin: [0, 10] },
                    {
                        columns: [
                            {
                                width: '*',
                                text: " "
                            },
                            {
                                width: 200,
                                table: {
                                    widths: ['*', 'auto'],
                                    body: [
                                        [
                                            { text: "Subtotal", style: "totalLabel" },
                                            { text: `$${subtotal.toLocaleString("es-CO")}`, style: "totalValue", alignment: "right" }
                                        ],
                                        [
                                            { text: "IVA (19%)", style: "totalLabel" },
                                            { text: `$${impuestos.toLocaleString("es-CO")}`, style: "totalValue", alignment: "right" }
                                        ],
                                        [
                                            { text: "TOTAL", style: "totalFinalLabel" },
                                            { text: `$${total.toLocaleString("es-CO")}`, style: "totalFinalValue", alignment: "right" }
                                        ]
                                    ]
                                },
                                layout: {
                                    hLineWidth: function(i, node) {
                                        return 0.5;
                                    },
                                    vLineWidth: function(i, node) {
                                        return 0;
                                    },
                                    hLineColor: function(i, node) {
                                        return '#E5E7EB';
                                    },
                                    paddingTop: function(i, node) {
                                        return 5;
                                    },
                                    paddingBottom: function(i, node) {
                                        return 5;
                                    }
                                }
                            }
                        ]
                    },
                    { text: " ", margin: [0, 15] },
                    {
                        text: "Notas",
                        style: "subheader"
                    },
                    {
                        text: notas || "—",
                        style: "notas",
                        margin: [0, 0, 0, 10]
                    },
                    {
                        text: "¡Gracias por su preferencia!",
                        style: "agradecimiento",
                        margin: [0, 20, 0, 0]
                    }
                ],
                styles: {
                    header: {
                        fontSize: 18,
                        bold: true,
                        color: "#F97316",
                        margin: [0, 0, 0, 10]
                    },
                    cliente: {
                        fontSize: 14,
                        bold: true,
                        color: "#374151"
                    },
                    subheader: {
                        fontSize: 12,
                        bold: true,
                        margin: [0, 10, 0, 5],
                        color: "#374151"
                    },
                    tableHeader: {
                        bold: true,
                        fontSize: 10,
                        fillColor: "#F97316",
                        color: "white",
                        alignment: "center"
                    },
                    totalLabel: {
                        fontSize: 10,
                        color: "#6B7280"
                    },
                    totalValue: {
                        fontSize: 10,
                        color: "#374151"
                    },
                    totalFinalLabel: {
                        fontSize: 11,
                        bold: true,
                        color: "#374151"
                    },
                    totalFinalValue: {
                        fontSize: 11,
                        bold: true,
                        color: "#F97316"
                    },
                    notas: {
                        fontSize: 10,
                        color: "#6B7280"
                    },
                    agradecimiento: {
                        fontSize: 11,
                        italic: true,
                        color: "#6B7280",
                        alignment: "center"
                    }
                },
                defaultStyle: {
                    fontSize: 10,
                    font: "Helvetica"
                }
            };
            
            pdfMake.createPdf(docDefinition).open();
        }
        
        // Inicializar la vista previa al cargar la página
        document.addEventListener('DOMContentLoaded', function() {
            calcularTotales();
            actualizarVistaPrevia();
            
            // Actualizar vista previa cuando cambien los campos
            document.getElementById('cliente').addEventListener('input', actualizarVistaPrevia);
            document.getElementById('notas').addEventListener('input', actualizarVistaPrevia);
            
            // Actualizar vista previa cuando cambien los items
            document.querySelectorAll('.descripcion, .cantidad, .precio').forEach(input => {
                input.addEventListener('input', actualizarVistaPrevia);
            });
        });
    </script>
</body>
</html>
