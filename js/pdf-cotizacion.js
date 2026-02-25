// js/pdf-cotizacion.js — DOMKA 2025
// Todo con tablas — nada flota, todo cuadrado, escala con muchos ítems
// Paleta: Beige #F5F0E8 · Oscuro #2E2C28 · Negro #1A1A1A · Verde #1a7a4a · Blanco

// ── IMAGEN ────────────────────────────────────────────────────
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
  } catch (e) { return null; }
}

async function preloadImages(paths) {
  const imgs = {};
  for (const [k, p] of Object.entries(paths)) imgs[k] = await imageToDataURL(p).catch(() => null);
  return imgs;
}

// ── PALETA ────────────────────────────────────────────────────
const C = {
  pageBg:    "#F5F0E8",   // fondo de toda la página
  headerBg:  "#2E2C28",   // header oscuro
  headerTxt: "#FFFFFF",
  headerSub: "#9E9B94",
  rowAlt:    "#EDE8DF",   // fila alternada (beige más oscuro)
  tableHdr:  "#2E2C28",   // encabezado de tabla oscuro
  totalBg:   "#2E2C28",   // fondo cuadro total
  black:     "#1A1A1A",
  gray:      "#4B5563",
  grayMid:   "#6B7280",
  grayLight: "#9CA3AF",
  white:     "#FFFFFF",
  green:     "#1a7a4a",
  greenDark: "#155C38",
  line:      "#D6D0C8"    // líneas divisoras
};

// ── CUENTAS BANCARIAS ─────────────────────────────────────────
// ⚠️ Edita aquí tus datos reales
const BANCOS = [
  { banco: "Bancolombia",      tipo: "Cta. Ahorros", numero: "123-456789-00",   titular: "Alexander Otalora Camayo" },
  { banco: "Nequi / Daviplata", tipo: "Billetera",   numero: "+57 305 811 4595", titular: "Alexander Otalora Camayo" }
];

// ── HELPERS ───────────────────────────────────────────────────
function fmtDate(f) {
  if (!f) return "—";
  const d = new Date(f && f.seconds ? f.seconds * 1000 : f);
  return d.toLocaleDateString("es-CO", { day: "2-digit", month: "long", year: "numeric" });
}

function fmtM(n) { return `$${Number(n || 0).toLocaleString("es-CO")}`; }

// Celda de encabezado de sección (etiqueta pequeña en mayúsculas)
function sLabel(text, color = C.grayLight) {
  return { text, fontSize: 6.5, bold: true, color, characterSpacing: 2.5, font: "Roboto", margin: [0, 0, 0, 6] };
}

// Línea separadora
function hr(margin = [0, 16, 0, 14]) {
  return { canvas: [{ type: "line", x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.6, lineColor: C.line }], margin };
}

// Celda de tabla con fondo beige claro alternado — SIEMPRE sin borde
function tc(content, opts = {}) {
  return {
    text: content,
    font: "Roboto",
    fontSize: opts.fontSize || 9.5,
    bold: opts.bold || false,
    color: opts.color || C.black,
    alignment: opts.align || "left",
    fillColor: opts.fill || C.pageBg,
    border: [false, false, false, false],
    margin: opts.margin || [10, 8, 10, 8]
  };
}

