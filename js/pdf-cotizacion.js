// js/pdf-cotizacion.js

// Asegúrate de cargar pdfmake y vfs_fonts en el HTML antes de este script.
// pdfMake viene global como window.pdfMake

(function () {
  function money(n) {
    return `$${Number(n || 0).toLocaleString("es-CO")}`;
  }

  function buildItemsTable(items = []) {
    const body = [
      [
        { text: "Descripción", style: "th" },
        { text: "Cantidad", style: "th", alignment: "right" },
        { text: "Precio", style: "th", alignment: "right" },
        { text: "Subtotal", style: "th", alignment: "right" }
      ]
    ];

    items.forEach((it) => {
      body.push([
        { text: it.descripcion || "" },
        { text: Number(it.cantidad || 0).toLocaleString("es-CO"), alignment: "right" },
        { text: money(it.precio || it.precioUnitario || 0), alignment: "right" },
        { text: money(it.subtotal || 0), alignment: "right" }
      ]);
    });

    return {
      table: {
        widths: ["*", "auto", "auto", "auto"],
        body
      },
      layout: "lightHorizontalLines",
      margin: [0, 6, 0, 10]
    };
  }

  function buildTotals(subtotal, impuestos, total) {
    return {
      table: {
        widths: ["*", "auto"],
        body: [
          ["Subtotal", money(subtotal)],
          ["IVA (19%)", money(impuestos)], // IVA actualmente suspendido: impuestos=0 desde JS
          [{ text: "TOTAL", bold: true }, { text: money(total), bold: true }]
        ]
      },
      layout: "lightHorizontalLines",
      margin: [0, 6, 0, 10]
    };
  }

  // Firma opcional: si en el futuro pasamos firmaBase64, la mostramos
  function buildAtentamenteSection(options = {}) {
    const { firmante = "DOMKA", cargo = "Construcción & Remodelaciones", firmaBase64 } = options;

    const stack = [
      { text: "Atentamente,", margin: [0, 10, 0, 2] },
      { text: firmante, bold: true },
      { text: cargo, color: "#6B7280" }
    ];

    if (firmaBase64) {
      // si llega una dataURL válida, la insertamos encima del nombre
      stack.splice(1, 0, { image: firmaBase64, width: 140, margin: [0, 10, 0, 6] });
    }

    return { stack };
  }

  function getDocDefinition(cot, cliente, opciones = {}) {
    const {
      clienteNombre = cliente?.nombreEmpresa || cliente?.nombre || "Cliente",
      clienteTelefono = cliente?.telefono || "",
      clienteEmail = cliente?.email || "",
      notas = "",
      tipo = "items",
      items = [],
      subtotal = 0,
      impuestos = 0,
      total = 0,
      fecha = new Date()
    } = cot || {};

    const content = [
      // Encabezado
      {
        columns: [
          { text: "DOMKA", style: "title" },
          {
            stack: [
              { text: "COTIZACIÓN", style: "header", alignment: "right" },
              { text: new Date(fecha?.toDate ? fecha.toDate() : fecha).toLocaleDateString("es-CO"), alignment: "right", color: "#6B7280", fontSize: 10 }
            ]
          }
        ]
      },
      { text: " " },
      { text: "Datos del Cliente", style: "subheader" },
      {
        columns: [
          { text: `Nombre: ${clienteNombre}` },
          { text: `Teléfono: ${clienteTelefono}` },
          { text: `Email: ${clienteEmail}` }
        ]
      },
      { text: " " },
      { text: "Detalle de la Cotización", style: "subheader" }
    ];

    if (tipo === "items") {
      content.push(buildItemsTable(items));
    } else {
      content.push({
        table: {
          widths: ["*", "auto"],
          body: [
            ["Valor total del servicio", money(total)]
          ]
        },
        layout: "lightHorizontalLines",
        margin: [0, 6, 0, 10]
      });
    }

    content.push(buildTotals(subtotal, impuestos, total));

    content.push({ text: "Notas", style: "subheader" });
    content.push({ text: notas || "—", margin: [0, 2, 0, 10] });

    content.push(buildAtentamenteSection(opciones));

    return {
      content,
      styles: {
        title: { fontSize: 20, bold: true, color: "#F97316" },
        header: { fontSize: 14, bold: true, color: "#111827" },
        subheader: { fontSize: 12, bold: true, margin: [0, 10, 0, 4], color: "#374151" },
        th: { bold: true, color: "white", fillColor: "#F97316" }
      },
      footer: function (currentPage, pageCount) {
        return {
          columns: [
            { text: "DOMKA · Construcción y Remodelaciones · contacto@domka.com · +57 300 000 0000", alignment: "left", margin: [40, 5, 0, 5], color: "#6B7280", fontSize: 9 },
            { text: `Página ${currentPage} de ${pageCount}`, alignment: "right", margin: [0, 5, 40, 5], color: "#6B7280", fontSize: 9 }
          ]
        };
      },
      defaultStyle: { fontSize: 10 }
    };
  }

  // API pública
  window.generarPDFCotizacion = function (cotizacion, cliente, opciones) {
    const docDefinition = getDocDefinition(cotizacion, cliente, opciones);
    window.pdfMake.createPdf(docDefinition).open();
  };
})();
