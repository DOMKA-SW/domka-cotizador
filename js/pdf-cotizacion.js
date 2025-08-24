// js/pdf-cotizacion.js

// Logo DOMKA en Base64 (naranja, incrustado directamente)
const logoBase64 =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMgAAADIC..."; 
// (Truncado para que no sea gigante, aquí va TODO el string base64 que te pasé)

function generarPDFCotizacion(cotizacion, clienteNombre) {
  if (!cotizacion) {
    alert("Error: No hay datos de cotización");
    return;
  }

  console.log("📄 Generando PDF para:", cotizacion);

  // Construcción de tabla de ítems
  const itemsTabla = [
    [
      { text: "Descripción", bold: true, fillColor: "#f97316", color: "white" },
      { text: "Cantidad", bold: true, fillColor: "#f97316", color: "white" },
      { text: "Precio", bold: true, fillColor: "#f97316", color: "white" },
      { text: "Subtotal", bold: true, fillColor: "#f97316", color: "white" }
    ]
  ];

  if (cotizacion.items && cotizacion.items.length > 0) {
    cotizacion.items.forEach(it => {
      itemsTabla.push([
        it.descripcion,
        it.cantidad,
        `$${Number(it.precio).toLocaleString("es-CO")}`,
        `$${Number(it.subtotal).toLocaleString("es-CO")}`
      ]);
    });
  }

  // Documento PDF
  const docDefinition = {
    content: [
      {
        columns: [
          { image: logoBase64, width: 100 },
          [
            { text: "DOMKA - Cotización", fontSize: 18, bold: true, margin: [0, 0, 0, 10], color: "#f97316" },
            { text: `Fecha: ${new Date().toLocaleDateString("es-CO")}`, fontSize: 10 }
          ]
        ]
      },
      { text: `\nCliente: ${clienteNombre || cotizacion.clienteId}`, fontSize: 12, margin: [0, 10, 0, 5] },
      { text: `Notas: ${cotizacion.notas || "-"}`, fontSize: 10, margin: [0, 0, 0, 10] },

      {
        table: {
          headerRows: 1,
          widths: ["*", "auto", "auto", "auto"],
          body: itemsTabla
        },
        margin: [0, 10, 0, 10]
      },

      {
        alignment: "right",
        table: {
          widths: ["*", "auto"],
          body: [
            ["Subtotal", `$${Number(cotizacion.subtotal).toLocaleString("es-CO")}`],
            ["IVA (19%)", `$${Number(cotizacion.impuestos).toLocaleString("es-CO")}`],
            [{ text: "TOTAL", bold: true }, { text: `$${Number(cotizacion.total).toLocaleString("es-CO")}`, bold: true }]
          ]
        },
        layout: "noBorders"
      }
    ],
    defaultStyle: {
      fontSize: 10
    }
  };

  // Generar y abrir el PDF en otra pestaña
  pdfMake.createPdf(docDefinition).open();
}

// ✅ Exponer la función al global para usarla en los botones
window.generarPDFCotizacion = generarPDFCotizacion;
