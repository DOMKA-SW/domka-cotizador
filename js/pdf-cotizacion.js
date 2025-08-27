// 🔹 Helpers para cargar imágenes dinámicamente
async function imageToDataURL(path) {
  const res = await fetch(path);
  const blob = await res.blob();
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
}

async function preloadImages(imagePaths) {
  const images = {};
  for (const [key, path] of Object.entries(imagePaths)) {
    images[key] = await imageToDataURL(path);
  }
  return images;
}

// 🔹 Función principal
async function generarPDFCotizacion(cotizacion, nombreCliente = "Cliente") {
  const { 
    items = [], 
    subtotal = 0, 
    total = 0, 
    notas = "", 
    tipo = "mano-obra",
    formaPago = "contado",
    planPagos = [],
    fecha = new Date(),
    mostrarValorLetras = true,
    id = "",
    firmaAprobacion = null,
    fechaAprobacion = null,
    tipoCalculo = "por-items"
  } = cotizacion;

  // 👇 Precargar imágenes
  const images = await preloadImages({
    firma: "img/firma.png",
    logo: "img/logo.png"
  });

  // Formatear fecha
  const fechaFormateada = new Date(fecha.seconds ? fecha.seconds * 1000 : fecha).toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const fechaAprobacionFormateada = fechaAprobacion ? 
    new Date(fechaAprobacion.seconds ? fechaAprobacion.seconds * 1000 : fechaAprobacion).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }) : null;

  // Traducir tipo
  let tipoTexto = "";
  switch(tipo) {
    case "mano-obra": tipoTexto = "Mano de obra"; break;
    case "materiales": tipoTexto = "Materiales"; break;
    case "ambos": tipoTexto = "Mano de obra y materiales"; break;
    default: tipoTexto = tipo || "No especificado";
  }

  // Construir tabla items
  let tablaItems = [];
  const widths = ["*", "auto", "auto", "auto"];
  tablaItems = [
    [
      { text: "Descripción", style: "tableHeader" },
      { text: "Cantidad", style: "tableHeader" },
      { text: "Precio", style: "tableHeader" },
      { text: "Subtotal", style: "tableHeader" }
    ],
    ...items.map(it => [
      it.descripcion || "",
      it.cantidad || 0,
      { text: `$${Number(it.precio || 0).toLocaleString("es-CO")}`, alignment: "right" },
      { text: `$${Number(it.subtotal || 0).toLocaleString("es-CO")}`, alignment: "right" }
    ])
  ];

  // Firma de aprobación (si existe)
  const contenidoAprobacion = firmaAprobacion ? [
    { text: " ", margin: [0, 20] },
    { text: "APROBACIÓN DEL CLIENTE", style: "aprobacionHeader" },
    {
      columns: [
        { text: " ", width: "*" },
        {
          stack: [
            { text: `Fecha de aprobación: ${fechaAprobacionFormateada}`, style: "aprobacionText" },
            {
              image: firmaAprobacion,
              width: 150,
              margin: [0, 10, 0, 5]
            },
            { text: "Firma del cliente", alignment: "center", style: "aprobacionText" }
          ],
          width: 200
        }
      ]
    }
  ] : [];

  // Info empresa con firma
  const infoEmpresa = [
    { text: " ", margin: [0, 20] },
    { text: "Atentamente", style: "firmaText", margin: [0, 0, 0, 10] },
    {
      columns: [
        { text: " ", width: "*" },
        {
          stack: [
            { image: images.firma, width: 150, margin: [0, 0, 0, 5] },
            { text: "DOMKA", style: "firmaEmpresa", alignment: "center" },
            { text: "Celular: +57 321 456 7890", style: "firmaDatos", alignment: "center" },
            { text: "RUT: 123456789-0", style: "firmaDatos", alignment: "center" },
            { text: "contacto@domka.com", style: "firmaDatos", alignment: "center" }
          ],
          width: 200
        }
      ]
    }
  ];

  // Contenido PDF
  const contenido = [
    // Marca de agua
    {
      image: images.logo,
      width: 100,
      opacity: 0.1,
      absolutePosition: { x: 40, y: 40 }
    },
    // Encabezado
    {
      columns: [
        { text: "DOMKA", style: "logo", width: 100 },
        {
          stack: [
            { text: "COTIZACIÓN", style: "header", alignment: "right" },
            { text: `N°: ${id.substring(0, 8)}`, style: "subheader", alignment: "right", margin: [0, 5] }
          ],
          width: "*"
        }
      ],
      margin: [0, 0, 0, 20]
    },
    // Datos cliente
    {
      table: {
        widths: ["*", "*"],
        body: [
          [{ text: "Cliente:", style: "label" }, { text: nombreCliente, style: "value" }],
          [{ text: "Fecha:", style: "label" }, { text: fechaFormateada, style: "value" }],
          [{ text: "Tipo de cotización:", style: "label" }, { text: tipoTexto, style: "value" }]
        ]
      },
      layout: "noBorders",
      margin: [0, 0, 0, 15]
    },
    // Items
    { text: "Detalle de la Cotización", style: "subheader" },
    {
      table: { widths: widths, body: tablaItems }
    },
    // Totales
    { text: " ", margin: [0, 10] },
    {
      table: {
        widths: ["*", "auto"],
        body: [
          ["Subtotal", { text: `$${subtotal.toLocaleString("es-CO")}`, alignment: "right" }],
          [{ text: "TOTAL", style: "totalLabel" }, { text: `$${total.toLocaleString("es-CO")}`, style: "totalValue" }]
        ]
      },
      layout: "lightHorizontalLines"
    },
    ...(mostrarValorLetras ? [
      { text: " ", margin: [0, 5] },
      { text: `Son: ${numeroAPalabras(total)}`, style: "valorLetras", margin: [0, 0, 0, 15] }
    ] : []),
    // Notas
    { text: " ", margin: [0, 10] },
    { text: "Notas", style: "subheader" },
    { text: notas || "—", margin: [0, 0, 0, 20] },
    // Términos
    { text: "Términos y Condiciones", style: "subheader" },
    {
      ul: [
        "Esta cotización tiene una validez de 30 días a partir de la fecha de emisión.",
        "Los precios no incluyen transportes especiales ni instalaciones complejas.",
        "El tiempo de entrega se confirmará al momento de la aprobación.",
        formaPago !== "contado" ? "Se requiere anticipo para iniciar el trabajo." : "Pago al contado."
      ],
      margin: [0, 0, 0, 30]
    },
    // Firmas
    ...contenidoAprobacion,
    ...infoEmpresa
  ];

  const docDefinition = {
    pageSize: 'A4',
    pageMargins: [40, 60, 40, 60],
    background: [
      {
        image: images.logo,
        width: 300,
        opacity: 0.05,
        absolutePosition: { x: 40, y: 150 }
      }
    ],
    content: contenido,
    styles: {
      header: { fontSize: 18, bold: true, color: "#F97316" },
      logo: { fontSize: 22, bold: true, color: "#F97316" },
      subheader: { fontSize: 14, bold: true, margin: [0, 10, 0, 5], color: "#374151" },
      tableHeader: { bold: true, fillColor: "#F97316", color: "white", alignment: "center" },
      label: { bold: true, fontSize: 10, color: "#374151" },
      value: { fontSize: 10 },
      totalLabel: { bold: true, fontSize: 12, color: "#374151" },
      totalValue: { bold: true, fontSize: 12, color: "#F97316", alignment: "right" },
      valorLetras: { italic: true, fontSize: 10, color: "#4B5563" },
      aprobacionHeader: { fontSize: 14, bold: true, color: "#059669", alignment: "center", margin: [0, 0, 0, 10] },
      aprobacionText: { fontSize: 10, color: "#374151", alignment: "center" },
      firmaText: { fontSize: 12, bold: true, alignment: "center", margin: [0, 0, 0, 5] },
      firmaEmpresa: { fontSize: 14, bold: true, color: "#F97316", alignment: "center", margin: [0, 5, 0, 2] },
      firmaDatos: { fontSize: 9, color: "#374151", alignment: "center", margin: [0, 1, 0, 0] }
    },
    defaultStyle: { fontSize: 10 }
  };

  // Crear PDF
  if (typeof pdfMake !== 'undefined') {
    pdfMake.createPdf(docDefinition).download(`Cotización_DOMKA_${id.substring(0, 8)}.pdf`);
  } else {
    console.error('pdfMake no está disponible');
    alert('Error: No se puede generar el PDF.');
  }
}

// Hacer accesible globalmente
if (typeof window !== 'undefined') {
  window.generarPDFCotizacion = generarPDFCotizacion;
}
