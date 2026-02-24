// js/pdf-cuenta.js
async function imageToDataURL(path) {
  try {
    if (path.startsWith('data:')) return path;
    
    let absolutePath = path;
    if (!path.startsWith('http') && !path.startsWith('data:')) {
      absolutePath = `https://domka-sw.github.io/domka-cotizador${path.startsWith('/') ? path : '/' + path}`;
    }
    
    const res = await fetch(absolutePath);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    
    const blob = await res.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    console.warn("No se pudo cargar la imagen:", path, e);
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

async function generarPDFCuenta(cuenta, nombreCliente = "Cliente") {
  const { 
    items = [], 
    total = 0, 
    notas = "",
    notasArray = [],
    fecha = new Date(),
    mostrarValorLetras = true,
    id = "",
    firmaConfirmacion = null,
    fechaConfirmacion = null,
    clienteNit = "",
    clienteNumeroDocumento = "",
    mostrarDocumento = true,
    anexos = []
  } = cuenta;

  const firmaNombre = "Alex Otalora";
  const firmaTelefono = "+57 305 811 4595";
  const firmaRut = "RUT: 79597683-1";
  const firmaEmail = "Email: piter030509@gmail.com";

  const images = await preloadImages({
    logo: "/img/logo.png",
    firma: "/img/firma.png",
    muneco: "/img/muneco.png"
  });

  const fechaFormateada = new Date(fecha.seconds ? fecha.seconds * 1000 : fecha).toLocaleDateString('es-CO', {
    year: 'numeric', month: 'long', day: 'numeric'
  });

  const fechaConfirmacionFormateada = fechaConfirmacion ? 
    new Date(fechaConfirmacion.seconds ? fechaConfirmacion.seconds * 1000 : fechaConfirmacion).toLocaleDateString('es-CO', {
      year: 'numeric', month: 'long', day: 'numeric'
    }) : null;

  // Firma del cliente si existe
  const contenidoFirmaCliente = firmaConfirmacion ? [
    { text: " ", margin: [0, 20] },
    { text: "CONFORMIDAD DEL CLIENTE", style: "aprobacionHeader" },
    {
      columns: [
        { text: " ", width: "*" },
        {
          stack: [
            { text: `Fecha de confirmación: ${fechaConfirmacionFormateada}`, style: "aprobacionText" },
            { image: firmaConfirmacion, width: 150, margin: [0, 10, 0, 5] },
            { text: "Firma del cliente", alignment: "center", style: "aprobacionText" }
          ],
          width: 200
        }
      ]
    }
  ] : [];

  // 🔹 Notas: viñetas si hay array, sino texto plano
  const viñetas = notasArray && notasArray.length > 0
    ? notasArray
    : (notas ? notas.split("\n").filter(l => l.trim()) : []);

  let notasContenido;
  if (viñetas.length > 1) {
    notasContenido = { ul: viñetas, margin: [0, 0, 0, 20] };
  } else {
    notasContenido = { text: notas || "—", margin: [0, 0, 0, 20] };
  }

  // 🔹 Filas de info del cliente con NIT y N° Documento opcionales
  const infoClienteRows = [
    [{ text: "Nombre/Empresa:", style: "label" }, { text: nombreCliente, style: "value" }],
    [{ text: "Fecha de emisión:", style: "label" }, { text: fechaFormateada, style: "value" }],
    [{ text: "ID de cuenta:", style: "label" }, { text: id || "No especificado", style: "value" }],
    ...(mostrarDocumento && clienteNit ? [[{ text: "NIT:", style: "label" }, { text: clienteNit, style: "value" }]] : []),
    ...(mostrarDocumento && clienteNumeroDocumento ? [[{ text: "N° Documento:", style: "label" }, { text: clienteNumeroDocumento, style: "value" }]] : []),
  ];

  const contenido = [
    // Encabezado
    {
      columns: [
        images.logo ? { image: images.logo, width: 80, height: 80 } : { text: "DOMKA", style: "logo" },
        {
          stack: [
            { text: "CUENTA DE COBRO", style: "header", alignment: "right" },
            { text: `N°: ${id || "Sin ID"}`, style: "subheader", alignment: "right", margin: [0, 5] }
          ],
          width: "*"
        }
      ],
      margin: [0, 0, 0, 20]
    },
    
    // Info general
    {
      table: { widths: ["*", "*"], body: infoClienteRows },
      layout: "noBorders",
      margin: [0, 0, 0, 15]
    },

    // Debe a / concepto
    {
      text: "Debe a: Alexander Otalora Camayo",
      alignment: "center",
      style: "subheader",
      margin: [0, 10, 0, 20]
    },
    {
      text: `Por concepto de: ${cuenta.concepto || "-"}`,
      style: "subheader",
      margin: [0, 0, 0, 10]
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
    ...(notas || (notasArray && notasArray.length > 0) ? [
      { text: " ", margin: [0, 10] },
      { text: "Notas", style: "subheader" },
      notasContenido
    ] : []),
    
    // Firma del cliente
    ...contenidoFirmaCliente,
    
    // Firma de la empresa
    { text: " ", margin: [0, 20] },
    { text: "Atentamente,", style: "firmaText" },
    images.firma ? { image: images.firma, width: 150, margin: [0, 10, 0, 5] } 
                 : { text: "[Firma digital]", style: "firmaPlaceholder", margin: [0, 10, 0, 5] },
    { text: firmaNombre, style: "firmaNombre" },
    { text: firmaTelefono, style: "firmaDatos" },
    { text: firmaRut, style: "firmaDatos" },
    { text: firmaEmail, style: "firmaDatos", margin: [0, 0, 0, 30] },
    
    // Pie
    { text: "Gracias por su preferencia", style: "pie", alignment: "center", margin: [0, 30, 0, 0] }
  ];

  // 🔹 ANEXOS: agregar imágenes como páginas adicionales
  const paginasAnexos = [];
  for (const anexo of anexos) {
    if (!anexo.base64) continue;

    if (anexo.tipo && anexo.tipo.startsWith("image/")) {
      paginasAnexos.push({ text: "", pageBreak: "before" });
      paginasAnexos.push({ text: `Anexo: ${anexo.nombre}`, style: "subheader", margin: [0, 0, 0, 10] });
      paginasAnexos.push({ image: anexo.base64, width: 500, alignment: "center" });
    } else if (anexo.tipo === "application/pdf") {
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
    background: function(currentPage, pageSize) {
      if (currentPage === 1) {
        const bg = [];
        if (images.logo) {
          bg.push({ image: images.logo, width: 300, opacity: 0.05, absolutePosition: { x: (pageSize.width - 300) / 2, y: (pageSize.height - 300) / 2 } });
        }
        if (images.muneco) {
          bg.push({ image: images.muneco, width: 100, opacity: 0.1, absolutePosition: { x: 455, y: 30 } });
        }
        return bg;
      }
      return [];
    },
    content: [...contenido, ...paginasAnexos],
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
      firmaPlaceholder: { fontSize: 10, color: "#9CA3AF", italic: true, alignment: "center" },
      aprobacionHeader: { fontSize: 14, bold: true, color: "#059669", alignment: "center", margin: [0, 0, 0, 10] },
      aprobacionText: { fontSize: 10, color: "#374151", alignment: "center" },
      pie: { fontSize: 10, color: "#9CA3AF", italic: true }
    },
    defaultStyle: { fontSize: 10 }
  };

  try {
    pdfMake.createPdf(docDefinition).download(`Cuenta_Cobro_DOMKA_${id || Date.now()}.pdf`);
  } catch (error) {
    console.error("Error al generar el PDF:", error);
    generarPDFCuentaSimple(cuenta, nombreCliente);
  }
}

// Función simple de respaldo (sin cambios, mantener igual)
function generarPDFCuentaSimple(cuenta, nombreCliente = "Cliente") {
  const { items = [], total = 0, notas = "", fecha = new Date(), mostrarValorLetras = true, id = "", firmaConfirmacion = null } = cuenta;

  const firmaNombre = "Alex Otalora";
  const firmaTelefono = "+57 305 811 4595";
  const firmaRut = "RUT: 79597683-1";

  const fechaFormateada = new Date(fecha.seconds ? fecha.seconds * 1000 : fecha).toLocaleDateString('es-CO');

  const docDefinition = {
    pageSize: 'A4',
    pageMargins: [40, 60, 40, 60],
    content: [
      { text: "DOMKA - CUENTA DE COBRO", style: "header" },
      { text: `N°: ${id || "Sin ID"}`, style: "subheader" },
      { text: `Cliente: ${nombreCliente}`, margin: [0, 10, 0, 5] },
      { text: `Fecha: ${fechaFormateada}`, margin: [0, 0, 0, 15] },
      { text: "Descripción del Servicio:", style: "subheader" },
      { ul: items.map(item => item.descripcion || "-"), margin: [0, 0, 0, 15] },
      { text: "Total:", style: "subheader" },
      { text: `$${Number(total || 0).toLocaleString("es-CO")}`, style: "totalValue" },
      ...(mostrarValorLetras ? [{ text: `Son: ${numeroAPalabras(total)}`, style: "valorLetras", margin: [0, 5, 0, 15] }] : []),
      ...(notas ? [{ text: "Notas:", style: "subheader" }, { text: notas, margin: [0, 0, 0, 15] }] : []),
      ...(firmaConfirmacion ? [{ text: "Firma de confirmación:", style: "subheader" }, { image: firmaConfirmacion, width: 150, margin: [0, 10] }] : []),
      { text: "Atentamente,", style: "firmaText" },
      { text: firmaNombre, style: "firmaNombre" },
      { text: firmaTelefono, style: "firmaDatos" },
      { text: firmaRut, style: "firmaDatos" }
    ],
    styles: {
      header: { fontSize: 18, bold: true, color: "#F97316", margin: [0, 0, 0, 5] },
      subheader: { fontSize: 14, bold: true, margin: [0, 10, 0, 5] },
      totalValue: { fontSize: 16, bold: true, color: "#F97316" },
      valorLetras: { italic: true, fontSize: 10 },
      firmaText: { fontSize: 12, bold: true, margin: [0, 20, 0, 5] },
      firmaNombre: { fontSize: 12, bold: true, color: "#F97316" },
      firmaDatos: { fontSize: 9, color: "#374151" }
    }
  };

  pdfMake.createPdf(docDefinition).download(`Cuenta_Cobro_DOMKA_${id || Date.now()}.pdf`);
}

window.generarPDFCuenta = generarPDFCuenta;
