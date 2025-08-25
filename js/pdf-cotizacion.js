// Convierte <img> a dataURL usando canvas (misma-origin)
function imgToDataURL(imgEl) {
  return new Promise((resolve, reject) => {
    if (!imgEl) return resolve(null);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);
        const dataURL = canvas.toDataURL("image/png");
        resolve(dataURL);
      } catch (e) {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = imgEl.src;
  });
}

async function generarPDFCotizacion(c) {
  // Prepara tabla de items
  const tablaItems = [
    [
      { text: "Descripción", style: "th" },
      { text: "Cantidad", style: "th", alignment: "right" },
      { text: "Precio", style: "th", alignment: "right" },
      { text: "Subtotal", style: "th", alignment: "right" }
    ],
    ...(Array.isArray(c.items) ? c.items : []).map(it => ([
      it.descripcion || "",
      { text: String(it.cantidad || 0), alignment: "right" },
      { text: `$${Number(it.precio || 0).toLocaleString("es-CO")}`, alignment: "right" },
      { text: `$${Number(it.subtotal || 0).toLocaleString("es-CO")}`, alignment: "right" }
    ]))
  ];

  const totalTxt = `$${Number(c.total || 0).toLocaleString("es-CO")}`;
  const tipoTxt = c.tipoCotizacion === "manoObra" ? "Solo Mano de Obra" : "Mano de Obra + Materiales";

  // Firma opcional
  let firmaDataURL = null;
  const firmaImgEl = document.getElementById("firma-img");
  try {
    firmaDataURL = await imgToDataURL(firmaImgEl);
  } catch (_) {
    firmaDataURL = null;
  }

  const content = [
    { text: "COTIZACIÓN DOMKA", style: "header" },
    { text: `Cliente: ${c.cliente || ""}`, margin: [0, 6, 0, 0] },
    { text: `Tipo de cotización: ${tipoTxt}`, margin: [0, 2, 0, 6] },
    { text: `Notas: ${c.notas || "—"}`, margin: [0, 0, 0, 10] },

    { text: "Detalle de Ítems", style: "subheader", margin: [0, 6, 0, 6] },
    { table: { headerRows: 1, widths: ["*", "auto", "auto", "auto"], body: tablaItems }, layout: "lightHorizontalLines" },

    { text: "Totales", style: "subheader", margin: [0, 12, 0, 6] },
    { text: `Total: ${totalTxt}` },
    { text: `En letras: ${c.totalEnLetras || ""}`, margin: [0, 2, 0, 12], italics: true },

    { text: "Atentamente,", margin: [0, 16, 0, 4] },
    ...(firmaDataURL ? [{ image: firmaDataURL, width: 160, margin: [0, 0, 0, 6] }] : []),
    { text: "DOMKA Construcciones", bold: true }
  ];

  const docDefinition = {
    content,
    styles: {
      header: { fontSize: 18, bold: true, color: "#F97316" },
      subheader: { fontSize: 14, bold: true, color: "#374151" },
      th: { bold: true, color: "#FFFFFF", fillColor: "#F97316" }
    },
    defaultStyle: { fontSize: 10 }
  };

  pdfMake.createPdf(docDefinition).open();
}

window.generarPDFCotizacion = generarPDFCotizacion;