// ── GENERADOR ─────────────────────────────────────────────────
async function generarPDFCotizacion(cotizacion, nombreCliente = "Cliente") {
  const {
    items = [], subtotal = 0, total = 0,
    notas = "", notasArray = null,
    tipo = "mano-obra", formaPago = "contado", planPagos = [],
    fecha = new Date(), mostrarValorLetras = true,
    id = "", firmaAprobacion = null, fechaAprobacion = null,
    tipoCalculo = "por-items", ubicacion = "",
    clienteNit = "", clienteNumeroDocumento = "",
    mostrarDocumento = true, adjuntos = []
  } = cotizacion;

  const images = await preloadImages({ logo: "/img/logo.png", firma: "/img/firma.png" });

  const numDoc = (id || "").substring(0, 8).toUpperCase() || "—";
  const fechaStr = fmtDate(fecha);
  const fechaAprobStr = fechaAprobacion ? fmtDate(fechaAprobacion) : null;

  const tipoTexto = { "mano-obra": "Mano de obra", "materiales": "Materiales", "ambos": "Mano de obra y materiales" }[tipo] || tipo;
  const formaPagoTexto = { "contado": "Contado", "60-40": "60% / 40%", "50-50": "50% / 50%", "tres-pagos": "3 cuotas", "personalizado": "Personalizado" }[formaPago] || formaPago;

  // ── 1. HEADER ─────────────────────────────────────────────
  // Tabla de 2 columnas: izq = nombre empresa, der = tipo doc + número
  // fillColor en cada celda garantiza que el fondo sea uniforme
  const bloqueHeader = {
    table: {
      widths: ["*", "*"],
      body: [[
        {
          stack: [
            { text: "DOMKA", fontSize: 22, bold: true, color: C.headerTxt, font: "Roboto" },
            { text: "CONSTRUCCIÓN & DISEÑO", fontSize: 7, color: C.headerSub, characterSpacing: 2.5, font: "Roboto", margin: [0, 4, 0, 0] }
          ],
          fillColor: C.headerBg,
          border: [false, false, false, false],
          margin: [18, 18, 10, 18]
        },
        {
          stack: [
            { text: "COTIZACIÓN",        fontSize: 24, bold: true, color: C.headerTxt, alignment: "right", font: "Roboto" },
            { text: `N° ${numDoc}`,       fontSize: 9,             color: C.headerSub, alignment: "right", font: "Roboto", margin: [0, 4, 0, 0] }
          ],
          fillColor: C.headerBg,
          border: [false, false, false, false],
          margin: [10, 18, 18, 18]
        }
      ]]
    },
    layout: "noBorders"
  };

  // Franja verde bajo el header
  const franjaVerde = { canvas: [{ type: "rect", x: 0, y: 0, w: 515, h: 3, color: C.green }], margin: [0, 0, 0, 0] };

  // ── 2. INFO CLIENTE + DETALLES ────────────────────────────
  // Tabla 2 columnas sobre fondo beige
  const bloqueInfo = {
    table: {
      widths: ["55%", "45%"],
      body: [[
        {
          stack: [
            sLabel("CLIENTE", C.green),
            { text: nombreCliente, fontSize: 14, bold: true, color: C.black, font: "Roboto", margin: [0, 0, 0, 3] },
            ...(ubicacion ? [{ text: ubicacion, fontSize: 9, color: C.gray, font: "Roboto" }] : []),
            ...(mostrarDocumento && clienteNit ? [{ text: `NIT: ${clienteNit}`, fontSize: 9, color: C.gray, font: "Roboto" }] : []),
            ...(mostrarDocumento && clienteNumeroDocumento ? [{ text: `Doc: ${clienteNumeroDocumento}`, fontSize: 9, color: C.gray, font: "Roboto" }] : [])
          ],
          fillColor: C.pageBg,
          border: [false, false, false, false],
          margin: [0, 16, 10, 16]
        },
        {
          // Cuadro oscuro "COTIZACIÓN N°" al estilo de la referencia
          stack: [
            sLabel("DETALLES", C.green),
            { text: fechaStr,         fontSize: 9,  color: C.gray, font: "Roboto", margin: [0, 0, 0, 2] },
            { text: tipoTexto,        fontSize: 9,  color: C.gray, font: "Roboto", margin: [0, 0, 0, 2] },
            { text: formaPagoTexto,   fontSize: 9,  color: C.gray, font: "Roboto", margin: [0, 0, 0, 2] },
            { text: "Validez: 30 días", fontSize: 9, color: C.gray, font: "Roboto" }
          ],
          fillColor: C.pageBg,
          border: [false, false, false, false],
          margin: [10, 16, 0, 16]
        }
      ]]
    },
    layout: "noBorders"
  };

  // ── 3. TABLA DE ÍTEMS ─────────────────────────────────────
  // Toda construida con tabla — sin posición absoluta, escala sola
  const thStyle = {
    bold: true, fontSize: 8, color: C.white, fillColor: C.tableHdr,
    font: "Roboto", border: [false, false, false, false],
    characterSpacing: 0.5
  };

  let tablaItems;

  if (tipoCalculo === "valor-total") {
    tablaItems = {
      table: {
        widths: [28, "*"],
        body: [
          [
            { ...thStyle, text: "N°", alignment: "center", margin: [8, 9, 8, 9] },
            { ...thStyle, text: "DESCRIPCIÓN DEL SERVICIO", margin: [12, 9, 12, 9] }
          ],
          ...items.map((it, i) => [
            tc(String(i + 1).padStart(2, "0"), { align: "center", color: C.grayMid, fill: i % 2 === 0 ? C.pageBg : C.rowAlt, margin: [8, 9, 8, 9] }),
            tc(it.descripcion || "—",          { fill: i % 2 === 0 ? C.pageBg : C.rowAlt, margin: [12, 9, 12, 9] })
          ])
        ]
      },
      layout: {
        hLineWidth: (i, n) => i === 0 || i === n.table.body.length ? 0 : 0.4,
        vLineWidth: () => 0,
        hLineColor: () => C.line
      }
    };
  } else {
    tablaItems = {
      table: {
        widths: [28, "*", 72, 34, 80],
        body: [
          [
            { ...thStyle, text: "N°",          alignment: "center", margin: [8,  9, 8,  9] },
            { ...thStyle, text: "DESCRIPCIÓN",                      margin: [12, 9, 8,  9] },
            { ...thStyle, text: "PRECIO",      alignment: "right",  margin: [8,  9, 8,  9] },
            { ...thStyle, text: "CANT.",       alignment: "center", margin: [4,  9, 4,  9] },
            { ...thStyle, text: "TOTAL",       alignment: "right",  margin: [8,  9, 12, 9], fillColor: C.green }
          ],
          ...items.map((it, i) => {
            const bg = i % 2 === 0 ? C.pageBg : C.rowAlt;
            const bgTotal = i % 2 === 0 ? C.rowAlt : C.pageBg;
            return [
              tc(String(i + 1).padStart(2, "0"), { align: "center", color: C.grayMid, fill: bg, margin: [8, 9, 8, 9] }),
              tc(it.descripcion || "—",          { fill: bg, margin: [12, 9, 8, 9] }),
              tc(fmtM(it.precio),               { align: "right", color: C.gray, fill: bg, margin: [8, 9, 8, 9] }),
              tc(String(it.cantidad || 1),       { align: "center", color: C.gray, fill: bg, margin: [4, 9, 4, 9] }),
              tc(fmtM(it.subtotal),             { align: "right", bold: true, fill: bgTotal, margin: [8, 9, 12, 9] })
            ];
          })
        ]
      },
      layout: {
        hLineWidth: (i, n) => i === 0 || i === n.table.body.length ? 0 : 0.4,
        vLineWidth: () => 0,
        hLineColor: () => C.line
      }
    };
  }

  // ── 4. TOTALES ────────────────────────────────────────────
  // Todo en tabla fija — izquierda: valor en letras, derecha: cuadro oscuro
  const iva = total - subtotal;
  const tieneIva = iva > 1 && tipoCalculo !== "valor-total";

  // Filas del cuadro oscuro
  const filasTotal = [];
  if (tieneIva) {
    filasTotal.push([
      { text: "SUBTOTAL", fontSize: 8, color: C.headerSub, bold: true, border: [false,false,false,false], margin: [14, 7, 8, 5], fillColor: C.totalBg, font: "Roboto" },
      { text: fmtM(subtotal), fontSize: 9, color: C.white, alignment: "right", border: [false,false,false,false], margin: [8, 7, 14, 5], fillColor: C.totalBg, font: "Roboto" }
    ]);
    filasTotal.push([
      { text: "IVA", fontSize: 8, color: C.headerSub, bold: true, border: [false,false,false,false], margin: [14, 5, 8, 5], fillColor: C.totalBg, font: "Roboto" },
      { text: fmtM(iva), fontSize: 9, color: C.white, alignment: "right", border: [false,false,false,false], margin: [8, 5, 14, 5], fillColor: C.totalBg, font: "Roboto" }
    ]);
  }
  filasTotal.push([
    { text: "TOTAL", fontSize: 11, bold: true, color: C.white, border: [false,false,false,false], margin: [14, tieneIva ? 5 : 12, 8, 12], fillColor: C.totalBg, font: "Roboto" },
    { text: fmtM(total), fontSize: 13, bold: true, color: C.white, alignment: "right", border: [false,false,false,false], margin: [8, tieneIva ? 5 : 12, 14, 12], fillColor: C.totalBg, font: "Roboto" }
  ]);

  const bloqueTotales = {
    table: {
      widths: ["*", 180],
      body: [[
        {
          stack: [
            { text: "TOTAL A PAGAR", fontSize: 9, bold: true, color: C.black, font: "Roboto", margin: [0, 0, 0, 5] },
            { text: fmtM(total), fontSize: 24, bold: true, color: C.black, font: "Roboto", margin: [0, 0, 0, 4] },
            ...(mostrarValorLetras && typeof numeroAPalabras === "function" ? [
              { text: `Son: ${numeroAPalabras(total)}`, fontSize: 8, italic: true, color: C.grayMid, font: "Roboto" }
            ] : [])
          ],
          fillColor: C.pageBg,
          border: [false, false, false, false],
          margin: [0, 12, 20, 12]
        },
        {
          table: { widths: ["*", "auto"], body: filasTotal },
          layout: "noBorders",
          fillColor: C.totalBg,
          border: [false, false, false, false],
          margin: [0, 0, 0, 0]
        }
      ]]
    },
    layout: "noBorders",
    margin: [0, 0, 0, 0]
  };

  // ── 5. PLAN DE PAGOS ──────────────────────────────────────
  const bloquePagos = planPagos.length > 0 ? [
    hr(),
    sLabel("PLAN DE PAGOS"),
    {
      table: {
        widths: ["*", 55, 90],
        body: [
          [
            { text: "Descripción", ...thStyle, margin: [12, 8, 8, 8] },
            { text: "Porcentaje", ...thStyle, alignment: "center", margin: [6, 8, 6, 8] },
            { text: "Valor", ...thStyle, alignment: "right", margin: [6, 8, 12, 8] }
          ],
          ...planPagos.map((p, i) => {
            const bg = i % 2 === 0 ? C.pageBg : C.rowAlt;
            return [
              tc(p.descripcion || "—", { fill: bg, margin: [12, 8, 8, 8] }),
              tc(`${p.porcentaje}%`, { align: "center", color: C.gray, fill: bg, margin: [6, 8, 6, 8] }),
              tc(fmtM(p.monto), { align: "right", bold: true, fill: bg, margin: [6, 8, 12, 8] })
            ];
          })
        ]
      },
      layout: {
        hLineWidth: (i, n) => i === 0 || i === n.table.body.length ? 0 : 0.4,
        vLineWidth: () => 0,
        hLineColor: () => C.line
      }
    }
  ] : [];

  // ── 6. MÉTODOS DE PAGO ────────────────────────────────────
  // Tabla de 2 (o N) columnas — cada banco es una celda
  const bancosCeldas = BANCOS.map(b => ({
    stack: [
      { text: b.banco,            fontSize: 11, bold: true, color: C.black,   font: "Roboto", margin: [0, 0, 0, 2] },
      { text: b.tipo,             fontSize: 8,  color: C.grayMid, font: "Roboto", margin: [0, 0, 0, 8] },
      { text: b.numero,           fontSize: 12, bold: true, color: C.green,   font: "Roboto", margin: [0, 0, 0, 3] },
      { text: `Titular: ${b.titular}`, fontSize: 8, color: C.gray, font: "Roboto" }
    ],
    fillColor: C.rowAlt,
    border: [false, false, false, false],
    margin: [16, 14, 16, 14]
  }));

  // Si hay 2 bancos → 2 columnas; más bancos → filas
  const bancoWidths = BANCOS.map(() => "*");
  const bloquePago = [
    hr(),
    sLabel("MÉTODO DE PAGO"),
    {
      table: {
        widths: bancoWidths,
        body: [bancosCeldas]
      },
      layout: {
        hLineWidth: () => 0,
        vLineWidth: (i) => i > 0 && i < BANCOS.length ? 0.6 : 0,
        vLineColor: () => C.line
      }
    }
  ];

  // ── 7. NOTAS ──────────────────────────────────────────────
  const notasLineas = (() => {
    if (notasArray && notasArray.length > 0) return notasArray.map(n => n.trim()).filter(Boolean);
    if (notas) return notas.split("\n").map(l => l.trim()).filter(Boolean);
    return [];
  })();

  const bloqueNotas = notasLineas.length > 0 ? [
    hr(),
    sLabel("NOTAS"),
    {
      ul: notasLineas,
      fontSize: 9.5, color: C.gray, font: "Roboto", lineHeight: 1.5, markerColor: C.green
    }
  ] : [];

  // ── 8. TÉRMINOS ───────────────────────────────────────────
  const bloqueTerminos = [
    hr(),
    sLabel("TÉRMINOS Y CONDICIONES"),
    {
      table: {
        widths: ["*", "*"],
        body: [[
          {
            ul: [
              "Esta cotización tiene validez de 30 días a partir de la fecha de emisión.",
              "El tiempo de entrega se confirmará al momento de aprobación del proyecto."
            ],
            fontSize: 8.5, color: C.grayMid, font: "Roboto", lineHeight: 1.4, markerColor: C.green,
            border: [false,false,false,false], fillColor: C.pageBg, margin: [0, 0, 12, 0]
          },
          {
            ul: [
              formaPago !== "contado"
                ? "Se requiere anticipo para iniciar según el plan de pagos acordado."
                : "Pago al contado, cancelado en su totalidad al finalizar el servicio.",
              "Trabajos adicionales no contemplados generarán un cobro extra acordado."
            ],
            fontSize: 8.5, color: C.grayMid, font: "Roboto", lineHeight: 1.4, markerColor: C.green,
            border: [false,false,false,false], fillColor: C.pageBg, margin: [12, 0, 0, 0]
          }
        ]]
      },
      layout: "noBorders"
    }
  ];

  // ── 9. APROBACIÓN (firma cliente) ─────────────────────────
  const bloqueAprobacion = firmaAprobacion ? [
    hr(),
    {
      table: {
        widths: ["*", 200],
        body: [[
          { text: "", fillColor: C.pageBg, border: [false,false,false,false] },
          {
            stack: [
              { canvas: [{ type: "rect", x: 0, y: 0, w: 185, h: 3, color: C.green }], margin: [0, 0, 0, 8] },
              sLabel("APROBADO POR", C.green),
              ...(fechaAprobStr ? [{ text: `Fecha: ${fechaAprobStr}`, fontSize: 8.5, color: C.gray, font: "Roboto", margin: [0, 0, 0, 8] }] : []),
              { image: firmaAprobacion, width: 115, margin: [0, 0, 0, 5] },
              { text: nombreCliente,       fontSize: 9, bold: true, color: C.black,   font: "Roboto" },
              { text: "Firma del cliente", fontSize: 8,             color: C.grayMid, font: "Roboto" }
            ],
            fillColor: C.pageBg,
            border: [false,false,false,false],
            margin: [0, 0, 0, 0]
          }
        ]]
      },
      layout: "noBorders"
    }
  ] : [];

  // ── 10. FIRMA EMPRESA + CONTACTO ─────────────────────────
  const bloqueEmpresa = [
    hr([0, 24, 0, 20]),
    {
      table: {
        widths: ["45%", "*", "35%"],
        body: [[
          // Contacto
          {
            stack: [
              sLabel("CONTÁCTANOS"),
              { text: "piter030509@gmail.com",         fontSize: 9, color: C.gray, font: "Roboto", margin: [0,0,0,2] },
              { text: "+57 305 811 4595",               fontSize: 9, color: C.gray, font: "Roboto", margin: [0,0,0,2] },
              { text: "RUT: 79.597.683-1",              fontSize: 9, color: C.gray, font: "Roboto" }
            ],
            fillColor: C.pageBg, border: [false,false,false,false], margin: [0, 0, 0, 0]
          },
          { text: "", fillColor: C.pageBg, border: [false,false,false,false] },
          // Firma
          {
            stack: [
              sLabel("ELABORADO POR", C.green),
              images.firma
                ? { image: images.firma, width: 100, margin: [0, 4, 0, 6] }
                : { text: "— firma —", fontSize: 9, italic: true, color: C.grayMid, font: "Roboto", margin: [0, 14, 0, 6] },
              { text: "Alexander Otalora Camayo",   fontSize: 10, bold: true, color: C.black,   font: "Roboto" },
              { text: "@DOMKA",                     fontSize: 8.5,            color: C.grayMid, font: "Roboto" }
            ],
            fillColor: C.pageBg, border: [false,false,false,false], margin: [0, 0, 0, 0]
          }
        ]]
      },
      layout: "noBorders"
    }
  ];

  // ── 11. ADJUNTOS ──────────────────────────────────────────
  const paginasAdjuntos = [];
  for (const adj of (adjuntos || [])) {
    if (adj.tipo && adj.tipo.startsWith("image/") && adj.datos) {
      paginasAdjuntos.push({ text: "", pageBreak: "before" });
      paginasAdjuntos.push(sLabel(`ADJUNTO: ${(adj.nombre || "IMAGEN").toUpperCase()}`));
      paginasAdjuntos.push({ image: adj.datos, width: 490 });
    } else if (adj.tipo === "application/pdf") {
      paginasAdjuntos.push({ text: "", pageBreak: "before" });
      paginasAdjuntos.push({
        text: `Adjunto PDF: "${adj.nombre}" — disponible en el link público de la cotización.`,
        fontSize: 9, color: C.grayMid, font: "Roboto", italic: true, margin: [0, 20, 0, 0]
      });
    }
  }

  // ── FOOTER ────────────────────────────────────────────────
  const footerFn = (pg, total) => ({
    table: {
      widths: ["*", "auto"],
      body: [[
        { text: `DOMKA © ${new Date().getFullYear()}  ·  Construcción & Diseño  ·  +57 305 811 4595`, fontSize: 7, color: C.grayLight, font: "Roboto", border: [false,false,false,false], margin: [45, 0, 0, 0] },
        { text: `Página ${pg} de ${total}`, fontSize: 7, color: C.grayLight, font: "Roboto", alignment: "right", border: [false,false,false,false], margin: [0, 0, 45, 0] }
      ]]
    },
    layout: "noBorders",
    margin: [0, 6, 0, 0]
  });

  // ── BACKGROUND: fondo beige + logo marca de agua ──────────
  const bgFn = (currentPage, pageSize) => {
    const elems = [
      // Fondo beige completo
      { canvas: [{ type: "rect", x: 0, y: 0, w: pageSize.width, h: pageSize.height, color: C.pageBg }] }
    ];
    // Logo muy sutil centrado
    if (images.logo) {
      elems.push({
        image: images.logo, width: 240, opacity: 0.04,
        absolutePosition: { x: (pageSize.width - 240) / 2, y: (pageSize.height - 240) / 2 }
      });
    }
    return elems;
  };

  // ── DOCUMENTO ─────────────────────────────────────────────
  const docDefinition = {
    pageSize:    "A4",
    pageMargins: [45, 42, 42, 50],
    footer:      footerFn,
    background:  bgFn,

    content: [
      // Header
      bloqueHeader,
      franjaVerde,

      // Info cliente
      { text: "", margin: [0, 14, 0, 0] },
      bloqueInfo,

      // Tabla ítems
      hr(),
      sLabel("DETALLE DE LA COTIZACIÓN"),
      tablaItems,

      // Totales
      { text: "", margin: [0, 6, 0, 0] },
      hr(),
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
    alert("Error: recarga la página e intenta de nuevo.");
  }
}

if (typeof window !== "undefined") window.generarPDFCotizacion = generarPDFCotizacion;
