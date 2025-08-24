// js/pdf-cuenta.js
function generarPDFCuenta(cuenta, nombreCliente = "Cliente") {
  const { items = [], subtotal = 0, total = 0, notas = "" } = cuenta;

  const tablaItems = [
    [
      { text: "Descripción", style: "tableHeader" },
      { text: "Cantidad", style: "tableHeader" },
      { text: "Vlr Unitario", style: "tableHeader" },
      { text: "Subtotal", style: "tableHeader" }
    ],
    ...items.map(it => [
      it.descripcion || "",
      it.cantidad || 0,
      `$${Number(it.precio || 0).toLocaleString("es-CO")}`,
      `$${Number(it.subtotal || 0).toLocaleString("es-CO")}`
    ])
  ];

  const docDefinition = {
    content: [
      { text: "DOMKA - Cuenta de Cobro", style: "header", alignment: "center" },
      { text: `Cliente: ${nombreCliente}`, margin: [0, 10, 0, 5] },
      { text: " " },
      { text: "Detalle", style: "subheader" },
      {
        table: {
          widths: ["*", "auto", "auto", "auto"],
          body: tablaItems
        }
      },
      { text: " " },
      { text: "Totales", style: "subheader" },
      {
        table: {
          widths: ["*", "auto"],
          body: [
            ["Subtotal", `$${subtotal.toLocaleString("es-CO")}`],
            [{ text: "TOTAL", bold: true }, { text: `$${total.toLocaleString("es-CO")}`, bold: true }]
          ]
        },
        layout: "lightHorizontalLines"
      },
      { text: " " },
      { text: "Notas", style: "subheader" },
      { text: notas || "—", margin: [0, 0, 0, 10] }
    ],
    styles: {
      header: { fontSize: 18, bold: true, color: "#F97316", margin: [0, 0, 0, 10] },
      subheader: { fontSize: 14, bold: true, margin: [0, 10, 0, 5], color: "#374151" },
      tableHeader: { bold: true, fillColor: "#F97316", color: "white", alignment: "center" }
    },
    defaultStyle: { fontSize: 10 }
  };

  pdfMake.createPdf(docDefinition).open();
}

window.generarPDFCuenta = generarPDFCuenta;
