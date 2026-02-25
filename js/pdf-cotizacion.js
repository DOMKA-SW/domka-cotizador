// js/pdf-cotizacion.js — DOMKA 2026
// pdfMake + DM Sans + DM Serif Display

// ───────────────────────────────────────────────────────────
// REGISTRO DE FUENTES (OBLIGATORIO)
// ───────────────────────────────────────────────────────────
pdfMake.fonts = {
  DMSans: {
    normal: "DMSans-Regular.ttf",
    bold: "DMSans-Bold.ttf",
    italics: "DMSans-Regular.ttf",
    bolditalics: "DMSans-Bold.ttf"
  },
  DMSerif: {
    normal: "DMSerifDisplay-Regular.ttf",
    bold: "DMSerifDisplay-Regular.ttf",
    italics: "DMSerifDisplay-Regular.ttf",
    bolditalics: "DMSerifDisplay-Regular.ttf"
  }
};

// ── COLORES ────────────────────────────────────────────────
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
const fmtDate = d =>
  new Date(d).toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  });

const fmtM = n => `$${Number(n || 0).toLocaleString("es-CO")}`;

const sLabel = text => ({
  text,
  fontSize: 7,
  bold: true,
  color: C.green,
  characterSpacing: 2,
  font: "DMSans",
  margin: [0, 0, 0, 6]
});

const hr = () => ({
  canvas: [{
    type: "line",
    x1: 0, y1: 0, x2: 515, y2: 0,
    lineWidth: 0.6,
    lineColor: C.line
  }],
  margin: [0, 14, 0, 14]
});

const tc = (text, o = {}) => ({
  text,
  font: "DMSans",
  fontSize: o.size || 9.5,
  bold: o.bold || false,
  color: o.color || C.black,
  alignment: o.align || "left",
  border: [false, false, false, false],
  fillColor: C.pageBg,
  margin: [8, 7, 8, 7]
});

// ── GENERADOR ───────────────────────────────────────────────
function generarPDFCotizacion(cotizacion, nombreCliente = "Cliente") {
  const {
    items = [],
    total = 0,
    fecha = new Date()
  } = cotizacion;

  const doc = {
    pageSize: "A4",
    pageMargins: [45, 42, 42, 50],

    background: (p, s) => [
      { canvas: [{ type: "rect", x: 0, y: 0, w: s.width, h: s.height, color: C.pageBg }] }
    ],

    content: [
      {
        columns: [
          {
            text: "DOMKA",
            font: "DMSerif",
            fontSize: 26
          },
          {
            stack: [
              { text: "COTIZACIÓN", font: "DMSerif", fontSize: 22, alignment: "right" },
              { text: fmtDate(fecha), fontSize: 9, color: C.gray, alignment: "right" }
            ]
          }
        ]
      },

      { canvas: [{ type: "rect", x: 0, y: 0, w: 515, h: 3, color: C.green }] },

      { text: "", margin: [0, 16] },

      sLabel("CLIENTE"),
      { text: nombreCliente, fontSize: 14, bold: true },

      hr(),
      sLabel("DETALLE DE LA COTIZACIÓN"),

      {
        table: {
          widths: [30, "*", 90],
          body: [
            [
              tc("N°", { bold: true }),
              tc("DESCRIPCIÓN", { bold: true }),
              tc("VALOR", { bold: true, align: "right" })
            ],
            ...items.map((it, i) => [
              tc(i + 1, { align: "center", color: C.grayMid }),
              tc(it.descripcion),
              tc(fmtM(it.subtotal), { align: "right", bold: true })
            ])
          ]
        },
        layout: {
          hLineWidth: i => (i === 0 ? 0 : 0.4),
          hLineColor: () => C.line,
          vLineWidth: () => 0
        }
      },

      hr(),
      sLabel("TOTAL A PAGAR"),
      {
        text: fmtM(total),
        font: "DMSerif",
        fontSize: 30,
        alignment: "right"
      }
    ],

    defaultStyle: {
      font: "DMSans",
      fontSize: 10,
      color: C.black
    }
  };

  pdfMake.createPdf(doc).download("Cotizacion_DOMKA.pdf");
}

window.generarPDFCotizacion = generarPDFCotizacion;
