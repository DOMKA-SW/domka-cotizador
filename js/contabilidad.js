// js/contabilidad.js
// ============================================================
// HELPERS
// ============================================================
function formatMoney(n) {
  return `$${Number(n || 0).toLocaleString("es-CO")}`;
}

function toDateLocal(tsOrStr) {
  if (!tsOrStr) return null;
  if (tsOrStr.toDate) return tsOrStr.toDate();
  return new Date(tsOrStr);
}

function fechaHoy() {
  return new Date().toISOString().slice(0, 10);
}

function inRange(d, desde, hasta) {
  if (!d) return false;
  if (!desde && !hasta) return true;
  const t = d.getTime();
  if (desde && t < desde.getTime()) return false;
  if (hasta && t > new Date(hasta.getFullYear(), hasta.getMonth(), hasta.getDate(), 23, 59, 59).getTime()) return false;
  return true;
}

function mesKey(fecha) {
  if (!fecha) return "sin-fecha";
  const d = toDateLocal(fecha);
  if (!d) return "sin-fecha";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function mesLabel(key) {
  if (!key || key === "sin-fecha") return "Sin fecha";
  const [y, m] = key.split("-");
  const meses = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
  return `${meses[parseInt(m) - 1]} ${y}`;
}

// ============================================================
// ESTADO GLOBAL
// ============================================================
let _cotizaciones = [];
let _cuentas = [];
let _movimientos = [];       // gastos/ingresos manuales
let _bancos = [];            // cuentas bancarias
let _filtroDesde = null;
let _filtroHasta = null;
let _filtroMovTipo = "todos";
let _charts = {};

// ============================================================
// CARGA DE DATOS DESDE FIREBASE
// ============================================================
async function cargarTodo() {
  const [cotSnap, cueSnap, movSnap, banSnap] = await Promise.all([
    db.collection("cotizaciones").orderBy("fecha", "desc").get(),
    db.collection("cuentas").orderBy("fecha", "desc").get(),
    db.collection("movimientos").orderBy("fecha", "desc").get(),
    db.collection("cuentas_bancarias").orderBy("nombre").get()
  ]);

  _cotizaciones = cotSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  _cuentas = cueSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  _movimientos = movSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  _bancos = banSnap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ============================================================
// RENDER PRINCIPAL
// ============================================================
async function renderTodo() {
  await cargarTodo();
  calcularYRenderizarStats();
  renderGraficos();
  renderMovimientos();
  renderCuentasBancarias();
  renderTransacciones();
  poblarSelectCuentas();
}

// ============================================================
// ESTADÍSTICAS / TARJETAS RESUMEN
// ============================================================
function calcularYRenderizarStats() {
  const desde = _filtroDesde ? new Date(_filtroDesde) : null;
  const hasta = _filtroHasta ? new Date(_filtroHasta) : null;

  // Cotizaciones
  const cotFiltradas = _cotizaciones.filter(c => !desde && !hasta ? true : inRange(toDateLocal(c.fecha), desde, hasta));
  const cotPendientes = cotFiltradas.filter(c => !c.estado || c.estado === "pendiente");
  const cotAprobadas = cotFiltradas.filter(c => c.estado === "aprobada");

  // Cuentas de cobro
  const cueFiltradas = _cuentas.filter(c => !desde && !hasta ? true : inRange(toDateLocal(c.fecha), desde, hasta));
  const cuePendientes = cueFiltradas.filter(c => !c.estado || c.estado === "pendiente");
  const cuePagadas = cueFiltradas.filter(c => c.estado === "pagada");

  const sumCuePendientes = cuePendientes.reduce((a, c) => a + Number(c.total || 0), 0);
  const sumCuePagadas = cuePagadas.reduce((a, c) => a + Number(c.total || 0), 0);
  const sumCotPendientes = cotPendientes.reduce((a, c) => a + Number(c.total || 0), 0);
  const sumCotAprobadas = cotAprobadas.reduce((a, c) => a + Number(c.total || 0), 0);

  // Movimientos manuales en rango
  const movFiltrados = _movimientos.filter(m => !desde && !hasta ? true : inRange(toDateLocal(m.fecha), desde, hasta));
  const ingresosMan = movFiltrados.filter(m => m.tipo === "ingreso").reduce((a, m) => a + Number(m.monto || 0), 0);
  const gastosTot = movFiltrados.filter(m => m.tipo === "gasto").reduce((a, m) => a + Number(m.monto || 0), 0);

  const totalIngresos = sumCuePagadas + ingresosMan;
  const balance = totalIngresos - gastosTot;

  set("stat-cot-pendientes", cotPendientes.length);
  set("stat-cot-pendientes-val", formatMoney(sumCotPendientes));
  set("stat-cot-aprobadas", cotAprobadas.length);
  set("stat-cot-aprobadas-val", formatMoney(sumCotAprobadas));
  set("stat-cue-pendientes", cuePendientes.length);
  set("stat-cue-pendientes-val", formatMoney(sumCuePendientes));
  set("stat-cue-pagadas", cuePagadas.length);
  set("stat-cue-pagadas-val", formatMoney(sumCuePagadas));
  set("stat-ingresos", formatMoney(totalIngresos));
  set("stat-gastos", formatMoney(gastosTot));
  set("stat-balance", formatMoney(balance));
  set("stat-por-cobrar", formatMoney(sumCuePendientes));

  const balanceEl = document.getElementById("stat-balance");
  if (balanceEl) balanceEl.className = `text-2xl font-bold ${balance >= 0 ? "text-blue-600" : "text-red-500"}`;
}

function set(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

// ============================================================
// GRÁFICOS
// ============================================================
function renderGraficos() {
  const desde = _filtroDesde ? new Date(_filtroDesde) : null;
  const hasta = _filtroHasta ? new Date(_filtroHasta) : null;

  // --- Gráfico 1: Ingresos vs Gastos por mes ---
  const movFiltrados = _movimientos.filter(m => !desde && !hasta ? true : inRange(toDateLocal(m.fecha), desde, hasta));
  const cuePagadas = _cuentas.filter(c => c.estado === "pagada" && (!desde && !hasta ? true : inRange(toDateLocal(c.fecha), desde, hasta)));

  const mesesMap = {};

  cuePagadas.forEach(c => {
    const k = mesKey(c.fecha);
    if (!mesesMap[k]) mesesMap[k] = { ingresos: 0, gastos: 0 };
    mesesMap[k].ingresos += Number(c.total || 0);
  });

  movFiltrados.forEach(m => {
    const k = mesKey(m.fecha);
    if (!mesesMap[k]) mesesMap[k] = { ingresos: 0, gastos: 0 };
    if (m.tipo === "ingreso") mesesMap[k].ingresos += Number(m.monto || 0);
    else mesesMap[k].gastos += Number(m.monto || 0);
  });

  const mesesOrdenados = Object.keys(mesesMap).sort();
  const labelsIG = mesesOrdenados.map(mesLabel);
  const dataIngresos = mesesOrdenados.map(k => mesesMap[k].ingresos);
  const dataGastos = mesesOrdenados.map(k => mesesMap[k].gastos);

  renderChart("chart-ingresos-gastos", "bar", {
    labels: labelsIG.length ? labelsIG : ["Sin datos"],
    datasets: [
      { label: "Ingresos", data: dataIngresos, backgroundColor: "#22c55e" },
      { label: "Gastos", data: dataGastos, backgroundColor: "#ef4444" }
    ]
  }, {
    scales: { y: { ticks: { callback: v => `$${Number(v).toLocaleString("es-CO")}` } } },
    plugins: { legend: { position: "top" } }
  });

  // --- Gráfico 2: Estado cotizaciones ---
  const cotF = _cotizaciones.filter(c => !desde && !hasta ? true : inRange(toDateLocal(c.fecha), desde, hasta));
  const cotCounts = {
    Pendientes: cotF.filter(c => !c.estado || c.estado === "pendiente").length,
    Aprobadas: cotF.filter(c => c.estado === "aprobada").length,
    Rechazadas: cotF.filter(c => c.estado === "rechazada").length,
  };

  renderChart("chart-cotizaciones", "doughnut", {
    labels: Object.keys(cotCounts),
    datasets: [{
      data: Object.values(cotCounts),
      backgroundColor: ["#fbbf24", "#22c55e", "#ef4444"]
    }]
  }, { plugins: { legend: { position: "bottom" } } });

  // --- Gráfico 3: Estado cuentas ---
  const cueF = _cuentas.filter(c => !desde && !hasta ? true : inRange(toDateLocal(c.fecha), desde, hasta));
  const cueCounts = {
    Pendientes: cueF.filter(c => !c.estado || c.estado === "pendiente").length,
    Pagadas: cueF.filter(c => c.estado === "pagada").length,
  };

  renderChart("chart-cuentas", "doughnut", {
    labels: Object.keys(cueCounts),
    datasets: [{
      data: Object.values(cueCounts),
      backgroundColor: ["#f97316", "#22c55e"]
    }]
  }, { plugins: { legend: { position: "bottom" } } });

  // --- Gráfico 4: Saldos por banco ---
  if (_bancos.length > 0) {
    const saldosCalculados = _bancos.map(b => {
      const saldoInicial = Number(b.saldoInicial || 0);
      const movBanco = _movimientos.filter(m => m.cuentaBancaria === b.id);
      const entradas = movBanco.filter(m => m.tipo === "ingreso").reduce((a, m) => a + Number(m.monto || 0), 0);
      const salidas = movBanco.filter(m => m.tipo === "gasto").reduce((a, m) => a + Number(m.monto || 0), 0);
      return saldoInicial + entradas - salidas;
    });

    renderChart("chart-bancos", "bar", {
      labels: _bancos.map(b => b.nombre),
      datasets: [{
        label: "Saldo actual",
        data: saldosCalculados,
        backgroundColor: saldosCalculados.map(s => s >= 0 ? "#3b82f6" : "#ef4444")
      }]
    }, {
      scales: { y: { ticks: { callback: v => `$${Number(v).toLocaleString("es-CO")}` } } },
      plugins: { legend: { display: false } }
    });
  } else {
    renderChart("chart-bancos", "bar", {
      labels: ["Sin cuentas bancarias registradas"],
      datasets: [{ label: "Saldo", data: [0], backgroundColor: "#d1d5db" }]
    }, { plugins: { legend: { display: false } } });
  }
}

function renderChart(canvasId, type, data, options = {}) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  if (_charts[canvasId]) {
    _charts[canvasId].destroy();
  }

  _charts[canvasId] = new Chart(canvas, {
    type,
    data,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      ...options
    }
  });
}

// ============================================================
// MOVIMIENTOS MANUALES
// ============================================================
function renderMovimientos() {
  const desde = _filtroDesde ? new Date(_filtroDesde) : null;
  const hasta = _filtroHasta ? new Date(_filtroHasta) : null;

  let movs = _movimientos.filter(m => !desde && !hasta ? true : inRange(toDateLocal(m.fecha), desde, hasta));

  if (_filtroMovTipo === "ingreso") movs = movs.filter(m => m.tipo === "ingreso");
  if (_filtroMovTipo === "gasto") movs = movs.filter(m => m.tipo === "gasto");

  const container = document.getElementById("lista-movimientos");
  if (!container) return;

  if (movs.length === 0) {
    container.innerHTML = `<p class="text-gray-400 text-sm text-center py-8">No hay movimientos registrados</p>`;
    return;
  }

  container.innerHTML = movs.map(m => {
    const fecha = toDateLocal(m.fecha);
    const esIngreso = m.tipo === "ingreso";
    const banco = _bancos.find(b => b.id === m.cuentaBancaria);
    return `
      <div class="p-3 rounded-lg border ${esIngreso ? "ingreso-row bg-green-50" : "gasto-row bg-red-50"} flex justify-between items-start gap-2">
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 flex-wrap">
            <span class="font-semibold text-sm truncate">${m.descripcion || "Sin descripción"}</span>
            <span class="badge ${esIngreso ? "badge-green" : "badge-red"}">${esIngreso ? "Ingreso" : "Gasto"}</span>
            ${m.categoria ? `<span class="badge badge-blue">${m.categoria}</span>` : ""}
          </div>
          <div class="text-xs text-gray-500 mt-1 flex gap-3 flex-wrap">
            ${fecha ? `<span><i class="fas fa-calendar-alt mr-1"></i>${fecha.toLocaleDateString("es-CO")}</span>` : ""}
            ${banco ? `<span><i class="fas fa-university mr-1"></i>${banco.nombre}</span>` : ""}
            ${m.notas ? `<span class="italic">${m.notas}</span>` : ""}
          </div>
        </div>
        <div class="text-right shrink-0">
          <p class="font-bold text-base ${esIngreso ? "text-green-700" : "text-red-600"}">${esIngreso ? "+" : "-"}${formatMoney(m.monto)}</p>
          <button onclick="eliminarMovimiento('${m.id}')" class="btn-danger mt-1">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </div>
    `;
  }).join("");
}

async function guardarMovimiento(e) {
  e.preventDefault();
  const tipo = document.querySelector('input[name="tipo-mov"]:checked').value;
  const descripcion = document.getElementById("mov-descripcion").value.trim();
  const monto = Number(document.getElementById("mov-monto").value) || 0;
  const fecha = document.getElementById("mov-fecha").value || fechaHoy();
  const cuentaBancaria = document.getElementById("mov-cuenta").value || "";
  const categoria = document.getElementById("mov-categoria").value || "general";
  const notas = document.getElementById("mov-notas").value.trim();

  if (!descripcion || monto <= 0) {
    alert("Completa descripción y monto.");
    return;
  }

  await db.collection("movimientos").add({
    tipo,
    descripcion,
    monto,
    fecha: new Date(fecha + "T12:00:00"),
    cuentaBancaria,
    categoria,
    notas,
    creadoEn: firebase.firestore.FieldValue.serverTimestamp()
  });

  document.getElementById("form-movimiento").reset();
  document.getElementById("mov-fecha").value = fechaHoy();

  await renderTodo();
  alert("✅ Movimiento guardado");
}

window.eliminarMovimiento = async function(id) {
  if (!confirm("¿Eliminar este movimiento?")) return;
  await db.collection("movimientos").doc(id).delete();
  await renderTodo();
};

// ============================================================
// CUENTAS BANCARIAS
// ============================================================
function renderCuentasBancarias() {
  const container = document.getElementById("lista-cuentas-bancarias");
  if (!container) return;

  if (_bancos.length === 0) {
    container.innerHTML = `<p class="text-gray-400 text-sm text-center py-8">No hay cuentas registradas</p>`;
    return;
  }

  container.innerHTML = _bancos.map(b => {
    const movBanco = _movimientos.filter(m => m.cuentaBancaria === b.id);
    const entradas = movBanco.filter(m => m.tipo === "ingreso").reduce((a, m) => a + Number(m.monto || 0), 0);
    const salidas = movBanco.filter(m => m.tipo === "gasto").reduce((a, m) => a + Number(m.monto || 0), 0);
    const saldoActual = Number(b.saldoInicial || 0) + entradas - salidas;

    const tipoIcono = { ahorros: "fa-piggy-bank", corriente: "fa-credit-card", digital: "fa-mobile-alt", efectivo: "fa-money-bill-wave", otro: "fa-university" };
    const icono = tipoIcono[b.tipo] || "fa-university";

    return `
      <div class="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
        <div class="flex justify-between items-start">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
              <i class="fas ${icono} text-orange-600"></i>
            </div>
            <div>
              <p class="font-semibold text-gray-800">${b.nombre}</p>
              <p class="text-xs text-gray-500">${b.tipo || "cuenta"} ${b.numero ? "· " + b.numero : ""}</p>
            </div>
          </div>
          <div class="text-right">
            <p class="font-bold text-lg ${saldoActual >= 0 ? "text-blue-600" : "text-red-500"}">${formatMoney(saldoActual)}</p>
            <p class="text-xs text-gray-400">Saldo actual</p>
          </div>
        </div>
        <div class="grid grid-cols-3 gap-2 mt-3 pt-3 border-t text-xs text-center">
          <div>
            <p class="text-gray-400">Saldo inicial</p>
            <p class="font-semibold">${formatMoney(b.saldoInicial)}</p>
          </div>
          <div>
            <p class="text-green-500">Entradas</p>
            <p class="font-semibold text-green-600">+${formatMoney(entradas)}</p>
          </div>
          <div>
            <p class="text-red-400">Salidas</p>
            <p class="font-semibold text-red-500">-${formatMoney(salidas)}</p>
          </div>
        </div>
        <div class="flex gap-2 mt-3">
          <button onclick="verDetalleBanco('${b.id}')" class="text-xs px-3 py-1 bg-gray-100 rounded hover:bg-gray-200 text-gray-700">
            <i class="fas fa-list mr-1"></i> Ver movimientos
          </button>
          <button onclick="editarBanco('${b.id}')" class="text-xs px-3 py-1 bg-blue-100 rounded hover:bg-blue-200 text-blue-700">
            <i class="fas fa-edit mr-1"></i> Editar
          </button>
          <button onclick="eliminarBanco('${b.id}')" class="text-xs px-3 py-1 bg-red-100 rounded hover:bg-red-200 text-red-700">
            <i class="fas fa-trash mr-1"></i> Eliminar
          </button>
        </div>
      </div>
    `;
  }).join("");
}

async function guardarCuentaBancaria(e) {
  e.preventDefault();
  const idEditando = document.getElementById("banco-id-editando").value;
  const nombre = document.getElementById("banco-nombre").value.trim();
  const numero = document.getElementById("banco-numero").value.trim();
  const tipo = document.getElementById("banco-tipo").value;
  const saldoInicial = Number(document.getElementById("banco-saldo-inicial").value) || 0;

  if (!nombre) { alert("Ingresa el nombre del banco"); return; }

  const data = { nombre, numero, tipo, saldoInicial };

  if (idEditando) {
    await db.collection("cuentas_bancarias").doc(idEditando).update(data);
    document.getElementById("banco-id-editando").value = "";
    document.getElementById("btn-cancelar-banco").classList.add("hidden");
  } else {
    await db.collection("cuentas_bancarias").add({
      ...data,
      creadoEn: firebase.firestore.FieldValue.serverTimestamp()
    });
  }

  document.getElementById("form-cuenta-bancaria").reset();
  document.getElementById("banco-saldo-inicial").value = "0";
  await renderTodo();
}

window.editarBanco = async function(id) {
  const banco = _bancos.find(b => b.id === id);
  if (!banco) return;

  document.getElementById("banco-id-editando").value = id;
  document.getElementById("banco-nombre").value = banco.nombre || "";
  document.getElementById("banco-numero").value = banco.numero || "";
  document.getElementById("banco-tipo").value = banco.tipo || "ahorros";
  document.getElementById("banco-saldo-inicial").value = banco.saldoInicial || 0;
  document.getElementById("btn-cancelar-banco").classList.remove("hidden");

  // Ir al tab de cuentas bancarias y scroll al form
  activarTab("cuentas-bancarias");
  document.getElementById("form-cuenta-bancaria").scrollIntoView({ behavior: "smooth" });
};

window.eliminarBanco = async function(id) {
  if (!confirm("¿Eliminar esta cuenta bancaria? Los movimientos asociados no se eliminarán.")) return;
  await db.collection("cuentas_bancarias").doc(id).delete();
  await renderTodo();
};

window.verDetalleBanco = function(id) {
  const banco = _bancos.find(b => b.id === id);
  if (!banco) return;

  const movBanco = _movimientos.filter(m => m.cuentaBancaria === id);
  movBanco.sort((a, b) => {
    const da = toDateLocal(a.fecha) || new Date(0);
    const db2 = toDateLocal(b.fecha) || new Date(0);
    return db2 - da;
  });

  document.getElementById("titulo-detalle-banco").textContent = `Movimientos — ${banco.nombre}`;
  const detalle = document.getElementById("detalle-cuenta-bancaria");
  const tabla = document.getElementById("tabla-detalle-banco");
  detalle.classList.remove("hidden");

  if (movBanco.length === 0) {
    tabla.innerHTML = `<p class="text-gray-400 text-sm py-4">Sin movimientos en esta cuenta.</p>`;
    return;
  }

  tabla.innerHTML = `
    <table class="w-full text-sm">
      <thead class="bg-gray-100">
        <tr>
          <th class="p-2 text-left">Fecha</th>
          <th class="p-2 text-left">Descripción</th>
          <th class="p-2 text-left">Tipo</th>
          <th class="p-2 text-right">Monto</th>
        </tr>
      </thead>
      <tbody class="divide-y">
        ${movBanco.map(m => {
          const fecha = toDateLocal(m.fecha);
          const esIngreso = m.tipo === "ingreso";
          return `<tr class="${esIngreso ? "bg-green-50" : "bg-red-50"}">
            <td class="p-2">${fecha ? fecha.toLocaleDateString("es-CO") : "—"}</td>
            <td class="p-2">${m.descripcion || "—"}</td>
            <td class="p-2"><span class="badge ${esIngreso ? "badge-green" : "badge-red"}">${esIngreso ? "Ingreso" : "Gasto"}</span></td>
            <td class="p-2 text-right font-semibold ${esIngreso ? "text-green-700" : "text-red-600"}">${esIngreso ? "+" : "-"}${formatMoney(m.monto)}</td>
          </tr>`;
        }).join("")}
      </tbody>
    </table>
  `;

  detalle.scrollIntoView({ behavior: "smooth" });
};

function poblarSelectCuentas() {
  const sel = document.getElementById("mov-cuenta");
  if (!sel) return;
  const valorActual = sel.value;
  sel.innerHTML = '<option value="">-- Sin cuenta --</option>';
  _bancos.forEach(b => {
    const opt = document.createElement("option");
    opt.value = b.id;
    opt.textContent = b.nombre;
    if (b.id === valorActual) opt.selected = true;
    sel.appendChild(opt);
  });
}

// ============================================================
// TRANSACCIONES (vista global)
// ============================================================
function renderTransacciones() {
  const desde = _filtroDesde ? new Date(_filtroDesde) : null;
  const hasta = _filtroHasta ? new Date(_filtroHasta) : null;

  const trans = [];

  // Cuentas de cobro
  _cuentas.forEach(c => {
    const fecha = toDateLocal(c.fecha);
    if (!inRange(fecha, desde, hasta)) return;
    trans.push({
      tipo: "Cuenta de Cobro",
      descripcion: c.nombreCliente || "Sin cliente",
      monto: c.total || 0,
      esIngreso: c.estado === "pagada",
      categoria: "Servicio prestado",
      cuenta: "",
      fecha,
      estado: c.estado || "pendiente"
    });
  });

  // Cotizaciones
  _cotizaciones.forEach(c => {
    const fecha = toDateLocal(c.fecha);
    if (!inRange(fecha, desde, hasta)) return;
    trans.push({
      tipo: "Cotización",
      descripcion: c.nombreCliente || "Sin cliente",
      monto: c.total || 0,
      esIngreso: c.estado === "aprobada",
      categoria: "Cotización",
      cuenta: "",
      fecha,
      estado: c.estado || "pendiente"
    });
  });

  // Movimientos manuales
  _movimientos.forEach(m => {
    const fecha = toDateLocal(m.fecha);
    if (!inRange(fecha, desde, hasta)) return;
    const banco = _bancos.find(b => b.id === m.cuentaBancaria);
    trans.push({
      tipo: m.tipo === "ingreso" ? "Ingreso Manual" : "Gasto",
      descripcion: m.descripcion || "Sin descripción",
      monto: m.monto || 0,
      esIngreso: m.tipo === "ingreso",
      categoria: m.categoria || "general",
      cuenta: banco ? banco.nombre : "",
      fecha,
      estado: "registrado"
    });
  });

  trans.sort((a, b) => (b.fecha || 0) - (a.fecha || 0));

  const tbody = document.getElementById("tbody-trans");
  const countEl = document.getElementById("trans-count");
  if (!tbody) return;

  if (countEl) countEl.textContent = `${trans.length} registros`;

  if (trans.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center py-8 text-gray-400">Sin transacciones en el período</td></tr>`;
    return;
  }

  const badgeEstado = (estado) => {
    if (estado === "pagada" || estado === "aprobada" || estado === "registrado") return "badge-green";
    if (estado === "rechazada") return "badge-red";
    return "badge-yellow";
  };

  tbody.innerHTML = trans.map(t => `
    <tr class="hover:bg-gray-50">
      <td class="p-2 text-xs text-gray-600">${t.tipo}</td>
      <td class="p-2 text-sm font-medium">${t.descripcion}</td>
      <td class="p-2 text-right font-semibold ${t.esIngreso ? "text-green-700" : "text-red-500"}">
        ${t.esIngreso ? "+" : "-"}${formatMoney(t.monto)}
      </td>
      <td class="p-2 text-xs text-gray-500">${t.categoria}</td>
      <td class="p-2 text-xs text-gray-500">${t.cuenta}</td>
      <td class="p-2 text-xs text-gray-500">${t.fecha ? t.fecha.toLocaleDateString("es-CO") : "—"}</td>
      <td class="p-2"><span class="badge ${badgeEstado(t.estado)}">${t.estado}</span></td>
    </tr>
  `).join("");

  window._contabilidad_export = trans;
}

// ============================================================
// EXPORT CSV
// ============================================================
function exportCSV() {
  const data = window._contabilidad_export || [];
  if (!data.length) { alert("No hay datos para exportar."); return; }

  const rows = [
    ["Tipo", "Descripción/Cliente", "Monto", "Ingreso/Gasto", "Categoría", "Cuenta", "Fecha", "Estado"],
    ...data.map(r => [
      r.tipo, r.descripcion,
      r.monto,
      r.esIngreso ? "Ingreso" : "Gasto",
      r.categoria, r.cuenta,
      r.fecha ? r.fecha.toLocaleDateString("es-CO") : "",
      r.estado
    ])
  ];

  const csv = rows.map(r => r.map(c => `"${String(c || "").replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `contabilidad_DOMKA_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ============================================================
// TABS
// ============================================================
function activarTab(nombre) {
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.tab === nombre);
  });
  document.querySelectorAll(".tab-content").forEach(div => {
    div.classList.toggle("hidden", div.id !== `tab-${nombre}`);
  });
}

document.querySelectorAll(".tab-btn").forEach(btn => {
  btn.addEventListener("click", () => activarTab(btn.dataset.tab));
});

// ============================================================
// EVENTOS
// ============================================================
document.getElementById("btn-filtrar").addEventListener("click", async () => {
  _filtroDesde = document.getElementById("desde").value || null;
  _filtroHasta = document.getElementById("hasta").value || null;
  calcularYRenderizarStats();
  renderGraficos();
  renderMovimientos();
  renderTransacciones();
});

document.getElementById("btn-limpiar-filtro").addEventListener("click", async () => {
  _filtroDesde = null;
  _filtroHasta = null;
  document.getElementById("desde").value = "";
  document.getElementById("hasta").value = "";
  calcularYRenderizarStats();
  renderGraficos();
  renderMovimientos();
  renderTransacciones();
});

document.getElementById("btn-export-csv").addEventListener("click", exportCSV);

document.getElementById("form-movimiento").addEventListener("submit", guardarMovimiento);
document.getElementById("form-cuenta-bancaria").addEventListener("submit", guardarCuentaBancaria);

document.getElementById("btn-cancelar-banco").addEventListener("click", () => {
  document.getElementById("banco-id-editando").value = "";
  document.getElementById("form-cuenta-bancaria").reset();
  document.getElementById("banco-saldo-inicial").value = "0";
  document.getElementById("btn-cancelar-banco").classList.add("hidden");
});

document.getElementById("filtro-todos").addEventListener("click", () => { _filtroMovTipo = "todos"; renderMovimientos(); });
document.getElementById("filtro-ingresos").addEventListener("click", () => { _filtroMovTipo = "ingreso"; renderMovimientos(); });
document.getElementById("filtro-gastos").addEventListener("click", () => { _filtroMovTipo = "gasto"; renderMovimientos(); });

// Fecha por defecto hoy
document.getElementById("mov-fecha").value = fechaHoy();

// ============================================================
// INIT
// ============================================================
renderTodo();
