// js/pdf-cotizacion.js
// pdfMake ya está cargado desde el HTML

// Logo en Base64 (tu logo de DOMKA convertido)
const logoBase64 = "data:image/png;base64,PUT_AQUI_TU_BASE64"; 

function generarPDFCotizacion(c) {
  const tablaItems = [
    [
      { text: "Descripción", style: "tableHeader" },
      { text: "Cantidad", style: "tableHeader" },
      { text: "Precio", style: "tableHeader" },
      { text: "Subtotal", style: "tableHeader" },
    ],
    ...(c.items || []).map(it => [
      it.descripcion,
      it.cantidad,
      `$${Number(it.precio).toLocaleString("es-CO")}`,
      `$${Number(it.subtotal).toLocaleString("es-CO")}`
    ])
  ];

  const docDefinition = {
    content: [
      {
        columns: [
          { image: logoBase64, width: 80 },
          { text: "DOMKA - Cotización", style: "header", alignment: "right" }
        ]
      },
      { text: "\n" },
      { text: `Cliente: ${c.nombreCliente || ""}`, style: "subheader" },
      { text: `Notas: ${c.notas || ""}\n\n` },
      {
        table: { widths: ["*", "auto", "auto", "auto"], body: tablaItems }
      },
      { text: "\n" },
      {
        table: {
          widths: ["*", "auto"],
          body: [
            ["Subtotal", `$${c.subtotal.toLocaleString("es-CO")}`],
            ["IVA (19%)", `$${c.impuestos.toLocaleString("es-CO")}`],
            [{ text: "TOTAL", bold: true }, { text: `$${c.total.toLocaleString("es-CO")}`, bold: true }]
          ]
        }
      }
    ],
    styles: {
      header: { fontSize: 18, bold: true, color: "#F97316" },
      subheader: { fontSize: 13, bold: true, margin: [0, 10, 0, 5] },
      tableHeader: { bold: true, fillColor: "#F97316", color: "white" }
    }
  };

  pdfMake.createPdf(docDefinition).open();
}

// Exportamos para usar en cotizaciones.js
window.generarPDFCotizacion = generarPDFCotizacion;
