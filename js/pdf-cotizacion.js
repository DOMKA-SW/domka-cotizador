// js/pdf-cotizacion.js
// Logo DOMKA en Base64 (versión comprimida para usar directamente en pdfmake)
const logoBase64 =
  "data:image/logo.png"; 
// ⚠️ Reemplaza el contenido por el string COMPLETO de tu logo convertido a Base64

function generarPDFCotizacion(c) {
  console.log("Generando PDF para:", c);

  // Construir tabla de ítems
  const tablaItems = [
    [
      { text: "Descripción", style: "tableHeader" },
      { text: "Cantidad", style: "tableHeader" },
      { text: "Precio", style: "tableHeader" },
      { text: "Subtotal", style: "tableHeader" }
    ],
    ...(c.items || []).map(it => [
      it.descripcion || "",
      it.cantidad || 0,
      `$${Number(it.precio).toLocaleString("es-CO")}`,
      `$${Number(it.subtotal).toLocaleString("es-CO")}`
    ])
  ];

  // Definición del documento PDF
  const docDefinition = {
    content: [
      {
        columns: [
          { image: logoBase64, width: 80 },
          {
            text: "DOMKA - Cotización",
            style: "header",
            alignment: "right"
          }
        ]
      },
      { text: "\n" },
      { text: `Cliente: ${c.nombreCliente || "N/A"}`, style: "subheader" },
      { text: `Notas: ${c.notas || "—"}\n\n` },

      {
        table: {
          widths: ["*", "auto", "auto", "auto"],
          body: tablaItems
        }
      },
      { text: "\n" },
      {
        table: {
          widths: ["*", "auto"],
          body: [
            ["Subtotal", `$${(c.subtotal || 0).toLocaleString("es-CO")}`],
            ["IVA (19%)", `$${(c.impuestos || 0).toLocaleString("es-CO")}`],
            [
              { text: "TOTAL", bold: true },
              { text: `$${(c.total || 0).toLocaleString("es-CO")}`, bold: true }
            ]
          ]
        },
        layout: "lightHorizontalLines"
      }
    ],
    styles: {
      header: {
        fontSize: 18,
        bold: true,
        color: "#F97316",
        margin: [0, 0, 0, 10]
      },
      subheader: {
        fontSize: 13,
        bold: true,
        margin: [0, 10, 0, 5],
        color: "#374151"
      },
      tableHeader: {
        bold: true,
        fillColor: "#F97316",
        color: "white",
        alignment: "center"
      }
    },
    defaultStyle: {
      fontSize: 10
    }
  };

  // Abrir el PDF en una nueva pestaña
  pdfMake.createPdf(docDefinition).open();
}

// Exponer función global
window.generarPDFCotizacion = generarPDFCotizacion;
