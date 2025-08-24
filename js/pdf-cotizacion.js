// js/pdf-cotizacion.js
function generarPDFCotizacion(c) {
  const logo = "https://i.ibb.co/h8JX2B7/logo.png"; // cambia por tu logo

  // Construcción tabla de ítems
  const tablaItems = [
    [
      { text: "Descripción", style: "tableHeader" },
      { text: "Cantidad", style: "tableHeader" },
      { text: "Precio", style: "tableHeader" },
      { text: "Subtotal", style: "tableHeader" }
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
          { image: logo, width: 80 },
          { text: "DOMKA - Cotización", alignment: "right", style: "header" }
        ]
      },
      { text: "\n" },
      { text: "Datos del Cliente", style: "subheader" },
      {
        ul: [
          `Cliente ID: ${c.clienteId || ""}`,
          `Notas: ${c.notas || ""}`
        ]
      },
      { text: "\n" },
      { text: "Detalle", style: "subheader" },
      { table: { widths: ["*", "auto", "auto", "auto"], body: tablaItems } },
      { text: "\n" },
      { text: "Totales", style: "subheader" },
      {
        table: {
          widths: ["*", "auto"],
          body: [
            ["Subtotal", `$${c.subtotal.toLocaleString("es-CO")}`],
            ["IVA (19%)", `$${c.impuestos.toLocaleString("es-CO")}`],
            [{ text: "TOTAL", bold: true }, { text: `$${c.total.toLocaleString("es-CO")}`, bold: true }]
          ]
        }
      },
      { text: "\n" },
      { text: "Firma del Cliente", style: "subheader" },
      c.firmaBase64
        ? { image: c.firmaBase64, width: 150 }
        : { text: "Pendiente de firma", italics: true }
    ],
    styles: {
      header: { fontSize: 18, bold: true, color: "#F97316" },
      subheader: { fontSize: 14, bold: true, margin: [0, 10, 0, 5] },
      tableHeader: { bold: true, fillColor: "#F97316", color: "white", alignment: "center" }
    },
    defaultStyle: { fontSize: 10 }
  };

  pdfMake.createPdf(docDefinition).open();
}

window.generarPDFCotizacion = generarPDFCotizacion;
