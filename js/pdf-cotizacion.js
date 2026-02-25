// js/pdf-cotizacion.js — DOMKA 2025 (Refinado editorial)
// Paleta: Negro #111827 · Gris #4B5563 · Beige #F5F0E8 · Verde #1a7a4a · Blanco
// Tipografía: DM Sans (Roboto en pdfMake)

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
  } catch {
    return null;
  }
}

async function preloadImages(paths) {
  const imgs = {};
  for (const [k, p] of Object.entries(paths)) imgs[k] = await imageToDataURL(p);
  return imgs;
}

const C = {
  black: "#111827",
  gray: "#4B5563",
  grayMid: "#6B7280",
  grayLight: "#9CA3AF",
  beige: "#F5F0E8",
  beigeDeep: "#EDE8DF",
  white: "#FFFFFF",
  green: "#1a7a4a",
  line: "#E5E7EB"
};

function hrLine(color = C.line, margin = [0, 16, 0, 16]) {
  return { canvas: [{ type: "line", x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.75, lineColor: color }], margin };
}

function sectionLabel(text) {
  return {
    text,
    fontSize: 7,
    bold: true,
    color: C.grayLight,
    characterSpacing: 2,
    margin: [0, 0, 0, 8]
  };
}

function fmtFecha(f) {
  const d = new Date(f?.seconds ? f.seconds * 1000 : f);
  return d.toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" });
}

function fmtMoney(n) {
  return `$${Number(n || 0).toLocaleString("es-CO")}`;
}

async function generarPDFCotizacion(cotizacion, nombreCliente = "Cliente") {
  const {
    items = [],
    subtotal = 0,
    total = 0,
    fecha = new Date(),
    planPagos = [],
    notas = "",
    adjuntos = [],
    id = ""
  } = cotizacion;

  const images = await preloadImages({
    logo: "/img/logo.png",
    firma: "/img/firma.png"
  });

  const numDoc = id.substring(0, 8).toUpperCase() || "—";

  /* ───────── HEADER ───────── */
  const bloqueHeader = [
    {
      columns: [
        {
          stack: [
            { text: "DOMKA", fontSize: 18, bold: true, color: C.black },
            { text: "Construcción & Diseño", fontSize: 8, color: C.grayLight, characterSpacing: 2 }
          ]
        },
        {
          stack: [
            { text: "COTIZACIÓN", fontSize: 26, bold: true, alignment: "right" },
            { text: `N° ${numDoc}`, fontSize: 9, color: C.grayMid, alignment: "right" }
          ]
        }
      ],
      margin: [0, 0, 0, 10]
    },
    hrLine(C.green)
  ];

  /* ───────── INFO CLIENTE ───────── */
  const bloqueInfo = {
    columns: [
      {
        stack: [
          sectionLabel("CLIENTE"),
          { text: nombreCliente, fontSize: 14, bold: true }
        ]
      },
      {
        stack: [
          sectionLabel("DETALLES"),
          { text: fmtFecha(fecha), fontSize: 9 }
        ],
        alignment: "right"
      }
    ],
    margin: [0, 20, 0, 0]
  };

  /* ───────── TABLA ITEMS ───────── */
  const headerCell = {
    bold: true,
    fontSize: 8,
    fillColor: C.beigeDeep,
    margin: [8, 8, 8, 8]
  };

  const tablaItems = {
    table: {
      widths: [28, "*", 72],
      body: [
        [
          { ...headerCell, text: "N°", alignment: "center" },
          { ...headerCell, text: "DESCRIPCIÓN" },
          { ...headerCell, text: "TOTAL", alignment: "right" }
        ],
        ...items.map((it, i) => [
          { text: i + 1, alignment: "center", margin: [8, 6, 8, 6] },
          { text: it.descripcion || "—", margin: [8, 6, 8, 6] },
          { text: fmtMoney(it.subtotal), alignment: "right", margin: [8, 6, 8, 6] }
        ])
      ]
    },
    layout: "noBorders",
    margin: [0, 12, 0, 0]
  };

  /* ───────── TOTALES ───────── */
  const bloqueTotales = {
    columns: [
      { width: "*", text: "" },
      {
        width: 220,
        table: {
          widths: ["*", "auto"],
          body: [[
            {
              text: "TOTAL A PAGAR",
              fillColor: C.beige,
              bold: true,
              margin: [12, 10, 6, 10]
            },
            {
              text: fmtMoney(total),
              fillColor: C.beige,
              bold: true,
              color: C.green,
              fontSize: 14,
              alignment: "right",
              margin: [6, 10, 12, 10]
            }
          ]]
        },
        layout: "noBorders"
      }
    ],
    margin: [0, 20, 0, 0]
  };

  /* ───────── MÉTODOS DE PAGO ───────── */
  const bloquePago = [
    hrLine(),
    sectionLabel("MÉTODOS DE PAGO"),
    {
      canvas: [{ type: "rect", x: 0, y: 0, w: 515, h: 70, r: 6, color: C.beige }],
      margin: [0, 6, 0, 0]
    },
    {
      text: "Cuenta Bancolombia · 123456789 · DOMKA",
      relativePosition: { x: 16, y: -55 },
      color: C.green,
      bold: true
    }
  ];

  /* ───────── NOTAS ───────── */
  const bloqueNotas = notas ? [
    hrLine(),
    sectionLabel("NOTAS"),
    { text: notas, fontSize: 9, color: C.gray }
  ] : [];

  /* ───────── FIRMA ───────── */
  const bloqueFirma = [
    hrLine(),
    sectionLabel("ELABORADO POR"),
    images.firma
      ? { image: images.firma, width: 110 }
      : { text: "— firma —", italic: true },
    { text: "Alexander Otalora Camayo", bold: true },
    { text: "DOMKA Construcción & Diseño", fontSize: 9, color: C.grayMid }
  ];

  const docDefinition = {
    pageSize: "A4",
    pageMargins: [45, 42, 42, 48],
    background: () => [
      { canvas: [{ type: "rect", x: 0, y: 0, w: 5, h: 842, color: C.green }] },
      images.logo ? {
        image: images.logo,
        width: 300,
        opacity: 0.04,
        absolutePosition: { x: 150, y: 250 }
      } : {}
    ],
    content: [
      ...bloqueHeader,
      bloqueInfo,
      hrLine(),
      sectionLabel("DETALLE DE LA COTIZACIÓN"),
      tablaItems,
      bloqueTotales,
      ...bloquePago,
      ...bloqueNotas,
      ...bloqueFirma
    ],
    defaultStyle: { font: "Roboto", fontSize: 10, color: C.black }
  };

  pdfMake.createPdf(docDefinition).download(`Cotizacion_DOMKA_${numDoc}.pdf`);
}

window.generarPDFCotizacion = generarPDFCotizacion;
