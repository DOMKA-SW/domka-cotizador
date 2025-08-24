// js/pdf-cotizacion.js

// Asegúrate de cargar pdfMake y vfs_fonts en el HTML ANTES de este archivo.
// En compat, pdfMake ya trae vfs por el script de vfs_fonts.

function generarPDFCotizacion(cotizacion, clienteNombre) {
  const items = Array.isArray(cotizacion.items) ? cotizacion.items : [];

  const body = [
    [{ text: "Descripción", style: "th" }, { text: "Cant.", style: "th" }, { text: "Vlr Unit.", style: "th" }, { text: "Subtotal", style: "th" }],
    ...items.map(it => ([
      it.descripcion || "",
      String(it.cantidad ?? 0),
      `$${Number(it.precio || 0).toLocaleString("es-CO")}`,
      `$${Number(it.subtotal || 0).toLocaleString("es-CO")}`
    ]))
  ];

  const docDefinition = {
    content: [
      {
        columns: [
          { text: "DOMKA", style: "brand" },
          { text: "COTIZACIÓN", alignment: "right", style: "title" }
        ]
      },
      { text: " " },
      { text: `Cliente: ${clienteNombre || "—"}`, margin: [0, 2, 0, 2] },
      { text: `Notas: ${cotizacion.notas || "—"}`, color: "#374151", margin: [0, 0, 0, 8] },

      {
        table: { widths: ["*", "auto", "auto", "auto"], body },
        layout: "lightHorizontalLines"
      },

      { text: " " },
      {
        columns: [
          { text: " " },
          {
            table: {
              widths: ["*", "auto"],
              body: [
                ["Subtotal", `$${Number(cotizacion.subtotal || 0).toLocaleString("es-CO")}`],
                ["IVA (19%)", `$${Number(cotizacion.impuestos || 0).toLocaleString("es-CO")}`],
                [{ text: "TOTAL", bold: true }, { text: `$${Number(cotizacion.total || 0).toLocaleString("es-CO")}`, bold: true }]
              ]
            }
          }
        ]
      }
    ],
    styles: {
      brand: { fontSize: 18, bold: true, color: "#F97316" }, // naranja DOMKA
      title: { fontSize: 16, bold: true },
      th: { fillColor: "#F97316", color: "white", bold: true, alignment: "center" }
    },
    defaultStyle: { fontSize: 10 }
  };

  pdfMake.createPdf(docDefinition).open();
}

window.generarPDFCotizacion = generarPDFCotizacion;
