// js/pdf-cotizacion.js
function generarPDF(cotizacionId) {
  db.collection("cotizaciones").doc(cotizacionId).get().then(doc => {
    if (!doc.exists) {
      alert("⚠️ Cotización no encontrada");
      return;
    }
    const c = doc.data();

    const { cliente, notas, items, subtotal, impuestos, total, fecha } = c;

    // Construcción tabla de items
    const tablaItems = [
      ["Descripción", "Cantidad", "Precio Unit.", "Subtotal"],
      ...items.map(it => [
        it.descripcion,
        it.cantidad,
        `$${it.precio.toLocaleString("es-CO")}`,
        `$${it.subtotal.toLocaleString("es-CO")}`
      ])
    ];

    const docDefinition = {
      content: [
        { text: "DOMKA - Cotización", style: "header" },
        { text: `Fecha: ${new Date(fecha.seconds * 1000).toLocaleDateString()}`, margin: [0, 0, 0, 10] },

        { text: `Cliente: ${cliente}`, style: "subheader" },
        { text: `Notas: ${notas || "—"}`, margin: [0, 0, 0, 10] },

        { text: "Detalle", style: "subheader" },
        {
          table: {
            widths: ["*", "auto", "auto", "auto"],
            body: tablaItems
          }
        },

        { text: "Totales", style: "subheader", margin: [0, 10, 0, 5] },
        {
          table: {
            widths: ["*", "auto"],
            body: [
              ["Subtotal", `$${subtotal.toLocaleString("es-CO")}`],
              ["IVA (19%)", `$${impuestos.toLocaleString("es-CO")}`],
              [{ text: "TOTAL", bold: true }, { text: `$${total.toLocaleString("es-CO")}`, bold: true }]
            ]
          }
        }
      ],
      styles: {
        header: { fontSize: 18, bold: true, color: "#F97316", margin: [0, 0, 0, 10] },
        subheader: { fontSize: 14, bold: true, margin: [0, 10, 0, 5], color: "#374151" }
      }
    };

    pdfMake.createPdf(docDefinition).open();
  });
}
