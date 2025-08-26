// js/pdf-cotizacion.js
function generarPDFCotizacion(cotizacion, nombreCliente = "Cliente") {
  const { 
    items = [], 
    subtotal = 0, 
    impuestos = 0, 
    total = 0, 
    notas = "", 
    tipo = "mano-obra",
    formaPago = "contado",
    planPagos = [],
    fecha = new Date(),
    mostrarValorLetras = true,
    id = ""
  } = cotizacion;

  // Formatear fecha
  const fechaFormateada = new Date(fecha.seconds ? fecha.seconds * 1000 : fecha).toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Traducir tipo de cotización
  let tipoTexto = "";
  switch(tipo) {
    case "mano-obra": tipoTexto = "Mano de obra"; break;
    case "materiales": tipoTexto = "Materiales"; break;
    case "ambos": tipoTexto = "Mano de obra y materiales"; break;
    default: tipoTexto = tipo || "No especificado";
  }

  // Construir tabla de ítems
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
      { text: `$${Number(it.precio || 0).toLocaleString("es-CO")}`, alignment: "right" },
      { text: `$${Number(it.subtotal || 0).toLocaleString("es-CO")}`, alignment: "right" }
    ])
  ];

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

  const contenido = [
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
        widths: ["*", "auto", "auto", "auto"],
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
          ["IVA (19%)", { text: `$${impuestos.toLocaleString("es-CO")}`, alignment: "right" }],
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
        "Los precios no incluyen transportes especiales ni instalaciones complejas.",
        "El tiempo de entrega se confirmará al momento de la aprobación.",
        formaPago !== "contado" ? "Se requiere anticipo para iniciar el trabajo." : "Pago al contado."
      ],
      margin: [0, 0, 0, 30]
    },

        // Firmas
    {
      columns: [
        {
          text: " ",
          width: "*"
        },
        {
          stack: [
            { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 200, y2: 0, lineWidth: 1 }] },
            { text: "Firma y Sello", alignment: "center", margin: [0, 5] },
            { text: "DOMKA", style: "firma", alignment: "center" }
          ],
          width: 200
        }
      ]
    }
  ];
    
  const docDefinition = {
    pageSize: 'A4',
    pageMargins: [40, 60, 40, 60],
    content: contenido,
    styles: {
      header: {
        fontSize: 18,
        bold: true,
        color: "#F97316" // naranja DOMKA
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
      }
    },
    defaultStyle: {
      fontSize: 10
    }
  };

  pdfMake.createPdf(docDefinition).open();
}

// Hacer accesible globalmente
window.generarPDFCotizacion = generarPDFCotizacion;
