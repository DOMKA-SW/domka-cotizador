// js/pdf-cotizacion.js — DOMKA 2025 · Diseño fiel a referencia visual
// Paleta: Beige oscuro #3D3B35 (header) · Beige claro #F5F0E8 · Negro #1A1A1A · Verde #1a7a4a · Blanco

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

// ── PALETA · igual a la imagen de referencia ─────────────────
const C = {
  headerBg:   "#3D3B35",   // beige muy oscuro/gris cálido — banda superior
  headerText: "#FFFFFF",   // blanco sobre header
  headerSub:  "#B8B5AE",   // gris claro para subtítulos del header
  beige:      "#F5F0E8",   // fondo general beige claro
  beigeMid:   "#EDE8DF",   // beige un poco más oscuro (filas alternas, secciones)
  black:      "#1A1A1A",   // negro casi puro para texto principal
  gray:       "#4B5563",   // gris medio
  grayMid:    "#6B7280",   // gris más claro
  grayLight:  "#9CA3AF",   // etiquetas y subtextos
  white:      "#FFFFFF",
  green:      "#1a7a4a",   // verde DOMKA — acentos y líneas
  greenText:  "#155C38",   // verde más oscuro para texto
  tableDark:  "#2D2B27",   // fondo oscuro tabla de totales (como en ref)
  line:       "#D6D0C8"    // línea divisora tono beige
};

// ── CUENTAS BANCARIAS ─────────────────────────────────────────
// ⚠️ Edita aquí tus cuentas reales
const CUENTAS_PAGO = [
  {
    banco:   "Bancolombia",
    tipo:    "Cuenta de Ahorros",
    numero:  "123-456789-00",
    titular: "Alexander Otalora Camayo"
  },
  {
    banco:   "Nequi / Daviplata",
    tipo:    "Billetera Digital",
    numero:  "+57 305 811 4595",
    titular: "Alexander Otalora Camayo"
  }
];

// ── HELPERS LAYOUT ────────────────────────────────────────────
function hr(color = C.line, margin = [0, 14, 0, 12]) {
  return {
    canvas: [{ type: "line", x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.75, lineColor: color }],
    margin
  };
}

function sLabel(text, color = C.grayLight) {
  return { text, fontSize: 6.5, bold: true, color, characterSpacing: 2.5, font: "Roboto", margin: [0, 0, 0, 7] };
}

function fmtDate(f) {
  if (!f) return "—";
  const d = new Date(f && f.seconds ? f.seconds * 1000 : f);
  return d.toLocaleDateString("es-CO", { day: "2-digit", month: "2-digit", year: "numeric" });
}
function fmtDateLong(f) {
  if (!f) return "—";
  const d = new Date(f && f.seconds ? f.seconds * 1000 : f);
  return d.toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" });
}

