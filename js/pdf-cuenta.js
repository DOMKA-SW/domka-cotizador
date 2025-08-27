// js/pdf-cuenta.js
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

async function generarPDFCuenta(cuenta, nombreCliente = "Cliente") {
  const { 
    items = [], 
    subtotal = 0, 
    total = 0, 
    notas = "", 
    terminos = "",
    fecha = new Date(),
    mostrarValorLetras = true,
    id = "",
    tipoCalculo = "por-items",
    firmaNombre = "DOMKA",
    firmaTelefono = "+57 321 456 7890",
    firmaEmail = "contacto@domka.com",
    firmaRut = "123456789-0"
  } = cuenta;

  // Cargar imágenes
  const basePath = "/domka-cotizador";
  const images = await preloadImages({
    firma: `${basePath}/img/firma.png`,
    logo: `${basePath}/img/logo.png`,
    muneco: `${basePath}/img/muneco.png`
  });

  // Formatear fecha
  const fechaFormateada = new Date(fecha.seconds ? fecha.seconds * 1000 : fecha).toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Construir tabla de ítems
  let tablaItems = [];
  const widths = ["*", "auto", "auto", "auto"];

  if (tipoCalculo === "valor-total") {
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

  const docDefinition = {
    pageSize: 'A4',
    pageMargins: [40, 60, 40, 60],
    background: [
      {
        image: images.muneco,
        width: 100,
        opacity: 0.1,
        absolutePosition: { x: 445, y: 30 }
      },
      {
        image: images.logo,
        width: 300,
        opacity: 0.05,
        absolutePosition: { x: 150, y: 200 }
      }
    ],
    content: [
      // Encabezado
      {
        columns: [
          { text: "DOMKA", style: "logo", width: 100 },
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
            [{ text: "Fecha:", style: "label" }, { text: fechaFormateada, style: "value" }]
          ]
        },
        layout: "noBorders",
        margin: [0, 0, 0, 15]
      },
      
      // Detalle de items
      { text: "Detalle de la Cuenta de Cobro", style: "subheader" },
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
      
      // Valor en letras
      ...(mostrarValorLetras ? [
        { text: " ", margin: [0, 5] },
        { text: `Son: ${numeroAPalabras(total)}`, style: "valorLetras", margin: [0, 0, 0, 15] }
      ] : []),
      
      // Notas
      { text: " ", margin: [0, 10] },
      { text: "Notas", style: "subheader" },
      { text: notas || "—", margin: [0, 0, 0, 20] },
      
      // Términos y condiciones
      { text: "Términos y Condiciones", style: "subheader" },
      { text: terminos || "Esta cuenta de cobro tiene una validez de 30 días a partir de la fecha de emisión.", margin: [0, 0, 0, 30] },
      
      // Firma y datos de contacto
      { text: "Atentamente,", style: "firmaText" },
      {
        columns: [
          { text: firmaNombre, style: "firmaNombre" },
          { text: `Fecha: ${fechaFormateada}`, alignment: "right", style: "fecha" }
        ]
      },
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
      fecha: { fontSize: 9, color: "#6B7280" },
      pie: { fontSize: 10, color: "#9CA3AF", italic: true }
    },
    defaultStyle: { fontSize: 10 }
  };

  pdfMake.createPdf(docDefinition).download(`Cuenta_Cobro_DOMKA_${id.substring(0, 8)}.pdf`);
}

window.generarPDFCuenta = generarPDFCuenta;
