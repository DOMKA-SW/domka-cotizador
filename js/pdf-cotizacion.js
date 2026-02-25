// js/pdf-cotizacion.js — Rediseño DOMKA 2025
// Paleta: Negro #111827 · Gris #4B5563 · Beige #F5F0E8 · Verde #1a7a4a · Blanco
// Tipografía: DM Sans (Roboto en pdfMake)

// ── HELPERS IMAGEN ────────────────────────────────────────────
async function imageToDataURL(path) {
  try {
    if (path && path.startsWith("data:")) return path;
    let url = path;
    if (!path.startsWith("http") && !path.startsWith("data:")) {
      url = `https://domka-sw.github.io/domka-cotizador${path.startsWith("/") ? path : "/" + path}`;
    }
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    console.warn("Imagen no cargada:", path, e);
    return null;
  }
}

async function preloadImages(paths) {
  const imgs = {};
  for (const [k, p] of Object.entries(paths)) {
    imgs[k] = await imageToDataURL(p).catch(() => null);
  }
  return imgs;
}

// ── PALETA ────────────────────────────────────────────────────
const C = {
  black:     "#111827",
  darkGray:  "#1F2937",
  gray:      "#4B5563",
  grayMid:   "#6B7280",
  grayLight: "#9CA3AF",
  beige:     "#F5F0E8",
  beigeDeep: "#EDE8DF",
  white:     "#FFFFFF",
  green:     "#1a7a4a",
  greenSoft: "#E6F4ED",
  line:      "#E5E7EB"
};

// ── CUENTAS BANCARIAS PARA MÉTODOS DE PAGO ────────────────────
// ⚠️ Edita estos datos con tus cuentas reales
const CUENTAS_PAGO = [
  {
    banco:    "Bancolombia",
    tipo:     "Cuenta de Ahorros",
    numero:   "123-456789-00",
    titular:  "Alexander Otalora Camayo"
  },
  {
    banco:    "Nequi / Daviplata",
    tipo:     "Billetera Digital",
    numero:   "+57 305 811 4595",
    titular:  "Alexander Otalora Camayo"
  }
];

// ── HELPERS LAYOUT ────────────────────────────────────────────
function hrLine(color = C.line, margin = [0, 16, 0, 14]) {
  return {
    canvas: [{ type: "line", x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.75, lineColor: color }],
    margin
  };
}

function sectionLabel(text) {
  return {
    text,
    fontSize: 7,
    bold: true,
    color: C.grayLight,
    characterSpacing: 2,
    font: "Roboto",
    margin: [0, 0, 0, 10]
  };
}

function fmtFecha(f) {
  if (!f) return "—";
  const d = new Date(f && f.seconds ? f.seconds * 1000 : f);
  return d.toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" });
}

function fmtMoney(n) {
  return `$${Number(n || 0).toLocaleString("es-CO")}`;
}

