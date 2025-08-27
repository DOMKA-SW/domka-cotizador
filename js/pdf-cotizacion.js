// js/pdf-cotizacion.js
function generarPDFCotizacion(cotizacion, nombreCliente = "Cliente") {
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

  // Obtener la URL base de GitHub Pages
  const repoName = window.location.pathname.split('/')[1];
  const baseUrl = repoName ? `/${repoName}` : '';
  
  // URLs absolutas para las imágenes
  const logoUrl = `${baseUrl}/img/logo.png`;
  const firmaUrl = `${baseUrl}/img/firma.png`;

  // Formatear fecha
  const fechaFormateada = new Date(fecha.seconds ? fecha.seconds * 1000 : fecha).toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Formatear fecha de aprobación si existe
  const fechaAprobacionFormateada = fechaAprobacion ? 
    new Date(fechaAprobacion.seconds ? fechaAprobacion.seconds * 1000 : fechaAprobacion).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }) : null;

  // Traducir tipo de cotización
  let tipoTexto = "";
  switch(tipo) {
    case "mano-obra": tipoTexto = "Mano de obra"; break;
    case "materiales": tipoTexto = "Materiales"; break;
    case "ambos": tipoTexto = "Mano de obra y materiales"; break;
    default: tipoTexto = tipo || "No especificado";
  }

  // Construir tabla de ítems
  let tablaItems = [];
  const widths = tipoCalculo === "valor-total" 
    ? ["*", "auto", "auto", "auto"]
    : ["*", "auto", "auto", "auto"];

  if (tipoCalculo === "valor-total") {
    // Modo valor total - mostrar solo descripción
    tablaItems = [
      [
        { text: "Descripción", style: "tableHeader" },
        { text: "", style: "tableHeader" },
        { text: "", style: "tableHeader" },
        { text: "", style: "tableHeader" }
      ],
      ...items.map(it => [
        it.descripcion || "",
        { text: "", alignment: "right" },
        { text: "", alignment: "right" },
        { text: "", alignment: "right" }
      ])
    ];
  } else {
    // Modo por ítems - mostrar todos los datos
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
  }

  // Construir plan de pagos si existe
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

  // Contenido de aprobación con firma si existe
  const contenidoAprobacion = firmaAprobacion ? [
    { text: " ", margin: [0, 20] },
    { text: "APROBACIÓN DEL CLIENTE", style: "aprobacionHeader" },
    {
      columns: [
        {
          text: " ",
          width: "*"
        },
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

  // Información de la empresa DOMKA (firma de autorización)
  const infoEmpresa = [
    { text: " ", margin: [0, 20] },
    { 
      text: "Atentamente", 
      style: "firmaText",
      margin: [0, 0, 0, 10]
    },
    {
      columns: [
        {
          text: " ",
          width: "*"
        },
        {
          stack: [
            // Usar URL absoluta para la firma
            {
              image: firmaUrl,
              width: 150,
              margin: [0, 0, 0, 5],
              fallback: { 
                canvas: [{ type: 'line', x1: 0, y1: 0, x2: 200, y2: 0, lineWidth: 1 }] 
              }
            },
            { text: "DOMKA", style: "firmaEmpresa", alignment: "center" },
            { text: "Celular: +57 3058114595", style: "firmaDatos", alignment: "center" },
            { text: "RUT: 79597683-1", style: "firmaDatos", alignment: "center" },
            { text: "contacto@domka.com", style: "firmaDatos", alignment: "center" }
          ],
          width: 200
        }
      ]
    }
  ];

  const contenido = [
    // Marca de agua (logo DOMKA en fondo) - usar URL absoluta
    {
      image: logoUrl,
      width: 100,
      opacity: 0.1,
      absolutePosition: { x: 40, y: 40 }
    },
    
    // Encabezado
    {
      columns: [
        {
          text: "DOMKA",
          style: "logo",
          width: 100
        },
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
    
    // Información general
    {
      table: {
        widths: ["*", "*"],
        body: [
          [
            { text: "Cliente:", style: "label" },
            { text: nombreCliente, style: "value" }
          ],
          [
            { text: "Fecha:", style: "label" },
            { text: fechaFormateada, style: "value" }
          ],
          [
            { text: "Tipo de cotización:", style: "label" },
            { text: tipoTexto, style: "value" }
          ]
        ]
      },
      layout: "noBorders",
      margin: [0, 0, 0, 15]
    },
    
    // Detalle de items
    { text: "Detalle de la Cotización", style: "subheader" },
    {
      table: {
        widths: widths,
        body: tablaItems
      }
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
    
    // Valor en letras
    ...(mostrarValorLetras ? [
      { text: " ", margin: [0, 5] },
      { 
        text: `Son: ${numeroAPalabras(total)}`, 
        style: "valorLetras",
        margin: [0, 0, 0, 15]
      }
    ] : []),
    
    // Plan de pagos
    ...contenidoPagos,
    
    // Notas
    { text: " ", margin: [0, 10] },
    { text: "Notas", style: "subheader" },
    {
      text: notas || "—",
      margin: [0, 0, 0, 20]
    },
    
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
    ...infoEmpresa
  ];

  const docDefinition = {
    pageSize: 'A4',
    pageMargins: [40, 60, 40, 60],
    background: [
      {
        image: logoUrl, // Usar URL absoluta para el fondo
        width: 300,
        opacity: 0.05,
        absolutePosition: { x: 40, y: 150 }
      }
    ],
    content: contenido,
    styles: {
      header: {
        fontSize: 18,
        bold: true,
        color: "#F97316"
      },
      logo: {
        fontSize: 22,
        bold: true,
        color: "#F97316"
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
      },
      label: {
        bold: true,
        fontSize: 10,
        color: "#374151"
      },
      value: {
        fontSize: 10
      },
      totalLabel: {
        bold: true,
        fontSize: 12,
        color: "#374151"
      },
      totalValue: {
        bold: true,
        fontSize: 12,
        color: "#F97316",
        alignment: "right"
      },
      valorLetras: {
        italic: true,
        fontSize: 10,
        color: "#4B5563"
      },
      firma: {
        bold: true,
        color: "#F97316"
      },
      aprobacionHeader: {
        fontSize: 14,
        bold: true,
        color: "#059669",
        alignment: "center",
        margin: [0, 0, 0, 10]
      },
      aprobacionText: {
        fontSize: 10,
        color: "#374151",
        alignment: "center"
      },
      firmaText: {
        fontSize: 12,
        bold: true,
        alignment: "center",
        margin: [0, 0, 0, 5]
      },
      firmaEmpresa: {
        fontSize: 14,
        bold: true,
        color: "#F97316",
        alignment: "center",
        margin: [0, 5, 0, 2]
      },
      firmaDatos: {
        fontSize: 9,
        color: "#374151",
        alignment: "center",
        margin: [0, 1, 0, 0]
      }
    },
    defaultStyle: {
      fontSize: 10
    }
  };

  // Verificar que pdfMake esté disponible antes de usarlo
  if (typeof pdfMake !== 'undefined') {
    pdfMake.createPdf(docDefinition).download(`Cotización_DOMKA_${id.substring(0, 8)}.pdf`);
  } else {
    console.error('pdfMake no está disponible');
    alert('Error: No se puede generar el PDF. Por favor, recarga la página.');
  }
}

// Hacer accesible globalmente
if (typeof window !== 'undefined') {
  window.generarPDFCotizacion = generarPDFCotizacion;
}
