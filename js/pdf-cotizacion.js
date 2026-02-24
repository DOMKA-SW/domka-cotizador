// js/pdf-cotizacion.js

// 🔹 Convierte imágenes a base64 dinámicamente
async function imageToDataURL(path) {
  try {
    if (path.startsWith('data:')) return path;
    const res = await fetch(path);
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    console.warn("No se pudo cargar imagen:", path, e);
    return null;
  }
}

async function preloadImages(imagePaths) {
  const images = {};
  for (const [key, path] of Object.entries(imagePaths)) {
    try {
      images[key] = await imageToDataURL(path);
    } catch (e) {
      images[key] = null;
    }
  }
  return images;
}

// 🔹 Generar PDF Cotización
async function generarPDFCotizacion(cotizacion, nombreCliente = "Cliente") {
  const { 
    items = [], 
    subtotal = 0, 
    total = 0, 
    notas = "",
    notasArray = [],
    tipo = "mano-obra",
    formaPago = "contado",
    planPagos = [],
    fecha = new Date(),
    mostrarValorLetras = true,
    id = "",
    firmaAprobacion = null,
    fechaAprobacion = null,
    tipoCalculo = "por-items",
    clienteNit = "",
    clienteNumeroDocumento = "",
    mostrarDocumento = true,
    anexos = []
  } = cotizacion;

  const basePath = "/domka-cotizador";
  const images = await preloadImages({
    firma: `${basePath}/img/firma.png`,
    logo: `${basePath}/img/logo.png`,
    muneco: `${basePath}/img/muneco.png`
  });

  const fechaFormateada = new Date(fecha.seconds ? fecha.seconds * 1000 : fecha).toLocaleDateString('es-CO', {
    year: 'numeric', month: 'long', day: 'numeric'
  });

  const fechaAprobacionFormateada = fechaAprobacion ? 
    new Date(fechaAprobacion.seconds ? fechaAprobacion.seconds * 1000 : fechaAprobacion).toLocaleDateString('es-CO', {
      year: 'numeric', month: 'long', day: 'numeric'
    }) : null;

  let tipoTexto = "";
  switch(tipo) {
    case "mano-obra": tipoTexto = "Mano de obra"; break;
    case "materiales": tipoTexto = "Materiales"; break;
    case "ambos": tipoTexto = "Mano de obra y materiales"; break;
    default: tipoTexto = tipo || "No especificado";
  }

  // Tabla de ítems
  let tablaItems = [];
  let widths = [];

  if (tipoCalculo === "valor-total") {
    tablaItems = [
      [{ text: "Descripción", style: "tableHeader" }],
      ...items.map(it => [ it.descripcion || "" ])
    ];
    widths = ["*"];
  } else {
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
    widths = ["*", "auto", "auto", "auto"];
  }

  // Plan de pagos
  const contenidoPagos = planPagos.length > 0 ? [
    { text: " ", margin: [0, 10] },
    { text: "Plan de Pagos", style: "subheader" },
    {
      table: {
        widths: ["*", "auto", "auto"],
        body: [
          [
            { text: "Descripción", style: "tableHeader" },
            { text: "Porcentaje", style: "tableHeader" },
            { text: "Valor", style: "tableHeader" }
          ],
          ...planPagos.map(p => [
            p.descripcion || "",
            { text: `${p.porcentaje}%`, alignment: "center" },
            { text: `$${Number(p.monto || 0).toLocaleString("es-CO")}`, alignment: "right" }
          ])
        ]
      }
    }
  ] : [];

  // Firma del cliente (aprobación)
  const contenidoAprobacion = firmaAprobacion ? [
    { text: " ", margin: [0, 20] },
    { text: "RECIBIDO", style: "aprobacionHeader" },
    {
      columns: [
        { text: " ", width: "*" },
        {
          stack: [
            { text: `Fecha de recibido: ${fechaAprobacionFormateada}`, style: "aprobacionText" },
            { image: firmaAprobacion, width: 150, margin: [0, 10, 0, 5] },
            { text: "Firma del cliente", alignment: "center", style: "aprobacionText" }
          ],
          width: 200
        }
      ]
    }
  ] : [];

  // Firma empresa
  const infoEmpresa = [
    { text: " ", margin: [0, 20] },
    { text: "Atentamente,", style: "firmaText" },
    {
      stack: [
        images.firma ? { image: images.firma, width: 150, margin: [0, 0, 0, 5] } : { text: "[Firma]", style: "firmaText" },
        { text: "Alex Otalora", style: "firmaEmpresa" },
        { text: "Cel: +57 305 811 4595", style: "firmaDatos" },
        { text: "RUT: 79.597.683-1", style: "firmaDatos" }
      ],
      width: 250
    }
  ];

  // 🔹 Notas: usar array de viñetas si existe, sino texto plano
  let notasContenido;
  const viñetas = notasArray && notasArray.length > 0
    ? notasArray
    : (notas ? notas.split("\n").filter(l => l.trim()) : []);

  if (viñetas.length > 1) {
    notasContenido = { ul: viñetas, margin: [0, 0, 0, 20] };
  } else {
    notasContenido = { text: notas || "—", margin: [0, 0, 0, 20] };
  }

  // 🔹 Info cliente — incluir NIT y/o Número de Documento si aplica
  const infoClienteRows = [
    [{ text: "Nombre/Empresa:", style: "label" }, { text: nombreCliente, style: "value" }],
    ...(cotizacion.ubicacion ? [[{ text: "Ubicación:", style: "label" }, { text: cotizacion.ubicacion, style: "value" }]] : []),
    [{ text: "Fecha:", style: "label" }, { text: fechaFormateada, style: "value" }],
    [{ text: "Tipo de cotización:", style: "label" }, { text: tipoTexto, style: "value" }],
    ...(mostrarDocumento && clienteNit ? [[{ text: "NIT:", style: "label" }, { text: clienteNit, style: "value" }]] : []),
    ...(mostrarDocumento && clienteNumeroDocumento ? [[{ text: "N° Documento:", style: "label" }, { text: clienteNumeroDocumento, style: "value" }]] : []),
  ];

  // Contenido principal
  const contenido = [
    // Encabezado
    {
      columns: [
        images.logo ? { image: images.logo, width: 80 } : { text: "DOMKA", style: "header" },
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
    
    // Info cliente
    {
      table: { widths: ["*", "*"], body: infoClienteRows },
      layout: "noBorders",
      margin: [0, 0, 0, 15]
    },
    
    // Detalle
    { text: "Detalle de la Cotización", style: "subheader" },
    { table: { widths: widths, body: tablaItems } },
    
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
    
    // Valor en letras
    ...(mostrarValorLetras ? [
      { text: " ", margin: [0, 5] },
      { text: `Son: ${numeroAPalabras(total)}`, style: "valorLetras", margin: [0, 0, 0, 15] }
    ] : []),
    
    // Plan pagos
    ...contenidoPagos,
    
    // Notas
    { text: " ", margin: [0, 10] },
    { text: "Notas", style: "subheader" },
    notasContenido,
    
    // Términos y condiciones
    { text: "Términos y Condiciones", style: "subheader" },
    {
      ul: [
        "Esta cotización tiene una validez de 30 días a partir de la fecha de emisión.",
        "El tiempo de entrega se confirmará al momento de la aprobación.",
        formaPago !== "contado" ? "Se requiere anticipo para iniciar el trabajo." : "Pago al contado."
      ],
      margin: [0, 0, 0, 30]
    },
    
    // Firmas
    ...contenidoAprobacion,
    ...infoEmpresa,

    // Footer
    { text: " ", margin: [0, 40] },
    { text: "DOMKA 2025 — Alex Otalora", style: "footer", alignment: "center" }
  ];

  // 🔹 ANEXOS: agregar cada imagen como página adicional
  const paginasAnexos = [];
  for (const anexo of anexos) {
    if (!anexo.base64) continue;

    if (anexo.tipo && anexo.tipo.startsWith("image/")) {
      paginasAnexos.push({ text: "", pageBreak: "before" });
      paginasAnexos.push({ text: `Anexo: ${anexo.nombre}`, style: "subheader", margin: [0, 0, 0, 10] });
      paginasAnexos.push({ image: anexo.base64, width: 500, alignment: "center" });
    } else if (anexo.tipo === "application/pdf") {
      // Los PDFs embebidos no son nativos en pdfmake; indicamos referencia
      paginasAnexos.push({ text: "", pageBreak: "before" });
      paginasAnexos.push({ text: `Anexo: ${anexo.nombre}`, style: "subheader", margin: [0, 0, 0, 10] });
      paginasAnexos.push({ text: "(Archivo PDF adjunto — descargable desde el link público)", style: "valorLetras" });
    } else {
      paginasAnexos.push({ text: "", pageBreak: "before" });
      paginasAnexos.push({ text: `Anexo: ${anexo.nombre}`, style: "subheader", margin: [0, 0, 0, 10] });
      paginasAnexos.push({ text: "(Archivo adjunto — descargable desde el link público)", style: "valorLetras" });
    }
  }

  const docDefinition = {
    pageSize: 'A4',
    pageMargins: [40, 60, 40, 60],
    background: [
      images.muneco ? { image: images.muneco, width: 100, opacity: 0.1, absolutePosition: { x: 445, y: 30 } } : null,
      images.logo ? { image: images.logo, width: 300, opacity: 0.05, absolutePosition: { x: 150, y: 200 } } : null,
    ].filter(Boolean),
    content: [...contenido, ...paginasAnexos],
    styles: {
      header: { fontSize: 18, bold: true, color: "#F97316", font: "Roboto" },
      subheader: { fontSize: 14, bold: true, margin: [0, 10, 0, 5], color: "#374151", font: "Roboto" },
      tableHeader: { bold: true, fillColor: "#F97316", color: "white", alignment: "center", font: "Roboto" },
      label: { bold: true, fontSize: 10, color: "#374151", font: "Roboto" },
      value: { fontSize: 10, font: "Roboto" },
      totalLabel: { bold: true, fontSize: 12, color: "#374151", font: "Roboto" },
      totalValue: { bold: true, fontSize: 12, color: "#F97316", alignment: "right", font: "Roboto" },
      valorLetras: { italic: true, fontSize: 10, color: "#4B5563", font: "Roboto" },
      firmaText: { fontSize: 12, bold: true, margin: [0, 0, 0, 5], font: "Roboto" },
      firmaEmpresa: { fontSize: 14, bold: true, color: "#F97316", margin: [0, 5, 0, 2], font: "Roboto" },
      firmaDatos: { fontSize: 9, color: "#374151", margin: [0, 1, 0, 0], font: "Roboto" },
      aprobacionHeader: { fontSize: 14, bold: true, color: "#059669", alignment: "center", margin: [0, 0, 0, 10], font: "Roboto" },
      aprobacionText: { fontSize: 10, color: "#374151", alignment: "center", font: "Roboto" },
      footer: { fontSize: 9, color: "#9CA3AF", font: "Roboto" }
    },
    defaultStyle: { font: "Roboto", fontSize: 10 }
  };

  if (typeof pdfMake !== 'undefined') {
    pdfMake.createPdf(docDefinition).download(`Cotización_DOMKA_${id.substring(0, 8)}.pdf`);
  } else {
    console.error('pdfMake no está disponible');
    alert('Error: No se puede generar el PDF. Por favor, recarga la página.');
  }
}

if (typeof window !== 'undefined') {
  window.generarPDFCotizacion = generarPDFCotizacion;
}