// ── GENERADOR PDF COTIZACIÓN ──────────────────────────────────
async function generarPDFCotizacion(cotizacion, nombreCliente = "Cliente") {
  const {
    items            = [],
    subtotal         = 0,
    total            = 0,
    notas            = "",
    notasArray       = null,
    tipo             = "mano-obra",
    formaPago        = "contado",
    planPagos        = [],
    fecha            = new Date(),
    mostrarValorLetras = true,
    id               = "",
    firmaAprobacion  = null,
    fechaAprobacion  = null,
    tipoCalculo      = "por-items",
    ubicacion        = "",
    clienteNit       = "",
    clienteNumeroDocumento = "",
    mostrarDocumento = true,
    adjuntos         = []
  } = cotizacion;

  const images = await preloadImages({
    logo:  "/img/logo.png",
    firma: "/img/firma.png"
  });

  const numDoc          = (id || "").substring(0, 8).toUpperCase() || "—";
  const fechaStr        = fmtFecha(fecha);
  const fechaAprobStr   = fechaAprobacion ? fmtFecha(fechaAprobacion) : null;

  const tipoTexto = {
    "mano-obra": "Mano de obra",
    "materiales": "Materiales",
    "ambos": "Mano de obra y materiales"
  }[tipo] || tipo;

  const formaPagoTexto = {
    "contado":       "Contado",
    "60-40":         "60% / 40%",
    "50-50":         "50% / 50%",
    "tres-pagos":    "3 cuotas",
    "personalizado": "Personalizado"
  }[formaPago] || formaPago;

  // ── 1. ENCABEZADO NEGRO ───────────────────────────────────
  const bloqueHeader = [
    // Banda negra
    {
      canvas: [{ type: "rect", x: 0, y: 0, w: 515, h: 85, color: C.black }],
      margin: [0, 0, 0, 0]
    },
    // Contenido sobre banda
    {
      columns: [
        {
          stack: [
            images.logo
              ? { image: images.logo, width: 42, margin: [0, 0, 0, 5] }
              : {},
            { text: "DOMKA", fontSize: 16, bold: true, color: C.white, font: "Roboto", margin: [0, 0, 0, 2] },
            { text: "CONSTRUCCIÓN & DISEÑO", fontSize: 6.5, color: C.grayLight, characterSpacing: 2, font: "Roboto" }
          ],
          width: "auto"
        },
        { text: "", width: "*" },
        {
          stack: [
            { text: "COTIZACIÓN", fontSize: 26, bold: true, color: C.white, alignment: "right", font: "Roboto" },
            { text: `N° ${numDoc}`, fontSize: 9, color: C.grayLight, alignment: "right", font: "Roboto", margin: [0, 4, 0, 0] }
          ],
          width: "auto"
        }
      ],
      margin: [0, -82, 0, 0]  // sube sobre la banda negra
    },
    // Línea verde bajo el encabezado
    {
      canvas: [{ type: "rect", x: 0, y: 0, w: 515, h: 3, color: C.green }],
      margin: [0, 7, 0, 0]
    }
  ];

  // ── 2. DATOS CLIENTE / DETALLES ───────────────────────────
  const bloqueInfo = {
    columns: [
      {
        stack: [
          { text: "CLIENTE", fontSize: 7, bold: true, color: C.grayLight, characterSpacing: 2, font: "Roboto", margin: [0, 0, 0, 6] },
          { text: nombreCliente, fontSize: 14, bold: true, color: C.black, font: "Roboto", margin: [0, 0, 0, 3] },
          ...(ubicacion ? [{ text: ubicacion, fontSize: 9, color: C.gray, font: "Roboto" }] : []),
          ...(mostrarDocumento && clienteNit ? [{ text: `NIT: ${clienteNit}`, fontSize: 9, color: C.gray, font: "Roboto", margin: [0, 2, 0, 0] }] : []),
          ...(mostrarDocumento && clienteNumeroDocumento ? [{ text: `Doc: ${clienteNumeroDocumento}`, fontSize: 9, color: C.gray, font: "Roboto" }] : [])
        ],
        width: "55%"
      },
      { text: "", width: "*" },
      {
        stack: [
          { text: "DETALLES", fontSize: 7, bold: true, color: C.grayLight, characterSpacing: 2, font: "Roboto", margin: [0, 0, 0, 6] },
          {
            table: {
              widths: ["auto", "*"],
              body: [
                [
                  { text: "Fecha:", fontSize: 8.5, color: C.grayMid, font: "Roboto", border: [false,false,false,false], margin: [0,2,10,2] },
                  { text: fechaStr, fontSize: 8.5, bold: true, color: C.black, font: "Roboto", alignment: "right", border: [false,false,false,false], margin: [0,2,0,2] }
                ],
                [
                  { text: "Tipo:", fontSize: 8.5, color: C.grayMid, font: "Roboto", border: [false,false,false,false], margin: [0,2,10,2] },
                  { text: tipoTexto, fontSize: 8.5, bold: true, color: C.black, font: "Roboto", alignment: "right", border: [false,false,false,false], margin: [0,2,0,2] }
                ],
                [
                  { text: "Pago:", fontSize: 8.5, color: C.grayMid, font: "Roboto", border: [false,false,false,false], margin: [0,2,10,2] },
                  { text: formaPagoTexto, fontSize: 8.5, bold: true, color: C.black, font: "Roboto", alignment: "right", border: [false,false,false,false], margin: [0,2,0,2] }
                ],
                [
                  { text: "Validez:", fontSize: 8.5, color: C.grayMid, font: "Roboto", border: [false,false,false,false], margin: [0,2,10,2] },
                  { text: "30 días", fontSize: 8.5, bold: true, color: C.black, font: "Roboto", alignment: "right", border: [false,false,false,false], margin: [0,2,0,2] }
                ]
              ]
            },
            layout: "noBorders"
          }
        ],
        width: "auto"
      }
    ],
    margin: [0, 22, 0, 0]
  };

  // ── 3. TABLA DE ÍTEMS ─────────────────────────────────────
  const buildRow = (cells, i) => cells.map((c, ci) => ({
    ...c,
    fillColor: i % 2 === 0 ? C.white : C.beige,
    border: [false, false, false, false],
    margin: [ci === 0 ? 10 : 8, 9, ci === cells.length - 1 ? 10 : 8, 9]
  }));

  const headerCellStyle = {
    bold: true, fontSize: 8, color: C.white, fillColor: C.black,
    font: "Roboto", characterSpacing: 1,
    border: [false, false, false, false]
  };

  let tablaItems;

  if (tipoCalculo === "valor-total") {
    // Sin precios unitarios — solo descripción
    tablaItems = {
      table: {
        widths: [28, "*"],
        body: [
          [
            { ...headerCellStyle, text: "N°",   alignment: "center", margin: [8, 8, 8, 8] },
            { ...headerCellStyle, text: "DESCRIPCIÓN DEL SERVICIO", margin: [10, 8, 10, 8] }
          ],
          ...items.map((it, i) => buildRow([
            { text: String(i + 1).padStart(2, "0"), fontSize: 9, color: C.grayMid, alignment: "center", font: "Roboto" },
            { text: it.descripcion || "—", fontSize: 9.5, color: C.black, font: "Roboto" }
          ], i))
        ]
      },
      layout: {
        hLineWidth: (i, node) => (i === 0 || i === node.table.body.length) ? 0 : 0.5,
        vLineWidth: () => 0,
        hLineColor: () => C.line
      }
    };
  } else {
    // Con precios unitarios — tabla completa (franja negra)
    tablaItems = {
      table: {
        widths: [28, "*", 72, 36, 72],
        body: [
          [
            { ...headerCellStyle, text: "N°",         alignment: "center", margin: [8, 8, 8, 8] },
            { ...headerCellStyle, text: "DESCRIPCIÓN",                     margin: [10, 8, 8, 8] },
            { ...headerCellStyle, text: "PRECIO",      alignment: "right",  margin: [8, 8, 10, 8] },
            { ...headerCellStyle, text: "CANT.",       alignment: "center", margin: [8, 8, 8, 8] },
            { ...headerCellStyle, text: "TOTAL",       alignment: "right",  margin: [8, 8, 10, 8] }
          ],
          ...items.map((it, i) => buildRow([
            { text: String(i + 1).padStart(2, "0"), fontSize: 9, color: C.grayMid, alignment: "center", font: "Roboto" },
            { text: it.descripcion || "—", fontSize: 9.5, color: C.black, font: "Roboto" },
            { text: fmtMoney(it.precio), fontSize: 9, color: C.gray, alignment: "right", font: "Roboto" },
            { text: String(it.cantidad || 1), fontSize: 9, color: C.gray, alignment: "center", font: "Roboto" },
            { text: fmtMoney(it.subtotal), fontSize: 9.5, bold: true, color: C.black, alignment: "right", font: "Roboto" }
          ], i))
        ]
      },
      layout: {
        hLineWidth: (i, node) => (i === 0 || i === node.table.body.length) ? 0 : 0.5,
        vLineWidth: () => 0,
        hLineColor: () => C.line
      }
    };
  }

  // ── 4. TOTALES ────────────────────────────────────────────
  const iva = total - subtotal;
  const tieneIva = iva > 1 && tipoCalculo !== "valor-total";

  const filasSubtotal = tieneIva ? [
    [
      { text: "Subtotal", fontSize: 9, color: C.gray, font: "Roboto", border: [false,false,false,false], margin: [0,4,12,4] },
      { text: fmtMoney(subtotal), fontSize: 9, color: C.gray, alignment: "right", font: "Roboto", border: [false,false,false,false], margin: [0,4,0,4] }
    ],
    [
      { text: "IVA", fontSize: 9, color: C.gray, font: "Roboto", border: [false,false,false,false], margin: [0,4,12,4] },
      { text: fmtMoney(iva), fontSize: 9, color: C.gray, alignment: "right", font: "Roboto", border: [false,false,false,false], margin: [0,4,0,4] }
    ]
  ] : [];

  const bloqueTotales = {
    columns: [
      // Izquierda: valor en letras
      {
        stack: mostrarValorLetras ? [
          { text: "VALOR EN LETRAS", fontSize: 7, bold: true, color: C.grayLight, characterSpacing: 2, font: "Roboto", margin: [0, 0, 0, 5] },
          {
            text: typeof numeroAPalabras === "function" ? numeroAPalabras(total) : "",
            fontSize: 8.5, italic: true, color: C.gray, font: "Roboto", lineHeight: 1.4
          }
        ] : [],
        width: "*",
        margin: [0, tieneIva ? filasSubtotal.length * 14 + 4 : 0, 0, 0]
      },
      // Derecha: cuadro de totales
      {
        width: 230,
        stack: [
          ...(filasSubtotal.length > 0 ? [{
            table: { widths: ["*", "auto"], body: filasSubtotal },
            layout: "noBorders",
            margin: [0, 0, 0, 6]
          }] : []),
          // Fila total en negro
          {
            table: {
              widths: ["*", "auto"],
              body: [[
                {
                  text: "TOTAL A PAGAR",
                  fontSize: 10, bold: true, color: C.white, font: "Roboto",
                  fillColor: C.black, border: [false,false,false,false],
                  margin: [14, 11, 8, 11]
                },
                {
                  text: fmtMoney(total),
                  fontSize: 13, bold: true, color: C.white, alignment: "right", font: "Roboto",
                  fillColor: C.black, border: [false,false,false,false],
                  margin: [8, 11, 14, 11]
                }
              ]]
            },
            layout: "noBorders"
          }
        ]
      }
    ]
  };

  // ── 5. PLAN DE PAGOS ──────────────────────────────────────
  const bloquePagos = planPagos.length > 0 ? [
    hrLine(),
    sectionLabel("PLAN DE PAGOS"),
    {
      table: {
        widths: ["*", 60, 90],
        body: [
          [
            { text: "Descripción",  ...headerCellStyle, margin: [10,8,8,8] },
            { text: "Porcentaje",   ...headerCellStyle, alignment: "center", margin: [8,8,8,8] },
            { text: "Valor",        ...headerCellStyle, alignment: "right",  margin: [8,8,10,8] }
          ],
          ...planPagos.map((p, i) => buildRow([
            { text: p.descripcion || "—", fontSize: 9, color: C.black, font: "Roboto" },
            { text: `${p.porcentaje}%`, fontSize: 9, color: C.gray, alignment: "center", font: "Roboto" },
            { text: fmtMoney(p.monto), fontSize: 9, bold: true, color: C.black, alignment: "right", font: "Roboto" }
          ], i))
        ]
      },
      layout: {
        hLineWidth: (i, node) => (i === 0 || i === node.table.body.length) ? 0 : 0.5,
        vLineWidth: () => 0,
        hLineColor: () => C.line
      }
    }
  ] : [];

  // ── 6. MÉTODOS DE PAGO ────────────────────────────────────
  const bloquePago = [
    hrLine(),
    sectionLabel("MÉTODOS DE PAGO"),
    {
      columns: CUENTAS_PAGO.map((cp, i) => ({
        stack: [
          // Fondo beige
          {
            canvas: [{
              type: "rect", x: 0, y: 0,
              w: CUENTAS_PAGO.length === 1 ? 515 : 245,
              h: 76, r: 5, color: C.beige
            }]
          },
          // Texto encima del rect
          {
            stack: [
              { text: cp.banco, fontSize: 11, bold: true, color: C.black, font: "Roboto", margin: [0,0,0,2] },
              { text: cp.tipo,  fontSize: 8,  color: C.grayMid, font: "Roboto", margin: [0,0,0,7] },
              { text: cp.numero, fontSize: 11, bold: true, color: C.green, font: "Roboto", margin: [0,0,0,3] },
              { text: `Titular: ${cp.titular}`, fontSize: 8, color: C.gray, font: "Roboto" }
            ],
            relativePosition: { x: 0, y: -76 },
            margin: [14, 14, 14, 0]
          }
        ],
        width: CUENTAS_PAGO.length === 1 ? "*" : "auto",
        margin: i < CUENTAS_PAGO.length - 1 ? [0,0,14,0] : [0,0,0,0]
      })),
      columnGap: 0
    }
  ];

  // ── 7. NOTAS ──────────────────────────────────────────────
  const notasLineas = (() => {
    if (notasArray && notasArray.length > 0) return notasArray.map(n => n.trim()).filter(Boolean);
    if (notas) return notas.split("\n").map(l => l.trim()).filter(Boolean);
    return [];
  })();

  const bloqueNotas = notasLineas.length > 0 ? [
    hrLine(),
    sectionLabel("NOTAS"),
    {
      ul: notasLineas,
      fontSize: 9.5, color: C.gray, font: "Roboto", lineHeight: 1.5,
      markerColor: C.green
    }
  ] : [];

  // ── 8. TÉRMINOS ───────────────────────────────────────────
  const bloqueTerminos = [
    hrLine(),
    sectionLabel("TÉRMINOS Y CONDICIONES"),
    {
      columns: [
        {
          ul: [
            "Esta cotización tiene validez de 30 días a partir de la fecha de emisión.",
            "El tiempo de entrega se confirmará al momento de aprobación del proyecto."
          ],
          fontSize: 8.5, color: C.grayMid, font: "Roboto", lineHeight: 1.4, markerColor: C.grayMid
        },
        {
          ul: [
            formaPago !== "contado"
              ? "Se requiere anticipo para iniciar el trabajo según el plan de pagos."
              : "Pago al contado, cancelado en su totalidad al finalizar el servicio.",
            "Trabajos adicionales no contemplados generarán un cobro extra acordado."
          ],
          fontSize: 8.5, color: C.grayMid, font: "Roboto", lineHeight: 1.4, markerColor: C.grayMid
        }
      ],
      columnGap: 24
    }
  ];

  // ── 9. APROBACIÓN (firma cliente) ─────────────────────────
  const bloqueAprobacion = firmaAprobacion ? [
    hrLine(),
    {
      columns: [
        { text: "", width: "*" },
        {
          stack: [
            { canvas: [{ type: "rect", x: 0, y: 0, w: 190, h: 3, r: 1, color: C.green }], margin: [0,0,0,8] },
            { text: "RECIBIDO Y APROBADO", fontSize: 7, bold: true, color: C.green, characterSpacing: 1.5, font: "Roboto", margin: [0,0,0,5] },
            ...(fechaAprobStr ? [{ text: `Fecha: ${fechaAprobStr}`, fontSize: 8.5, color: C.gray, font: "Roboto", margin: [0,0,0,8] }] : []),
            { image: firmaAprobacion, width: 120, margin: [0,0,0,6] },
            { text: nombreCliente, fontSize: 9, bold: true, color: C.black, font: "Roboto" },
            { text: "Firma del cliente", fontSize: 8, color: C.grayMid, font: "Roboto" }
          ],
          width: 200
        }
      ]
    }
  ] : [];

  // ── 10. FIRMA EMPRESA ─────────────────────────────────────
  const bloqueEmpresa = [
    hrLine([C.line], [0, 28, 0, 20]),
    {
      columns: [
        // Firma + datos
        {
          stack: [
            sectionLabel("ELABORADO POR"),
            images.firma
              ? { image: images.firma, width: 110, margin: [0,0,0,8] }
              : { text: "— firma —", fontSize: 9, color: C.grayMid, italic: true, margin: [0,14,0,8] },
            { text: "Alexander Otalora Camayo", fontSize: 11, bold: true, color: C.black, font: "Roboto", margin: [0,0,0,3] },
            { text: "DOMKA Construcción & Diseño",  fontSize: 8.5, color: C.grayMid, font: "Roboto", margin: [0,0,0,2] },
            { text: "Cel: +57 305 811 4595",         fontSize: 8.5, color: C.gray, font: "Roboto", margin: [0,0,0,1] },
            { text: "RUT: 79.597.683-1",             fontSize: 8.5, color: C.gray, font: "Roboto", margin: [0,0,0,1] },
            { text: "piter030509@gmail.com",         fontSize: 8.5, color: C.gray, font: "Roboto" }
          ],
          width: "55%"
        },
        { text: "", width: "*" },
        // Cuadro verde de cierre
        {
          stack: [
            { canvas: [{ type: "rect", x: 0, y: 0, w: 195, h: 88, r: 6, color: C.green }] },
            {
              stack: [
                { text: "Gracias por confiar", fontSize: 11, bold: true, color: C.white, font: "Roboto", margin: [0,0,0,3] },
                { text: "en DOMKA.",            fontSize: 11, bold: true, color: C.white, font: "Roboto", margin: [0,0,0,12] },
                { text: "piter030509@gmail.com", fontSize: 8, color: "rgba(255,255,255,0.75)", font: "Roboto" }
              ],
              relativePosition: { x: 0, y: -88 },
              margin: [18, 18, 18, 0]
            }
          ],
          width: 195
        }
      ]
    }
  ];

  // ── 11. ADJUNTOS ──────────────────────────────────────────
  const paginasAdjuntos = [];
  for (const adj of (adjuntos || [])) {
    if (adj.tipo && adj.tipo.startsWith("image/") && adj.datos) {
      paginasAdjuntos.push({ text: "", pageBreak: "before" });
      paginasAdjuntos.push(sectionLabel(`ADJUNTO: ${(adj.nombre || "imagen").toUpperCase()}`));
      paginasAdjuntos.push({ image: adj.datos, width: 490 });
    } else if (adj.tipo === "application/pdf") {
      paginasAdjuntos.push({ text: "", pageBreak: "before" });
      paginasAdjuntos.push({
        text: `Adjunto PDF: "${adj.nombre || "documento"}" — disponible para descarga en el link público de la cotización.`,
        fontSize: 9, color: C.grayMid, font: "Roboto", italic: true, margin: [0, 20, 0, 0]
      });
    }
  }

  // ── FOOTER ────────────────────────────────────────────────
  const footerFn = (currentPage, pageCount) => ({
    columns: [
      {
        text: `DOMKA © ${new Date().getFullYear()}  ·  Construcción & Diseño  ·  +57 305 811 4595`,
        fontSize: 7, color: C.grayLight, font: "Roboto", margin: [45, 0, 0, 0]
      },
      {
        text: `Página ${currentPage} de ${pageCount}`,
        fontSize: 7, color: C.grayLight, font: "Roboto", alignment: "right", margin: [0, 0, 45, 0]
      }
    ],
    margin: [0, 8, 0, 0]
  });

  // ── BACKGROUND: borde verde izquierdo ─────────────────────
  const bgFn = () => [
    { canvas: [{ type: "rect", x: 0, y: 0, w: 5, h: 842, color: C.green }] }
  ];

  // ── DOCUMENTO FINAL ───────────────────────────────────────
  const docDefinition = {
    pageSize:    "A4",
    pageMargins: [45, 42, 42, 48],
    footer:      footerFn,
    background:  bgFn,

    content: [
      // Encabezado negro
      ...bloqueHeader,

      // Espacio
      { text: "", margin: [0, 20, 0, 0] },

      // Info cliente
      bloqueInfo,

      // Divisor
      hrLine(C.line, [0, 22, 0, 16]),

      // Label + tabla
      sectionLabel("DETALLE DE LA COTIZACIÓN"),
      tablaItems,

      // Totales
      { text: "", margin: [0, 18, 0, 0] },
      bloqueTotales,

      // Plan de pagos
      ...bloquePagos,

      // Métodos de pago
      ...bloquePago,

      // Notas
      ...bloqueNotas,

      // Términos
      ...bloqueTerminos,

      // Aprobación
      ...bloqueAprobacion,

      // Firma empresa
      ...bloqueEmpresa,

      // Adjuntos
      ...paginasAdjuntos
    ],

    defaultStyle: { font: "Roboto", fontSize: 10, color: C.black }
  };

  if (typeof pdfMake !== "undefined") {
    pdfMake.createPdf(docDefinition).download(`Cotizacion_DOMKA_${numDoc}.pdf`);
  } else {
    console.error("pdfMake no disponible");
    alert("Error generando PDF. Recarga la página.");
  }
}

if (typeof window !== "undefined") {
  window.generarPDFCotizacion = generarPDFCotizacion;
}
