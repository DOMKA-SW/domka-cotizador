// js/contabilidad.js

// Helpers
function formatMoney(n) { return `$${Number(n || 0).toLocaleString("es-CO")}`; }
function toDateLocal(tsOrStr) {
  if (!tsOrStr) return null;
  if (tsOrStr.toDate) return tsOrStr.toDate();
  return new Date(tsOrStr);
}

async function fetchAll() {
  const [cotSnap, cueSnap] = await Promise.all([
    db.collection("cotizaciones").get(),
    db.collection("cuentas").get()
  ]);
  const cot = cotSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const cue = cueSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  return { cot, cue };
}

function inRange(d, desde, hasta) {
  if (!desde && !hasta) return true;
  const t = d.getTime();
  if (desde && t < desde.getTime()) return false;
  if (hasta && t > (new Date(hasta.getFullYear(), hasta.getMonth(), hasta.getDate(),23,59,59)).getTime()) return false;
  return true;
}

async function render(desde=null, hasta=null) {
  const { cot, cue } = await fetchAll();

  const desdeD = desde ? new Date(desde) : null;
  const hastaD = hasta ? new Date(hasta) : null;

  // Transacciones: cuentas pagadas + cotizaciones aprobadas
  const trans = [];

  let totalIngresos = 0;
  let totalCotAprob = 0;
  let countItems = 0;

  // cuentas
  for (const c of cue) {
    const fecha = toDateLocal(c.fecha);
    if (!fecha) continue;
    if (!inRange(fecha, desdeD, hastaD)) continue;

    // Fetch client name if exists
    let nombre = c.clienteId || "Cliente";
    try {
      const cli = await db.collection("clientes").doc(c.clienteId).get();
      nombre = cli.exists ? (cli.data().nombre || cli.data().nombreEmpresa || nombre) : nombre;
    } catch (e) { /* ignore */ }

    trans.push({ tipo: "Cuenta", cliente: nombre, total: c.total || 0, fecha, ref: c.linkPublico || c.id });
    if (c.estado === "pagada") totalIngresos += Number(c.total || 0);
    (c.items || []).forEach(it => countItems++);
  }

  // cotizaciones
  for (const c of cot) {
    const fecha = toDateLocal(c.fecha);
    if (!fecha) continue;
    if (!inRange(fecha, desdeD, hastaD)) continue;

    let nombre = c.clienteNombre || c.clienteId || "Cliente";
    try {
      const cli = await db.collection("clientes").doc(c.clienteId).get();
      nombre = cli.exists ? (cli.data().nombre || cli.data().nombreEmpresa || nombre) : nombre;
    } catch(e){}
    trans.push({ tipo: "Cotización", cliente: nombre, total: c.total || 0, fecha, ref: c.linkPublico || c.id });
    if (c.estado === "aprobada") totalCotAprob += Number(c.total || 0);
    (c.items || []).forEach(it => countItems++);
  }

  // Render resumen
  document.getElementById("total-ingresos").textContent = formatMoney(totalIngresos);
  document.getElementById("total-cot-aprob").textContent = formatMoney(totalCotAprob);
  document.getElementById("count-items").textContent = countItems;

  // Render tabla transacciones (orden descendente por fecha)
  trans.sort((a,b)=> b.fecha - a.fecha);
  const tbody = document.querySelector("#tabla-trans tbody");
  tbody.innerHTML = "";
  trans.forEach(t => {
    const tr = document.createElement("tr");
    tr.className = "border-t";
    tr.innerHTML = `
      <td class="p-2">${t.tipo}</td>
      <td class="p-2">${t.cliente}</td>
      <td class="p-2 text-right">${formatMoney(t.total)}</td>
      <td class="p-2">${t.fecha.toLocaleDateString()}</td>
      <td class="p-2 break-words">${t.ref}</td>
    `;
    tbody.appendChild(tr);
  });

  // store trans for export
  window._contabilidad_export = trans;
}

// Filtrado / Export
document.getElementById("btn-filtrar").addEventListener("click", async () => {
  const desde = document.getElementById("desde").value || null;
  const hasta = document.getElementById("hasta").value || null;
  await render(desde, hasta);
});

document.getElementById("btn-export").addEventListener("click", () => {
  const data = window._contabilidad_export || [];
  if (!data.length) return alert("No hay datos para exportar.");
  // CSV simple
  const rows = [
    ["Tipo","Cliente","Total","Fecha","Referencia"],
    ...data.map(r => [r.tipo, r.cliente, r.total, r.fecha.toLocaleDateString(), r.ref])
  ];
  const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `contabilidad_${new Date().toISOString().slice(0,10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
});

// Inicializar con todo
render();
