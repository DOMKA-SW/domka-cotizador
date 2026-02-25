// js/pdf-cotizacion.js — DOMKA 2025 (Beige editorial)
// Paleta: Negro #111827 · Gris #4B5563 · Beige #F5F0E8 · Verde #1a7a4a
// Tipografía: DM Sans (Roboto en pdfMake)

async function imageToDataURL(path) {
  try {
    if (path && path.startsWith("data:")) return path;
    let url = path;
    if (!path.startsWith("http")) {
      url = `https://domka-sw.github.io/domka-cotizador${path.startsWith("/") ? path : "/" + path}`;
    }
    const res = await fetch(url);
    const blob = await res.blob();
    return await new Promise(r => {
      const fr = new FileReader();
      fr.onload = () => r(fr.result);
      fr.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

async function preloadImages(paths) {
  const out = {};
  for (const k in paths) out[k] = await imageToDataURL(paths[k]);
  return out;
}

/* ───── PALETA ───── */
const C = {
  black: "#111827",
  gray: "#4B5563",
  grayMid: "#6B7280",
  grayLight: "#9CA3AF",
  beige: "#F5F0E8",
  beigeDeep: "#EDE8DF",
  green: "#1a7a4a",
  line: "#E5E7EB"
};

/* ───── HELPERS ───── */
const hrLine = (color = C.line, margin = [0, 16, 0, 16]) => ({
  canvas: [{ type: "line", x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.75, lineColor: color }],
  margin
});

const sectionLabel = text => ({
  text,
  fontSize: 7,
  bold: true,
  color: C.grayLight,
  characterSpacing: 2,
  margin: [0, 0, 0, 8]
});

const fmtMoney = n => `$${Number(n || 0).toLocaleString("es-CO")}`;
const fmtFecha = f => new Date(f).toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" });

/* ───── GENERADOR ───── */
async function generarPDFCotizacion(cotizacion, nombreCliente = "Cliente") {
  const {
    items = [],
    total = 0,
    fecha = new Date(),
    notas = "",
    id = ""
  } = cotizacion;

  const images = await preloadImages({
    logo: "/img/logo.png",
    firma: "/img/firma.png"
  });

  const numDoc = id.substring(0, 8).toUpperCase() || "—";

  /* ───── HEADER ───── */
  const header = [
    {
      columns: [
        {
          stack: [
            { text: "DOMKA", fontSize: 18, bold: true },
            { text: "Construcción & Diseño", fontSize: 8, color: C.grayLight, characterSpacing: 2 }
          ]
        },
        {
          stack: [
            { text: "COTIZACIÓN", fontSize: 26, bold: true, alignment: "right" },
            { text: `N° ${numDoc}`, fontSize: 9, color: C.grayMid, alignment: "right" }
          ]
        }
      ]
    },
    hrLine(C.green)
  ];

  /* ───── INFO CLIENTE ───── */
  const info = {
    columns: [
      {
        stack: [
          sectionLabel("CLIENTE"),
          { text: nombreCliente, fontSize: 14, bold: true }
        ]
      },
      {
        stack: [
          sectionLabel("FECHA"),
          { text: fmtFecha(fecha), fontSize: 9 }
        ],
        alignment: "right"
      }
    ],
    margin: [0, 18, 0, 0]
  };

  /* ───── TABLA ───── */
  const tableHeader = {
    bold: true,
    fontSize: 8,
    fillColor: C.beigeDeep,
    margin: [8, 8, 8, 8]
  };

  const tabla = {
    table: {
      widths: [28, "*", 90],
      body: [
        [
          { ...tableHeader, text: "N°", alignment: "center" },
          { ...tableHeader, text: "DESCRIPCIÓN" },
          { ...tableHeader, text: "TOTAL", alignment: "right" }
        ],
        ...items.map((it, i) => ([
          { text: i + 1, alignment: "center", margin: [8, 6, 8, 6] },
          { text: it.descripcion || "—", margin: [8, 6, 8, 6] },
          { text: fmtMoney(it.subtotal), alignment: "right", margin: [8, 6, 8, 6] }
        ]))
      ]
    },
    layout: "noBorders",
    margin: [0, 12, 0, 0]
  };

  /* ───── TOTAL ───── */
  const totalBlock = {
    columns: [
      { width: "*", text: "" },
      {
        width: 230,
        table: {
          widths: ["*", "auto"],
          body: [[
            { text: "TOTAL A PAGAR", bold: true, fillColor: C.beige, margin: [12, 10, 6, 10] },
            { text: fmtMoney(total), bold: true, fontSize: 14, color: C.green, fillColor: C.beige, alignment: "right", margin: [6, 10, 12, 10] }
          ]]
        },
        layout: "noBorders"
      }
    ],
    margin: [0, 20, 0, 0]
  };

  /* ───── NOTAS ───── */
  const notasBlock = notas ? [
    hrLine(),
    sectionLabel("NOTAS"),
    { text: notas, fontSize: 9, color: C.gray }
  ] : [];

  /* ───── FIRMA ───── */
  const firmaBlock = [
    hrLine(),
    sectionLabel("ELABORADO POR"),
    images.firma ? { image: images.firma, width: 110 } : {},
    { text: "Alexander Otalora Camayo", bold: true },
    { text: "DOMKA Construcción & Diseño", fontSize: 9, color: C.grayMid }
  ];

  /* ───── DOCUMENTO ───── */
  const docDefinition = {
    pageSize: "A4",
    pageMargins: [45, 42, 42, 48],

    /* FONDO BEIGE GLOBAL + MARCA DE AGUA */
    background: () => [
      { canvas: [{ type: "rect", x: 0, y: 0, w: 595, h: 842, color: C.beige }] },
      { canvas: [{ type: "rect", x: 0, y: 0, w: 5, h: 842, color: C.green }] },
      images.logo ? {
        image: images.logo,
        width: 320,
        opacity: 0.04,
        absolutePosition: { x: 140, y: 260 }
      } : {}
    ],

    content: [
      ...header,
      info,
      hrLine(),
      sectionLabel("DETALLE DE LA COTIZACIÓN"),
      tabla,
      totalBlock,
      ...notasBlock,
      ...firmaBlock
    ],

    defaultStyle: {
      font: "Roboto",
      fontSize: 10,
      color: C.black
    }
  };

  pdfMake.createPdf(docDefinition).download(`Cotizacion_DOMKA_${numDoc}.pdf`);
}

window.generarPDFCotizacion = generarPDFCotizacion;
