// js/pdf-cuenta.js
async function imageToDataURL(path) {
  try {
    const res = await fetch(path);
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    console.warn("No se pudo cargar la imagen:", path);
    return null;
  }
}

async function preloadImages(imagePaths) {
  const images = {};
  for (const [key, path] of Object.entries(imagePaths)) {
    images[key] = await imageToDataURL(path);
  }
  return images;
}

async function generarPDFCuenta(cuenta, nombreCliente = "Cliente") {
  const { 
    items = [], 
    total = 0, 
    notas = "", 
    fecha = new Date(),
    mostrarValorLetras = true,
    id = "",
    firmaConfirmacion = null,
    fechaConfirmacion = null,
    firmaNombre = "DOMKA",
    firmaTelefono = "+57 321 456 7890",
    firmaEmail = "contacto@domka.com",
    firmaRut = "123456789-0"
  } = cuenta;

  // Cargar imágenes
  const images = await preloadImages({
    logo: "img/logo.png",
    firma: "img/firma.png"
  });

  // Formatear fecha
  const fechaFormateada = new Date(fecha.seconds ? fecha.seconds * 1000 : fecha).toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Formatear fecha de confirmación si existe
  const fechaConfirmacionFormateada = fechaConfirmacion ? 
    new Date(fechaConfirmacion.seconds ? fechaConfirmacion.seconds * 1000 : fechaConfirmacion).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }) : null;

  // Términos y condiciones fijos
  const terminosFijos = [
    "Esta cuenta de cobro tiene una validez de 30 días a partir de la fecha de emisión.",
    "El pago debe realizarse dentro de los 15 días posteriores a la recepción.",
    "En caso de mora, se aplicará un interés del 1.5% mensual sobre el saldo pendiente.",
    "Todos los precios incluyen IVA."
  ];

  // Contenido de firma del cliente si existe
  const contenidoFirmaCliente = firmaConfirmacion ? [
    { text: " ", margin: [0, 20] },
    { text: "CONFORMIDAD DEL CLIENTE", style: "aprobacionHeader" },
    {
      columns: [
        { text: " ", width: "*" },
        {
          stack: [
            { text: `Fecha de confirmación: ${fechaConfirmacionFormateada}`, style: "aprobacionText" },
            {
              image: firmaConfirmacion,
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

  const docDefinition = {
    pageSize: 'A4',
    pageMargins: [40, 60, 40, 60],
    content: [
      // Encabezado con logo
      {
        columns: [
          images.logo ? { image: images.logo, width: 80, height: 80 } : { text: "DOMKA", style: "logo" },
          {
            stack: [
              { text: "CUENTA DE COBRO", style: "header", alignment: "right" },
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
            [{ text: "Cliente:", style: "label" }, { text: nombreCliente, style: "value" }],
            [{ text: "Fecha de emisión:", style: "label" }, { text: fechaFormateada, style: "value" }]
          ]
        },
        layout: "noBorders",
        margin: [0, 0, 0, 15]
      },
      
      // Detalle de items
      { text: "Descripción del Servicio", style: "subheader" },
      {
        table: {
          widths: ["*"],
          body: [
            [{ text: "Descripción", style: "tableHeader" }],
            ...items.map(it => [it.descripcion || "-"])
          ]
        }
      },
      
      // Valor total
      { text: " ", margin: [0, 10] },
      {
        table: {
          widths: ["*", "auto"],
          body: [
            [{ text: "VALOR TOTAL", style: "totalLabel" }, { text: `$${Number(total || 0).toLocaleString("es-CO")}`, style: "totalValue" }]
          ]
        },
        layout: "noBorders"
      },
      
      // Valor en letras
      ...(mostrarValorLetras ? [
        { text: " ", margin: [0, 5] },
        { text: `Son: ${numeroAPalabras(total)}`, style: "valorLetras", margin: [0, 0, 0, 15] }
      ] : []),
      
      // Notas
      ...(notas ? [
        { text: " ", margin: [0, 10] },
        { text: "Notas", style: "subheader" },
        { text: notas, margin: [0, 0, 0, 20] }
      ] : []),
      
      // Términos y condiciones
      { text: "Términos y Condiciones", style: "subheader" },
      {
        ul: terminosFijos,
        margin: [0, 0, 0, 30]
      },
      
      // Firma del cliente (si existe)
      ...contenidoFirmaCliente,
      
      // Firma de la empresa
      { text: " ", margin: [0, 20] },
      { text: "Atentamente,", style: "firmaText" },
      images.firma ? {
        image: images.firma,
        width: 150,
        margin: [0, 10, 0, 5]
      } : { text: " " },
      { text: firmaNombre, style: "firmaNombre" },
      { text: firmaTelefono, style: "firmaDatos" },
      { text: firmaEmail, style: "firmaDatos" },
      { text: firmaRut, style: "firmaDatos", margin: [0, 0, 0, 30] },
      
      // Pie de página
      { text: "Gracias por su preferencia", style: "pie", alignment: "center", margin: [0, 30, 0, 0] }
    ],
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
      firmaText: { fontSize: 12, bold: true, margin: [0, 20, 0, 5] },
      firmaNombre: { fontSize: 12, bold: true, color: "#F97316" },
      firmaDatos: { fontSize: 9, color: "#374151" },
      aprobacionHeader: { fontSize: 14, bold: true, color: "#059669", alignment: "center", margin: [0, 0, 0, 10] },
      aprobacionText: { fontSize: 10, color: "#374151", alignment: "center" },
      pie: { fontSize: 10, color: "#9CA3AF", italic: true }
    },
    defaultStyle: { fontSize: 10 }
  };

  pdfMake.createPdf(docDefinition).download(`Cuenta_Cobro_DOMKA_${id.substring(0, 8)}.pdf`);
}

window.generarPDFCuenta = generarPDFCuenta;
