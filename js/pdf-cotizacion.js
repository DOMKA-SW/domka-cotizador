// js/pdf-cotizacion.js
function generarPDFCotizacion(cotizacion) {
  if (!cotizacion) {
    alert("Error: no se encontró la cotización");
    return;
  }

  const {
    clienteNombre,
    telefono,
    email,
    items = [],
    subtotal = 0,
    impuestos = 0,
    total = 0,
    notas = "",
    firmaBase64 = null
  } = cotizacion;

  // Logo (debe estar en /public/logo.png o en la raíz del proyecto)
  const logo = "https://i.ibb.co/mb54XQ6/logo-domka.png"; // puedes reemplazar con tu logo en GitHub Pages o ruta local

  // Construcción de tabla de ítems
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
      {
        columns: [
          {
            image: logo,
            width: 80
          },
          {
            text: "DOMKA - Cotización",
            style: "header",
            alignment: "right"
          }
        ]
      },
      { text: " " },
      {
        text: "Datos del Cliente",
        style: "subheader"
      },
      {
        columns: [
          { text: `Nombre: ${clienteNombre || ""}` },
          { text: `Teléfono: ${telefono || ""}` },
          { text: `Email: ${email || ""}` }
        ]
      },
      { text: " " },
      {
        text: "Detalle de Cotización",
        style: "subheader"
      },
      {
        table: {
          widths: ["*", "auto", "auto", "auto"],
          body: tablaItems
        }
      },
      { text: " " },
      {
        text: "Totales",
        style: "subheader"
      },
      {
        table: {
          widths: ["*", "auto"],
          body: [
            ["Subtotal", `$${subtotal.toLocaleString("es-CO")}`],
            ["IVA (19%)", `$${impuestos.toLocaleString("es-CO")}`],
            [{ text: "TOTAL", bold: true }, { text: `$${total.toLocaleString("es-CO")}`, bold: true }]
          ]
        },
        layout: "lightHorizontalLines"
      },
      { text: " " },
      {
        text: "Notas",
        style: "subheader"
      },
      {
        text: notas || "—",
        margin: [0, 0, 0, 10]
      },
      {
        text: "Firma del Cliente",
        style: "subheader"
      },
      firmaBase64
        ? { image: firmaBase64, width: 150, margin: [0, 10, 0, 0] }
        : { text: "Pendiente de firma", italics: true }
    ],
    styles: {
      header: {
        fontSize: 18,
        bold: true,
        color: "#F97316", // naranja DOMKA
        margin: [0, 0, 0, 10]
      },
      subheader: {
        fontSize: 14,
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

  pdfMake.createPdf(docDefinition).open();
}
