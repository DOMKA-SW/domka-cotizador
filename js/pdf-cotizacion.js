// js/pdf-cotizacion.js — DOMKA 2026
// Tipografías: DM Sans + DM Serif Display
// Estilo: Beige limpio · Verde acento · Sin fondos negros

// ── IMÁGENES ────────────────────────────────────────────────
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
      fr.onloadend = () => r(fr.result);
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

// ── PALETA ──────────────────────────────────────────────────
const C = {
  pageBg: "#F5F0E8",
  black: "#1A1A1A",
  gray: "#4B5563",
  grayMid: "#6B7280",
  grayLight: "#9CA3AF",
  green: "#1a7a4a",
  line: "#D6D0C8"
};

// ── HELPERS ────────────────────────────────────────────────
const fmtDate = f =>
  new Date(f).toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  });

const fmtM = n => `$${Number(n || 0).toLocaleString("es-CO")}`;

const sLabel = (text, color = C.green) => ({
  text,
  fontSize: 7,
  bold: true,
  color,
  characterSpacing: 2,
  font: "DMSans",
  margin: [0, 0, 0, 6]
});

const hr = (m = [0, 14, 0, 14]) => ({
  canvas: [{ type: "line", x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.6, lineColor: C.line }],
  margin: m
});

const tc = (text, o = {}) => ({
  text,
  font: "DMSans",
  fontSize: o.size || 9.5,
  bold: o.bold || false,
  color: o.color || C.black,
  alignment: o.align || "left",
  fillColor: C.pageBg,
  border: [false, false, false, false],
  margin: o.margin || [8, 7, 8, 7]
});

// ── GENERADOR ───────────────────────────────────────────────
async function generarPDFCotizacion(c, nombreCliente = "Cliente") {
  const {
    items = [],
    total = 0,
    fecha = new Date(),
    planPagos = [],
    notas = "",
    adjuntos = [],
    ubicacion = ""
  } = c;

  const images = await preloadImages({
    logo: "/img/logo.png",
    firma: "/img/firma.png"
  });

  // ── HEADER ───────────────────────────────────────────────
  const header = {
    table: {
      widths: ["*", "*"],
      body: [[
        {
          stack: [
            { text: "DOMKA", fontSize: 24, bold: true, font: "DMSerif", color: C.black },
            { text: "CONSTRUCCIÓN & DISEÑO", fontSize: 8, color: C.grayMid, characterSpacing: 2 }
          ],
          border: [false, false, false, false]
        },
        {
          stack: [
            { text: "COTIZACIÓN", fontSize: 22, font: "DMSerif", alignment: "right" },
            { text: fmtDate(fecha), fontSize: 9, color: C.gray, alignment: "right" }
          ],
          border: [false, false, false, false]
        }
      ]]
    },
    layout: "noBorders"
  };

  // ── INFO CLIENTE ─────────────────────────────────────────
  const info = {
    table: {
      widths: ["55%", "45%"],
      body: [[
        {
          stack: [
            sLabel("CLIENTE"),
            { text: nombreCliente, fontSize: 14, bold: true },
            ubicacion ? { text: ubicacion, fontSize: 9, color: C.gray } : null
          ].filter(Boolean),
          border: [false, false, false, false]
        },
        {
          stack: [
            sLabel("DETALLES"),
            { text: "Validez: 30 días", fontSize: 9, color: C.gray }
          ],
          border: [false, false, false, false]
        }
      ]]
    },
    layout: "noBorders"
  };

  // ── TABLA ÍTEMS ──────────────────────────────────────────
  const tablaItems = {
    table: {
      widths: [28, "*", 80],
      body: [
        [
          tc("N°", { bold: true }),
          tc("DESCRIPCIÓN", { bold: true }),
          tc("VALOR", { bold: true, align: "right" })
        ],
        ...items.map((it, i) => [
          tc(String(i + 1), { align: "center", color: C.grayMid }),
          tc(it.descripcion || "—"),
          tc(fmtM(it.subtotal), { align: "right", bold: true })
        ])
      ]
    },
    layout: {
      hLineWidth: i => (i === 0 ? 0 : 0.4),
      hLineColor: () => C.line,
      vLineWidth: () => 0
    }
  };

  // ── TOTAL ────────────────────────────────────────────────
  const bloqueTotal = {
    margin: [0, 12, 0, 0],
    stack: [
      sLabel("TOTAL A PAGAR"),
      {
        text: fmtM(total),
        fontSize: 28,
        bold: true,
        font: "DMSerif",
        alignment: "right"
      }
    ]
  };

  // ── PLAN DE PAGOS ────────────────────────────────────────
  const bloquePagos = planPagos.length ? [
    hr(),
    sLabel("PLAN DE PAGOS"),
    {
      table: {
        widths: ["*", 80],
        body: planPagos.map(p => [
          tc(p.descripcion),
          tc(fmtM(p.monto), { align: "right", bold: true })
        ])
      },
      layout: "noBorders"
    }
  ] : [];

  // ── NOTAS ────────────────────────────────────────────────
  const bloqueNotas = notas ? [
    hr(),
    sLabel("NOTAS"),
    { text: notas, fontSize: 9, color: C.gray, lineHeight: 1.4 }
  ] : [];

  // ── FIRMA / CONTACTO ─────────────────────────────────────
  const bloqueEmpresa = [
    hr([0, 24, 0, 20]),
    {
      table: {
        widths: ["*", "*"],
        body: [[
          {
            stack: [
              sLabel("CONTÁCTANOS"),
              { text: "piter030509@gmail.com", fontSize: 9, color: C.gray },
              { text: "+57 305 811 4595", fontSize: 9, color: C.gray }
            ],
            border: [false, false, false, false]
          },
          {
            stack: [
              sLabel("ELABORADO POR"),
              images.firma
                ? { image: images.firma, width: 90, margin: [0, 6, 0, 6] }
                : null,
              { text: "Alexander Otalora Camayo", bold: true }
            ].filter(Boolean),
            border: [false, false, false, false]
          }
        ]]
      },
      layout: "noBorders"
    }
  ];

  // ── BACKGROUND ───────────────────────────────────────────
  const bg = (p, s) => {
    const arr = [{
      canvas: [{ type: "rect", x: 0, y: 0, w: s.width, h: s.height, color: C.pageBg }]
    }];
    if (images.logo) {
      arr.push({
        image: images.logo,
        width: 300,
        opacity: 0.08,
        absolutePosition: {
          x: (s.width - 300) / 2,
          y: (s.height - 300) / 2
        }
      });
    }
    return arr;
  };

  // ── DOCUMENTO ────────────────────────────────────────────
  const doc = {
    pageSize: "A4",
    pageMargins: [45, 42, 42, 50],
    background: bg,
    content: [
      header,
      { canvas: [{ type: "rect", x: 0, y: 0, w: 515, h: 3, color: C.green }] },
      { text: "", margin: [0, 14] },
      info,
      hr(),
      sLabel("DETALLE DE LA COTIZACIÓN"),
      tablaItems,
      bloqueTotal,
      ...bloquePagos,
      ...bloqueNotas,
      ...bloqueEmpresa
    ],
    defaultStyle: {
      font: "DMSans",
      fontSize: 10,
      color: C.black
    }
  };

  pdfMake.createPdf(doc).download("Cotizacion_DOMKA.pdf");
}

if (typeof window !== "undefined") {
  window.generarPDFCotizacion = generarPDFCotizacion;
}