function fmtM(n) { return `$${Number(n || 0).toLocaleString("es-CO")}`; }

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

  const numDoc       = (id || "").substring(0, 8).toUpperCase() || "—";
  const fechaStr     = fmtDateLong(fecha);
  const fechaAprobStr = fechaAprobacion ? fmtDateLong(fechaAprobacion) : null;

  const tipoTexto = {
    "mano-obra": "Mano de obra", "materiales": "Materiales", "ambos": "Mano de obra y materiales"
  }[tipo] || tipo;

  const formaPagoTexto = {
    "contado": "Contado", "60-40": "60% / 40%", "50-50": "50% / 50%",
    "tres-pagos": "3 cuotas", "personalizado": "Personalizado"
  }[formaPago] || formaPago;

  // ══════════════════════════════════════════════════════════
  // 1. ENCABEZADO — banda beige oscuro (igual a la referencia)
  //    Izq: nombre empresa + subtítulo   Der: "Cotización" grande + asterisco decorativo
  // ══════════════════════════════════════════════════════════
  const bloqueHeader = [
    // Banda de color
    {
      canvas: [{ type: "rect", x: 0, y: 0, w: 515, h: 80, color: C.headerBg }],
      margin: [0, 0, 0, 0]
    },
    // Contenido encima de la banda
    {
      columns: [
        // Izquierda: nombre empresa
        {
          stack: [
            { text: "DOMKA", fontSize: 26, bold: true, color: C.headerText, font: "Roboto" },
            { text: "CONSTRUCCIÓN & DISEÑO", fontSize: 7, color: C.headerSub, characterSpacing: 2, font: "Roboto", margin: [0, 3, 0, 0] }
          ],
          width: "auto"
        },
        { text: "", width: "*" },
        // Derecha: tipo documento + símbolo decorativo
        {
          stack: [
            // Símbolo decorativo (asterisco / estrella como en la ref)
            { text: "✳", fontSize: 22, color: C.headerText, alignment: "right", font: "Roboto", margin: [0, 0, 0, 4] },
          ],
          width: "auto"
        }
      ],
      margin: [0, -78, 0, 0]
    }
  ];

  // ══════════════════════════════════════════════════════════
  // 2. ZONA BLANCA/BEIGE — "Cotización" + descripción intro
  //    (como en la referencia: título grande a la derecha, fecha a la izq)
  // ══════════════════════════════════════════════════════════
  const bloqueSubHeader = {
    columns: [
      // Izquierda: fecha pequeña
      {
        stack: [
          { text: `Fecha: ${fechaStr}`, fontSize: 9, color: C.gray, font: "Roboto" },
          { text: `N° ${numDoc}`,       fontSize: 9, color: C.gray, font: "Roboto", margin: [0, 2, 0, 0] }
        ],
        width: "40%"
      },
      { text: "", width: "*" },
      // Derecha: "Cotización" grande
      {
        stack: [
          { text: "Cotización", fontSize: 30, bold: true, color: C.black, alignment: "right", font: "Roboto" }
        ],
        width: "auto"
      }
    ],
    margin: [0, 18, 0, 0]
  };

  // ══════════════════════════════════════════════════════════
  // 3. BLOQUES CLIENTE / PROYECTO / FACTURA N°
  //    Fiel a la referencia: 3 columnas horizontales
  // ══════════════════════════════════════════════════════════
  const bloqueInfoPrincipal = {
    columns: [
      // Col 1: Cliente
      {
        stack: [
          sLabel("CLIENTE", C.green),
          { text: nombreCliente, fontSize: 11, bold: true, color: C.black, font: "Roboto", margin: [0, 0, 0, 3] },
          ...(ubicacion ? [{ text: ubicacion, fontSize: 8.5, color: C.gray, font: "Roboto" }] : []),
          ...(mostrarDocumento && clienteNit ? [{ text: `NIT: ${clienteNit}`, fontSize: 8.5, color: C.gray, font: "Roboto", margin: [0, 2, 0, 0] }] : []),
          ...(mostrarDocumento && clienteNumeroDocumento ? [{ text: `Doc: ${clienteNumeroDocumento}`, fontSize: 8.5, color: C.gray, font: "Roboto" }] : [])
        ],
        width: "28%"
      },
      // Col 2: Proyecto / detalles
      {
        stack: [
          sLabel("PROYECTO", C.green),
          { text: tipoTexto, fontSize: 10, bold: true, color: C.black, font: "Roboto", margin: [0, 0, 0, 4] },
          { text: `Forma de pago: ${formaPagoTexto}`, fontSize: 8.5, color: C.gray, font: "Roboto" },
          { text: `Validez: 30 días`,                 fontSize: 8.5, color: C.gray, font: "Roboto", margin: [0, 2, 0, 0] }
        ],
        width: "*"
      },
      // Col 3: Número de cotización (cuadro oscuro como "FACTURA NO." en la ref)
      {
        stack: [
          {
            canvas: [{ type: "rect", x: 0, y: 0, w: 130, h: 50, r: 3, color: C.headerBg }]
          },
          {
            stack: [
              { text: "COTIZACIÓN N°",  fontSize: 7, bold: true, color: C.headerSub, characterSpacing: 1.5, font: "Roboto", margin: [0, 0, 0, 4] },
              { text: numDoc,            fontSize: 14, bold: true, color: C.headerText, font: "Roboto" }
            ],
            relativePosition: { x: 0, y: -50 },
            margin: [10, 10, 10, 0]
          }
        ],
        width: "auto"
      }
    ],
    margin: [0, 0, 0, 0]
  };

  // ══════════════════════════════════════════════════════════
  // 4. TABLA DE ÍTEMS
  //    Header fondo oscuro (#2D2B27) · filas alternadas beige/blanco
  //    columna TOTAL con fondo oscuro (como en la ref)
  // ══════════════════════════════════════════════════════════
  const thStyle = {
    bold: true, fontSize: 8, color: C.white, fillColor: C.tableDark,
    font: "Roboto", border: [false, false, false, false], characterSpacing: 0.5
  };

  const cellPad = (col, last = false) => [col === 0 ? 8 : 6, 9, last ? 10 : 6, 9];

  let tablaItems;

  if (tipoCalculo === "valor-total") {
    // Sin precios unitarios
    tablaItems = {
      table: {
        widths: [24, "*", 80],
        body: [
          [
            { ...thStyle, text: "N°",      alignment: "center", margin: cellPad(0) },
            { ...thStyle, text: "DESCRIPCIÓN",                  margin: cellPad(1) },
            { ...thStyle, text: "TOTAL",   alignment: "right",  margin: cellPad(2, true), fillColor: C.green }
          ],
          ...items.map((it, i) => [
            { text: String(i + 1).padStart(2, "0"), fontSize: 9, color: C.grayMid, alignment: "center", font: "Roboto",
              fillColor: i % 2 === 0 ? C.white : C.beige, border: [false,false,false,false], margin: cellPad(0) },
            { text: it.descripcion || "—", fontSize: 9.5, color: C.black, font: "Roboto",
              fillColor: i % 2 === 0 ? C.white : C.beige, border: [false,false,false,false], margin: cellPad(1) },
            { text: "—", fontSize: 9, color: C.grayMid, alignment: "right", font: "Roboto",
              fillColor: i % 2 === 0 ? C.beigeMid : C.beige, border: [false,false,false,false], margin: cellPad(2, true) }
          ])
        ]
      },
      layout: {
        hLineWidth: (i, n) => (i === 0 || i === n.table.body.length) ? 0 : 0.4,
        vLineWidth: () => 0,
        hLineColor: () => C.line
      }
    };
  } else {
    // Con precios unitarios — columna TOTAL en verde oscuro
    tablaItems = {
      table: {
        widths: [24, "*", 70, 34, 80],
        body: [
          [
            { ...thStyle, text: "N°",        alignment: "center", margin: cellPad(0) },
            { ...thStyle, text: "DESCRIPCIÓN",                    margin: cellPad(1) },
            { ...thStyle, text: "PRECIO",    alignment: "right",  margin: cellPad(2) },
            { ...thStyle, text: "CANT.",     alignment: "center", margin: cellPad(3) },
            { ...thStyle, text: "TOTAL",     alignment: "right",  margin: cellPad(4, true), fillColor: C.green }
          ],
          ...items.map((it, i) => [
            { text: String(i + 1).padStart(2, "0"), fontSize: 9, color: C.grayMid, alignment: "center", font: "Roboto",
              fillColor: i % 2 === 0 ? C.white : C.beige, border: [false,false,false,false], margin: cellPad(0) },
            { text: it.descripcion || "—", fontSize: 9.5, color: C.black, font: "Roboto",
              fillColor: i % 2 === 0 ? C.white : C.beige, border: [false,false,false,false], margin: cellPad(1) },
            { text: fmtM(it.precio), fontSize: 9, color: C.gray, alignment: "right", font: "Roboto",
              fillColor: i % 2 === 0 ? C.white : C.beige, border: [false,false,false,false], margin: cellPad(2) },
            { text: String(it.cantidad || 1), fontSize: 9, color: C.gray, alignment: "center", font: "Roboto",
              fillColor: i % 2 === 0 ? C.white : C.beige, border: [false,false,false,false], margin: cellPad(3) },
            { text: fmtM(it.subtotal), fontSize: 9.5, bold: true, color: C.black, alignment: "right", font: "Roboto",
              fillColor: i % 2 === 0 ? C.beigeMid : C.beige, border: [false,false,false,false], margin: cellPad(4, true) }
          ])
        ]
      },
      layout: {
        hLineWidth: (i, n) => (i === 0 || i === n.table.body.length) ? 0 : 0.4,
        vLineWidth: () => 0,
        hLineColor: () => C.line
      }
    };
  }

  // ══════════════════════════════════════════════════════════
  // 5. TOTALES — igual a la referencia:
  //    "TOTAL A PAGAR" grande izq · subtotal/imp/total columna der oscura
  // ══════════════════════════════════════════════════════════
  const iva = total - subtotal;
  const tieneIva = iva > 1 && tipoCalculo !== "valor-total";

  const filasTotales = [];
  if (tieneIva) {
    filasTotales.push([
      { text: "SUBTOTAL", fontSize: 8, color: C.headerSub, font: "Roboto", border: [false,false,false,false], margin: [10,7,8,5] },
      { text: fmtM(subtotal), fontSize: 9, bold: true, color: C.headerText, alignment: "right", font: "Roboto", border: [false,false,false,false], margin: [8,7,12,5] }
    ]);
    filasTotales.push([
      { text: "% IMP", fontSize: 8, color: C.headerSub, font: "Roboto", border: [false,false,false,false], margin: [10,5,8,5] },
      { text: fmtM(iva), fontSize: 9, bold: true, color: C.headerText, alignment: "right", font: "Roboto", border: [false,false,false,false], margin: [8,5,12,5] }
    ]);
  }
  filasTotales.push([
    { text: "TOTAL", fontSize: 10, bold: true, color: C.white, font: "Roboto", border: [false,false,false,false], margin: [10, tieneIva ? 5 : 10, 8, 10] },
    { text: fmtM(total), fontSize: 11, bold: true, color: C.white, alignment: "right", font: "Roboto", border: [false,false,false,false], margin: [8, tieneIva ? 5 : 10, 12, 10] }
  ]);

  const bloqueTotales = {
    columns: [
      // Izquierda: "TOTAL A PAGAR" grande (como en la referencia)
      {
        stack: [
          { text: "TOTAL A PAGAR:", fontSize: 10, bold: true, color: C.black, font: "Roboto", margin: [0, 0, 0, 6] },
          { text: fmtM(total), fontSize: 22, bold: true, color: C.black, font: "Roboto" },
          ...(mostrarValorLetras && typeof numeroAPalabras === "function" ? [
            { text: `Son: ${numeroAPalabras(total)}`, fontSize: 8, italic: true, color: C.grayMid, font: "Roboto", margin: [0, 6, 0, 0] }
          ] : [])
        ],
        width: "*",
        margin: [0, 8, 0, 0]
      },
      // Derecha: tabla oscura con subtotal/iva/total
      {
        width: 160,
        stack: [
          {
            canvas: [{ type: "rect", x: 0, y: 0, w: 160, h: tieneIva ? 88 : 42, r: 3, color: C.tableDark }]
          },
          {
            table: {
              widths: ["*", "auto"],
              body: filasTotales
            },
            layout: "noBorders",
            relativePosition: { x: 0, y: -(tieneIva ? 88 : 42) }
          }
        ]
      }
    ],
    margin: [0, 0, 0, 0]
  };

  // ══════════════════════════════════════════════════════════
  // 6. PLAN DE PAGOS
  // ══════════════════════════════════════════════════════════
  const bloquePagos = planPagos.length > 0 ? [
    hr(),
    sLabel("PLAN DE PAGOS"),
    {
      table: {
        widths: ["*", 55, 90],
        body: [
          [
            { text: "Descripción", ...thStyle, margin: [10,7,8,7] },
            { text: "Porcentaje", ...thStyle, alignment: "center", margin: [6,7,6,7] },
            { text: "Valor", ...thStyle, alignment: "right", margin: [6,7,10,7] }
          ],
          ...planPagos.map((p, i) => [
            { text: p.descripcion || "—", fontSize: 9, color: C.black, font: "Roboto",
              fillColor: i % 2 === 0 ? C.white : C.beige, border: [false,false,false,false], margin: [10,7,8,7] },
            { text: `${p.porcentaje}%`, fontSize: 9, color: C.gray, alignment: "center", font: "Roboto",
              fillColor: i % 2 === 0 ? C.white : C.beige, border: [false,false,false,false], margin: [6,7,6,7] },
            { text: fmtM(p.monto), fontSize: 9, bold: true, color: C.black, alignment: "right", font: "Roboto",
              fillColor: i % 2 === 0 ? C.beigeMid : C.beige, border: [false,false,false,false], margin: [6,7,10,7] }
          ])
        ]
      },
      layout: {
        hLineWidth: (i, n) => (i === 0 || i === n.table.body.length) ? 0 : 0.4,
        vLineWidth: () => 0,
        hLineColor: () => C.line
      }
    }
  ] : [];

  // ══════════════════════════════════════════════════════════
  // 7. MÉTODOS DE PAGO — tarjetas beige con número en verde
  // ══════════════════════════════════════════════════════════
  const bloquePago = [
    hr(),
    sLabel("MÉTODO DE PAGO"),
    {
      columns: CUENTAS_PAGO.map((cp, i) => ({
        stack: [
          { canvas: [{ type: "rect", x: 0, y: 0, w: 240, h: 80, r: 4, color: C.beige }] },
          {
            stack: [
              { text: cp.banco,                       fontSize: 11, bold: true, color: C.black,   font: "Roboto", margin: [0,0,0,2] },
              { text: cp.tipo,                        fontSize: 8,  color: C.grayMid, font: "Roboto", margin: [0,0,0,8] },
              { text: cp.numero,                      fontSize: 12, bold: true, color: C.green,   font: "Roboto", margin: [0,0,0,3] },
              { text: `Titular: ${cp.titular}`,       fontSize: 8,  color: C.gray,   font: "Roboto" }
            ],
            relativePosition: { x: 0, y: -80 },
            margin: [14, 13, 14, 0]
          }
        ],
        width: "auto",
        margin: i < CUENTAS_PAGO.length - 1 ? [0,0,16,0] : [0,0,0,0]
      })),
      columnGap: 0
    }
  ];

  // ══════════════════════════════════════════════════════════
  // 8. NOTAS
  // ══════════════════════════════════════════════════════════
  const notasLineas = (() => {
    if (notasArray && notasArray.length > 0) return notasArray.map(n => n.trim()).filter(Boolean);
    if (notas) return notas.split("\n").map(l => l.trim()).filter(Boolean);
    return [];
  })();

  const bloqueNotas = notasLineas.length > 0 ? [
    hr(),
    sLabel("NOTAS"),
    { ul: notasLineas, fontSize: 9.5, color: C.gray, font: "Roboto", lineHeight: 1.5, markerColor: C.green }
  ] : [];

  // ══════════════════════════════════════════════════════════
  // 9. TÉRMINOS Y CONDICIONES — 2 columnas como en la ref
  // ══════════════════════════════════════════════════════════
  const bloqueTerminos = [
    hr(),
    sLabel("TÉRMINOS Y CONDICIONES"),
    {
      columns: [
        {
          ul: [
            "Esta cotización tiene validez de 30 días a partir de la fecha de emisión.",
            "El tiempo de entrega se confirmará al momento de aprobación del proyecto."
          ],
          fontSize: 8.5, color: C.grayMid, font: "Roboto", lineHeight: 1.4, markerColor: C.green
        },
        {
          ul: [
            formaPago !== "contado"
              ? "Se requiere anticipo para iniciar el trabajo según el plan de pagos."
              : "Pago al contado, cancelado en su totalidad al finalizar el servicio.",
            "Trabajos adicionales no contemplados en esta cotización tendrán un cobro extra."
          ],
          fontSize: 8.5, color: C.grayMid, font: "Roboto", lineHeight: 1.4, markerColor: C.green
        }
      ],
      columnGap: 24
    }
  ];

  // ══════════════════════════════════════════════════════════
  // 10. FIRMA CLIENTE (si existe aprobación)
  // ══════════════════════════════════════════════════════════
  const bloqueAprobacion = firmaAprobacion ? [
    hr(),
    {
      columns: [
        { text: "", width: "*" },
        {
          stack: [
            { canvas: [{ type: "rect", x: 0, y: 0, w: 185, h: 3, color: C.green }], margin: [0,0,0,8] },
            sLabel("APROBADO POR", C.green),
            ...(fechaAprobStr ? [{ text: `Fecha: ${fechaAprobStr}`, fontSize: 8.5, color: C.gray, font: "Roboto", margin: [0,0,0,8] }] : []),
            { image: firmaAprobacion, width: 115, margin: [0,0,0,5] },
            { text: nombreCliente,       fontSize: 9, bold: true, color: C.black,   font: "Roboto" },
            { text: "Firma del cliente", fontSize: 8,             color: C.grayMid, font: "Roboto" }
          ],
          width: 190
        }
      ]
    }
  ] : [];

  // ══════════════════════════════════════════════════════════
  // 11. FIRMA EMPRESA + bloque verde cierre
  //     Fiel a la referencia: datos a la izq, "Aprobado por" a la der
  // ══════════════════════════════════════════════════════════
  const bloqueEmpresa = [
    hr(C.line, [0, 24, 0, 20]),
    {
      columns: [
        // Contacto
        {
          stack: [
            sLabel("CONTÁCTANOS"),
            { text: "piter030509@gmail.com",      fontSize: 9, color: C.gray, font: "Roboto", margin: [0,0,0,2] },
            { text: "o llámanos al +57 305 811 4595", fontSize: 9, color: C.gray, font: "Roboto", margin: [0,0,0,2] },
            { text: "RUT: 79.597.683-1",           fontSize: 9, color: C.gray, font: "Roboto" }
          ],
          width: "40%"
        },
        { text: "", width: "*" },
        // Firma empresa (como "APROBADO POR" en la referencia)
        {
          stack: [
            sLabel("ELABORADO POR", C.green),
            images.firma
              ? { image: images.firma, width: 100, margin: [0, 4, 0, 6] }
              : { text: "— firma —", fontSize: 9, italic: true, color: C.grayMid, font: "Roboto", margin: [0,14,0,6] },
            { text: "Alexander Otalora Camayo",       fontSize: 10, bold: true, color: C.black, font: "Roboto" },
            { text: "@DOMKA",                         fontSize: 8.5, color: C.grayMid, font: "Roboto" }
          ],
          width: 200,
          alignment: "right"
        }
      ]
    }
  ];

  // ══════════════════════════════════════════════════════════
  // 12. ADJUNTOS (páginas extra)
  // ══════════════════════════════════════════════════════════
  const paginasAdjuntos = [];
  for (const adj of (adjuntos || [])) {
    if (adj.tipo && adj.tipo.startsWith("image/") && adj.datos) {
      paginasAdjuntos.push({ text: "", pageBreak: "before" });
      paginasAdjuntos.push(sLabel(`ADJUNTO: ${(adj.nombre || "IMAGEN").toUpperCase()}`));
      paginasAdjuntos.push({ image: adj.datos, width: 490 });
    } else if (adj.tipo === "application/pdf") {
      paginasAdjuntos.push({ text: "", pageBreak: "before" });
      paginasAdjuntos.push({
        text: `Adjunto PDF: "${adj.nombre || "documento"}" — disponible en el link público de la cotización.`,
        fontSize: 9, color: C.grayMid, font: "Roboto", italic: true, margin: [0, 20, 0, 0]
      });
    }
  }

  // ══════════════════════════════════════════════════════════
  // FOOTER + BACKGROUND
  // ══════════════════════════════════════════════════════════
  const footerFn = (currentPage, pageCount) => ({
    columns: [
      { text: `DOMKA © ${new Date().getFullYear()}  ·  Construcción & Diseño`, fontSize: 7, color: C.grayLight, font: "Roboto", margin: [45,0,0,0] },
      { text: `Página ${currentPage} de ${pageCount}`, fontSize: 7, color: C.grayLight, font: "Roboto", alignment: "right", margin: [0,0,45,0] }
    ],
    margin: [0, 6, 0, 0]
  });

  // Logo como marca de agua muy sutil en el centro
  const bgFn = (currentPage, pageSize) => {
    const elems = [];
    if (images.logo) {
      elems.push({
        image: images.logo,
        width: 220,
        opacity: 0.04,
        absolutePosition: {
          x: (pageSize.width - 220) / 2,
          y: (pageSize.height - 220) / 2
        }
      });
    }
    return elems;
  };

  // ══════════════════════════════════════════════════════════
  // DOCUMENTO FINAL
  // ══════════════════════════════════════════════════════════
  const docDefinition = {
    pageSize:    "A4",
    pageMargins: [45, 42, 42, 50],
    footer:      footerFn,
    background:  bgFn,

    content: [
      // Header beige oscuro
      ...bloqueHeader,

      // Franja verde separadora
      { canvas: [{ type: "rect", x: 0, y: 0, w: 515, h: 3, color: C.green }], margin: [0, 5, 0, 0] },

      // Zona "Cotización" + fecha
      bloqueSubHeader,

      // Info cliente/proyecto
      hr(C.line, [0, 18, 0, 16]),
      bloqueInfoPrincipal,

      // Tabla ítems
      hr(C.line, [0, 18, 0, 12]),
      sLabel("DETALLE DE LA COTIZACIÓN"),
      tablaItems,

      // Totales
      { text: "", margin: [0, 16, 0, 0] },
      bloqueTotales,

      // Plan de pagos
      ...bloquePagos,

      // Métodos de pago
      ...bloquePago,

      // Notas
      ...bloqueNotas,

      // Términos
      ...bloqueTerminos,

      // Aprobación cliente
      ...bloqueAprobacion,

      // Firma empresa + contacto
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
